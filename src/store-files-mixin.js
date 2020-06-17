import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { CacheMixin } from "./cache-mixin.js";

export const StoreFilesMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
      name: "store-files-mixin",
      refresh: 1000 * 60 * 60 * 2,
      expiry: 1000 * 60 * 60 * 4
    },
    LOCAL_STORAGE_KEY = "rise_files_last_requested";

  class LastRequestedStorage {
    constructor() {
      this._isSupported = this._isLocalStorageSupported();
    }

    save( fileUrl, timestamp ) {
      if ( !this._isSupported ) {
        return;
      }

      if ( !fileUrl || !timestamp ) {
        return;
      }

      const map = this._getMap();

      map.set( fileUrl, timestamp );

      this._saveMap( map );
    }

    getTimestamp( fileUrl ) {
      if ( !this._isSupported || !fileUrl ) {
        return;
      }

      const map = this._getMap();

      return map.get( fileUrl )
    }

    _isLocalStorageSupported() {
      const test = "test";

      try {
        localStorage.setItem( test, test );
        localStorage.removeItem( test );
        return true;
      } catch ( e ) {
        return false;
      }
    }

    _getMap() {
      let map;

      try {
        map = new Map( JSON.parse( localStorage.getItem( LOCAL_STORAGE_KEY )));
      } catch ( e ) {
        console.warn( e ); // eslint-disable-line no-console
        map = new Map();
      }
      return map;
    }

    _saveMap( map ) {
      if ( !map || !( map instanceof Map )) {
        return;
      }

      localStorage.setItem( LOCAL_STORAGE_KEY, JSON.stringify( Array.from( map )));
    }
  }

  class StoreFiles extends CacheMixin( base ) {
    constructor() {
      super();

      this.lastRequestedStorage = new LastRequestedStorage();
      this.cacheConfig = Object.assign({}, CACHE_CONFIG );
    }

    getFile( fileUrl ) {
      return this._getCache( fileUrl ).then( cache => {
        return this._handleCachedFile( fileUrl, cache );
      }).catch(() => {
        return this._requestFile( fileUrl );
      })
    }

    _getCache( url ) {
      return super._getCache().then( cache => {
        return cache.match( url );
      }).then( response => {
        if ( response ) {
          return Promise.resolve( response );
        }
        return Promise.reject();
      }).catch(() => {
        return Promise.reject();
      })
    }

    _handleCachedFile( fileUrl, cache ) {
      let dateSinceModified = this.lastRequestedStorage.getTimestamp( fileUrl ),
        respToCache;

      return fetch( fileUrl, {
        headers: {
          "If-Modified-Since": `${dateSinceModified}`
        }
      })
        .then( resp => {
          if ( resp.status === 200 ) {
            respToCache = resp.clone();
            super.putCache( respToCache );

            let timestamp = new Date();

            this.lastRequestedStorage.save( fileUrl, timestamp.toUTCString());
            return this._getFileRepresentation( resp );
          } else if ( resp.status === 304 ) {
            return this._getFileRepresentation( cache );
          }
        })
        .catch( err => {
          console.error( "Error:", err );
        })
    }

    _requestFile( fileUrl ) {
      let respToCache;

      return fetch( fileUrl )
        .then( resp => {
          respToCache = resp.clone();
          return this._getFileRepresentation( resp );
        })
        .then( objectURL => {
          super.putCache( respToCache, fileUrl );
          return objectURL;
        })
        .catch(() => {
          // TODO: handle errors
        })
    }

    _getFileRepresentation( resp ) {
      return resp.blob().then( blob => {
        return URL.createObjectURL( blob );
      })
    }
  }

  return StoreFiles;
});
