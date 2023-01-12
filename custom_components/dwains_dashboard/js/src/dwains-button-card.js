import { hass } from "card-tools/src/hass";
import { moreInfo } from "card-tools/src/more-info";
import { fireEvent } from "card-tools/src/event";
import {
  computeStateDisplay,
  computeStateDomain,
  computeDomain
} from 'custom-card-helpers';
import { styleMap } from 'lit-html/directives/style-map.js';
import { css, html, LitElement } from 'lit-element';
import { 
  STATES_OFF,
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

  class DwainsButtonCard extends LitElement {
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
      .icon ha-state-icon {
        display: inline-block;
        margin: auto;
        --mdc-icon-size: 100% !important;
        --iron-icon-width: 100% !important;
        --iron-icon-height: 100% !important;

        width: 1.5rem;
        height: 1.5rem;
      }
      .icon {
        padding: 0.75rem;
        background-color: var(--secondary-background-color);
        border-radius: 999px;
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

    async setConfig(config) {
      if (!config.entity) {
        throw new Error("Specify an entity");
      }
      
      this.hass = hass();
      this._config = config;
      this.friendly_name = config.friendly_name ? config.friendly_name : false;

      if(computeDomain(this._config.entity) == 'sensor'){
        if(this.hass.states[this._config.entity].attributes.unit_of_measurement){
          const cardInput2 = {
              type: "graph",
              entity: this._config.entity,
              detail: 1,
              hours_to_show: 24,
              limits: 1
          };
          const cardHelper = await cardHelpers;
          this.card = await cardHelper.createHeaderFooterElement(cardInput2);
          this.card.hass = this.hass;
        }
      }
    }
    _handleMoreInfo(ev){
      moreInfo(this._config.entity);
    }
    _computeBrightness(stateObj) {
      if (!stateObj.attributes.brightness || !this._config.state_color) {
        return "";
      }
      const brightness = stateObj.attributes.brightness;
      return `brightness(${(brightness + 245) / 5}%)`;
    }
  
    _computeColor(stateObj) {
      if (this._config.state_color && stateObj.attributes.rgb_color) {
        return `rgb(${stateObj.attributes.rgb_color.join(",")})`;
      }
      return "";
    }
    _toggleEntity(ev){
      const entityId = ev.currentTarget.entity;

      const turnOn = STATES_OFF.includes(this.hass.states[entityId].state);
      const stateDomain = computeDomain(entityId);

      if(stateDomain == 'binary_sensor' || stateDomain == 'sensor' || stateDomain == 'person' || stateDomain == 'weather'){
        this._handleMoreInfo();
        return;
      } else {
        const serviceDomain = stateDomain === "group" ? "homeassistant" : stateDomain;

        let service;
        switch (stateDomain) {
          case "lock":
            service = turnOn ? "unlock" : "lock";
            break;
          case "cover":
            service = turnOn ? "open_cover" : "close_cover";
            break;
          case "scene":
            service = "turn_on";
            break;
          default:
            service = turnOn ? "turn_on" : "turn_off";
        }

        this.hass.callService(serviceDomain, service, { entity_id: entityId });
        fireEvent('haptic','success');
      }
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
        
      const name = this.friendly_name ? this.friendly_name : (stateObj.attributes.friendly_name === undefined ? (stateObj.entity_id).replace(/_/g, " ") : stateObj.attributes.friendly_name);
    
      const config = {
        type: "graph",
        entity: this._config.entity,
        detail: 1,
        hours_to_show: 24,
        limits: 1
      };

      return html`
      <ha-card>
        <div class="flex space-x-2 p-2">
          <div>
            <div class="icon cursor-pointer">
              <ha-state-icon
                tabindex="-1"
                data-domain=${computeStateDomain(stateObj)}
                data-state=${stateObj.state}
                .icon=${this._config.icon}
                .state=${stateObj}
                .entity=${this._config.entity}
                @click=${this._toggleEntity}
                style=${styleMap({
                  filter: stateObj ? this._computeBrightness(stateObj) : "",
                  color: stateObj ? this._computeColor(stateObj) : "",
                  height: "",
                })}
              ></ha-state-icon>
            </div>
          </div>
          <div class="cursor-pointer information" @click=${this._handleMoreInfo}>
            <h1 class="font-semibold">${name}</h1>
            <span class="state">
              ${computeDomain(stateObj.entity_id) == 'scene' ? html`
              <ha-relative-time
                id="label"
                class="ellipsis"
                .hass="${this.hass}"
                .datetime="${stateObj.last_changed}"
              ></ha-relative-time>
              `
              :
              html`
              ${computeStateDisplay(
                this.hass.localize,
                stateObj,
                this.hass.locale
              )}
              `
              }
            </span>
          </div>
        </div>
        ${computeDomain(this._config.entity) == 'sensor' && this.card ? html`
            <div class="w-full">
              ${this.card}
            <div>
            ` : ""
          }
      </ha-card>
      `;
    }
  }
  customElements.define("dwains-button-card", DwainsButtonCard);

});