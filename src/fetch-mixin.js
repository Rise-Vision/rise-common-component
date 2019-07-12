import { timeOut } from "@polymer/polymer/lib/utils/async.js";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce.js";
import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LoggerMixin } from "./logger-mixin.js";

export const FetchMixin = dedupingMixin( base => {
  const FETCH_CONFIG = {
      retry: 1000 * 60,
      cooldown: 1000 * 60 * 10,
      refresh: 1000 * 60 * 60,
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
      return this._tryGetCache( this._url ).then( resp => {
        this._logData( true );

        this._processData( resp );
      }).catch(() => {
        this._requestData();
      });
    }

    _requestData() {
      return fetch( this._url, this._headers ).then( resp => {
        if ( resp.ok ) {
          this._logData( false );
          this._processData( resp.clone());

          super.putCache && super.putCache( resp );
        } else {
          throw new Error( `Request rejected with status ${resp.status}: ${resp.statusText}` );
        }
      }).catch( this._handleFetchError.bind( this ));
    }

    _processData( resp ) {
      this.processData && this.processData( resp );

      this._refresh( this.fetchConfig.refresh );
    }

    _logData( cached ) {
      if ( this._logDataReceived ) {
        this._logDataReceived = false;
        super.log( "info", "data received", { cached });
      }
    }

    _handleFetchError( err ) {
      if ( this._requestRetryCount < this.fetchConfig.count ) {
        this._requestRetryCount += 1;

        this._refresh( this.fetchConfig.retry );
      } else {
        this._requestRetryCount = 0;

        super.log( "error", "request error", { error: err ? err.message : null });

        this.processError && this.processError();

        this._refresh( this.fetchConfig.cooldown );
      }
    }

  }

  return Fetch;
})
