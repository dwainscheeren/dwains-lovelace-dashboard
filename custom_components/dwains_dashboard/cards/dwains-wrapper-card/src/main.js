import { hass, provideHass } from "card-tools/src/hass";
import { createCard } from "card-tools/src/lovelace-element";

const bases = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases).then(() => {

  const LitElement = customElements.get('hui-masonry-view')
    ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))
    : Object.getPrototypeOf(customElements.get('hc-lovelace'));

  const html = LitElement.prototype.html;

  const css = LitElement.prototype.css;

  const NO_STYLE = `
  ha-card {
    background: none;
    box-shadow: none;
  }`;
  
  class DwainsWrapperCard extends LitElement {
    constructor() {
      super();
      provideHass(this);
    }

    static get properties() {
      return {
        hass: {},
      };
    }
    setConfig(config) {
      this._config = JSON.parse(JSON.stringify(config));
      if(config.style === undefined)
      {
        this._config.style = NO_STYLE;
      } else if (typeof(config.style) === "string") {
        this._config.style = NO_STYLE + config.style;
      } else if (config.style["."]) {
        this._config.style["."] = NO_STYLE + config.style["."];
      } else {
        this._config.style["."] = NO_STYLE;
      }

      this.card = createCard(this._config.card);
      this.card.hass = hass();
    }

    render() {
      return html`
        <style>
        ${this._config.style}
        </style>
        <div style="${this._config.css}">
        <ha-card>
          ${this.card}
        </ha-card>
        </div>
      `;
    }

    set hass(hass) {
      if(!this.card) return;
      this.card.hass = hass;
    }

    getCardSize() {
      if(this._config.report_size)
        return this._config.report_size;
      let ret = this.shadowRoot;
      if(ret) ret = ret.querySelector("ha-card card-maker");
      if(ret) ret = ret.getCardSize;
      if(ret) ret = ret();
      if(ret) return ret;
      return 1;
    }

  }

  if (!customElements.get("dwains-wrapper-card")) {
    customElements.define("dwains-wrapper-card", DwainsWrapperCard);
    const pjson = require('../package.json');
    console.info(
      `%c DWAINS-WRAPPER-CARD \n%c      Version ${pjson.version}      `,
      "color: #2fbae5; font-weight: bold; background: black",
      "color: white; font-weight: bold; background: dimgray"
    );
  }
});