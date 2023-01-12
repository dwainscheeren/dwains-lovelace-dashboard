import { hass } from "card-tools/src/hass";
import { popUp, closePopUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import Cookies from 'js-cookie'
import { 
  DOMAIN_ICONS,
 } from './variables'
import {
  computeDomain
} from 'custom-card-helpers';
import { mdiDotsVertical, mdiCog } from "@mdi/js";
import { css, html, LitElement } from 'lit-element';
import Sortable from 'sortablejs/modular/sortable.complete.esm.js';
import translateEngine from './translate-engine';
import { closePopup } from "./helpers";

const bases2 = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases2).then(() => {
    const cardHelpers = window.loadCardHelpers()
    ? window.loadCardHelpers()
    : undefined;


    class DwainsEditDeviceCardCard extends LitElement {
      static get styles() {
        return [
          css`
          .edit-element {
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            font-size: inherit;
          }
          blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
            margin: 0;
          }
          .add-button {
            font-size: 16px;
            border: 2px solid #4591B8;
            padding: 5px;
            margin-bottom: 50px;
            background: #459CEE;
            border-radius: 20px;
            color: white;
          }
          .card-footer {
            display: flex;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          .grid {
            display: grid;
            gap: 2rem;
          }
          @media (min-width: 768px){
            .grid-cols-2 {
              grid-template-columns: repeat(2,minmax(0,1fr));
            }
          }
          .pre-select {
            padding: 2.5rem;
          }
          .pre-select-option {
            padding: 2.5rem;
            border: 1px solid #4591B8;
            text-align: center;
            cursor: pointer;
          }
          .pre-selected-option:hover {
            border: 2px solid #4591B8;
          }
          .more-page-settings {
            padding: 0.75rem;
            border: 2px solid grey;
          }
          .seperator {
            background-color: var(--secondary-background-color);
            width: 100%;
            height: 3px;
            margin-top: 15px;
            margin-bottom: 15px;
          }
          /*Start blueprint table*/
          .min-w-full {
            min-width: 100%;
          }
          table {
              text-indent: 0;
              border-color: inherit;
              border-collapse: collapse;
          }
          .bg-gray-50 {
            background-color: var(--secondary-background-color);
          }
          .tracking-wider {
              letter-spacing: .05em;
          }
          .text-sm {
            font-size: .875rem;
            line-height: 1.25rem;
          }
          .py-4 {
              padding-top: 1rem;
              padding-bottom: 1rem;
          }
          .uppercase {
              text-transform: uppercase;
          }
          .font-medium {
              font-weight: 500;
          }
          .text-xs {
              font-size: .75rem;
              line-height: 1rem;
          }
          .text-left {
              text-align: left;
          }
          .px-6 {
              padding-left: 1.5rem;
              padding-right: 1.5rem;
          }
          .py-3 {
              padding-top: 0.75rem;
              padding-bottom: 0.75rem;
          }
          .card-footer-multiple {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          `
        ]
      }
      static get properties() {
        return {
          mode: {},
          blueprints: {},
        }
      }
      setConfig(config) {
        this.hass = hass();
        this.mode = config.mode ? config.mode : 'dwains-dashboard-blueprint-select'; //Set default mode to hui-card-picker
        this.domain = config.domain;
        if(config.cardConfig){
          const cardConfig = config.cardConfig;
          delete cardConfig["input_entity"];
          delete cardConfig["input_name"];
          this.cardConfig = cardConfig;
        } else {
          this.cardConfig = "";
        }  
        this.existingCardEdit = config.existingCardEdit ? config.existingCardEdit : false;

        const loader = document.createElement("hui-masonry-view");
        loader.lovelace = { editMode: true };
        loader.willUpdate(new Map());
      }
      async connectedCallback(){
        super.connectedCallback();
  
        await this._loadBlueprints();

        const ch = await window.loadCardHelpers();
        const c = await ch.createCardElement({ type: "button" });
        await c.constructor.getConfigElement();
      }
  
      async _loadBlueprints(){
        //Load blueprints
        this.blueprints = await this.hass.callWS({
          type: 'dwains_dashboard/get_blueprints'
        });        
      }
      _switchMode(ev){
        const mode = ev.currentTarget.mode;
        this.mode = mode;
        this.requestUpdate();
      }
      _removeCard(){
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/remove_device_card',
          domain: this.domain,
        }).then(
            (resp) => {
                console.log(resp);
                closePopup();
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
      _handleDeleteBlueprintClicked(ev){
        const blueprint = ev.currentTarget.blueprint;
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/delete_blueprint',
          blueprint: blueprint
        }).then(
            (resp) => {
              console.log(resp);
              this._loadBlueprints();
              this.requestUpdate();
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
      _handleUseBlueprintClicked(ev){
        const blueprint = ev.currentTarget.blueprint;
  
        const cardData = JSON.stringify({
            "type": "custom:dwains-blueprint-card",
            "blueprint": blueprint,
            "card": this.blueprints["blueprints"][blueprint]['card'],
        });
        //console.log(cardData);
        //Here parse it with websocket to my integration?
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/edit_device_card',
          cardData: cardData,
          domain: this.domain,
        }).then(
            (resp) => {
                console.log(resp);
                closePopup();
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
      _installBlueprintYamlChanged(e) {
        this.installBlueprintYaml = e.target.yaml;
      }
      _handleInstallBlueprintClicked(ev) {
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/install_blueprint',
          yamlCode: JSON.stringify(this.installBlueprintYaml),
        }).then(
            (resp) => {
              console.log(resp);
              if(resp["succesfull"]){
                alert(this.hass.localize("ui.common.successfully_saved"));
                this._loadBlueprints();
                this.requestUpdate();
              } else {
                alert(resp["error"]);
              }   
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
  
      _checkCustomCard(card) {
        const cardInstalled = customElements.get(card);
        return html`
          <div>
            ${cardInstalled ? html`
              <ha-icon
                style="color: green;"
                .icon=${"mdi:check-bold"}
              ></ha-icon>` : 
              html`
              <ha-icon
                style="color: red;"
                .icon=${"mdi:close-thick"}
              ></ha-icon>
              `
            }
            ${card}
            ${cardInstalled ? html`(${translateEngine(this.hass, 'blueprint.installed')})` : html`(${translateEngine(this.hass, 'blueprint.not_installed')})`}
          </div>
        `;
      }
  
      render() {
        if(this.blueprints == null || this.blueprints.length === 0 ){
          return html`Loading...`;
        }
        if(this.mode == 'dwains-dashboard-blueprint-select'){
          const blueprintsSorted = Object.entries(this.blueprints['blueprints']).sort(function (x, y) {
            let a = x[1].blueprint.type,
                b = y[1].blueprint.type;
            return a == b ? 0 : a > b ? 1 : -1;
          });
          return html`
          <div class="edit-element">  
            <strong>${translateEngine(this.hass, 'blueprint.installed_blueprints')}:</strong>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'blueprint.title')}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'global.version')}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'blueprint.type')}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'blueprint.used_custom_cards')}</th>
                  <th scope="col" class="relative px-6 py-3">
                  </th>
                </tr>
              </thead>
              <tbody>
                ${Object.values(this.blueprints['blueprints']).length == 0 ? html `
                  <tr>
                    <td  class="px-6 py-4" colspan="5">${translateEngine(this.hass, 'blueprint.no_blueprints_installed')}</td>
                  </tr>` : html`
                  ${
                    Object.entries(blueprintsSorted).map(([k,v]) => 
                        html`
                          <tr class="bg-white">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <h3>${v[1]["blueprint"]["name"]}</h3>
                              ${v[1]["blueprint"]["description"]}
                            </td>
                            <td class="px-6 py-4">
                              ${v[1]["blueprint"]["version"]}
                            </td>
                            <td class="px-6 py-4">
                              ${v[1]["blueprint"]["type"]}
                            </td>
                            <td class="px-6 py-4">
                              ${!v[1]["blueprint"]["custom_cards"] || v[1]["blueprint"]["custom_cards"].length === 0 ? `None` : 
                                html`
                                  ${v[1]["blueprint"]["custom_cards"].map(i => this._checkCustomCard(i))}
                                `
                              }
                            </td>
                            <td>
                              ${v[1]["blueprint"]["type"] == "replace-card" ? html`
                                <mwc-button .blueprint=${v[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                                  ${translateEngine(this.hass, 'blueprint.use')}
                                </mwc-button>
                              `: ""}
                              <mwc-button .blueprint=${v[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                                <ha-icon
                                  .icon=${"mdi:delete"}
                                ></ha-icon>
                              </mwc-button>
                            </td>
                          </tr>
                        `
                    )
                  }
                  `
                }
              </tbody>
            </table>
            <div class="seperator"></div>
            <strong>${translateEngine(this.hass, 'blueprint.install')}</strong>
            <p>${translateEngine(this.hass, 'blueprint.instruction')}</p>
            <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
            <ha-yaml-editor
              .label=${translateEngine(this.hass, 'blueprint.yaml_code')}
              name="description"
              @value-changed=${this._installBlueprintYamlChanged}
            ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <mwc-button @click=${this._handleInstallBlueprintClicked} unelevated>
                ${translateEngine(this.hass, 'blueprint.install')}
              </mwc-button>
            </div>
          </div>`;
        } else if(this.mode == 'current-selected-blueprint'){
          //console.log(this.cardConfig);

          /*
          <hui-card-element-editor
                @save-config=${this.magicStuffSecond}
                @config-changed=${this.magicStuff}
                .value=${this.cardConfig}
                .hass=${this.hass}
                lovelace=${{views: []}}
              ></hui-card-element-editor>

              <hui-card-preview
                .hass=${this.hass}
                .config=${this.cardConfig}
              ></hui-card-preview>
          */
          
          return html`
            <div class="edit-element">
              <p>
              ${translateEngine(this.hass,'device.current_blueprint_card')} ${translateEngine(this.hass,'device.'+this.domain)}:<br>
                <strong>${this.blueprints['blueprints'][this.cardConfig.blueprint]["blueprint"]["name"]}</strong><br>
                ${this.blueprints['blueprints'][this.cardConfig.blueprint]["blueprint"]["description"]}
              </p>

              <div class="card-footer-multiple">
                ${
                  this.existingCardEdit ? html `
                    <div>
                      <mwc-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</mwc-button>
                      <mwc-button class="warning" @click=${(e) => this.mode = 'dwains-dashboard-blueprint-select'}}>${this.hass.localize("ui.common.previous")}</mwc-button>
                    </div>
                  ` : html`<div></div>`
                }
                <div>
                  <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                    ${this.hass.localize("ui.common.cancel")}
                  </mwc-button>
                  <mwc-button slot="primaryAction" .blueprint=${this.cardConfig.blueprint} @click=${this._handleUseBlueprintClicked}>
                    ${this.hass.localize("ui.common.submit")}
                  </mwc-button>
                </div>
              </div>
            </div>
          `;
        }
      }
    }
    customElements.define("dwains-edit-device-card-card", DwainsEditDeviceCardCard);



    class DwainsEditDevicePopupCard extends LitElement {
      static get styles() {
        return [
          css`
          .edit-element {
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            font-size: inherit;
          }
          blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
            margin: 0;
          }
          .add-button {
            font-size: 16px;
            border: 2px solid #4591B8;
            padding: 5px;
            margin-bottom: 50px;
            background: #459CEE;
            border-radius: 20px;
            color: white;
          }
          .card-footer {
            display: flex;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          .grid {
            display: grid;
            gap: 2rem;
          }
          @media (min-width: 768px){
            .grid-cols-2 {
              grid-template-columns: repeat(2,minmax(0,1fr));
            }
          }
          .pre-select {
            padding: 2.5rem;
          }
          .pre-select-option {
            padding: 2.5rem;
            border: 1px solid #4591B8;
            text-align: center;
            cursor: pointer;
          }
          .pre-selected-option:hover {
            border: 2px solid #4591B8;
          }
          .more-page-settings {
            padding: 0.75rem;
            border: 2px solid grey;
          }
          .seperator {
            background-color: var(--secondary-background-color);
            width: 100%;
            height: 3px;
            margin-top: 15px;
            margin-bottom: 15px;
          }
          /*Start blueprint table*/
          .min-w-full {
            min-width: 100%;
          }
          table {
              text-indent: 0;
              border-color: inherit;
              border-collapse: collapse;
          }
          .bg-gray-50 {
            background-color: var(--secondary-background-color);
          }
          .tracking-wider {
              letter-spacing: .05em;
          }
          .text-sm {
            font-size: .875rem;
            line-height: 1.25rem;
          }
          .py-4 {
              padding-top: 1rem;
              padding-bottom: 1rem;
          }
          .uppercase {
              text-transform: uppercase;
          }
          .font-medium {
              font-weight: 500;
          }
          .text-xs {
              font-size: .75rem;
              line-height: 1rem;
          }
          .text-left {
              text-align: left;
          }
          .px-6 {
              padding-left: 1.5rem;
              padding-right: 1.5rem;
          }
          .py-3 {
              padding-top: 0.75rem;
              padding-bottom: 0.75rem;
          }
          .card-footer-multiple {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          `
        ]
      }
      static get properties() {
        return {
          mode: {},
          blueprints: {},
        }
      }
      setConfig(config) {
        this.hass = hass();
        this.mode = config.mode ? config.mode : 'dwains-dashboard-blueprint-select'; //Set default mode to hui-card-picker
        this.domain = config.domain;
        if(config.cardConfig){
          const cardConfig = config.cardConfig;
          delete cardConfig["input_entity"];
          delete cardConfig["input_name"];
          this.cardConfig = cardConfig;
        } else {
          this.cardConfig = "";
        }  
        this.existingCardEdit = config.existingCardEdit ? config.existingCardEdit : false;
      }
      async connectedCallback(){
        super.connectedCallback();
  
        await this._loadBlueprints();
      }
  
      async _loadBlueprints(){
        //Load blueprints
        this.blueprints = await this.hass.callWS({
          type: 'dwains_dashboard/get_blueprints'
        });

        const ch = await window.loadCardHelpers();
        const c = await ch.createCardElement({ type: "button" });
        await c.constructor.getConfigElement();
      }
      _switchMode(ev){
        const mode = ev.currentTarget.mode;
        this.mode = mode;
        this.requestUpdate();
      }
      _removeCard(){
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/remove_device_popup',
          domain: this.domain,
        }).then(
            (resp) => {
                console.log(resp);
                closePopup();
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
      _handleDeleteBlueprintClicked(ev){
        const blueprint = ev.currentTarget.blueprint;
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/delete_blueprint',
          blueprint: blueprint
        }).then(
            (resp) => {
              console.log(resp);
              this._loadBlueprints();
              this.requestUpdate();
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
      _handleUseBlueprintClicked(ev){
        const blueprint = ev.currentTarget.blueprint;
  
        const cardData = JSON.stringify({
            "type": "custom:dwains-blueprint-card",
            "blueprint": blueprint,
            "card": this.blueprints["blueprints"][blueprint]['card'],
        });
        //console.log(cardData);
        //Here parse it with websocket to my integration?
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/edit_device_popup',
          cardData: cardData,
          domain: this.domain,
        }).then(
            (resp) => {
                console.log(resp);
                closePopup();
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
      _installBlueprintYamlChanged(e) {
        this.installBlueprintYaml = e.target.yaml;
      }
      _handleInstallBlueprintClicked(ev) {
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/install_blueprint',
          yamlCode: JSON.stringify(this.installBlueprintYaml),
        }).then(
            (resp) => {
              console.log(resp);
              if(resp["succesfull"]){
                alert(this.hass.localize("ui.common.successfully_saved"));
                this._loadBlueprints();
                this.requestUpdate();
              } else {
                alert(resp["error"]);
              }   
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
  
      _checkCustomCard(card) {
        const cardInstalled = customElements.get(card);
        return html`
          <div>
            ${cardInstalled ? html`
              <ha-icon
                style="color: green;"
                .icon=${"mdi:check-bold"}
              ></ha-icon>` : 
              html`
              <ha-icon
                style="color: red;"
                .icon=${"mdi:close-thick"}
              ></ha-icon>
              `
            }
            ${card}
            ${cardInstalled ? html`(${translateEngine(this.hass, 'blueprint.installed')})` : html`(${translateEngine(this.hass, 'blueprint.not_installed')})`}
          </div>
        `;
      }
  
      render() {
        if(this.mode == 'dwains-dashboard-blueprint-select'){
          const blueprintsSorted = Object.entries(this.blueprints['blueprints']).sort(function (x, y) {
            let a = x[1].blueprint.type,
                b = y[1].blueprint.type;
            return a == b ? 0 : a > b ? 1 : -1;
          });
          return html`
          <div class="edit-element">  
            <strong>${translateEngine(this.hass, 'blueprint.installed_blueprints')}:</strong>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'blueprint.title')}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'global.version')}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'blueprint.type')}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${translateEngine(this.hass, 'blueprint.used_custom_cards')}</th>
                  <th scope="col" class="relative px-6 py-3">
                  </th>
                </tr>
              </thead>
              <tbody>
              ${
                Object.entries(blueprintsSorted).map(([k,v]) => 
                    html`
                      <tr class="bg-white">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <h3>${v[1]["blueprint"]["name"]}</h3>
                          ${v[1]["blueprint"]["description"]}
                        </td>
                        <td class="px-6 py-4">
                          ${v[1]["blueprint"]["version"]}
                        </td>
                        <td class="px-6 py-4">
                          ${v[1]["blueprint"]["type"]}
                        </td>
                        <td class="px-6 py-4">
                          ${!v[1]["blueprint"]["custom_cards"] || v[1]["blueprint"]["custom_cards"].length === 0 ? `None` : 
                            html`
                              ${v[1]["blueprint"]["custom_cards"].map(i => this._checkCustomCard(i))}
                            `
                          }
                        </td>
                        <td>
                          ${v[1]["blueprint"]["type"] == "replace-card" ? html`
                            <mwc-button .blueprint=${v[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                              ${translateEngine(this.hass, 'blueprint.use')}
                            </mwc-button>
                          `: ""}
                          <mwc-button .blueprint=${v[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                            <ha-icon
                              .icon=${"mdi:delete"}
                            ></ha-icon>
                          </mwc-button>
                        </td>
                      </tr>
                    `
                )
              }
              </tbody>
            </table>
            <div class="seperator"></div>
            <strong>${translateEngine(this.hass, 'blueprint.install')}</strong>
            <p>${translateEngine(this.hass, 'blueprint.instruction')}</p>
            <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
            <ha-yaml-editor
              .label=${translateEngine(this.hass, 'blueprint.yaml_code')}
              name="description"
              @value-changed=${this._installBlueprintYamlChanged}
            ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <mwc-button @click=${this._handleInstallBlueprintClicked} unelevated>
                ${translateEngine(this.hass, 'blueprint.install')}
              </mwc-button>
            </div>
          </div>`;
        } else if(this.mode == 'current-selected-blueprint'){
          return html`
            <div class="edit-element">
              <p>
                ${translateEngine(this.hass,'device.current_blueprint_popup')} ${translateEngine(this.hass,'device.'+this.domain)}:<br>
                <strong>${this.blueprints['blueprints'][this.cardConfig.blueprint]["blueprint"]["name"]}</strong><br>
                ${this.blueprints['blueprints'][this.cardConfig.blueprint]["blueprint"]["description"]}
              </p>
              <div class="card-footer-multiple">
                ${
                  this.existingCardEdit ? html `
                    <div>
                      <mwc-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</mwc-button>
                      <mwc-button class="warning" @click=${(e) => this.mode = 'dwains-dashboard-blueprint-select'}}>${this.hass.localize("ui.common.previous")}</mwc-button>
                    </div>
                  ` : html`<div></div>`
                }
                <div>
                  <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                    ${this.hass.localize("ui.common.cancel")}
                  </mwc-button>
                  <mwc-button slot="primaryAction" .blueprint=${this.cardConfig.blueprint} @click=${this._handleUseBlueprintClicked}>
                    ${this.hass.localize("ui.common.submit")}
                  </mwc-button>
                </div>
              </div>
            </div>
          `;
        }
      }
    }
    customElements.define("dwains-edit-device-popup-card", DwainsEditDevicePopupCard);



    class DwainsEditDeviceButtonCard extends LitElement {
      static get styles() {
        return [
          css`
          .edit-element {
            padding: 20px;
          }
          .add-button {
            font-size: 16px;
            border: 2px solid #4591B8;
            padding: 5px;
            margin-bottom: 50px;
            background: #459CEE;
            border-radius: 20px;
            color: white;
          }
          .card-footer {
            display: flex;
            justify-content: flex-end;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          ha-formfield {
            padding: 16px 6px;
          }
          `
        ]
      }
      setConfig(config) {
        this.hass = hass();
        this.device = config.device;
        this.icon = config.icon ? config.icon : "";
        this.showInNavbar = config.showInNavbar ? config.showInNavbar : false;
      }
      async connectedCallback(){
        super.connectedCallback();
  
        //loadHaYamlEditor Start
          if (customElements.get("ha-yaml-editor")) return;
  
          // Load in ha-yaml-editor from developer-tools-service
          const ppResolver = document.createElement("partial-panel-resolver");
          const routes = (ppResolver).getRoutes([
            {
              component_name: "developer-tools",
              url_path: "a",
            },
          ]);
          await routes.routes.a.load();
          const devToolsRouter = document.createElement("developer-tools-router");
          await (devToolsRouter).routerOptions.routes.service.load();
        //loadHaYamlEditor End
      }
      _iconPickerChange(ev){
        this.icon = ev.detail['value'];
      }
      _showInMainNavbarValueChanged(ev) {
        this.showInNavbar = ev.target.checked;
      }
      _saveButton(ev){
        ev.stopPropagation();

        if(this.showInNavbar && !this.icon){
          alert(translateEngine(this.hass, 'device.icon_required'));
          return;
        }

        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/edit_device_button',
          icon: this.icon,
          device: this.device,
          showInNavbar: this.showInNavbar,
        }).then(
            (resp) => {
                console.log(resp);
                closePopup();
            },
            (err) => {
                console.error('Message failed!', err);
            }
        );
      }
      render() {
        return html`
        <div class="edit-element">
            <ha-icon-picker
              .label=${translateEngine(this.hass, 'device.icon')}
              .value=${this.icon}
              @value-changed=${this._iconPickerChange}
            ></ha-icon-picker>

            <ha-formfield .label=${translateEngine(this.hass,'device.show_in_navbar')}>
              <ha-switch
                @change=${this._showInMainNavbarValueChanged}
                .checked=${this.showInNavbar}
              ></ha-switch>
            </ha-formfield>

            <div class="card-footer">
              <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                ${this.hass.localize("ui.common.cancel")}
              </mwc-button>
              <mwc-button slot="primaryAction" @click=${this._saveButton}>
                ${this.hass.localize("ui.common.submit")}
              </mwc-button>
            </div>
        </div>
        `;
      }
    }
    customElements.define("dwains-edit-device-button-card", DwainsEditDeviceButtonCard);



    class DevicesCard extends LitElement {
        static get properties() {
          return {
            data: {},
            selectedDevice: {},
            deviceEditMode: {},
            deviceViewDisplayGrouped: {},
            deviceViewEditMode: {},
          };
        }
    
        /**
         * @param {any} hass
         */
        set hass(hass) {
          if(this.startedUp){
            this._update_hass(hass);
          }
        }

        _update_hass(hass){
          if(this.timeout) return;
          this.timeout = true;
          window.setTimeout(() => {this.timeout = false;}, 100); // 100 ms timeout

          if(this.data == null || this.data.length === 0) return;

          Object.values(this.data).map((data) => {
            if(data.domain == this.selectedDevice){
              data.cards.forEach((item) => {
                item.card.hass = hass;
              });
              data.customCardsTop.forEach((item) => {
                item.card.hass = hass;
              });
              data.customCardsBottom.forEach((item) => {
                item.card.hass = hass;
              });
            }
          });
          this._hass = hass;
          this.requestUpdate();
        }
    
        setConfig(config) {
          this.startedUp = false;
          this.timeout = false;

          this._hass = hass();
          this.selectedDevice = window.location.hash.substring(1);
          this.deviceEditMode = false;
          this.deviceViewEditMode = false;
          this.deviceViewDisplayGrouped = Cookies.get('dwains_dashboard_deviceViewDisplayGrouped') ? (Cookies.get('dwains_dashboard_deviceViewDisplayGrouped') == "false" ? false : true) : false;
          this._config = config;
    
          this.notificationCard, this.weatherCard;

          window.addEventListener("location-changed", () => this.updated(new Map()));
        }

        updated(changedProperties) {
          if(!changedProperties.has("state")) {
            let newstate = undefined;
            newstate = window.location.hash.substring(1);
            
            if (newstate){
              this.selectedDevice = newstate;
            } else {
              //The tab/page itself is clicked so fallback on first device button
              if(this.data != null && Object.keys(this.data).length != 0){
                this.selectedDevice = Object.values(this.data)[0]['domain'];
              }
            }
          } 
        }
    
        async connectedCallback(){
          //console.log('connectedCallBack');
          super.connectedCallback();
    
          await this._loadData(); //Load areas
    
          await this._hass.connection.subscribeEvents(() => this._reloadCard(), "dwains_dashboard_devicespage_card_reload");
        }
    
        async _reloadCard(){
          await this._loadData();
          this.requestUpdate();
        }
    
        async _loadData(){
          this.startedUp = false;
          
          this.areas = await this._hass.callWS({
            type: "config/area_registry/list"
          });
          this.devices = await this._hass.callWS({
            type: "config/device_registry/list"
          });
          this.entities = await this._hass.callWS({
            type: "config/entity_registry/list"
          });
    
          //Load configuration
          this.configuration = await this._hass.callWS({
            type: 'dwains_dashboard/configuration/get'
          });
          
          if(this.areas == null || this.areas.length === 0 
          || this.devices == null || this.devices.length === 0
          || this.entities == null || this.entities.length === 0
          || this.configuration == null || this.configuration.length === 0
          ){
          } else {
            //for the ha-icon-picker?
            const loader = document.createElement("hui-masonry-view");
            loader.lovelace = { editMode: true };
            loader.willUpdate(new Map());
            //end for the ha-icon-picker

            const data = [];
            const disabledDevices = [];
            
            const areaEntities = new Set();
            //Loop throught all areas to get all entities assigned to an area to populate the data group            
            for(const area of this.areas){
              if(!(this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['disabled'])){
                const areaDevices = new Set();
      
                // Find all devices linked to this area
                for (const device of this.devices) {
                  if (device.area_id === area.area_id) {
                    areaDevices.add(device.id);
                  }
                }
      
                // Find all entities directly linked to this area
                // or linked to a device linked to this area.
                for (const entity of this.entities) {
                  if (
                    entity.area_id
                      ? entity.area_id === area.area_id
                      : areaDevices.has(entity.device_id) 
                    ||
                      (computeDomain(entity.entity_id) == 'person' && !areaEntities.has(entity.entity_id))
                    ||
                      (computeDomain(entity.entity_id) == 'weather' && !areaEntities.has(entity.entity_id))
                    ||
                      (computeDomain(entity.entity_id) == 'alarm_control_panel' && !areaEntities.has(entity.entity_id))
                  ) {
                    
                    if(entity.hidden_by){
                      continue;
                    }
                    
                    const domain = computeDomain(entity.entity_id);
                    const stateObj = this._hass.states[entity.entity_id];

                    if(this.configuration['devices'][domain] && this.configuration['devices'][domain]['hidden']){
                      if (!disabledDevices.includes(domain)) {
                        disabledDevices.push(domain);
                      }
                      continue;
                    } 

                    if (!(domain in data)) {
                      //Custom cards
                      const deviceCustomCardsTop = [];
                      const deviceCustomCardsBottom = [];

                      if(this.configuration.device_cards.length !== 0){
                        if(this.configuration.device_cards[domain]){
                          Object.entries(this.configuration.device_cards[domain]).map(async ([k,v]) => {
                            const card = await this.createCardElement2(v);
                            const rowSpan = v["row_span"] ? v["row_span"] : "1";
                            const colSpan = v["col_span"] ? v["col_span"] : "1";
                            const rowSpanLg = v["row_span_lg"] ? v["row_span_lg"] : "1";
                            const colSpanLg = v["col_span_lg"] ? v["col_span_lg"] : "1";
                            const rowSpanXl = v["row_span_xl"] ? v["row_span_xl"] : "1";
                            const colSpanXl = v["col_span_xl"] ? v["col_span_xl"] : "1";
                            
                            if(v["position"] == 'bottom'){
                              deviceCustomCardsBottom.push({
                                card: card,
                                filename: k,
                                domain: domain,
                                rowSpan: rowSpan,
                                colSpan: colSpan,
                                rowSpanLg: rowSpanLg,
                                colSpanLg: colSpanLg,
                                rowSpanXl: rowSpanXl,
                                colSpanXl: colSpanXl,
                              });
                            } else {
                              deviceCustomCardsTop.push({
                                card: card,
                                filename: k,
                                domain: domain,
                                rowSpan: rowSpan,
                                colSpan: colSpan,
                                rowSpanLg: rowSpanLg,
                                colSpanLg: colSpanLg,
                                rowSpanXl: rowSpanXl,
                                colSpanXl: colSpanXl,
                              });
                            }
                          });
                        }
                      }
                      data[domain] = {
                        domain: domain, 
                        cards: [],
                        entitiesNoState: [],
                        entitiesHidden: [],
                        entitiesDisabled: [],
                        customCardsTop: deviceCustomCardsTop,
                        customCardsBottom: deviceCustomCardsBottom,
                        sort_order: (this.configuration['devices'][domain] && this.configuration['devices'][domain]['sort_order'] ? this.configuration['devices'][domain]['sort_order']: 99),
                      };
                    }

                    const disableEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['disabled'] ? true : false) : false;
                    if(disableEntity){
                      data[domain].entitiesDisabled.push(entity.entity_id);
                      areaEntities.add(entity.entity_id);
                      continue;
                    }
      
                    if (!stateObj) {
                      data[domain].entitiesNoState.push(entity.entity_id);
                      areaEntities.add(entity.entity_id);
                      continue;
                    } else {
                      const hideEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['hidden'] ? true : false) : false;
                      const excludeEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['excluded'] ? true : false) : false;
                      const friendlyName = this.configuration['entities'][entity.entity_id] ? this.configuration['entities'][entity.entity_id]['friendly_name'] : "";
                      const customCard = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['custom_card'] ? this.configuration['entities'][entity.entity_id]['custom_card'] : false;
                      const customPopup = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['custom_popup'] ? this.configuration['entities'][entity.entity_id]['custom_popup'] : false;
                      
                      if(hideEntity){
                        if(!data[domain].entitiesHidden.includes(entity.entity_id)){
                          data[domain].entitiesHidden.push(entity.entity_id);
                        }
                        continue;
                      }

                      let cardConfig = {};
                      let rowSpan = "1";
                      let colSpan = "1";
                      let rowSpanLg = "1";
                      let colSpanLg = "1";
                      let rowSpanXl = "1";
                      let colSpanXl = "1";
                      if(customCard && this.configuration['entity_cards'] && this.configuration['entity_cards'][entity.entity_id]){
                        //If entity has a custom card set by user
                        cardConfig = {input_name: friendlyName, input_entity: entity.entity_id,...this.configuration['entity_cards'][entity.entity_id]};
                      } else if(this.configuration['devices_card'][domain]){
                        //If domain has a custom card set by user
                        cardConfig = {input_name: friendlyName, input_entity: entity.entity_id,...this.configuration['devices_card'][domain]};
                      } else {
                        //No custom card set so fallback to original DD cards
                        switch(domain) {
                          default:
                            cardConfig = {
                              type: "custom:dwains-button-card",
                              friendly_name: friendlyName
                            };
                            break;
                          case "camera":
                            cardConfig = {
                              type: "picture-entity",
                              camera_view: "live"
                            };
                            rowSpan = "2";
                            colSpan = "2";
                            rowSpanLg = "2";
                            colSpanLg = "2";
                            rowSpanXl = "2";
                            colSpanXl = "2";
                            break;
                          case "climate":
                            cardConfig = {
                              type: "custom:dwains-thermostat-card",
                              friendly_name: friendlyName
                            };
                            break;
                          case "cover":
                            cardConfig = {
                              type: "custom:dwains-cover-card",
                              friendly_name: friendlyName
                            };
                            break;
                          case "light":
                            cardConfig = {
                              type: "custom:dwains-light-card",
                              friendly_name: friendlyName
                            };
                            break;
                        }
    
                        cardConfig = {entity: entity.entity_id,...cardConfig};
                      }
    
                      
                      if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['row_span']){
                        rowSpan = this.configuration['entities'][entity.entity_id]['row_span'];
                      }  
                      if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['col_span']){
                        colSpan = this.configuration['entities'][entity.entity_id]['col_span'];
                      }     
                      if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['row_span_lg']){
                        rowSpanLg = this.configuration['entities'][entity.entity_id]['row_span_lg'];
                      }  
                      if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['col_span_lg']){
                        colSpanLg = this.configuration['entities'][entity.entity_id]['col_span_lg'];
                      } 
                      if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['row_span_xl']){
                        rowSpanXl = this.configuration['entities'][entity.entity_id]['row_span_xl'];
                      }  
                      if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['col_span_xl']){
                        colSpanXl = this.configuration['entities'][entity.entity_id]['col_span_xl'];
                      }       

                      areaEntities.add(entity.entity_id);

                      data[domain].cards.push({
                        area: area,
                        entity: entity.entity_id,
                        rowSpan: rowSpan,
                        colSpan: colSpan,
                        rowSpanLg: rowSpanLg,
                        colSpanLg: colSpanLg,
                        rowSpanXl: rowSpanXl,
                        colSpanXl: colSpanXl,
                        friendlyName: friendlyName,
                        hideEntity: hideEntity,
                        excludeEntity: excludeEntity,
                        card: await this.createCardElement2(cardConfig),
                        customCard: customCard,
                        customPopup: customPopup, 
                        sort_order: (this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['devices_sort_order'] ? this.configuration['entities'][entity.entity_id]['devices_sort_order']: 99),
                        grouped_sort_order: (this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['devices_grouped_sort_order'] ? this.configuration['entities'][entity.entity_id]['devices_grouped_sort_order']: 99),
                      });
                    }
                  }
                }
              }
            }

            const sortedData = Object.keys(data)
              .sort(function(a, b) {
                return data[a].sort_order - data[b].sort_order;
              })
              .map(function(category) {
                return data[category]; // Convert array of categories to array of objects
              });

            this.data = sortedData;
            this.disabledDevices = disabledDevices;
            this.startedUp = true;

            //Set first selected device
            if(this.selectedDevice.length === 0){
              this.selectedDevice = Object.values(sortedData)[0]['domain'];
            }
          }
        }
    
        _average(data, domain, deviceClass) {
          const entities = data[domain].filter((entity) =>
            deviceClass ? entity.attributes.device_class === deviceClass : true
          );
          if (!entities) {
            return undefined;
          }
          let uom;
          const values = entities.filter((entity) => {
            if (
              !entity.attributes.unit_of_measurement ||
              isNaN(Number(entity.state))
            ) {
              return false;
            }
            if (!uom) {
              uom = entity.attributes.unit_of_measurement;
              return true;
            }
            return entity.attributes.unit_of_measurement === uom;
          });
          if (!values.length) {
            return undefined;
          }
          const sum = values.reduce(
            (total, entity) => total + Number(entity.state),
            0
          );
          return `${Math.round((sum / values.length)*10)/10}${uom}`;
        }
    
        _isOn(data, domain, deviceClass) {
          const entities = data[domain];
          if (!entities) {
            return undefined;
          }
          return((
            deviceClass
              ? entities.filter(
                  (entity) => entity.attributes.device_class === deviceClass
                )
              : entities
          ).filter(
            (entity) =>
              !UNAVAILABLE_STATES.includes(entity.state) &&
              !STATES_OFF.includes(entity.state)
          ).length);
        }
    
        _climateState(data, domain){
          const entities = data[domain];
          if (!entities) {
            return undefined;
          }
          const climateStates = [];
          for(const climate of entities){
            if(climate.attributes['hvac_action'] != 'idle'){
              climateStates.push(climate.attributes['hvac_action']);
            }
          }
          return climateStates.join(", ");
        }
    
        _handleDeviceClick(event){
          var id = event.currentTarget.dataset.device;
          window.location.hash = id;
          this.selectedDevice = id;
          window.scrollTo(0,0);
          //this.requestUpdate();
          this._update_hass(this._hass);
        }
    
        _backButtonClick(){
          window.location.hash = "";
          //this.selectedDevice = "woonkamer";
          //this.requestUpdate();
          this._update_hass(this._hass);
        }
    
        _entitiesByDomain(entities){
          const entitiesByDomain = {};
    
          for (const entity of entities) {
    
              const domain = entity.substr(0, entity.indexOf("."));
    
              if (
                !TOGGLE_DOMAINS.includes(domain) &&
                !SENSOR_DOMAINS.includes(domain) &&
                !ALERT_DOMAINS.includes(domain) &&
                !CLIMATE_DOMAINS.includes(domain) &&
                !OTHER_DOMAINS.includes(domain)
              ) {
                //console.log(domain);
                continue;
              }
    
              const stateObj = this._hass.states[entity];
    
              if (!stateObj) {
                continue;
              }
    
              if (
                (SENSOR_DOMAINS.includes(domain) || ALERT_DOMAINS.includes(domain)) &&
                !DEVICE_CLASSES[domain].includes(
                  stateObj.attributes.device_class || ""
                )
              ) {
                //console.log(domain);
                continue;
              }
    
              if (!(domain in entitiesByDomain)) {
                entitiesByDomain[domain] = [];
              }
              entitiesByDomain[domain].push(stateObj);
          }
          return entitiesByDomain;
        }
    
        async createCardElement(inputCards){
          const cardInput2 = {
              type: "grid",
              columns: 6,
              cards: inputCards,
          };
          const cardHelper = await cardHelpers;
          const element = await cardHelper.createCardElement(cardInput2);
          element.hass = this._hass;
          //element.setConfig(cardInput2);
    
          //console.log(element);
    
          return element;
        }
    
        async createCardElement2(config){
          const cardHelper = await cardHelpers;
          const element = await cardHelper.createCardElement(config);
          element.hass = hass();
          //element.setConfig(config);
    
          return element;
        }
    
        shouldUpdate(changedProps){
          if (changedProps.has("_hass")) {
            return false;
          }
          return true;
    
          // const oldHass = changedProps.get("hass");
    
          // if (
          //   !oldHass ||
          //   oldHass.themes !== this._hass!.themes ||
          //   oldHass.locale !== this._hass!.locale
          // ) {
          //   return true;
          // }
    
        }
    
        _iconPickerChange(ev){
          console.log(ev);
    
        }
    
        _toggle(ev) {
          ev.stopPropagation();
          const domain = ev.currentTarget.domain;
          if (TOGGLE_DOMAINS.includes(domain)) {
            this._hass.callService(
              domain,
              (ev.currentTarget.state ? "turn_off" : "turn_on"),
              undefined,
              {
                area_id: ev.currentTarget.area_id,
              }
            );
          }
        }
    
        _addLovelaceCard(ev) {
          ev.stopPropagation();
          const domain = ev.currentTarget.domain;
          const position = ev.currentTarget.position;

          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'device.add_card_to') + domain, {
              type: "custom:dwains-create-custom-card-card", 
              domain: domain, 
              position: position,
              page: "devices"
            }, true, '');
          }, 50);
        }
    
        _handleEntityEditClick(ev) {
          ev.stopPropagation();
          const entity = ev.currentTarget.entity;
          const friendlyName = ev.currentTarget.friendlyName;
          const hideEntity = ev.currentTarget.hideEntity;
          const excludeEntity = ev.currentTarget.excludeEntity;
          const disableEntity = ev.currentTarget.disableEntity;
          const colSpan = ev.currentTarget.colSpan;
          const rowSpan = ev.currentTarget.rowSpan;
          const colSpanLg = ev.currentTarget.colSpanLg;
          const rowSpanLg = ev.currentTarget.rowSpanLg;
          const colSpanXl = ev.currentTarget.colSpanXl;
          const rowSpanXl = ev.currentTarget.rowSpanXl;
          const customCard = ev.currentTarget.customCard;
          const customPopup = ev.currentTarget.customPopup;
          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'entity.edit_entity'), {
              type: "custom:dwains-edit-entity-card", 
              entity: entity, 
              friendlyName: friendlyName,
              hideEntity: hideEntity,
              excludeEntity: excludeEntity,
              disableEntity: disableEntity,
              colSpan: colSpan,
              rowSpan: rowSpan,
              colSpanLg: colSpanLg,
              rowSpanLg: rowSpanLg,
              colSpanXl: colSpanXl,
              rowSpanXl: rowSpanXl,
              customCard: customCard,
              customPopup: customPopup,
            }, false, '');
          }, 50);
        }
    
        
        _handleEntityEditCardClick(ev) {
          ev.stopPropagation();
          const entityId = ev.currentTarget.entity;

          let cardConfig, mode;
          if(this.configuration['entity_cards'] && this.configuration['entity_cards'][entityId]){
            //cardConfig = this.configuration['entity_cards'][entityId];
            const friendlyName = this.configuration['entities'][entityId] ? this.configuration['entities'][entityId]['friendly_name'] : "";
            cardConfig = {input_name: friendlyName,input_entity: entityId,...this.configuration['entity_cards'][entityId]};
            mode = "editor-element";
          }

          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'entity.edit_entity_card'), {
              type: "custom:dwains-edit-entity-card-card", 
              entity_id: entityId, 
              cardConfig: cardConfig, 
              mode: mode,
              existingCardEdit: cardConfig ? true : false,
            }, true, '');
          }, 50);
        }

        _handleEntityEditPopupClick(ev) {
          ev.stopPropagation();
          const entityId = ev.currentTarget.entity;

          let cardConfig, mode;
          if(this.configuration['entities_popup'] && this.configuration['entities_popup'][entityId]){
            //cardConfig = this.configuration['entities_popup'][entityId];
            const friendlyName = this.configuration['entities'][entityId] ? this.configuration['entities'][entityId]['friendly_name'] : "";
            cardConfig = {input_name: friendlyName,input_entity: entityId, ...this.configuration['entities_popup'][entityId]};
            mode = "editor-element";
          }

          console.log(cardConfig);

          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'entity.edit_entity_popup_card'), {
              type: "custom:dwains-edit-entity-popup-card", 
              entity_id: entityId, 
              cardConfig: cardConfig, 
              mode: mode,
              existingCardEdit: cardConfig ? true : false,
            }, true, '');
          }, 50);
        }

        _handleDeviceEditClick(ev) {
          ev.stopPropagation();
          const device = ev.currentTarget.device;
          const icon = ev.currentTarget.device_icon;
          const showInNavbar = ev.currentTarget.showInNavbar;
          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'device.edit_device_button'), {
              type: "custom:dwains-edit-device-button-card", 
              device: device, 
              icon: icon,
              showInNavbar: showInNavbar,
            }, false, '');
          }, 50);
        }

        _handleCustomCardEditClick(ev){
          ev.stopPropagation();
          const domain = ev.currentTarget.domain;
          const filename = ev.currentTarget.filename;
    
          const loader = document.createElement("hui-masonry-view");
          loader.lovelace = { editMode: true };
          loader.willUpdate(new Map());

          const colSpan = ev.currentTarget.colSpan;
          const rowSpan = ev.currentTarget.rowSpan;
          const colSpanLg = ev.currentTarget.colSpanLg;
          const rowSpanLg = ev.currentTarget.rowSpanLg;
          const colSpanXl = ev.currentTarget.colSpanXl;
          const rowSpanXl = ev.currentTarget.rowSpanXl;
    
          const cardConfig = this.configuration.device_cards[domain][filename];
          var position = "top";
          if(cardConfig["position"]){
            //Config has the DD position key, but editor doesnt understand that so remove it and parse it to editor
            position = cardConfig["position"];
            delete cardConfig["position"];
          }

          delete cardConfig["col_span"];
          delete cardConfig["row_span"];
          delete cardConfig["col_span_lg"];
          delete cardConfig["row_span_lg"];
          delete cardConfig["col_span_xl"];
          delete cardConfig["row_span_xl"];
    
          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(this._hass.localize("ui.components.entity.entity-picker.edit"), {
              type: "custom:dwains-create-custom-card-card", 
              domain: domain,
              page: "devices",
              mode: "editor-element", 
              cardConfig: cardConfig,
              position: position,
              filename: filename,
              colSpan: colSpan,
              rowSpan: rowSpan,
              colSpanLg: colSpanLg,
              rowSpanLg: rowSpanLg,
              colSpanXl: colSpanXl,
              rowSpanXl: rowSpanXl,
              }, true, '');
          }, 50);
        }

        _handleEntityEditBoolValueClick(ev) {
          ev.stopPropagation();
          const entityId = ev.currentTarget.entity;
          const key = ev.currentTarget.key;
          const value = ev.currentTarget.value;
          
          this._hass.connection.sendMessagePromise({
            type: 'dwains_dashboard/edit_entity_bool_value',
            entityId: entityId,
            key: key,
            value: value,
          }).then(
              (resp) => {
                  console.log(resp);
              },
              (err) => {
                  console.error('Message failed!', err);
              }
          );
        }

        _handleDeviceEditBoolValueClick(ev) {
          ev.stopPropagation();
          const device = ev.currentTarget.device;
          const key = ev.currentTarget.key;
          const value = ev.currentTarget.value;
          
          this._hass.connection.sendMessagePromise({
            type: 'dwains_dashboard/edit_device_bool_value',
            device: device,
            key: key,
            value: value,
          }).then(
              (resp) => {
                  console.log(resp);
              },
              (err) => {
                  console.error('Message failed!', err);
              }
          );
        }

        _handleDeviceEditCardClick(ev) {
          ev.stopPropagation();
          const domain = ev.currentTarget.domain;
    
          let cardConfig, mode;
          if(this.configuration['devices_card'] && this.configuration['devices_card'][domain]){
            cardConfig = this.configuration['devices_card'][domain];
            mode = 'current-selected-blueprint';
          }

          const loader = document.createElement("hui-masonry-view");
          loader.lovelace = { editMode: true };
          loader.willUpdate(new Map());
    
          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'device.edit_device_card')+translateEngine(this._hass, 'device.'+domain), {
              type: "custom:dwains-edit-device-card-card", 
              domain: domain,
              cardConfig: cardConfig,
              existingCardEdit: cardConfig ? true : false,
              mode: mode,
            }, true, '');
          }, 50);
        }
    
        _handleDeviceEditPopupClick(ev) {
          ev.stopPropagation();
          const domain = ev.currentTarget.domain;
    
          let cardConfig, mode;
          if(this.configuration['devices_popup'] && this.configuration['devices_popup'][domain]){
            cardConfig = this.configuration['devices_popup'][domain];
            mode = 'current-selected-blueprint';
          }
    
          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'device.edit_device_popup')+translateEngine(this._hass, 'device.'+domain), {
              type: "custom:dwains-edit-device-popup-card", 
              domain: domain,
              cardConfig: cardConfig,
              existingCardEdit: cardConfig ? true : false,
              mode: mode,
            }, true, '');
          }, 50);
        }
    

        /**
         * Handle when area button is moved
         * @param {evt} evt 
         */
        _deviceButtonMoved(evt){
          this._hass.connection.sendMessagePromise({
            type: 'dwains_dashboard/sort_device_button',
            sortData: JSON.stringify(this._sortable.toArray()),
          }).then(
              (resp) => {
                  console.log(resp);
              },
              (err) => {
                  console.error('Message failed!', err);
              }
          );
        }
        _handleDeviceEditModeClicked(ev){
          ev.stopPropagation();
          const value = ev.currentTarget.value;
    
          if(value){
            if(this.shadowRoot.getElementById("sortable")){
              this._sortable = new Sortable(this.shadowRoot.getElementById("sortable"), {
                forceFallback: true,
                animation: 150,
                dataIdAttr: "data-device",
                handle: '.sortable-move',
                onEnd: async (evt) => this._deviceButtonMoved(evt),
              });
            }
          } else {
            this._sortable.destroy();
            this._sortable = undefined;
          }
          this.deviceEditMode = value;
        }

        _handleDeviceViewEditModeClicked(ev){
          ev.stopPropagation();
          const value = ev.currentTarget.value;

          if(value){
            this._sortable = [];
            const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
            for(var i=0; i<sortableElements.length; i++){
              const sortType = (this.deviceViewDisplayGrouped ? 'devices_grouped_sort_order' : 'devices_sort_order');
              this._sortable[i] = new Sortable(sortableElements[i], {
                  forceFallback: true,
                  animation: 150,
                  dataIdAttr: "data-entity",
                  handle: '.sortable-move',
                  onEnd: function(event){ 
                    hass().connection.sendMessagePromise({
                        type: 'dwains_dashboard/sort_entity',
                        sortData: JSON.stringify(this.toArray()),
                        sortType: sortType
                      }).then(
                          (resp) => {
                              console.log(resp);
                          },
                          (err) => {
                              console.error('Message failed!', err);
                          }
                      );
                  }
              });
            }
          } else {
            this._sortable.forEach(sortElement => sortElement.destroy());
            this._sortable = undefined;
          }
          this.deviceViewEditMode = value;
        }

        _renderDeviceButtonCard(domain, type) {
          return html`
            <div>
              <ha-card class="p-2">
                <span class="break-words">
                ${translateEngine(this._hass, 'device.'+domain)}
                </span>
              </ha-card>
              <ha-card>
                <div class="card-actions">
                  <mwc-button 
                    .device="${domain}"
                    .key=${"hidden"}
                    .value=${false}
                    @click=${this._handleDeviceEditBoolValueClick} 
                  >
                    ${translateEngine(this._hass, 'device.unhide')}
                  </mwc-button>
                </div>
              </ha-card>
            </div>
          `;
        }

        _renderDeviceButton(data){
          //console.log(data.domain);
          return html`
            <div class="relative" data-device='${data.domain}'>
              <div 
                class="flex justify-between h-44 p-3 device-button ${this.selectedDevice == data.domain && !this.configuration['homepage_header']['v2_mode'] ? 'current' : ''}" 
                data-device=${data.domain}
                @click=${this._handleDeviceClick}
              >
                <div class="h-full flex flex-wrap content-between">
                  <div class="w-full ha-icon">
                    ${this.configuration['devices'][data.domain] && this.configuration['devices'][data.domain]['icon'] ? html`
                      <ha-icon
                        class="h-14 w-14"
                        style="color: var(--primary-color);"
                        .icon=${this.configuration['devices'][data.domain]['icon']}
                      ></ha-icon>` 
                      : html`${DOMAIN_ICONS[data.domain] ? html`<ha-icon
                          class="h-14 w-14"
                          style="color: var(--primary-color);"
                          .icon=${DOMAIN_ICONS[data.domain]}></ha-icon>` : ""}`
                    }
                  </div>
                  <div class="w-full">
                    <h3 class="font-semibold text-lg capitalize">${translateEngine(this._hass, 'device.'+data.domain)}</h3>
                  </div>
                </div>
                <div class="row-span-2 text-right space-y-0.5 info">
                  
                </div>
              </div>
              ${this.deviceEditMode ? html`
                <ha-card>
                  <div class="card-actions-multiple">
                    <div class="sortable-move">
                      <ha-icon
                        .icon=${"mdi:cursor-move"}
                      >
                      </ha-icon>
                    </div>
                    <ha-button-menu
                      class="ha-icon-overflow-menu-overflow"
                      corner="BOTTOM_START"
                      absolute
                    >
                      <ha-icon-button
                        .label=${this._hass.localize("ui.common.overflow_menu")}
                        .path=${mdiDotsVertical}
                        slot="trigger"
                      ></ha-icon-button>
                        <mwc-list-item
                          graphic="icon"
                          .device=${data.domain}
                          .device_icon=${this.configuration['devices'][data.domain] && this.configuration['devices'][data.domain]['icon'] ? this.configuration['devices'][data.domain]['icon'] : (DOMAIN_ICONS[data.domain] ? DOMAIN_ICONS[data.domain] : "")}
                          .showInNavbar=${this.configuration['devices'][data.domain] && this.configuration['devices'][data.domain]['show_in_navbar'] ? this.configuration['devices'][data.domain]['show_in_navbar'] : ""}
                          @click=${this._handleDeviceEditClick} 
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:cog"}></ha-icon>
                          </div>
                          ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                        </mwc-list-item>
                    
                        <mwc-list-item
                          graphic="icon"
                          .domain=${data.domain}
                          @click="${this._handleDeviceEditCardClick}"
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                          </div>
                          ${translateEngine(this._hass, 'entity.entity_card')}
                        </mwc-list-item>
                        <mwc-list-item
                          graphic="icon"
                          .domain=${data.domain}
                          @click="${this._handleDeviceEditPopupClick}"
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                          </div>
                          ${translateEngine(this._hass, 'entity.popup_card')}
                        </mwc-list-item>
                        <mwc-list-item
                          graphic="icon"
                          .device=${data.domain}
                          .key=${"hidden"}
                          .value=${true}
                          @click=${this._handleDeviceEditBoolValueClick} 
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:eye-off"}></ha-icon>
                          </div>
                          ${translateEngine(this._hass, 'device.hide')}
                        </mwc-list-item>
                    </ha-button-menu>
                  </div>
                </ha-card>
                ` : ""
              }
            </div>
          `;
        }
    
        _renderDeviceViewCards(data){
          //console.log(data);
          if(!this.deviceViewDisplayGrouped || data.domain == 'person' || data.domain == 'weather' || data.domain == 'alarm_control_panel'){
            data.cards.sort(function (x, y) {
              let a = x.sort_order,
                  b = y.sort_order;
              return a == b ? 0 : a > b ? 1 : -1;
            });

            return html`
            <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
              ${data.cards.map((i) => 
                html`${this._renderDeviceViewCard(i)}`
              )}
            </div>
            `;
          } else {        
            let group = data.cards.reduce((r, a) => {
              //console.log("a", a);
              //console.log('r', r);
              r[a.area.area_id] = [...r[a.area.area_id] || [], a];
              return r;
             }, {});

             //console.log(1, group);

             let sortedGroup = Object.keys(group).sort((x,y) => {
              let a = (this.configuration['areas'][x] && this.configuration['areas'][x]['sort_order'] ? this.configuration['areas'][x] : 1),
                  b = (this.configuration['areas'][y] && this.configuration['areas'][y]['sort_order'] ? this.configuration['areas'][y] : 1);
              return a == b ? 0 : a > b ? 1 : -1;
             });

             //sortedGroup.map(input => );

             //console.log(2,test);

            //  group.sort(function(x,y) {
            //    console.log(x);
            //   let a = x,
            //       b = y;
            //   return a == b ? 0 : a > b ? 1 : -1;
            //  });


            data.cards.sort(function (x, y) {
              let a = x.grouped_sort_order,
                  b = y.grouped_sort_order;
              return a == b ? 0 : a > b ? 1 : -1;
            });
    
            return html`
            <div>
            ${sortedGroup.map((key) => 
              html`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${group[key][0].area.name}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
                  ${Object.entries(group[key]).map(([k,v]) => html`${this._renderDeviceViewCard(v)}`)}
                  </div>
                </div>
              `
            )}
            </div>
            `;
          }
        }
        _renderDeviceViewCard(data){
          return html`
          <div 
            data-entity='${data.entity}'
            class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg} xl-col-span-${data.colSpanXl} xl-row-span-${data.rowSpanXl} relative"
          >
            <div>
              <span class="hidden">${translateEngine(this._hass, 'device.'+data.domain)}<br></span>
              ${data.card}
            </div>
            ${this.deviceViewEditMode ? html`
            <ha-card>
              <div class="card-actions-multiple">
                <div class="sortable-move">
                  <ha-icon
                    .icon=${"mdi:cursor-move"}
                  >
                  </ha-icon>
                </div>
                <ha-button-menu
                  class="ha-icon-overflow-menu-overflow"
                  corner="BOTTOM_START"
                  absolute
                >
                  <ha-icon-button
                    .label=${this._hass.localize("ui.common.overflow_menu")}
                    .path=${mdiDotsVertical}
                    slot="trigger"
                  ></ha-icon-button>
                    <mwc-list-item
                      graphic="icon"
                      .entity="${data.entity}"
                      .friendlyName="${data.friendlyName}"
                      .disableEntity=${data.disableEntity}
                      .hideEntity=${data.hideEntity}
                      .excludeEntity=${data.excludeEntity}
                      .rowSpan=${data.rowSpan}
                      .colSpan=${data.colSpan}
                      .rowSpanLg=${data.rowSpanLg}
                      .colSpanLg=${data.colSpanLg}
                      .rowSpanXl=${data.rowSpanXl}
                      .colSpanXl=${data.colSpanXl}
                      .customCard=${data.customCard}
                      .customPopup=${data.customPopup}
                      @click=${this._handleEntityEditClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:cog"}></ha-icon>
                      </div>
                      ${translateEngine(this._hass, 'entity.settings')}
                    </mwc-list-item>
                    ${data.entity != 't' ? html `
                      <mwc-list-item
                        graphic="icon"
                        .entity="${data.entity}"
                        @click="${this._handleEntityEditCardClick}"
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                        </div>
                        ${translateEngine(this._hass, 'entity.entity_card')}
                      </mwc-list-item>` : ""
                    }
                    ${data.entity != 't' ? html `
                      <mwc-list-item
                        graphic="icon"
                        .entity="${data.entity}"
                        @click="${this._handleEntityEditPopupClick}"
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                        </div>
                        ${translateEngine(this._hass, 'entity.popup_card')}
                      </mwc-list-item>` : ""
                    }
                    <mwc-list-item
                      graphic="icon"
                      .entity="${data.entity}"
                      .key=${"excluded"}
                      .value=${true}
                      @click=${this._handleEntityEditBoolValueClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:table-eye-off"}></ha-icon>
                      </div>
                      ${translateEngine(this._hass, 'entity.exclude')}
                    </mwc-list-item>
                    <mwc-list-item
                      graphic="icon"
                      .entity="${data.entity}"
                      .key=${"hidden"}
                      .value=${true}
                      @click=${this._handleEntityEditBoolValueClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:eye-off"}></ha-icon>
                      </div>
                      ${translateEngine(this._hass, 'entity.hide')}
                    </mwc-list-item>
                    <mwc-list-item
                      graphic="icon"
                      .entity="${data.entity}"
                      .key=${"disabled"}
                      .value=${true}
                      @click=${this._handleEntityEditBoolValueClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:tray-remove"}></ha-icon>
                      </div>
                      ${translateEngine(this._hass, 'entity.disable')}
                    </mwc-list-item>
                </ha-button-menu>
              </div>
            </ha-card>` : ""}
          </div>
          `;
        }

        _renderDeviceViewCustomCards(data, position){
          return html`
          <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 my-4">
            ${position == "bottom" ?  data.customCardsBottom.map((i) => 
              html`${this._renderDeviceViewCustomCard(i)}`
            ) : data.customCardsTop.map((i) => 
              html`${this._renderDeviceViewCustomCard(i)}`
            )}
          </div>
          `;
        }
        _renderDeviceViewCustomCard(data){
          return html`
          <div class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg} xl-col-span-${data.colSpanXl} xl-row-span-${data.rowSpanXl} relative">
            <div>
              ${data.card}
            </div>
            ${this.deviceViewEditMode ? html`
            <ha-card>
              <div class="card-actions">
                <mwc-button 
                  @click=${this._handleCustomCardEditClick} 
                  .domain=${data.domain}
                  .filename=${data.filename}
                  .rowSpan=${data.rowSpan}
                  .colSpan=${data.colSpan}
                  .rowSpanLg=${data.rowSpanLg}
                  .colSpanLg=${data.colSpanLg}
                  .rowSpanXl=${data.rowSpanXl}
                  .colSpanXl=${data.colSpanXl}
                >
                  ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                </mwc-button>
              </div>
            </ha-card>` : ""}
          </div>
          `;
        }


        _handleDeviceViewDisplayGroupedClicked(ev){
          ev.stopPropagation();
    
          const value = ev.currentTarget.value;
          this.deviceViewDisplayGrouped = value;
          Cookies.set('dwains_dashboard_deviceViewDisplayGrouped', value, { expires: 365 });
        }
        _renderAreaViewEntityCard(entity, type) {
          return html`
            <div>
              <ha-card class="p-2">
                ${translateEngine(this._hass, 'entity.title')}:<br>
                <span class="break-words">
                ${entity}
                </span>
              </ha-card>
              <ha-card>
                <div class="card-actions">
                  ${type == 'hidden' ? html`
                  <mwc-button 
                    .entity="${entity}"
                    .key=${"hidden"}
                    .value=${false}
                    @click=${this._handleEntityEditBoolValueClick} 
                  >
                    ${translateEngine(this._hass, 'entity.unhide')}
                  </mwc-button>`: ""}
                  ${type == 'disabled' ? html`
                  <mwc-button 
                    .entity="${entity}"
                    .key=${"disabled"}
                    .value=${false}
                    @click=${this._handleEntityEditBoolValueClick} 
                  >
                    ${translateEngine(this._hass, 'entity.enable')}
                  </mwc-button>`: ""}
                </div>
              </ha-card>
            </div>
          `;
        }

        _renderDeviceView(data){
            const visible = this.selectedDevice == data.domain ? "block" : "hidden";        
    
            return html`
              <div class="w-full mb-12 ${visible}" id="${data.domain}">
                <div class="flex justify-between">
                  <div>
                    <h2 class="font-semibold text-lg capitalize">
                      ${translateEngine(this._hass, 'device.'+data.domain)}
                    </h2>
                    <span class="text-gray">
                      ${data.cards.length} ${translateEngine(this._hass, 'entity.title_plural')}
                    </span>
                  </div>
                  <div>
                    <ha-button-menu
                      class="ha-icon-overflow-menu-overflow"
                      corner="BOTTOM_START"
                      absolute
                    >
                      <ha-icon-button
                        .label=${this._hass.localize("ui.common.overflow_menu")}
                        .path=${mdiDotsVertical}
                        slot="trigger"
                      ></ha-icon-button>
                        ${!this.deviceViewDisplayGrouped ? html `
                          <mwc-list-item
                            graphic="icon"
                            .value=${true}
                            .key=${"deviceViewDisplayGrouped"}
                            @click="${this._handleDeviceViewDisplayGroupedClicked}"
                          >
                            <div slot="graphic">
                              <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                            </div>
                            ${translateEngine(this._hass, 'device.group')}
                          </mwc-list-item>` : html `
                          <mwc-list-item
                            graphic="icon"
                            .value=${false}
                            .key=${"deviceViewDisplayGrouped"}
                            @click="${this._handleDeviceViewDisplayGroupedClicked}"
                          >
                            <div slot="graphic">
                            <ha-icon .icon=${"mdi:grid"}></ha-icon>
                            </div>
                            ${translateEngine(this._hass, 'device.ungroup')}
                          </mwc-list-item>
                          `
                        }
                        ${this._hass.user.is_admin ? html`
                          ${this.deviceViewEditMode ? html `
                            <mwc-list-item
                              graphic="icon"
                              .value=${false}
                              @click=${this._handleDeviceViewEditModeClicked}
                            >
                              <div slot="graphic">
                                <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                              </div>
                              ${translateEngine(this._hass, 'global.disable_edit_mode')}
                            </mwc-list-item>` : html `
                            <mwc-list-item
                              graphic="icon"
                              .value=${true}
                              @click=${this._handleDeviceViewEditModeClicked}
                            >
                              <div slot="graphic">
                                <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                              </div>
                              ${translateEngine(this._hass, 'global.enable_edit_mode')}
                            </mwc-list-item>
                            `
                          }
                        ` : ""}
                    </ha-button-menu>
                  </div>
                </div>
                ${this.deviceViewEditMode ? html `
                <button type="button" 
                  @click=${this._addLovelaceCard}
                  .domain=${data.domain}
                  .position=${"top"}
                  class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                  </svg>
                  <span class="mt-2 block text-sm font-medium text-gray">
                    ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
                  </span>
                </button>` : "" }

                ${this._renderDeviceViewCustomCards(data, "top")}

                ${this._renderDeviceViewCards(data)}

                ${this._renderDeviceViewCustomCards(data, "bottom")}

                ${this.deviceViewEditMode ? html `
                  ${data.entitiesNoState.length ? html`
                    <div class="mb-5">
                      <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass, 'entity.unavailable')}</h3>
                      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                      ${data.entitiesNoState.map((entity) => 
                          html`${this._renderAreaViewEntityCard(entity, 'noState')}`
                      )}
                      </div>
                    </div>` : ""
                  }
                  ${data.entitiesHidden.length ? html`
                    <div class="mb-5">
                      <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass, 'entity.hidden')}</h3>
                      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                      ${data.entitiesHidden.map((entity) => 
                          html`${this._renderAreaViewEntityCard(entity, 'hidden')}`
                      )}
                      </div>
                    </div>` : ""
                  }
                  ${data.entitiesDisabled.length ? html`
                    <div class="mb-5">
                      <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass, 'entity.disabled')}</h3>
                      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                      ${data.entitiesDisabled.map((entity) => 
                          html`${this._renderAreaViewEntityCard(entity, 'disabled')}`
                      )}
                      </div>
                    </div>` : ""
                  }
                `: ""}

                ${this.deviceViewEditMode ? html `
                <button type="button" 
                  @click=${this._addLovelaceCard}
                  .domain=${data.domain}
                  .position=${"bottom"}
                  class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                  </svg>
                  <span class="mt-2 block text-sm font-medium text-gray">
                    ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
                  </span>
                </button>` : "" }
              </div>`;
        }
    
    
        render() {
          //console.log('render()');
    
          if(this.data == null || Object.keys(this.data).length === 0){
            return html``;
          } else {
            return html`
                <div class="flex flex-wrap">
                  <div class="w-full ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-w-1-2 xl-w-1-3"} ${window.location.hash ? (this.configuration['homepage_header']['v2_mode'] ? "hidden" : "hidden lg-block") : ""} p-4">
                    <div id="devices">
                      <div class="flex justify-between mb-2">
                        <div>
                          <h2 class="font-semibold text-lg capitalize">
                            ${translateEngine(this._hass, 'device.title_plural')}
                          </h2>
                          <span class="text-gray">
                            ${Object.keys(this.data).length} ${translateEngine(this._hass, 'device.title_plural')}
                          </span>
                        </div>
                        <div>
                          ${this._hass.user.is_admin ? html`
                          <ha-button-menu
                            class="ha-icon-overflow-menu-overflow"
                            corner="BOTTOM_END"
                            absolute
                          >
                            <ha-icon-button
                              .label=${this._hass.localize("ui.common.overflow_menu")}
                              .path=${mdiDotsVertical}
                              slot="trigger"
                            ></ha-icon-button>
                              ${this.deviceEditMode ? html `
                                <mwc-list-item
                                  graphic="icon"
                                  .value=${false}
                                  @click=${this._handleDeviceEditModeClicked}
                                >
                                  <div slot="graphic">
                                    <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                                  </div>
                                  ${translateEngine(this._hass, 'global.disable_edit_mode')}
                                </mwc-list-item>` : html `
                                <mwc-list-item
                                  graphic="icon"
                                  .value=${true}
                                  @click=${this._handleDeviceEditModeClicked}
                                >
                                  <div slot="graphic">
                                    <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                                  </div>
                                  ${translateEngine(this._hass, 'global.enable_edit_mode')}
                                </mwc-list-item>
                                `
                              }
                          </ha-button-menu>
                          ` : ""}
                        </div>
                      </div>
    
                      <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration['homepage_header']['v2_mode'] ? "lg-grid-cols-4 xl-grid-cols-5" : ""} gap-4" id="sortable">
                        ${Object.values(this.data).map((i) => this._renderDeviceButton(i))}
                      </div>

                      ${this.deviceEditMode ? html `
                        ${this.disabledDevices.length ? html`
                          <div class="mb-5">
                            <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass,'device.hidden')}</h3>
                            <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                            ${this.disabledDevices.map((device) => 
                                html`${this._renderDeviceButtonCard(device, 'disabled')}`
                            )}
                            </div>
                          </div>` : ""
                        }
                      `: ""}
                    </div>
                  </div>
                  <div class="w-full ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-w-1-2 xl-w-2-3"} ${!window.location.hash ? (this.configuration['homepage_header']['v2_mode'] ? "hidden" : "hidden lg-block") : ""} p-4">
                    ${Object.values(this.data).map((i) => this._renderDeviceView(i))}
                  </div>
                </div>
                <div class="sticky z-30 bottom-0 ${!window.location.hash ? "hidden" : ""} ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-hidden"} text-right">
                <div @click=${this._backButtonClick} class="back-button">
                    <div class="button">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                </div>
                </div>
            `;
          }
        }
    
        static get styles() {
          return css`
            .back-button {
              margin-right: 1rem;
              margin-bottom: 3.4rem;
              display: inline-block;
            }
            .back-button .button {
              background-color: var(--secondary-background-color);
              padding: 0.75rem;
              border-radius: 9999px;
              margin-bottom: env(safe-area-inset-bottom);
            }
            .card-actions {
              text-align: right;
            }
            .card-actions-multiple {
              display: flex;
              justify-content: space-between;
              padding: 0.25rem 0.5rem;
            }
            .sortable-move {
              cursor: -webkit-grabbing;
              cursor: grab;
              margin: auto 0;
            }
            .device-button .info ha-icon, .ha-icon ha-icon {
              display: inline-block;
              margin: auto;
              --mdc-icon-size: 100% !important;
              --iron-icon-width: 100% !important;
              --iron-icon-height: 100% !important;
            }
            #badges {
              cursor: pointer;
              background: var( --ha-card-background, var(--card-background-color, white) );
              box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
              color: var(--primary-text-color);
            } 
            .break-words {
              overflow-wrap: break-word;
            }
            .device-button {
              cursor: pointer;
              background: var( --ha-card-background, var(--card-background-color, white) );
              border-radius: var(--ha-card-border-radius, 4px);
              box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
              color: var(--primary-text-color);
            }
            @media (min-width: 1024px) {
              .device-button.current {
                background: transparent;
                z-index: 1;
                position: relative;
              }
              .device-button.current::before {
                content: "";
                position: absolute;
                top: 0; 
                left: 0;
                width: 100%; 
                height: 100%;  
                opacity: .12; 
                z-index: -1;
                background: var(--sidebar-selected-icon-color);
                border-radius: var(--ha-card-border-radius, 4px);
              }
            }
            /*styling tailwind dwains version*/
            *, ::after, ::before {
              box-sizing: border-box;
            }
            h1,h2,h3 {
              margin: 0;
            }
            h3 {
              font-size: 1em;
            }
            .absolute {
              position: absolute
            }
            .relative {
                position: relative
            }
            .sticky {
                position: -webkit-sticky;
                position: sticky
            }
            .top-0 {
                top: 0px
            }
            .bottom-0 {
                bottom: 0px
            }
            .z-30 {
                z-index: 30
            }
            .col-span-1 {
                grid-column: span 1 / span 1
            }
            .col-span-2 {
                grid-column: span 2 / span 2
            }
            .row-span-1 {
                grid-row: span 1 / span 1
            }
            .row-span-2 {
                grid-row: span 2 / span 2
            }
            .my-4 {
                margin-top: 1rem;
                margin-bottom: 1rem
            }
            .mx-auto {
              margin-left: auto;
              margin-right: auto
            }
            .mb-2 {
                margin-bottom: 0.5rem
            }
            .mb-4 {
                margin-bottom: 1rem
            }
            .mt-4 {
                margin-top: 1rem
            }
            .mr-0\.5 {
                margin-right: 0.125rem
            }
            .mr-0 {
                margin-right: 0px
            }
            .mb-12 {
                margin-bottom: 3rem
            }
            .mb-5 {
                margin-bottom: 1.25rem
            }
            .mb-16 {
                margin-bottom: 4rem
            }
            .ml-4 {
                margin-left: 1rem
            }
            .block {
                display: block
            }
            .inline-block {
                display: inline-block
            }
            .flex {
                display: flex
            }
            .inline-flex {
                display: inline-flex
            }
            .grid {
                display: grid
            }
            .hidden {
                display: none
            }
            .h-6 {
                height: 1.5rem
            }
            .h-44 {
                height: 11rem
            }
            .h-full {
                height: 100%
            }
            .h-14 {
                height: 3.5rem
            }
            .h-8 {
                height: 2rem
            }
            .w-full {
                width: 100%
            }
            .w-6 {
                width: 1.5rem
            }
            .w-14 {
                width: 3.5rem
            }
            .w-8 {
                width: 2rem
            }
            .w-12 {
              width: 3rem
            }
            .cursor-pointer {
                cursor: pointer
            }
            .grid-flow-row-dense {
                grid-auto-flow: row dense
            }
            .grid-cols-1 {
                grid-template-columns: repeat(1, minmax(0, 1fr))
            }
            .grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr))
            }
            .flex-wrap {
                flex-wrap: wrap
            }
            .content-between {
                align-content: space-between
            }
            .items-center {
                align-items: center
            }
            .justify-between {
                justify-content: space-between
            }
            .gap-4 {
                gap: 1rem
            }
            .space-y-0.5 > :not([hidden]) ~ :not([hidden]) {
                --tw-space-y-reverse: 0;
                margin-top: calc(0.125rem * calc(1 - var(--tw-space-y-reverse)));
                margin-bottom: calc(0.125rem * var(--tw-space-y-reverse))
            }
            .space-y-0 > :not([hidden]) ~ :not([hidden]) {
                --tw-space-y-reverse: 0;
                margin-top: calc(0px * calc(1 - var(--tw-space-y-reverse)));
                margin-bottom: calc(0px * var(--tw-space-y-reverse))
            }
            .rounded {
                border-radius: 0.25rem
            }
            .rounded-md {
                border-radius: 0.375rem
            }
            .bg-gray-800 {
                --tw-bg-opacity: 1;
                background-color: rgb(31 41 55 / var(--tw-bg-opacity))
            }
            .rounded-lg {
              border-radius: 0.5rem
            }
            .border-2 {
                border-width: 2px
            }
            .border-dashed {
                border-style: dashed
            }
            .border-gray-300 {
                --tw-border-opacity: 1;
                border-color: rgb(209 213 219 / var(--tw-border-opacity))
            }
            .bg-gray-800 {
                --tw-bg-opacity: 1;
                background-color: rgb(31 41 55 / var(--tw-bg-opacity))
            }
            .bg-opacity-50 {
                --tw-bg-opacity: 0.5
            }
            .p-2 {
              padding: 0.5rem;
            }
            .p-4 {
                padding: 1rem
            }
            .p-1 {
                padding: 0.25rem
            }
            .p-3 {
                padding: 0.75rem
            }
            .px-1 {
                padding-left: 0.25rem;
                padding-right: 0.25rem
            }
            .p-12 {
              padding: 3rem
            }
            .py-0\.5 {
                padding-top: 0.125rem;
                padding-bottom: 0.125rem
            }
            .py-0 {
                padding-top: 0px;
                padding-bottom: 0px
            }
            .text-center {
              text-align: center
            }
            .text-right {
                text-align: right
            }
            .text-xl {
                font-size: 1.5rem;
                line-height: 2rem
            }
            .text-lg {
                font-size: 1.125rem;
                line-height: 1.75rem
            }
            .text-sm {
                font-size: 0.875rem;
                line-height: 1.25rem
            }
            .text-xs {
                font-size: 0.75rem;
                line-height: 1rem
            }
            .font-semibold {
                font-weight: 600
            }
            .font-medium {
                font-weight: 500
            }
            .capitalize {
                text-transform: capitalize
            }
            .text-gray {
              color: var(--paper-item-body-secondary-color, var(--secondary-text-color));
            }
            .text-white {
                --tw-text-opacity: 1;
                color: rgb(255 255 255 / var(--tw-text-opacity))
            }
            @media (min-width: 768px) {
                .md-grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr))
                }
            }
            @media (min-width: 1024px) {
                .lg-col-span-1 {
                    grid-column: span 1 / span 1
                }
                .lg-col-span-3 {
                    grid-column: span 3 / span 3
                }
                .lg-col-span-2 {
                    grid-column: span 2 / span 2
                }
                .lg-row-span-1 {
                    grid-row: span 1 / span 1
                }
                .lg-row-span-3 {
                    grid-row: span 3 / span 3
                }
                .lg-row-span-2 {
                    grid-row: span 2 / span 2
                }
                .lg-block {
                    display: block
                }
                .lg-hidden {
                    display: none
                }
                .lg-w-1-2 {
                    width: 50%
                }
                .lg-grid-cols-2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr))
                }
                .lg-grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr))
                }
                .lg-grid-cols-4 {
                  grid-template-columns: repeat(4, minmax(0, 1fr))
                }
            }
            @media (min-width: 1536px) {
              .xl-col-span-1 {
                  grid-column: span 1 / span 1
              }
              .xl-col-span-4 {
                  grid-column: span 4 / span 4
              }
              .xl-col-span-2 {
                  grid-column: span 2 / span 2
              }
              .xl-row-span-1 {
                  grid-row: span 1 / span 1
              }
              .xl-row-span-4 {
                  grid-row: span 4 / span 4
              }
              .xl-row-span-2 {
                  grid-row: span 2 / span 2
              }
              .xl-w-1-3 {
                  width: 33.333333%
              }
              .xl-w-2-3 {
                  width: 66.666667%
              }
              .xl-grid-cols-4 {
                  grid-template-columns: repeat(4, minmax(0, 1fr))
              }
              .xl-grid-cols-5 {
                grid-template-columns: repeat(5, minmax(0, 1fr))
              }
          }
          `
        }
    
        
      }
      customElements.define("devices-card", DevicesCard);
});