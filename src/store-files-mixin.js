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
      if ( this._checkInCache( fileUrl )) {
        return this._getCachedFile( fileUrl );
      } else {
        return this._requestFile( fileUrl );
      }
    }

    _getCachedFile( fileUrl ) {
      console.log( "fileUrl", fileUrl );
      // TODO: Check file version and update it if needed functionality.
    }

    _checkInCache( fileUrl ) {
      console.log( "fileUrl", fileUrl );
      // TODO: Check file in cache
    }

    _requestFile( fileUrl ) {
      console.log( "fileUrl", fileUrl );
      // TODO: fetch file
    }

  }

  return StoreFiles;
});
