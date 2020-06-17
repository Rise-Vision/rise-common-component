import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { CacheMixin } from "./cache-mixin.js";

export const StoreFilesMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
    name: "store-files-mixin",
    refresh: 1000 * 60 * 60 * 2,
    expiry: 1000 * 60 * 60 * 4
  };

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
      let respToCache,
        etag = cache.headers.get( "etag" );

      return fetch( fileUrl, {
        headers: {
          "If-None-Match": `${etag}`
        }
      })
        .then( resp => {
          if ( resp.status === 200 ) {
            respToCache = resp.clone();
            super.putCache( respToCache );
            return this._getFileRepresentation( resp );
          } else if ( resp.status === 304 ) {
            return this._getFileRepresentation( cache );
          }
        })
        .catch( err => {
          console.error( "Error :", err );
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
        .catch( err => {
          super.log( StoreFiles.LOG_TYPE_ERROR, "Failed to get file from storage", { url: fileUrl, err }, StoreFiles.LOG_AT_MOST_ONCE_PER_DAY );
          Promise.reject( err );
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
