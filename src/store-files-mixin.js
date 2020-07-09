import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { CacheMixin } from "./cache-mixin.js";

export const StoreFilesMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
    name: "store-files-mixin"
  };

  class StoreFiles extends CacheMixin( base ) {
    constructor() {
      super();

      this.cacheConfig = Object.assign({}, CACHE_CONFIG );
    }

    getFile( fileUrl ) {
      return this._getCacheCustom( fileUrl ).then( cache => {
        return this._getFileRepresentation( cache );
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
        });
    }

    _getFileRepresentation( resp ) {
      return resp.blob().then( blob => {
        return URL.createObjectURL( blob );
      });
    }
  }

  return StoreFiles;
});
