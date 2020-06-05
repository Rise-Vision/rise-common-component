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
      return super.getCache( fileUrl ).then( resp => {
        return this._handleCachedFile( resp );
      }).catch(() => {
        return this._requestFile( fileUrl );
      })
    }

    _handleCachedFile( resp ) {
      console.log( "file is cached:", resp );
      // TODO: Check file version and update it if needed and return it.
    }

    _requestFile( fileUrl ) {
      return fetch( fileUrl ).then( resp => {
        console.log( "resp", resp );
      }).catch( err => {
        console.log( "handling error", err );
        // TODO: handle errors
      })
    }

  }

  return StoreFiles;
});
