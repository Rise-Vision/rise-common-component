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
      static get EVENT_READY() {
        return "rise-components-ready";
      }
      static get EVENT_RISE_PRESENTATION_PLAY() {
        return "rise-presentation-play"
      }
      static get EVENT_RISE_PRESENTATION_STOP() {
        return "rise-presentation-stop"
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

        if ( RisePlayerConfiguration
        && RisePlayerConfiguration.Viewer
        && RisePlayerConfiguration.Viewer.startEndpointApplicationHeartbeats ) {
          RisePlayerConfiguration.Viewer.startEndpointApplicationHeartbeats({
            componentId: this.id,
            eventApp: this.tagName.toLowerCase(),
            eventAppVersion: this.version
          });
        }

        this._init();

        RisePlayerConfiguration.Helpers.getComponentAsync( this );

        this._sendEvent( RiseElement.EVENT_CONFIGURED );
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
        this.addEventListener( RiseElement.EVENT_RISE_PRESENTATION_PLAY, this._handleRisePresentationPlay );
        this.addEventListener( RiseElement.EVENT_RISE_PRESENTATION_STOP, this._handleRisePresentationStop );
      }

      _sendEvent( eventName, detail = {}) {
        const event = new CustomEvent( eventName, {
          bubbles: true, composed: true, detail
        });

        this.dispatchEvent( event );
      }

      _sendReadyEvent() {
        this._sendEvent( RiseElement.EVENT_READY );
      }

      _handleStart( event, skipReady ) {
        super.log( riseElement.LOG_TYPE_INFO, "start received" );

        if ( !skipReady ) {
          this._sendReadyEvent();
        }
      }

      _handleRisePresentationPlay() {
      }

      _handleRisePresentationStop() {
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
