/* eslint-disable no-console */

import { PolymerElement } from "@polymer/polymer";

import { CacheMixin } from "./cache-mixin.js";
import { config } from "./rise-common-component-config.js";
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

  static get COMPONENT_NAME() {
    return "rise-common-component";
  }

  static get CACHE_CONFIG() {
    return {
      name: RiseCommonComponent.COMPONENT_NAME
    };
  }

  static get LOGGER_CONFIG() {
    return {
      name: RiseCommonComponent.COMPONENT_NAME,
      id: this.id,
      version
    };
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
    super.initCache( RiseCommonComponent.CACHE_CONFIG );
    super.initLogger( RiseCommonComponent.LOGGER_CONFIG );

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
