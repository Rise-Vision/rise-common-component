/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";

import { LoggerMixin } from "./logger-mixin.js";
import { version } from "./rise-common-component-version.js";

export class RiseCommonComponent extends LoggerMixin( PolymerElement ) {

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

  _init() {
    this.addEventListener( RiseCommonComponent.EVENT_START, this._handleStart, { once: true });

    this._sendEvent( RiseCommonComponent.EVENT_CONFIGURED );
  }

  _sendEvent( eventName, detail = {}) {
    const event = new CustomEvent( eventName, {
      bubbles: true, composed: true, detail
    });

    this.dispatchEvent( event );
  }

  _handleStart() {
    super.log( "info", "start received" );
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

}

customElements.define( "rise-common-component", RiseCommonComponent );
