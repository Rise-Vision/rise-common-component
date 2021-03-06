/* eslint-disable one-var */

import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin.js";

export const FetchMixin = dedupingMixin( base => {
  const FETCH_CONFIG = {
      retry: 1000 * 60,
      cooldown: 1000 * 60 * 10,
      refresh: 1000 * 60 * 60,
      avoidRetriesForStatusCodes: [],
      refreshFromCacheControlHeader: false,
      count: 5
    },
    fetchBase = LoggerMixin( base );

  class Fetch extends fetchBase {

    constructor() {
      super();

      this.fetchConfig = Object.assign({}, FETCH_CONFIG );

      this._url = null;
      this._requestRetryCount = 0;
      this._refreshDebounceJob = null;
      this._logDataReceived = true;
    }

    initFetch( fetchConfig, processData, processError ) {
      Object.assign( this.fetchConfig, fetchConfig );

      this.processData = processData;
      this.processError = processError;

      super.initCache && super.initCache({
        refresh: this.fetchConfig.refresh - (( this.fetchConfig.refresh > 10 * 1000 ) ? 5 * 1000 : 0 )
      });
    }

    fetch( url, headers ) {
      if ( !url ) {
        return;
      }

      this._url = url;
      this._headers = headers;
      this._requestRetryCount = 0;

      this._refresh( 0 );
    }

    _refresh( interval ) {
      this._refreshDebounceJob = Debouncer.debounce( this._refreshDebounceJob, timeOut.after( interval ), () => {
        this._getData();
      });
    }

    _tryGetCache() {
      if ( super.getCache ) {
        return super.getCache( this._url );
      } else {
        return Promise.reject();
      }
    }

    _getData() {
      return this._tryGetCache().then( resp => {
        this._logData( true );

        this._processData( Object.assign( resp, { isCached: true }));
      }).catch(( cachedResp ) => {
        cachedResp = cachedResp instanceof Response ? Object.assign( cachedResp, { isCached: true }) : null;

        this._requestData( cachedResp );
      });
    }

    _handleRejectedFetch( resp ) {
      const error = new Error( `Request rejected with status ${resp.status}: ${resp.statusText}` );

      error.status = resp.status;

      return resp.text().then( text => {
        error.responseText = text;

        throw error;
      });
    }

    _requestData( cachedResp ) {
      return fetch( this._url, this._headers ).then( resp => {
        if ( resp.ok ) {
          this._requestRetryCount = 0;
          this._logData( false );
          this._processData( resp.clone());

          super.putCache && super.putCache( resp );
        } else {
          return this._handleRejectedFetch( resp );
        }
      }).catch( err => {
        return super.isOffline().then( isOffline => {
          if ( this._requestRetryCount === 0 ) {
            cachedResp && this._processData( Object.assign( cachedResp, { isOffline }));
          }

          this._handleFetchError( Object.assign( err, { isOffline }));
        });
      });
    }

    _processData( resp ) {
      this.processData && this.processData( resp );

      const refreshInterval = this._getRefreshInterval( resp );

      this._refresh( refreshInterval );
    }

    _getRefreshInterval( resp ) {
      if ( resp && !resp.isCached && !resp.isOffline && this.fetchConfig.refreshFromCacheControlHeader ) {
        const header = resp.headers && resp.headers.get( "Cache-Control" );

        if ( header ) {
          const match = header.match( /max-age=(\d+)/ );

          if ( match ) {
            const expirationInSeconds = Number( match[ 1 ]) * 1000;
            const randomExtraInterval = Math.floor( Math.random() * this.fetchConfig.cooldown );

            return expirationInSeconds + randomExtraInterval;
          }
        }
      }

      return this.fetchConfig.refresh;
    }

    _logData( cached ) {
      if ( this._logDataReceived ) {
        this._logDataReceived = false;
        super.log( Fetch.LOG_TYPE_INFO, "data received", null, { cached });
      }
    }

    logTypeForFetchError() {
      return Fetch.LOG_TYPE_ERROR;
    }

    logFetchError( err ) {
      const details = this.eventDetailFor( err );

      if ( err && err.isOffline ) {
        super.log( Fetch.LOG_TYPE_WARNING, "client offline", null, details );
      } else {
        const eventType = this.logTypeForFetchError( err );
        const event = `request ${ eventType }`;

        super.log( eventType, event, { errorCode: "E000000037" }, details );
      }
    }

    _handleFetchError( err ) {
      if ( this._shouldRetryFor( err )) {
        this._requestRetryCount += 1;

        this._refresh( this.fetchConfig.retry );
      } else {
        this._requestRetryCount = 0;

        this.logFetchError( err );

        this.processError && this.processError( err );

        this._refresh( this.fetchConfig.cooldown );
      }
    }

    eventDetailFor( error ) {
      const detail = { error: error && error.message ? error.message : null };

      if ( error && error.status ) {
        detail.status = error.status;
      }

      if ( error && error.responseText ) {
        detail.responseText = error.responseText;
      }

      return detail;
    }

    _shouldRetryFor( error ) {
      if ( error && !error.isOffline && error.status &&
          this.fetchConfig.avoidRetriesForStatusCodes.includes( error.status )) {
        return false;
      }

      return this._requestRetryCount < this.fetchConfig.count;
    }

  }

  return Fetch;
});
