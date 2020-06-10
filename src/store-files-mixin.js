import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { CacheMixin } from "./cache-mixin.js";

export const StoreFilesMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
    name: "store-files-mixin",
    refresh: 1000 * 60 * 60 * 2,
    expiry: 1000 * 60 * 60 * 4
  }

  class StoreFiles extends CacheMixin( base ) {
    constructor() {
      super();

      this.cacheConfig = Object.assign({}, CACHE_CONFIG );
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
        .then(() => {
          super.putCache( response );
        })
        .catch(() => {
          // TODO: handle errors
        })
    }

  }

  return StoreFiles;
});
