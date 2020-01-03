import { html } from "lit-element";

import { RiseLitElement } from "../../../src/rise-element.js";

export default class RiseTestElement extends RiseLitElement {

  render() {
    return html`${ this.value }`;
  }

  static get properties() {
    return {
      value: {
        type: String
      }
    }
  }

  constructor() {
    super();

    this.version = "200";
  }
}

customElements.define( "rise-test-element", RiseTestElement );
