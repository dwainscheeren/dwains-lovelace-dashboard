import { hass } from "card-tools/src/hass";
import { moreInfo } from "card-tools/src/more-info";
import {
  computeStateDisplay,
  computeStateDomain,
} from 'custom-card-helpers';
import { mdiAutorenew,
  mdiCalendarSync,
  mdiFan,
  mdiFire,
  mdiPower,
  mdiSnowflake,
  mdiWaterPercent } from "@mdi/js";
import { styleMap } from 'lit-html/directives/style-map.js';
import {classMap} from 'lit-html/directives/class-map.js';
import { css, html, LitElement } from 'lit-element';

const bases2 = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases2).then(() => {

  // const LitElement = customElements.get('hui-masonry-view')
  //   ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))
  //   : Object.getPrototypeOf(customElements.get('hc-lovelace'));

  //const html = LitElement.prototype.html;

  //const css = LitElement.prototype.css;

  //const stylemap = LitElement.prototype.styleMap;

  const modeIcons = {
    auto: mdiCalendarSync,
    heat_cool: mdiAutorenew,
    heat: mdiFire,
    cool: mdiSnowflake,
    off: mdiPower,
    fan_only: mdiFan,
    dry: mdiWaterPercent,
  };
  
  class DwainsThermostatCard extends LitElement {
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
      #modes {
        text-align: center;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.5rem;
        padding: 5px 0.5rem 5px 0.5rem;
      }
      #modes ha-icon-button {
        background-color: var(--secondary-background-color);
        border-radius: var(--ha-card-border-radius, 4px);
        --mdc-icon-size: 1.5rem;
        --mdc-icon-button-size: 41px;
      }

      .icon {
        padding: 0.75rem;
        background-color: var(--secondary-background-color);
        border-radius: 999px;
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
    }
    _handleMoreInfo(ev){
      moreInfo(this._config.entity);
    }
    _handleAction(ev) {
      this.hass.callService("climate", "set_hvac_mode", {
        entity_id: this._config.entity,
        hvac_mode: ev.currentTarget.mode,
      });
    }
    _renderIcon(mode, currentMode) {
      if (!modeIcons[mode]) {
        return html``;
      }
      return html`
          <ha-icon-button
            class=${classMap({ "selected-icon": currentMode === mode })}
            .mode=${mode}
            @click=${this._handleAction}
            tabindex="0"
            .path=${modeIcons[mode]}
            .label=${this.hass.localize(`component.climate.state._.${mode}`)}
          >
          </ha-icon-button>
      `;
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
        
      const mode = stateObj.state in modeIcons ? stateObj.state : "unknown-mode";
      const name = this.friendly_name ? this.friendly_name : (stateObj.attributes.friendly_name === undefined ? (stateObj.entity_id).replace(/_/g, " ") : stateObj.attributes.friendly_name);

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
              ></ha-state-icon>
            </div>
          </div>
          <div class="cursor-pointer information" @click=${this._handleMoreInfo}>
            <h1 class="font-semibold">${name}</h1>
            <span class="state">
              ${computeStateDisplay(
                this.hass.localize,
                stateObj,
                this.hass.locale
              )}
              ${
                stateObj.attributes.current_temperature !== null &&
                !isNaN(stateObj.attributes.current_temperature)
                  ? html`${
                      stateObj.attributes.current_temperature
                      }
                      ${this.hass.config.unit_system.temperature}
                `
                  : ""
              }
            </span>
          </div>
        </div>
        <div id="modes">
          ${(stateObj.attributes.hvac_modes || [])
            .concat()
            .map((modeItem) => this._renderIcon(modeItem, mode))}
        </div>
      </ha-card>
      `;
    }
  }
  customElements.define("dwains-thermostat-card", DwainsThermostatCard);
});