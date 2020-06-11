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

      if ( !fileUrl || !timestamp || typeof timestamp !== "number" ) {
        return;
      }

      const map = this._getMap();

      map.set( fileUrl, timestamp );

      this._saveMap( map );
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

      this.cacheConfig = Object.assign({}, CACHE_CONFIG );
      this.lastRequestedStorage = new LastRequestedStorage();
    }

    getFile( fileUrl ) {
      return super.getCache( fileUrl ).then(() => {
        return this._handleCachedFile();
      }).catch(() => {
        return this._requestFile( fileUrl );
      })
    }

    _handleCachedFile() {
      // TODO: Check file version and update it if needed and return it.
    }

    _requestFile( fileUrl ) {
      let response;

      return fetch( fileUrl )
        .then( resp => {
          response = resp.clone();
          return resp.blob();
        })
        .then( blob => {
          return URL.createObjectURL( blob );
        })
        .then( objectURL => {
          super.putCache( response );
          return objectURL;
        })
        .catch(() => {
          // TODO: handle errors
        })
    }

  }

  return StoreFiles;
});
