import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { CacheMixin } from "./cache-mixin.js";

export const StoreFilesMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
    name: "store-files-mixin",
    refresh: 1000 * 60 * 60 * 2,
    expiry: 1000 * 60 * 60 * 4
  };
  let isFileDeleted = false;

  class StoreFiles extends CacheMixin( base ) {
    constructor() {
      super();

      this.cacheConfig = Object.assign({}, CACHE_CONFIG );
    }

    getFile( fileUrl ) {
      return this._getCacheCustom( fileUrl ).then( cache => {
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
      return this._isCachedFileRelevant( fileUrl, cache ).then( isCacheRelevant => {
        if ( isCacheRelevant ) {
          return this._getFileRepresentation( cache );
        } else {
          return isFileDeleted ? null : this._requestFile( fileUrl )
        }
      })
    }

    _isCachedFileRelevant( fileUrl, cachedResponse ) {
      return fetch( fileUrl, {
        method: "HEAD"
      }).then( resp => {
        if ( resp.status === 404 ) {
          return super.getCacheByName().then( cache => {
            return cache.delete( fileUrl ).then(() => {
              isFileDeleted = true;
              return false;
            })
          })
        }
        if ( resp.ok ) {
          return cachedResponse.headers.get( "etag" ) === resp.headers.get( "etag" );
        } else {
          return true;
        }
      }).catch( err => {
        super.log( StoreFiles.LOG_TYPE_ERROR, "Failed to check file relevancy", { url: fileUrl, err }, StoreFiles.LOG_AT_MOST_ONCE_PER_DAY );
        return true;
      });
    }

    _requestFile( fileUrl ) {
      let respToCache;

      return fetch( fileUrl )
        .then( resp => {
          if ( resp.ok ) {
            respToCache = resp.clone();
            return this._getFileRepresentation( resp );
          } else {
            return Promise.reject();
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
