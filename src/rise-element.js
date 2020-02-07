import { PolymerElement } from "@polymer/polymer";
import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";

import { LoggerMixin } from "./logger-mixin.js";
import { version } from "./rise-element-version.js";


export const RiseElementMixin = dedupingMixin( base => {

    const riseElementBase = LoggerMixin( base );

    class riseElement extends riseElementBase {

      static get properties() {
        return {
        /**
         * Component version; should override when implementing
         */
          version: {
            type: String,
            value: version,
            readOnly: true
          }
        }
      }

      // Event name constants
      static get EVENT_CONFIGURED() {
        return "configured";
      }
      static get EVENT_START() {
        return "start";
      }
      static get EVENT_DATA_UPDATE() {
        return "data-update";
      }
      static get EVENT_DATA_ERROR() {
        return "data-error";
      }
      static get EVENT_REQUEST_ERROR() {
        return "request-error";
      }
      static get EVENT_CLIENT_OFFLINE() {
        return "client-offline"
      }

      // General constants
      static get STORAGE_PREFIX() {
        return "https://storage.googleapis.com/";
      }

      constructor() {
        super();

        this._uptimeError = false;
      }

      connectedCallback() {
        super.connectedCallback();
        this._uptimeHandler = this._handleUptimeRequest.bind( this );
        window.addEventListener( "component-uptime-request", this._uptimeHandler );
      }

      disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener( "component-uptime-request", this._uptimeHandler );
      }

      ready() {
        super.ready();

        super.initLogger({
          name: this.tagName.toLowerCase(),
          id: this.id,
          version: this.version
        });

        if ( RisePlayerConfiguration.isConfigured()) {
          this._init();
        } else {
          const init = () => this._init();

          window.addEventListener( "rise-components-ready", init, { once: true });
        }
      }

      isOffline() {
        return new Promise(( resolve ) => {
          fetch( "https://widgets.risevision.com", { method: "HEAD" })
            .then(() => {
              resolve( false );
            }).catch(() => {
              resolve( true );
            });
        });
      }

      _init() {
        this.addEventListener( RiseElement.EVENT_START, this._handleStart, { once: true });

        this._sendEvent( RiseElement.EVENT_CONFIGURED );
      }

      _sendEvent( eventName, detail = {}) {
        const event = new CustomEvent( eventName, {
          bubbles: true, composed: true, detail
        });

        this.dispatchEvent( event );
      }

      _handleStart() {
        super.log( riseElement.LOG_TYPE_INFO, "start received" );
      }

      _handleUptimeRequest() {
        window.dispatchEvent( new CustomEvent( "component-uptime-result", {
          detail: {
            component_id: this.id,
            component_type: this.tagName.toLowerCase(),
            error: this._uptimeError
          }
        }));
      }

      _setUptimeError( value ) {
        this._uptimeError = value;
      }

      _sendDoneEvent( done ) {
        this._sendEvent( "report-done", { done });
      }

    }

    return riseElement;
  }),
  RiseElement = RiseElementMixin( PolymerElement );

if ( !customElements.get( "rise-element" )) {
  customElements.define( "rise-element", RiseElement );
}
