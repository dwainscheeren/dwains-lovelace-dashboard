import { hass } from "card-tools/src/hass";
import { moreInfo } from "card-tools/src/more-info";
import { styleMap } from 'lit-html/directives/style-map.js';
import {classMap} from 'lit-html/directives/class-map.js';
import { css, html, LitElement } from 'lit-element';
import { 
  UNAVAILABLE,
  UNAVAILABLE_STATES,
 } from './variables'

const bases2 = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases2).then(() => {

  // const LitElement = customElements.get('hui-masonry-view')
  //   ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))
  //   : Object.getPrototypeOf(customElements.get('hc-lovelace'));

  //const html = LitElement.prototype.html;

  //const css = LitElement.prototype.css;

  //const stylemap = LitElement.prototype.styleMap;

  const cardHelpers = window.loadCardHelpers()
    ? window.loadCardHelpers()
    : undefined;

  class DwainsLightCard extends LitElement {
    static get styles() {
      return css`
        .flex {
          display: flex;
        }
        .font-semibold {
          font-weight: 600;
        }
        h1, h2, h3, h4, h5, h6 {
          font-size: inherit;
        }
        blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
          margin: 0;
        }
        .p-2 {
          padding: 0.5rem;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .space-x-2>:not([hidden])~:not([hidden]) {
          --tw-space-x-reverse: 0;
          margin-right: calc(0.5rem * var(--tw-space-x-reverse));
          margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
        }
        .capitalize {
            text-transform: capitalize;
        }
        .ha-icon ha-icon {
          display: inline-block;
          margin: auto;
          --mdc-icon-size: 100% !important;
          --iron-icon-width: 100% !important;
          --iron-icon-height: 100% !important;
        }
        .light-button {
          color: var(--paper-item-icon-color, #44739e);
          box-sizing: border-box;
          padding: 0.75rem;
          background-color: var(--secondary-background-color);
          border-radius: 999px;
        }
        .light-button ha-state-icon {
          display: inline-block;
          margin: auto;
          --mdc-icon-size: 100% !important;
          --iron-icon-width: 100% !important;
          --iron-icon-height: 100% !important;
          width: 1.5rem;
          height: 1.5rem;
        }
  
        .light-button.state-on {
          color: var(--paper-item-icon-active-color, #fdd835);
        }
  
        .light-button.state-unavailable {
          color: var(--state-icon-unavailable-color);
        }
        .information {
          line-height: 1.10;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .information .state {
          font-size: 0.9rem;
          line-height: 1.25rem;
          color: var(--paper-item-body-secondary-color, var(--secondary-text-color));
        }
      `
    }

    static get properties() {
      return {
        hass: {},
      }
    }

    setConfig(config) {
      if (!config.entity || config.entity.split(".")[0] !== "light") {
        throw new Error("Specify an entity from within the light domain");
      }
      
      this.hass = hass();
      this._config = config;
      this.friendly_name = config.friendly_name ? config.friendly_name : false;
    }
    _lightSupportsDimming(){
      return true;
    }
    _computeBrightness(stateObj) {
      if (stateObj.state === "off" || !stateObj.attributes.brightness) {
        return "";
      }
      const brightness = stateObj.attributes.brightness;
      return `brightness(${(brightness + 245) / 5}%)`;
    }
    _computeColor(stateObj) {
      if (stateObj.state === "off") {
        return "";
      }
      return stateObj.attributes.rgb_color
        ? `rgb(${stateObj.attributes.rgb_color.join(",")})`
        : "";
    }
    _setBrightness(e) {
      this.hass.callService("light", "turn_on", {
        entity_id: this._config.entity,
        brightness_pct: e.detail.value,
      });
    }
    _toggleLight(ev){
      
      this.hass.callService("light", "toggle", {
        entity_id: this._config.entity,
      });
    }
    _handleMoreInfo(ev){
      moreInfo(this._config.entity);
    }
    render() {
      if (!this.hass || !this._config) {
        return html``;
      }
      const stateObj = this.hass.states[this._config.entity];

      if (!stateObj) {
        return html`
          <hui-warning>
          ${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity || "[empty]"
          )}
          </hui-warning>
        `;
      }

      const brightness =
        Math.round((stateObj.attributes.brightness / 255) * 100) || 0;
        
      const name = this.friendly_name ? this.friendly_name : (stateObj.attributes.friendly_name === undefined ? (stateObj.entity_id).replace(/_/g, " ") : stateObj.attributes.friendly_name);

      const brightnessInfo = (brightness != 0) ? ", " + brightness + "%": "";
      const state = stateObj.state === "on" ? this.hass.localize("state.default."+stateObj.state) + brightnessInfo : this.hass.localize("state.default."+stateObj.state);

      return html`
      <ha-card class="p-2">
        <div class="flex space-x-2">
          <div>
            <div
              class="cursor-pointer light-button ${classMap({
                "state-on": stateObj.state === "on",
                "state-unavailable": stateObj.state === UNAVAILABLE,
              })}"
              .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
              @click=${this._toggleLight}
              tabindex="0"
            >
              <ha-state-icon
                .icon=${this._config.icon}
                .state=${stateObj}
                style=${styleMap({
                  filter: this._computeBrightness(stateObj),
                  color: this._computeColor(stateObj),
                })}
              ></ha-state-icon>
            </div>
          </div>
          <div class="cursor-pointer information" @click=${this._handleMoreInfo}>
            <h1 class="font-semibold">${name}</h1>
            <span class="state">${state}</span>
          </div>
        </div>
      </ha-card>
      `;
    }
  }
  customElements.define("dwains-light-card", DwainsLightCard);
});
