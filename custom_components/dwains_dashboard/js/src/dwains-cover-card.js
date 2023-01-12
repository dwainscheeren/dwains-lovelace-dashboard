import { hass } from "card-tools/src/hass";
import { moreInfo } from "card-tools/src/more-info";
import { css, html, LitElement } from 'lit-element';

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

  class DwainsCoverCard extends LitElement {
    static get styles() {
      return css`
      .flex {
        display: flex;
        margin-bottom: 5px;
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

    setConfig(config) {
      if (!config.entity || config.entity.split(".")[0] !== "cover") {
        throw new Error("Specify an entity from within the cover domain");
      }
      
      this.hass = hass();
      this._config = config;
      this.friendly_name = config.friendly_name ? config.friendly_name : false;
    }

    firstUpdated() {
      this.update_style();
    }
    async update_style() {
      await customElements.whenDefined("ha-cover-controls");
      const element = this.shadowRoot.querySelector("ha-cover-controls");
      await element.updateComplete;
      this.shadowRoot.querySelector('ha-cover-controls').shadowRoot.querySelector('.state').style.textAlign = 'center';
      this.shadowRoot.querySelector('ha-cover-controls').shadowRoot.querySelector('.state').style.display = 'grid';
      this.shadowRoot.querySelector('ha-cover-controls').shadowRoot.querySelector('.state').style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      this.shadowRoot.querySelector('ha-cover-controls').shadowRoot.querySelector('.state').style.gap = '0.5rem';
      this.shadowRoot.querySelector('ha-cover-controls').shadowRoot.querySelectorAll('ha-icon-button').forEach(function (element) {
        element.style.backgroundColor = 'var(--secondary-background-color)';
        element.style.borderRadius = "var(--ha-card-border-radius, 4px)";
        element.style.setProperty('--mdc-icon-size','1.5rem');
        element.style.setProperty('--mdc-icon-button-size', '41px');
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
        
      const name = this.friendly_name ? this.friendly_name : (stateObj.attributes.friendly_name === undefined ? (stateObj.entity_id).replace(/_/g, " ") : stateObj.attributes.friendly_name);

      return html`
      <ha-card class="p-2">
        <div class="flex space-x-2">
          <div>
            <div class="icon cursor-pointer">
              <ha-state-icon
                .icon=${this._config.icon}
                .state=${stateObj}
              ></ha-state-icon>
            </div>
          </div>
          <div class="cursor-pointer information" @click=${this._handleMoreInfo}>
            <h1 class="font-semibold">${name}</h1>
            <span class="state">
            ${stateObj.attributes.current_position !== undefined
              ? `${this.hass.localize("ui.card.cover.position")}: ${
                  stateObj.attributes.current_position
                }`: ""}
            </span>
          </div>
        </div>
        <div>
          <ha-cover-controls
            .hass=${this.hass}
            .stateObj=${stateObj}
          ></ha-cover-controls>
        </div>
      </ha-card>
      `;
    }
  }
  customElements.define("dwains-cover-card", DwainsCoverCard);
});



