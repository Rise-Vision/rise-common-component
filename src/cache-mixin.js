import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin.js";

export const CacheMixin = dedupingMixin( base => {
  const CACHE_CONFIG = {
      name: "cache-mixin",
      refresh: 1000 * 60 * 60 * 2,
      expiry: 1000 * 60 * 60 * 4
    },
    cacheBase = LoggerMixin( base );

  class LocalStorageFallback {
    open( namespace ) {
      const getFullKey = key => {
          return namespace + key;
        },
        tryParse = text => {
          try {
            return JSON.parse( text );
          } catch ( e ) {
            return {};
          }
        },
        responseToCache = response => {
          const cacheObject = {
            headers: [],
            status: response.status,
            statusText: response.statusText,
            url: response.url
          };

          response.headers.forEach(( val, key ) => {
            cacheObject.headers.push([ key, val ]);
          })

          return response.clone().text().then( text => {
            cacheObject.text = text;

            return JSON.stringify( cacheObject );
          });
        },
        cacheToResponse = text => {
          const cacheObject = tryParse( text ),
            init = {
              status: cacheObject.status,
              statusText: cacheObject.statusText,
              headers: cacheObject.headers
            },
            response = new Response( new Blob([ cacheObject.text ]), init );

          if ( cacheObject.url ) {
            Object.defineProperty( response, "url", { value: cacheObject.url });
          }

          return response;
        },
        cacheMock = {
          keys: () => {
            const keys = [];

            for ( let i = 0, len = localStorage.length; i < len; ++i ) {
              if ( localStorage.key( i ).startsWith( namespace )) {
                const key = localStorage.key( i ).slice( namespace.length );

                keys.push( key );
              }
            }

            return Promise.resolve( keys );
          },
          match: ( key ) => {
            const item = localStorage.getItem( getFullKey( key ));

            if ( item ) {
              let response = cacheToResponse( item );

              return Promise.resolve( response );
            } else {
              return Promise.resolve();
            }
          },
          delete: ( key ) => {
            localStorage.removeItem( getFullKey( key ));
          },
          put: ( key, value ) => {
            responseToCache( value ).then( text => {
              localStorage.setItem( getFullKey( key ), text );
            });
          }
        };

      return Promise.resolve( cacheMock );
    }
  }

  class Cache extends cacheBase {
    constructor() {
      super();

      this.cacheConfig = Object.assign({}, CACHE_CONFIG );

      if ( window.caches && window.caches.open ) {
        this._caches = window.caches;
      } else if ( window.localStorage ) {
        this._caches = new LocalStorageFallback();
      }
    }

    initCache( cacheConfig ) {
      Object.assign( this.cacheConfig, cacheConfig );

      this._deleteExpiredCache();
    }

    _getCacheStorage() {
      if ( this._caches ) {
        if ( !( window.caches && window.caches.open )) {
          super.log( Cache.LOG_TYPE_WARNING, "cache API not available", {}, Cache.LOG_AT_MOST_ONCE_PER_DAY );
        }

        return this._caches.open( this.cacheConfig.name );
      } else {
        super.log( Cache.LOG_TYPE_WARNING, "localStorage fallback API not available", {}, Cache.LOG_AT_MOST_ONCE_PER_DAY );

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
      if ( this._caches ) {
        this._getCacheStorage().then( cache => {
          return cache.keys().then( keys => {
            keys.forEach( key => {
              cache.match( key ).then( response => {
                if ( response && this._isResponseExpired( response, this.cacheConfig.expiry )) {
                  cache.delete( key );
                }
              });
            });
          });
        });
      }
    }

    /*
     The intention of getCacheRequestKey and getCacheResponseKey functions below is they can be overridden by a component to customize
     the key for a cache entry. The main purpose of using this is when you want to pair a response with a custom string
     instead of request url
     */
    getCacheRequestKey( url ) {
      return url;
    }

    getCacheResponseKey( response ) {
      return response.url || null;
    }

    putCache( response, url ) {
      if ( this._caches ) {
        return this._getCacheStorage().then( cache => {
          return cache.put( this.getCacheResponseKey( response ) || url, response );
        }).catch( err => {
          super.log( Cache.LOG_TYPE_WARNING, "cache put failed", { url: response.url || url, err }, Cache.LOG_AT_MOST_ONCE_PER_DAY );
        });
      } else {
        return Promise.resolve();
      }
    }

    getCache( url ) {
      if ( this._caches ) {
        let _cache;

        return this._getCacheStorage().then( cache => {
          _cache = cache;
          return cache.match( this.getCacheRequestKey( url ));
        }).then( response => {
          if ( !this._isResponseExpired( response, this.cacheConfig.refresh )) {
            return Promise.resolve( response );
          } else if ( !this._isResponseExpired( response, this.cacheConfig.expiry )) {
            return Promise.reject( response );
          } else if ( _cache ) {
            response && _cache.delete( url );
            return Promise.reject();
          } else {
            return Promise.reject();
          }
        });
      } else {
        return Promise.reject();
      }
    }
  }

  return Cache;
});
