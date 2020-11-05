import { hass } from "card-tools/src/hass";
import { createCard } from "card-tools/src/lovelace-element";

const bases = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases).then(() => {

  const LitElement = customElements.get('hui-masonry-view')
    ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))
    : Object.getPrototypeOf(customElements.get('hc-lovelace'));

  const html = LitElement.prototype.html;

  const css = LitElement.prototype.css;

  class DwainsHashSwitchCard extends LitElement {
    constructor() {
      super();
    }

    static get properties() {
      return {
        hass: {},
        state: {},
      };
    }

    setConfig(config) {
      this._config = config;
  
      this.state = undefined;
      this.classList.add('no-match');
      this.cards = {};
      for(let k in config.states) {
        this.cards[k] = createCard(config.states[k]);
        this.cards[k].hass = hass();
      }
  
      window.addEventListener("location-changed", () => this.updated(new Map()));
    }
  
    update_state() {
      let newstate = undefined;
      
      newstate = location.hash.substr(1);
      
      if (newstate === undefined || !this.cards.hasOwnProperty(newstate))
        newstate = this._config.default;
      this.state = newstate;
    }
  
    updated(changedProperties) {
      if(changedProperties.has("hass"))
        for(let k in this.cards)
          this.cards[k].hass = this.hass;
  
      if(!changedProperties.has("state")) {
        this.update_state();
      } else {
        const oldState = changedProperties.get("state");
        if(this.cards[oldState]) {
          this.cards[oldState].classList.remove("visible");
          this.cards[oldState].classList.add("out");
          window.setTimeout(() => {
            this.cards[oldState].classList.remove("out");
          }, this._config.transition_time || 500);
        }
        if(this.cards[this.state]) {
          this.cards[this.state].classList.add("visible");
          this.classList.remove('no-match');
        } else {
          this.classList.add('no-match');
        }
      }
    }
  
    render() {
      return html`
      <div
        id="root"
      >
        ${Object.keys(this.cards).map((k) =>
          html`
            ${this.cards[k]}
          `)}
      </div>
      `;
    }
  
    getCardSize() {
      let sz = 1;
      for(let k in this.cards) {
        if(this.cards[k] && this.cards[k].getCardSize)
          sz = Math.max(sz, this.cards[k].getCardSize());
      }
      return sz;
    }
  
    static get styles() {
      return css`
        :host {
          perspective: 1000px;
        }
        :host(.no-match) {
          display: none;
        }
        #root * {
          display: none;
        }
        #root .visible {
          display: block;
        }
      `;
    }
  }

  if (!customElements.get("dwains-hash-switch-card")) {
    customElements.define("dwains-hash-switch-card", DwainsHashSwitchCard);
    const pjson = require('../package.json');
    console.info(
      `%c DWAINS-HASH-SWITCH-CARD \n%c      Version ${pjson.version}      `,
      "color: #2fbae5; font-weight: bold; background: black",
      "color: white; font-weight: bold; background: dimgray"
    );
  }
});