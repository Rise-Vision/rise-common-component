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
      return super.getCache( fileUrl ).then( cache => {
        console.log('CACHED');
        return this._handleCachedFile( fileUrl, cache );
      }).catch(() => {
        console.log('REQUESTED');        
        return this._requestFile( fileUrl );
      })
    }

    _handleCachedFile( fileUrl, cache ) {
      console.log( "cache", cache );
      let dateSinceModified = 1561661041,
        respToCache;

      // return fetch( fileUrl )
      return fetch( fileUrl, {
          headers: {
            "If-Modified-Since": dateSinceModified
          },
          mode: "cors" 
        } )
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
          console.error( "", err );
        })
      // TODO: send if-match-since request
      // TODO:   check response.status
      // TODO:     handle 200 status code
      // TODO:       putCache
      // TODO:       _getFileRepresentation
      // TODO:     handle 300 status code
      // TODO:       _getFileRepresentation
    }

    _requestFile( fileUrl ) {
      let respToCache;

      return fetch( fileUrl )
        .then( resp => {
          respToCache = resp.clone();
          return this._getFileRepresentation( resp );
        })
        .then( objectURL => {
          super.putCache( respToCache );
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

    _getCacheCustom() {
      if ( this._caches ) {
        let _cache;

        return this._getCache().then( cache => {
          _cache = cache;
          return cache.match( this.getCacheRequestKey( url ));
        })
      } else {
        return Promise.reject();
      }
    }

  }

  }

  return StoreFiles;
});
