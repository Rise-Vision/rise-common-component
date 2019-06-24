/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";

import { CacheMixin } from "./cache-mixin.js";
import { version } from "./rise-common-component-version.js";

export class RiseCommonComponent extends CacheMixin( PolymerElement ) {

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
  }

  ready() {
    super.ready();

    const name = this.tagName.toLowerCase();

    super.initCache({
      name
    });
    super.initLogger({
      name,
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

}

customElements.define( "rise-common-component", RiseCommonComponent );
