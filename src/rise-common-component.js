/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";

import { CacheMixin } from "./cache-mixin.js";
import { version } from "./rise-common-component-version.js";

class RiseCommonComponent extends CacheMixin( PolymerElement ) {

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

    if ( RisePlayerConfiguration.isConfigured()) {
      this._init();
    } else {
      const init = () => this._init();

      window.addEventListener( "rise-components-ready", init, { once: true });
    }
  }

  _init() {
    const name = this.tagName.toLowerCase();
    super.initCache({
      name
    });
    super.initLogger({
      name,
      id: this.id,
      version
    });

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
