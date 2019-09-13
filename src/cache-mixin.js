import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin.js";

export const CacheMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
      name: "cache-mixin",
      refresh: 1000 * 60 * 60 * 2,
      expiry: 1000 * 60 * 60 * 4
    },
    cacheBase = LoggerMixin( base );

  class Cache extends cacheBase {
    constructor() {
      super();

      this.cacheConfig = Object.assign({}, CACHE_CONFIG );
    }

    initCache( cacheConfig ) {
      Object.assign( this.cacheConfig, cacheConfig );

      this._deleteExpiredCache();
    }

    _getCache() {
      if ( window.caches && window.caches.open ) {
        return caches.open( this.cacheConfig.name );
      } else {
        super.log( "warning", "cache API not available" );

        return Promise.reject();
      }
    }

    _isResponseExpired( response, expiration ) {
      if ( expiration === -1 ) {
        return false;
      } else {
        const date = response && response.headers && new Date( response.headers.get( "date" ));

        return !date || ( Date.now() > date.getTime() + expiration );
      }
    }

    _deleteExpiredCache() {
      this._getCache().then( cache => {
        cache.keys().then( keys => {
          keys.forEach( key => {
            cache.match( key ).then( response => {
              if ( this._isResponseExpired( response, this.cacheConfig.expiry )) {
                cache.delete( key );
              }
            });
          });
        });
      });
    }

    putCache( res, url ) {
      return this._getCache().then( cache => {
        return cache.put( res.url || url, res );
      }).catch( err => {
        super.log( "warning", "cache put failed", { url: res.url || url, err });
      });
    }

    getCache( url ) {
      var _cache;

      return this._getCache().then( cache => {
        _cache = cache;
        return cache.match( url );
      }).then( response => {
        if ( !this._isResponseExpired( response, this.cacheConfig.refresh )) {
          return Promise.resolve( response );
        } else if ( !this._isResponseExpired( response, this.cacheConfig.expiry )) {
          return Promise.reject( response );
        } else {
          response && _cache.delete( url );

          return Promise.reject();
        }
      });
    }
  }

  return Cache;
});
