import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { CacheMixin } from "./cache-mixin.js";

export const StoreFilesMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
      name: "store-files-mixin",
      refresh: 1000 * 60 * 60 * 2,
      expiry: 1000 * 60 * 60 * 4
    },
    LOCAL_STORAGE_KEY = "rise_files_last_requested",
    FILE_STATUS_CHECK_EXPIRY = 10,
    deletedFileStatusCodes = [ 401, 403, 404 ],
    fileStatuses = {
      fresh: "fresh",
      stale: "stale",
      deleted: "deleted"
    };

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

    getFile( fileUrl, omitCheckingCachedStatus = false ) {
      return this._getCacheCustom( fileUrl ).then( cache => {
        if ( omitCheckingCachedStatus ) {
          return Promise.resolve( this._getFileRepresentation( cache ));
        }

        return this._handleCachedFile( fileUrl, cache );
      }).catch(() => {
        return this._requestFile( fileUrl );
      })
    }

    _getCacheCustom( url ) {
      return super.getCacheByName().then( cache => {
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
      return this._getFileStatus( fileUrl, cache ).then( isCacheRelevant => {
        switch ( isCacheRelevant ) {
        case fileStatuses.fresh:
          return this._getFileRepresentation( cache );
        case fileStatuses.stale:
          return this._requestFile( fileUrl )
        case fileStatuses.deleted:
        default:
          return null;
        }
      })
    }

    _hasFileStatusCheckExpired( fileUrl ) {
      const date = this.lastRequestedStorage.getTimestamp( fileUrl );

      if ( !date ) {
        // nothing stored, return as if expired
        return true;
      }

      try {
        const lastRequestedDate = new Date( date );

        return Math.floor(( Date.now() - lastRequestedDate.getTime()) / 1000 / 60 ) > FILE_STATUS_CHECK_EXPIRY;
      } catch ( err ) {
        console.warn( "could not calculate file status check expiry", err );
        return true;
      }
    }

    _getUrlWithCacheBuster( url ) {
      const str = url.split( "?" ),
        separator = ( str.length === 1 ) ? "?" : "&";

      return `${url}${separator}cb=${Date.now()}`;
    }

    _getFileStatus( fileUrl, cachedResponse ) {
      if ( !this._hasFileStatusCheckExpired( fileUrl )) {
        return Promise.resolve( fileStatuses.fresh );
      }

      return fetch( this._getUrlWithCacheBuster( fileUrl ), {
        method: "HEAD"
      }).then( resp => {
        if ( resp.ok ) {
          return cachedResponse.headers.get( "etag" ) === resp.headers.get( "etag" ) ? fileStatuses.fresh : fileStatuses.stale;
        } else {
          if ( deletedFileStatusCodes.includes( resp.status )) {
            return fileStatuses.deleted;
          }

          super.log( StoreFiles.LOG_TYPE_WARNING, "File status request error", { url: fileUrl, err: resp.statusText }, StoreFiles.LOG_AT_MOST_ONCE_PER_DAY );

          return fileStatuses.fresh;
        }
      }).catch( err => {
        super.log( StoreFiles.LOG_TYPE_WARNING, "Failed to check file status", { url: fileUrl, err }, StoreFiles.LOG_AT_MOST_ONCE_PER_DAY );
        return fileStatuses.fresh;
      })
        .finally(() => this.lastRequestedStorage.save( fileUrl, new Date().toUTCString()));
    }

    _requestFile( fileUrl ) {
      let respToCache;

      return fetch( fileUrl )
        .then( resp => {
          if ( resp.ok ) {
            respToCache = resp.clone();
            return this._getFileRepresentation( resp );
          } else {
            return Promise.reject( resp.statusText );
          }
        })
        .then( objectURL => {
          super.putCache( respToCache, fileUrl );
          return objectURL;
        })
        .catch( err => {
          super.log( StoreFiles.LOG_TYPE_ERROR, "Failed to get file from storage", { url: fileUrl, err }, StoreFiles.LOG_AT_MOST_ONCE_PER_DAY );
          return err;
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
