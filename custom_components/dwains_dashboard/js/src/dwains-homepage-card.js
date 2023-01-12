import { lovelace_view, hass } from "card-tools/src/hass";
import { moreInfo } from "card-tools/src/more-info";
import { popUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import { mdiDotsVertical, mdiCog } from "@mdi/js";
import { css, html, LitElement } from 'lit-element';
import Cookies from 'js-cookie'
import { 
  WEATHER_ICONS,
  STATES_OFF,
  UNAVAILABLE_STATES,
  SENSOR_DOMAINS,
  ALERT_DOMAINS,
  TOGGLE_DOMAINS,
  CLIMATE_DOMAINS,
  OTHER_DOMAINS,
  DEVICE_CLASSES,
  DOMAIN_STATE_ICONS,
  DOMAIN_ICONS,
  ALARM_ICONS,
  SUPPORTED_CARDS_WITH_ENTITY
 } from './variables'
import { computeDomain} from 'custom-card-helpers';
import Sortable from 'sortablejs/modular/sortable.complete.esm.js';
import translateEngine from './translate-engine';
import { closePopup } from "./helpers";

const bases2 = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases2).then(() => {
  
  const cardHelpers = window.loadCardHelpers()
    ? window.loadCardHelpers()
    : undefined;

  class DwainsCreateCustomCardCard extends LitElement {
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
        .card-dd-settings {
          padding: 0.75rem;
          border: 2px solid grey;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 1rem;
        }
        ha-select, ha-textfield, mwc-formfield {
          width: 100%;
        }
        h2,h3 {
          margin: 0;
          font-size: 1rem;
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
      this.mode = config.mode ? config.mode : 'pre-select'; //Set default mode to hui-card-picker
      this.area_id = config.area ? config.area : "";
      this.domain = config.domain ? config.domain : "";
      this.position = config.position;
      this.page = config.page;
      if(config.cardConfig){
        const cardConfig = config.cardConfig;
        delete cardConfig["input_entity"];
        delete cardConfig["input_name"];
        this.cardConfig = cardConfig;
      } else {
        this.cardConfig = "";
      }  
      this.filename = config.filename ? config.filename.replace(".yaml", "") : "";
      this.name = config.name ? config.name : "Dwains Dashboard";

      this.rowSpan = config.rowSpan ? config.rowSpan : "1";
      this.colSpan = config.colSpan ? config.colSpan : "1";

      this.rowSpanLg = config.rowSpanLg ? config.rowSpanLg : "1";
      this.colSpanLg = config.colSpanLg ? config.colSpanLg : "1";

      this.rowSpanXl = config.rowSpanXl ? config.rowSpanXl : "1";
      this.colSpanXl = config.colSpanXl ? config.colSpanXl : "1";

      const loader = document.createElement("hui-masonry-view");
      loader.lovelace = { editMode: true };
      loader.willUpdate(new Map());
    }
    async connectedCallback(){
      super.connectedCallback();

      await this._loadBlueprints();
  
      // //loadHaYamlEditor Start
      //   if (customElements.get("ha-yaml-editor")) return;

      //   // Load in ha-yaml-editor from developer-tools-service
      //   const ppResolver = document.createElement("partial-panel-resolver");
      //   const routes = (ppResolver).getRoutes([
      //     {
      //       component_name: "developer-tools",
      //       url_path: "a",
      //     },
      //   ]);
      //   await routes.routes.a.load();
      //   const devToolsRouter = document.createElement("developer-tools-router");
      //   await (devToolsRouter).routerOptions.routes.service.load();
      // //loadHaYamlEditor End
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
    magicStuff(ev) {
      //console.log(ev.detail.config);
      this.cardConfig = ev.detail.config;
      this.mode = 'editor-element';
      this.requestUpdate();
    }
    magicStuffSecond(ev){
      //console.log(ev);
    }
    _sendCard(){
      const cardData = JSON.stringify(this.cardConfig);
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/add_card',
        card_data: cardData,
        area_id: this.area_id,
        domain: this.domain,
        position: this.position,
        filename: this.filename,
        page: this.page,
        rowSpan: this.rowSpan,
        colSpan: this.colSpan,
        rowSpanLg: this.rowSpanLg,
        colSpanLg: this.colSpanLg,
        rowSpanXl: this.rowSpanXl,
        colSpanXl: this.colSpanXl,
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
    _removeCard(){
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/remove_card',
        area_id: this.area_id,
        domain: this.domain,
        filename: this.filename,
        page: this.page,
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
    _switchMode(ev){
      const mode = ev.currentTarget.mode;
      this.mode = mode;
      this.requestUpdate();
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

      //this.mode = 'dwains-dashboard-blueprint-selected';
      this.mode = 'editor-element';
      this.name = this.blueprints["blueprints"][blueprint]["blueprint"]["name"];
      this.cardConfig = {
          "type": "custom:dwains-blueprint-card",
          "blueprint": blueprint,
          "card": this.blueprints["blueprints"][blueprint]['card']
      };
    }
    _installBlueprintYamlChanged(e) {
      this.installBlueprintYaml = e.target.yaml;
    }
    _handleInstallBlueprintClicked(ev) {
      if(!this.installBlueprintYaml){
        alert('No YAML code entered!');
      }
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
    _haSelectChanged(ev) {
      ev.stopPropagation();
      const type = ev.target.type;
      this[type] = ev.target.value;
    }
    _stopPropagation(ev){
      ev.stopPropagation();
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
      if(this.mode == 'pre-select') {
        return html`
          <mwc-list>
            <mwc-list-item twoline .mode=${"hui-card-picker"} @click=${this._switchMode}>
              ${translateEngine(this.hass, 'editor.lovelace_card')}
              <span slot="secondary">
                ${translateEngine(this.hass, 'editor.create_lovelace_card')}
              </span>
            </mwc-list-item>
            <li divider role="separator"></li>
            <mwc-list-item hasmeta twoline .mode=${"dwains-dashboard-blueprint-select"} @click=${this._switchMode}>
              ${translateEngine(this.hass, 'editor.dwains_dashboard_blueprint')}
              <span slot="secondary">
                ${translateEngine(this.hass, 'editor.use_dwains_dashboard_blueprint')}
              </span>
              <ha-icon-next slot="meta"></ha-icon-next
            ></mwc-list-item>
          </mwc-list>
        `;
      }
      if(this.mode == 'dwains-dashboard-blueprint-select'){
        const blueprintsSorted = Object.entries(this.blueprints['blueprints']).sort(function (x, y) {
          let a = x[1].blueprint.type,
              b = y[1].blueprint.type;
          return a == b ? 0 : a > b ? 1 : -1;
        });
        return html`
        <div class="edit-element">

          <div style="margin-bottom: 20px;">
            <mwc-button .mode=${"pre-select"} @click=${this._switchMode}>< ${this.hass.localize("ui.common.previous")}</mwc-button>
          </div>

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
              ${Object.values(blueprintsSorted).length == 0 ? html `
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
                            ${v[1]["blueprint"]["type"] == "card"  ? html`
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
      }
      if(this.mode == 'hui-card-picker'){
        return html`
          <div class="edit-element">
            <h1 style="font-size: 17px; font-weight: bold;">Select the card you want to add to ${this.name}</h1>
            <hui-card-picker
              @config-changed=${this.magicStuff}
              .hass=${this.hass}
              .lovelace=${{views: []}}
            ></hui-card-picker>
            <div class="card-footer">
              <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                ${this.hass.localize("ui.common.cancel")}
              </mwc-button>
            </div>
          </div>
        `;
      }
      if(this.mode == 'editor-element') {
        return html`
          <div class="edit-element">
            <div class="card-dd-settings">
              
            <h2>${translateEngine(this.hass, 'editor.default_col_row')}</h2>
            <div class="grid-2">
              <ha-select
                .label=${translateEngine(this.hass, 'editor.row_span')}
                .value=${this.rowSpan}
                .type=${"rowSpan"}
                name="rowSpan"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.row')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
              </ha-select>
              <ha-select
                .label=${translateEngine(this.hass, 'editor.col_span')}
                .value=${this.colSpan}
                .type=${"colSpan"}
                name="colSpan"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.column')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
              </ha-select>
            </div>

            <h2>${translateEngine(this.hass, 'editor.large_col_row')}</h2>
            <div class="grid-2">
              <ha-select
                .label=${translateEngine(this.hass, 'editor.row_span')}
                .value=${this.rowSpanLg}
                .type=${"rowSpanLg"}
                name="rowSpanLg"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.row')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
                <mwc-list-item value="3">3 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
              </ha-select>
              <ha-select
                .label=${translateEngine(this.hass, 'editor.col_span')}
                .value=${this.colSpanLg}
                .type=${"colSpanLg"}
                name="colSpanLg"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.column')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
                <mwc-list-item value="3">3 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
              </ha-select>
            </div>

            <h2>${translateEngine(this.hass, 'editor.extra_large_col_row')}</h2>
            <div class="grid-2">
              <ha-select
                .label=${translateEngine(this.hass, 'editor.row_span')}
                .value=${this.rowSpanXl}
                .type=${"rowSpanXl"}
                name="rowSpanXl"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.row')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
                <mwc-list-item value="4">3 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
                <mwc-list-item value="4">4 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
              </ha-select>
              <ha-select
                .label=${translateEngine(this.hass, 'editor.col_span')}
                .value=${this.colSpanXl}
                .type=${"colSpanXl"}
                name="colSpanXl"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.column')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
                <mwc-list-item value="3">3 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
                <mwc-list-item value="4">4 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
              </ha-select>
            </div>
            </div>
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
            <div class="card-footer">
              ${this.filename ? html `<mwc-button @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</mwc-button>` : ""}
              <mwc-button @click=${this._sendCard}>${this.hass.localize("ui.common.submit")}</mwc-button>
            </div>
          </div>
        `;
      }
    }
  }
  customElements.define("dwains-create-custom-card-card", DwainsCreateCustomCardCard);


  class DwainsEditEntityCardCard extends LitElement {
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
      this.mode = config.mode ? config.mode : 'pre-select'; //Set default mode to hui-card-picker
      this.entity_id = config.entity_id;

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
    magicStuff(ev) {
      //console.log(ev.detail.config);

      //Lets start with this, ugly, but fix it later...
      const cardType = ev.detail.config.type;
      if(SUPPORTED_CARDS_WITH_ENTITY.includes(cardType)){
        this.cardConfig = {...ev.detail.config, entity: this.entity_id};
      } else {
        this.cardConfig = ev.detail.config;
      }
      this.mode = 'editor-element';
      this.requestUpdate();
    }
    magicStuffSecond(ev){
      //console.log(ev);
    }
    _sendCard(){
      const cardData = JSON.stringify(this.cardConfig);
      //console.log(cardData);
      //Here parse it with websocket to my integration?
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity_card',
        cardData: cardData,
        entityId: this.entity_id,
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
    _switchMode(ev){
      const mode = ev.currentTarget.mode;
      this.mode = mode;
      this.requestUpdate();
    }
    _removeCard(){
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/remove_entity_card',
        entityId: this.entity_id,
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

      //this.mode = 'dwains-dashboard-blueprint-selected';
      this.mode = 'editor-element';
      this.name = this.blueprints["blueprints"][blueprint]["blueprint"]["name"];
      this.cardConfig = {
          "type": "custom:dwains-blueprint-card",
          "blueprint": blueprint,
          "input_entity": this.entity_id,
          "card": this.blueprints["blueprints"][blueprint]['card'],
      };
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

      if(this.mode == 'pre-select') {
        return html`
          <mwc-list>
            <mwc-list-item twoline .mode=${"hui-card-picker"} @click=${this._switchMode}>
              ${translateEngine(this.hass, 'editor.lovelace_card')}
              <span slot="secondary">
                ${translateEngine(this.hass, 'editor.create_lovelace_card')}
              </span>
            </mwc-list-item>
            <li divider role="separator"></li>
            <mwc-list-item hasmeta twoline .mode=${"dwains-dashboard-blueprint-select"} @click=${this._switchMode}>
              ${translateEngine(this.hass, 'editor.dwains_dashboard_blueprint')}
              <span slot="secondary">
                ${translateEngine(this.hass, 'editor.use_dwains_dashboard_blueprint')}
              </span>
              <ha-icon-next slot="meta"></ha-icon-next
            ></mwc-list-item>
          </mwc-list>
        `;
      }
      if(this.mode == 'dwains-dashboard-blueprint-select'){
        const blueprintsSorted = Object.entries(this.blueprints['blueprints']).sort(function (x, y) {
          let a = x[1].blueprint.type,
              b = y[1].blueprint.type;
          return a == b ? 0 : a > b ? 1 : -1;
        });
        // Object.entries(blueprintsSorted).map(([k,v]) => {
        //   console.log(v[0]);
        //   console.log(v[1]["blueprint"]["name"]);
        // });
        return html`
        <div class="edit-element">

          <div style="margin-bottom: 20px;">
            <mwc-button .mode=${"pre-select"} @click=${this._switchMode}>< ${this.hass.localize("ui.common.previous")}</mwc-button>
          </div>

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
                              ${v[1]["blueprint"]["type"] == "card" || v[1]["blueprint"]["type"] == "replace-card" ? html`
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
      }
      if(this.mode == 'hui-card-picker'){
        return html`
          <div class="edit-element">
            <h1 style="font-size: 17px; font-weight: bold;">Select the card you want to use for ${this.entity_id}</h1>
            <hui-card-picker
              @config-changed=${this.magicStuff}
              .hass=${this.hass}
              .lovelace=${{views: []}}
            ></hui-card-picker>
            <div class="card-footer">
              <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                ${this.hass.localize("ui.common.cancel")}
              </mwc-button>
            </div>
          </div>
        `;
      } else {
        return html`
          <div class="edit-element">
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
            <div class="card-footer-multiple">
              ${
                this.existingCardEdit ? html `
                  <div>
                    <mwc-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</mwc-button>
                    <mwc-button class="warning" @click=${(e) => this.mode = 'hui-card-picker'}}>${this.hass.localize("ui.common.previous")}</mwc-button>
                  </div>
                ` : html`<div></div>`
              }
              <div>
                <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                  ${this.hass.localize("ui.common.cancel")}
                </mwc-button>
                <mwc-button slot="primaryAction" @click=${this._sendCard}>
                  ${this.hass.localize("ui.common.submit")}
                </mwc-button>
              </div>
            </div>
          </div>
        `;
      }
    }
  }
  customElements.define("dwains-edit-entity-card-card", DwainsEditEntityCardCard);
  

  class DwainsEditEntityPopupCard extends LitElement {
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
      this.mode = config.mode ? config.mode : 'pre-select'; //Set default mode to hui-card-picker
      this.entity_id = config.entity_id;
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

    magicStuff(ev) {
      //console.log(ev.detail.config);
      //Lets start with this, ugly, but fix it later...
      const cardType = ev.detail.config.type;
      if(SUPPORTED_CARDS_WITH_ENTITY.includes(cardType)){
        this.cardConfig = {...ev.detail.config, entity: this.entity_id};
      } else {
        this.cardConfig = ev.detail.config;
      }
      this.mode = 'editor-element';
      this.requestUpdate();
    }
    magicStuffSecond(ev){
      //console.log(ev);
    }
    _sendCard(){
      const cardData = JSON.stringify(this.cardConfig);
      //console.log(cardData);
      //Here parse it with websocket to my integration?
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity_popup',
        cardData: cardData,
        entityId: this.entity_id,
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
    _switchMode(ev){
      const mode = ev.currentTarget.mode;
      this.mode = mode;
      this.requestUpdate();
    }
    _removeCard(){
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/remove_entity_popup',
        entityId: this.entity_id,
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

      //this.mode = 'dwains-dashboard-blueprint-selected';
      this.mode = 'editor-element';
      this.name = this.blueprints["blueprints"][blueprint]["blueprint"]["name"];
      this.cardConfig = {
          "type": "custom:dwains-blueprint-card",
          "blueprint": blueprint,
          "input_entity": this.entity_id,
          "card": this.blueprints["blueprints"][blueprint]['card']
      };
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
      if(this.mode == 'pre-select') {
        return html`
          <mwc-list>
            <mwc-list-item twoline .mode=${"hui-card-picker"} @click=${this._switchMode}>
              ${translateEngine(this.hass, 'editor.lovelace_card')}
              <span slot="secondary">
                ${translateEngine(this.hass, 'editor.create_lovelace_card')}
              </span>
            </mwc-list-item>
            <li divider role="separator"></li>
            <mwc-list-item hasmeta twoline .mode=${"dwains-dashboard-blueprint-select"} @click=${this._switchMode}>
              ${translateEngine(this.hass, 'editor.dwains_dashboard_blueprint')}
              <span slot="secondary">
                ${translateEngine(this.hass, 'editor.use_dwains_dashboard_blueprint')}
              </span>
              <ha-icon-next slot="meta"></ha-icon-next
            ></mwc-list-item>
          </mwc-list>
        `;
      }
      if(this.mode == 'dwains-dashboard-blueprint-select'){
        const blueprintsSorted = Object.entries(this.blueprints['blueprints']).sort(function (x, y) {
          let a = x[1].blueprint.type,
              b = y[1].blueprint.type;
          return a == b ? 0 : a > b ? 1 : -1;
        });
        return html`
        <div class="edit-element">

          <div style="margin-bottom: 20px;">
            <mwc-button .mode=${"pre-select"} @click=${this._switchMode}>< ${this.hass.localize("ui.common.previous")}</mwc-button>
          </div>

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
                            ${v[1]["blueprint"]["type"] == "card" || v[1]["blueprint"]["type"] == "replace-card" ? html`
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
      }
      if(this.mode == 'hui-card-picker'){
        return html`
          <div class="edit-element">
            <h1 style="font-size: 17px; font-weight: bold;">Select the popup card you want to use for ${this.entity_id}</h1>
            <hui-card-picker
              @config-changed=${this.magicStuff}
              .hass=${this.hass}
              .lovelace=${{views: []}}
            ></hui-card-picker>
            <div class="card-footer">
              <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                ${this.hass.localize("ui.common.cancel")}
              </mwc-button>
            </div>
          </div>
        `;
      } else {
        return html`
          <div class="edit-element">
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
            <div class="card-footer-multiple">
              ${
                this.existingCardEdit ? html `
                  <div>
                    <mwc-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</mwc-button>
                    <mwc-button class="warning" @click=${(e) => this.mode = 'hui-card-picker'}}>${this.hass.localize("ui.common.previous")}</mwc-button>
                  </div>
                ` : html`<div></div>`
              }
              <div>
                <mwc-button slot="secondaryAction" @click=${(e) => closePopup()}>
                  ${this.hass.localize("ui.common.cancel")}
                </mwc-button>
                <mwc-button slot="primaryAction" @click=${this._sendCard}>
                  ${this.hass.localize("ui.common.submit")}
                </mwc-button>
              </div>
            </div>
          </div>
        `;
      }
    }
  }
  customElements.define("dwains-edit-entity-popup-card", DwainsEditEntityPopupCard);



  class DwainsEditEntityCard extends LitElement {
    static get styles() {
      return [
        css`
        h2 {
          margin: 0;
          font-size: 1rem;
        }
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
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 1rem;
        }
        ha-select, ha-textfield, mwc-formfield {
          width: 100%;
        }
        `
      ]
    }
    setConfig(config) {
      this.hass = hass();
      this.entity = config.entity;
      this.friendlyName = config.friendlyName ? config.friendlyName : "";

      this.hideEntity = config.hideEntity ? config.hideEntity : false;
      this.disableEntity = config.disableEntity ? config.disableEntity : false;
      this.excludeEntity = config.excludeEntity ? config.excludeEntity : false;

      this.rowSpan = config.rowSpan ? config.rowSpan : "1";
      this.colSpan = config.colSpan ? config.colSpan : "1";

      this.rowSpanLg = config.rowSpanLg ? config.rowSpanLg : "1";
      this.colSpanLg = config.colSpanLg ? config.colSpanLg : "1";

      this.rowSpanXl = config.rowSpanXl ? config.rowSpanXl : "1";
      this.colSpanXl = config.colSpanXl ? config.colSpanXl : "1";

      this.customCard = config.customCard ? config.customCard : false;
      this.customPopup = config.customPopup ? config.customPopup : false;
    }
    _saveButton(ev){
      ev.stopPropagation();
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity',
        entity: this.entity,
        friendlyName: this.friendlyName,

        disableEntity: this.disableEntity,
        hideEntity: this.hideEntity,
        excludeEntity: this.excludeEntity,

        rowSpan: this.rowSpan,
        colSpan: this.colSpan,
        rowSpanLg: this.rowSpanLg,
        colSpanLg: this.colSpanLg,
        rowSpanXl: this.rowSpanXl,
        colSpanXl: this.colSpanXl,

        customCard: this.customCard,
        customPopup: this.customPopup,
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
    _friendlyNameChanged(e) {
      this.friendlyName = e.target.value;
    }
    _disableValueChanged(ev) {
      this.disableEntity = ev.target.checked;
    }
    _hideValueChanged(ev) {
      this.hideEntity = ev.target.checked;
    }
    _excludeValueChanged(ev) {
      this.excludeEntity = ev.target.checked;
    }
    _customCardValueChanged(ev) {
      this.customCard = ev.target.checked;
    }
    _customPopupValueChanged(ev) {
      this.customPopup = ev.target.checked;
    }
    _haSelectChanged(ev) {
      ev.stopPropagation();
      const type = ev.target.type;
      this[type] = ev.target.value;
    }
    _stopPropagation(ev){
      ev.stopPropagation();
    }
    render() {
      return html`
        <div class="edit-element">
            <h1 style="font-size: 15px; font-weight: bold;">${translateEngine(this.hass, 'entity.edit_entity')} "${this.entity}"</h1>

            <ha-textfield 
              .label=${translateEngine(this.hass, 'entity.friendly_name')}
              .value=${this.friendlyName}
              @input=${this._friendlyNameChanged}
            ></ha-textfield>

            <h2>${translateEngine(this.hass, 'editor.default_col_row')}</h2>
            <div class="grid-2">
              <ha-select
                .label=${translateEngine(this.hass, 'editor.row_span')}
                .value=${this.rowSpan}
                .type=${"rowSpan"}
                name="rowSpan"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.row')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
              </ha-select>
              <ha-select
                .label=${translateEngine(this.hass, 'editor.col_span')}
                .value=${this.colSpan}
                .type=${"colSpan"}
                name="colSpan"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.column')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
              </ha-select>
            </div>

            <h2>${translateEngine(this.hass, 'editor.large_col_row')}</h2>
            <div class="grid-2">
              <ha-select
                .label=${translateEngine(this.hass, 'editor.row_span')}
                .value=${this.rowSpanLg}
                .type=${"rowSpanLg"}
                name="rowSpanLg"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.row')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
                <mwc-list-item value="3">3 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
              </ha-select>
              <ha-select
                .label=${translateEngine(this.hass, 'editor.col_span')}
                .value=${this.colSpanLg}
                .type=${"colSpanLg"}
                name="colSpanLg"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.column')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
                <mwc-list-item value="3">3 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
              </ha-select>
            </div>

            <h2>${translateEngine(this.hass, 'editor.extra_large_col_row')}</h2>
            <div class="grid-2">
              <ha-select
                .label=${translateEngine(this.hass, 'editor.row_span')}
                .value=${this.rowSpanXl}
                .type=${translateEngine(this.hass, 'editor.row_span')}
                name="rowSpanXl"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.row')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
                <mwc-list-item value="4">3 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
                <mwc-list-item value="4">4 ${translateEngine(this.hass, 'editor.rows')}</mwc-list-item>
              </ha-select>
              <ha-select
                .label=${translateEngine(this.hass, 'editor.col_span')}
                .value=${this.colSpanXl}
                .type=${"colSpanXl"}
                name="colSpanXl"
                @selected=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <mwc-list-item value="1">1 ${translateEngine(this.hass, 'editor.column')}</mwc-list-item>
                <mwc-list-item value="2">2 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
                <mwc-list-item value="3">3 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
                <mwc-list-item value="4">4 ${translateEngine(this.hass, 'editor.columns')}</mwc-list-item>
              </ha-select>
            </div>

            <mwc-formfield .label=${translateEngine(this.hass, 'entity.disable')}>
              <ha-checkbox
                @change=${this._disableValueChanged}
                .checked=${this.disableEntity}
              ></ha-checkbox>
            </mwc-formfield>
            <mwc-formfield .label=${translateEngine(this.hass, 'entity.hide')}>
              <ha-checkbox
                @change=${this._hideValueChanged}
                .checked=${this.hideEntity}
              ></ha-checkbox>
            </mwc-formfield>
            <mwc-formfield .label=${translateEngine(this.hass, 'entity.exclude')}>
              <ha-checkbox
                @change=${this._excludeValueChanged}
                .checked=${this.excludeEntity}
              ></ha-checkbox>
            </mwc-formfield>
            <mwc-formfield .label=${translateEngine(this.hass, 'entity.use_entity_card')}>
              <ha-checkbox
                @change=${this._customCardValueChanged}
                .checked=${this.customCard}
              ></ha-checkbox>
            </mwc-formfield>
            <mwc-formfield .label=${translateEngine(this.hass, 'entity.use_popup_card')}>
              <ha-checkbox
                @change=${this._customPopupValueChanged}
                .checked=${this.customPopup}
              ></ha-checkbox>
            </mwc-formfield>

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
  customElements.define("dwains-edit-entity-card", DwainsEditEntityCard);



  class DwainsEditAreaButtonCard extends LitElement {
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
        `
      ]
    }
    setConfig(config) {
      this.hass = hass();
      this.areaId = config.areaId;
      this.icon = config.icon ? config.icon : "";
      this.floor = config.floor ? config.floor : "";
      this.disableArea = config.disableArea ? config.disableArea : false;
    }
    async connectedCallback(){
      //console.log('connectedCallBack');
      super.connectedCallback();

      // //loadHaYamlEditor Start
      //   if (customElements.get("ha-yaml-editor")) return;

      //   // Load in ha-yaml-editor from developer-tools-service
      //   const ppResolver = document.createElement("partial-panel-resolver");
      //   const routes = (ppResolver).getRoutes([
      //     {
      //       component_name: "developer-tools",
      //       url_path: "a",
      //     },
      //   ]);
      //   await routes.routes.a.load();
      //   const devToolsRouter = document.createElement("developer-tools-router");
      //   await (devToolsRouter).routerOptions.routes.service.load();
      // //loadHaYamlEditor End
      const ch = await window.loadCardHelpers();
      const c = await ch.createCardElement({ type: "button" });
      await c.constructor.getConfigElement();
    }
    _iconPickerChange(ev){
      this.icon = ev.detail['value'];
    }
    _floorChanged(ev){
      this.floor = ev.target.value;
    }
    _disableValueChanged(ev) {
      this.disableArea = ev.target.checked;
    }
    _saveButton(ev){
      ev.stopPropagation();
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_area_button',
        icon: this.icon,
        areaId: this.areaId,
        floor: this.floor,
        disableArea: this.disableArea,
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
            .label=${translateEngine(this.hass, 'area.icon')}
            .value=${this.icon}
            .name=${translateEngine(this.hass, 'area.icon')}
            @value-changed=${this._iconPickerChange}
          ></ha-icon-picker>
          <ha-textfield
            .label=${translateEngine(this.hass, 'area.floor')}
            .name=${translateEngine(this.hass, 'area.floor')}
            .value=${this.floor}
            .style=${"width: 100%"}
            @input=${this._floorChanged}
          ></ha-textfield>
          <mwc-formfield .label=${translateEngine(this.hass, 'area.disable')}>
            <ha-checkbox
              @change=${this._disableValueChanged}
              .checked=${this.disableArea}
            ></ha-checkbox>
          </mwc-formfield>
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
  customElements.define("dwains-edit-area-button-card", DwainsEditAreaButtonCard);

  class DwainsEditHomepageHeaderCard extends LitElement {

    static get styles() {
      return [
        css`
        .w-full {
          width: 100%;
        }
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
        .block {
          display: block;
        }
        .hidden {
          display: none;
        }
        `
      ]
    }
    static get properties() {
      return {
        configuration: {},
      }
    }
    setConfig(config) {
      this.hass = hass();
      this.disableClock = config.disableClock ? config.disableClock : false;
      this.amPmClock = config.amPmClock ? config.amPmClock : false;
      this.disableWelcomeMessage = config.disableWelcomeMessage ? config.disableWelcomeMessage : false;
      this.v2Mode = config.v2Mode ? config.v2Mode : false;
      this.weatherEntity = config.weatherEntity ? config.weatherEntity : "";
      this.alarmEntity = config.alarmEntity ? config.alarmEntity : "";
      this.selectedTab = 1;
    }
    async connectedCallback(){
      //console.log('connectedCallBack');
      super.connectedCallback();

      // First we get an entities card element
      const cardHelpers = await window.loadCardHelpers();
      const entitiesCard = await cardHelpers.createCardElement({type: "entities", entities: []}); // A valid config avoids errors

      // Then we make it load its editor through the static getConfigElement method
      entitiesCard.constructor.getConfigElement();

  
      await this._loadConfiguration();
    }
    async _loadConfiguration(){
      //Load configuration
      this.configuration = await this.hass.callWS({
        type: 'dwains_dashboard/configuration/get'
      });
    }

    _disableClockValueChanged(ev) {
      this.disableClock = ev.target.checked;
    }
    _amPmClockValueChanged(ev) {
      this.amPmClock = ev.target.checked;
    }
    _disableWelcomeMessageValueChanged(ev) {
      this.disableWelcomeMessage = ev.target.checked;
    }
    _v2ModeValueChanged(ev) {
      this.v2Mode = ev.target.checked;
    }
    _weatherEntityPicked(ev){
      this.weatherEntity = ev.detail.value;
    }
    _alarmEntityPicked(ev){
      this.alarmEntity = ev.detail.value;
    }
    
    _saveButton(ev){
      ev.stopPropagation();
      this.hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_homepage_header',
        disableClock: this.disableClock,
        amPmClock: this.amPmClock,
        disableWelcomeMessage: this.disableWelcomeMessage,
        v2Mode: this.v2Mode,
        weatherEntity: this.weatherEntity ? this.weatherEntity : "",
        alarmEntity: this.alarmEntity ? this.alarmEntity : "",
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
    _handleTabClick(ev){
      const page = ev.currentTarget.page;
      this.selectedTab = page;

      this.requestUpdate();
    }

    render() {
      if(!this.configuration || this.configuration.length === 0){
        return html``;
      }
      return html`
      <div class="edit-element">
        <paper-tabs selected="${this.selectedTab}">
            <paper-tab .page=${"1"} @click=${this._handleTabClick}">${translateEngine(this.hass, 'global.settings')}</paper-tab>
            <paper-tab .page=${"2"} @click=${this._handleTabClick}">${translateEngine(this.hass, 'global.dashboard_information')}</paper-tab>
        </paper-tabs>
        <div class=${this.selectedTab == 1 ? 'block' : "hidden"}>
          <div class="w-full">
          <mwc-formfield .label=${translateEngine(this.hass, 'global.disable_clock')}>
            <ha-checkbox
              @change=${this._disableClockValueChanged}
              .checked=${this.disableClock}
            ></ha-checkbox>
          </mwc-formfield>
          </div>
          <div class="w-full">
          <mwc-formfield .label=${translateEngine(this.hass, 'global.am_pm_clock')}>
            <ha-checkbox
              @change=${this._amPmClockValueChanged}
              .checked=${this.amPmClock}
            ></ha-checkbox>
          </mwc-formfield>
          </div>
          <div class="w-full">
          <mwc-formfield .label=${translateEngine(this.hass, 'global.disable_welcome_message')}>
            <ha-checkbox
              @change=${this._disableWelcomeMessageValueChanged}
              .checked=${this.disableWelcomeMessage}
            ></ha-checkbox>
          </mwc-formfield>
          </div>
          <div class="w-full">
          <mwc-formfield .label=${translateEngine(this.hass, 'global.v2_mode')}>
            <ha-checkbox
              @change=${this._v2ModeValueChanged}
              .checked=${this.v2Mode}
            ></ha-checkbox>
          </mwc-formfield>
          </div>
          <ha-entity-picker 
            .hass=${this.hass}
            .label=${translateEngine(this.hass, 'global.weather_entity')}
            .value=${this.weatherEntity}
            .includeDomains=${["weather"]}
            @value-changed=${this._weatherEntityPicked}
          ></ha-entity-picker>
          <ha-entity-picker 
            .hass=${this.hass}
            .label=${translateEngine(this.hass, 'global.alarm_entity')}
            .includeDomains=${["alarm_control_panel"]}
            .value=${this.alarmEntity}
            @value-changed=${this._alarmEntityPicked}
          ></ha-entity-picker>
        </div>
        <div class=${this.selectedTab == 2 ? 'block' : "hidden"}>
          <strong>Dwains Dashboard</strong><br>
          Created by Dwain Scheeren<br>
          Version ${this.configuration.installed_version}
        </div>
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
  customElements.define("dwains-edit-homepage-header-card", DwainsEditHomepageHeaderCard);












  class HomepageCard extends LitElement {
    static get properties() {
      return {
        data: {},
        favorites: {},
        favoriteEditMode: {},
        selectedArea: {},
        areaEditMode: {},
        areaViewEditMode: {},
        areaViewDisplayGrouped: {},
        areaDisplayGrouped: {},
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
      
      //console.log('set hass runned');
      if(this.data == null || this.data.length === 0) return;

      //Only update the cards for the opened area page.
      this.data.forEach((data) => {
        if(data.area.area_id == this.selectedArea){
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

      if(this.favorites.length != 0){
        this.favorites.forEach((item) => {
          item.card.hass = hass;
        })
      }
      this._hass = hass;
      this.badgesCard.hass = hass;
      // this._loadData();
      this.requestUpdate();

    }

    setConfig(config) {
      this.startedUp = false;
      this.timeout = false;

      this._hass = hass();
      this.selectedArea = window.location.hash.substring(1);
      this.areaEditMode = false;
      this.favoriteEditMode = false;
      this.areaViewEditMode = false;
      this.areaViewDisplayGrouped = Cookies.get('dwains_dashboard_areaViewDisplayGrouped') ? (Cookies.get('dwains_dashboard_areaViewDisplayGrouped') == "false" ? false : true) : false;
      this.areaDisplayGrouped = Cookies.get('dwains_dashboard_areaDisplayGrouped') ? (Cookies.get('dwains_dashboard_areaDisplayGrouped') == "false" ? false : true) : false;

      this._config = config;
    }

    async connectedCallback(){
      //console.log('connectedCallBack');
      super.connectedCallback();

      await this._loadData(); //Load areas

      await this._hass.connection.subscribeEvents(() => this._reloadCard(), "dwains_dashboard_homepage_card_reload");
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

      const data = [];
      const disabledAreas = [];
      const favorites = [];
      
      if(this.areas == null || this.areas.length === 0 
      || this.devices == null || this.devices.length === 0
      || this.entities == null || this.entities.length === 0
      || this.configuration == null || this.configuration.length === 0
      ){
      } else {
        //console.log(this.entities);
        //console.log(this._hass.states['dwains_dashboard.notification']);
        
        //test1
        // const cardHelper = await cardHelpers;
        // const entitiesCard = await cardHelper.createCardElement({type: "entities", entities: []}); // A valid config avoids errors
        // // Then we make it load its editor through the static getConfigElement method
        // entitiesCard.constructor.getConfigElement();
        //test2

        //For activating the ha-icon-picker
        const loader = document.createElement("hui-masonry-view");
        loader.lovelace = { editMode: true };
        loader.willUpdate(new Map());
        //End for the ha-icon-picker

        this.notificationCard = await this.createCardElement2({ 
          type: "custom:dwains-notification-card",
          hass: this._hass,
        });
        //this.notificationCard.hass = this._hass;        

        this.badgesCard = await this.createCardElement2({ 
          type: "custom:dwains-house-information-card",
          hass: this._hass,
        });

        
        //Favorites load part
        if(this.configuration['entities']){
          const favoritesEntities = [];
          Object.entries(this.configuration['entities']).map( async([entity,v]) => {
            if(v['favorite']){
              const domain = computeDomain(entity);
              const hideEntity = this.configuration['entities'][entity] ? (this.configuration['entities'][entity]['hidden'] ? true : false) : false;
              const excludeEntity = this.configuration['entities'][entity] ? (this.configuration['entities'][entity]['excluded'] ? true : false) : false;
              const friendlyName = this.configuration['entities'][entity] ? this.configuration['entities'][entity]['friendly_name'] : "";
              const customCard = this.configuration['entities'][entity] && this.configuration['entities'][entity]['custom_card'] ? this.configuration['entities'][entity]['custom_card'] : false;
              const customPopup = this.configuration['entities'][entity] && this.configuration['entities'][entity]['custom_popup'] ? this.configuration['entities'][entity]['custom_popup'] : false;
              const isFavorite = this.configuration['entities'][entity] && this.configuration['entities'][entity]['favorite'] ? this.configuration['entities'][entity]['favorite'] : false;

              let cardConfig = {};
              let rowSpan = "1";
              let colSpan = "1";
              let rowSpanLg = "1";
              let colSpanLg = "1";
              let rowSpanXl = "1";
              let colSpanXl = "1";
              if(customCard && this.configuration['entity_cards'] && this.configuration['entity_cards'][entity]){
                //If entity has a custom card set by user
                cardConfig = {input_name: friendlyName, input_entity: entity,...this.configuration['entity_cards'][entity]};
              } else if(this.configuration['devices_card'][domain]){
                //If domain has a custom card set by user
                cardConfig = {input_name: friendlyName, input_entity: entity,...this.configuration['devices_card'][domain]};
              } else {
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

                cardConfig = {entity: entity,...cardConfig};
              }

              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['row_span']){
                rowSpan = this.configuration['entities'][entity]['row_span'];
              }  
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['col_span']){
                colSpan = this.configuration['entities'][entity]['col_span'];
              }     
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['row_span_lg']){
                rowSpanLg = this.configuration['entities'][entity]['row_span_lg'];
              }  
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['col_span_lg']){
                colSpanLg = this.configuration['entities'][entity]['col_span_lg'];
              } 
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['row_span_xl']){
                rowSpanXl = this.configuration['entities'][entity]['row_span_xl'];
              }  
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['col_span_xl']){
                colSpanXl = this.configuration['entities'][entity]['col_span_xl'];
              } 

              favoritesEntities.push({
                domain: domain,
                entity: entity,
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
                isFavorite: isFavorite,
                favorite_sort_order: (this.configuration['entities'][entity] && this.configuration['entities'][entity]['favorite_sort_order'] ? this.configuration['entities'][entity]['favorite_sort_order']: 99),
              });
            }
          });

          this.favorites = favoritesEntities;
        }

        for(const area of this.areas){
          if(this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['disabled']){
            disabledAreas.push(area);
          } else {
            // //Check if selectedArea is empty (no hash and this is first area to loop throug so set it)
            // if(this.selectedArea.length === 0){
            //   this.selectedArea = area.area_id;
            // }

            const areaDevices = new Set();
            const areaEntities = new Set();
            const areaCardsByDomain = [];
            const areaEntitiesNoState = [];
            const areaEntitiesHidden = [];
            const areaEntitiesDisabled = [];
            const areaCustomCardsTop = [];
            const areaCustomCardsBottom = [];

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
              ) {
                if(entity.hidden_by){
                  continue;
                }
                const disableEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['disabled'] ? true : false) : false;
                if(disableEntity){
                  areaEntitiesDisabled.push(entity.entity_id);
                  continue;
                }
                const domain = entity.entity_id.substr(0, entity.entity_id.indexOf("."));
                const stateObj = this._hass.states[entity.entity_id];

                if (stateObj) {
                  const hideEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['hidden'] ? true : false) : false;
                  const excludeEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['excluded'] ? true : false) : false;
                  const friendlyName = this.configuration['entities'][entity.entity_id] ? this.configuration['entities'][entity.entity_id]['friendly_name'] : "";
                  const customCard = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['custom_card'] ? this.configuration['entities'][entity.entity_id]['custom_card'] : false;
                  const customPopup = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['custom_popup'] ? this.configuration['entities'][entity.entity_id]['custom_popup'] : false;
                  const isFavorite = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['favorite'] ? this.configuration['entities'][entity.entity_id]['favorite'] : false;

                  if(hideEntity){
                    areaEntitiesHidden.push(entity.entity_id);
                    
                    //Also add the entity to the normal area entities because a hidden entity is still used in area button (states)
                    areaEntities.add(entity.entity_id);
                  } else {
                    let cardConfig = {};
                    let rowSpan = "1";
                    let colSpan = "1";
                    let rowSpanLg = "1";
                    let colSpanLg = "1";
                    let rowSpanXl = "1";
                    let colSpanXl = "1";
                    if(customCard && this.configuration['entity_cards'] && this.configuration['entity_cards'][entity.entity_id]){
                      //If entity has a custom card set by user
                      cardConfig = {input_name: friendlyName,input_entity: entity.entity_id,...this.configuration['entity_cards'][entity.entity_id]};
                    } else if(this.configuration['devices_card'][domain]){
                      //If domain has a custom card set by user
                      cardConfig = {input_name: friendlyName,input_entity: entity.entity_id,...this.configuration['devices_card'][domain]};
                    } else {
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
              

                    areaCardsByDomain.push({
                      domain: domain,
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
                      isFavorite: isFavorite,
                      sort_order: (this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['sort_order'] ? this.configuration['entities'][entity.entity_id]['sort_order']: 99),
                      grouped_sort_order: (this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['grouped_sort_order'] ? this.configuration['entities'][entity.entity_id]['grouped_sort_order']: 99),
                    });

                    areaEntities.add(entity.entity_id);
                  }
                } else {
                  areaEntitiesNoState.push(entity.entity_id);
                }
              }
            }

            //Custom cards
            if(this.configuration.area_cards.length !== 0){
              if(this.configuration.area_cards[area.area_id]){
                //console.log(Object.entries(this.configuration.area_cards[area.area_id]));
                Object.entries(this.configuration.area_cards[area.area_id]).map(async ([k,v]) => {
                  const card = await this.createCardElement2(v);
                  const rowSpan = v["row_span"] ? v["row_span"] : "1";
                  const colSpan = v["col_span"] ? v["col_span"] : "1";
                  const rowSpanLg = v["row_span_lg"] ? v["row_span_lg"] : "1";
                  const colSpanLg = v["col_span_lg"] ? v["col_span_lg"] : "1";
                  const rowSpanXl = v["row_span_xl"] ? v["row_span_xl"] : "1";
                  const colSpanXl = v["col_span_xl"] ? v["col_span_xl"] : "1";

                  if(v["position"] == 'bottom'){
                    areaCustomCardsBottom.push({
                      card: card,
                      filename: k,
                      area_id: area.area_id,
                      rowSpan: rowSpan,
                      colSpan: colSpan,
                      rowSpanLg: rowSpanLg,
                      colSpanLg: colSpanLg,
                      rowSpanXl: rowSpanXl,
                      colSpanXl: colSpanXl,
                    });
                  } else {
                    areaCustomCardsTop.push({
                      card: card,
                      filename: k,
                      area_id: area.area_id,
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

            //if(areaCardsByDomain.length != 0){
              data.push({
                entitiesNoState: areaEntitiesNoState,
                entitiesHidden: areaEntitiesHidden,
                entitiesDisabled: areaEntitiesDisabled,
                entities: areaEntities,
                area: area,
                cards: areaCardsByDomain,
                customCardsTop: areaCustomCardsTop,
                customCardsBottom: areaCustomCardsBottom,
                floor: (this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['floor'] ? this.configuration['areas'][area.area_id]['floor']: translateEngine(this._hass, 'area.no_floor')),
                sort_order: (this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['sort_order'] ? this.configuration['areas'][area.area_id]['sort_order']: 99),
                grouped_sort_order: (this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['grouped_sort_order'] ? this.configuration['areas'][area.area_id]['grouped_sort_order']: 99),
              });
            //}
          }
        }
        
        data.sort(function (x, y) {
          let a = x.sort_order,
              b = y.sort_order;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        //Check if selectedArea is empty (no hash and this is first area to loop throug so set it)
        if(this.selectedArea.length === 0){
          this.selectedArea = data[0]['area']['area_id'];
        }

        this.data = data;
        this.disabledAreas = disabledAreas;

        this.startedUp = true;
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
        // if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['excluded']){
        //   return false;
        // }
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
          //&& !(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['excluded'])
      ).length);
    }

    _climateState(data, domain){
      const entities = data[domain];
      if (!entities) {
        return undefined;
      }
      const climateStates = [];
      for(const climate of entities){
        //if(!(this.configuration['entities'][climate.entity_id] && this.configuration['entities'][climate.entity_id]['excluded'])){
          if(climate.attributes['hvac_action'] && climate.attributes['hvac_action'] != 'idle'){
            const targetTemp = climate.attributes['temperature'] ? ' (' + climate.attributes['temperature'] + this._hass.config.unit_system['temperature'] +')' : "";
            climateStates.push(this._hass.localize(`state_attributes.climate.hvac_action.${climate.attributes['hvac_action']}`)+targetTemp);
          } else if(!climate.attributes['hvac_action']){
            if(!UNAVAILABLE_STATES.includes(climate.state) && !STATES_OFF.includes(climate.state)){
              const targetTemp = climate.attributes['temperature'] ? ' (' + climate.attributes['temperature'] + this._hass.config.unit_system['temperature'] +')' : "";
              climateStates.push(this._hass.localize(`component.climate.state._.${climate.state}`)+targetTemp);
            }
          }
        //}
      }
      return climateStates.length == 0 ? "" : climateStates.join(", ");
    }

    _handleAreaDisableAllEntitiesClicked(ev){
      const areaId = ev.currentTarget.area;
      const data = this.data.find((data) => data.area.area_id == areaId);
      const key = ev.currentTarget.key;
      const value = ev.currentTarget.value;
      
      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entities_bool_value',
        entities: JSON.stringify([...data.entities]),
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

    _handleAreaClick(event){
      var id = event.currentTarget.dataset.areaId;
      window.location.hash = id;
      this.selectedArea = id;
      window.scrollTo(0,0);
      //this.requestUpdate();
      this._update_hass(this._hass);
    }

    _handleAreaDoubleClick(event){
      const areaId = event.currentTarget.dataset.areaId;
      const lightState = event.currentTarget.lightState;
      this._hass.callService(
        'light',
        (lightState ? "turn_off" : "turn_on"),
        undefined,
        {
          area_id: areaId,
        }
      );
    }

    _backButtonClick(){
      window.location.hash = "";
      //this.requestUpdate();
      this._update_hass(this._hass);
    }

    _handleMoreInfo(ev){
      moreInfo(ev.currentTarget.entity);
    }

    _entitiesByDomain(entities){
      const entitiesByDomain = {};

      for (const entity of entities) {
          if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['excluded']){
            continue;
          }

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

    async createCardElement2(config){
      const cardHelper = await cardHelpers;
      const element = await cardHelper.createCardElement(config);
      element.hass = hass();
      //element.setConfig(config);

      return element;
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
      const area = ev.currentTarget.area;
      const areaName = ev.currentTarget.areaName;
      const position = ev.currentTarget.position;

      window.setTimeout(() => {
        
        popUp(translateEngine(this._hass, 'entity.add_card_to') + areaName, {
          type: "custom:dwains-create-custom-card-card", 
          area: area, 
          position: position,
          page: "areas",
          name: areaName,
        }, true, '');
      }, 50);
    }

    _handleAreaEditClick(ev) {
      ev.stopPropagation();
      const areaId = ev.currentTarget.area_id;
      const icon = ev.currentTarget.area_icon;
      const floor = ev.currentTarget.floor;
      const disableArea = ev.currentTarget.disable_area;
      window.setTimeout(() => {
        
        popUp(translateEngine(this._hass, 'area.edit_area_button'), {
          type: "custom:dwains-edit-area-button-card", 
          areaId: areaId, 
          icon: icon,
          floor: floor,
          disableArea: disableArea,
        }, false, '');
      }, 50);
    }

    _handleEntityEditClick(ev) {
      ev.stopPropagation();
      const entity = ev.currentTarget.entity;
      const friendlyName = ev.currentTarget.friendlyName;
      const hideEntity = ev.currentTarget.hideEntity;
      const disableEntity = ev.currentTarget.disableEntity;
      const excludeEntity = ev.currentTarget.excludeEntity;
      const colSpan = ev.currentTarget.colSpan;
      const rowSpan = ev.currentTarget.rowSpan;
      const colSpanLg = ev.currentTarget.colSpanLg;
      const rowSpanLg = ev.currentTarget.rowSpanLg;
      const colSpanXl = ev.currentTarget.colSpanXl;
      const rowSpanXl = ev.currentTarget.rowSpanXl;
      const customCard = ev.currentTarget.customCard;
      const customPopup = ev.currentTarget.customPopup;
      window.setTimeout(() => {
        
        popUp(translateEngine(this._hass, 'entity.edit_entity'), {
          type: "custom:dwains-edit-entity-card", 
          entity: entity, 
          friendlyName: friendlyName,
          hideEntity: hideEntity,
          disableEntity: disableEntity,
          excludeEntity: excludeEntity,
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
    _handleAreaEditBoolValueClick(ev) {
      ev.stopPropagation();
      const areaId = ev.currentTarget.areaId;
      const key = ev.currentTarget.key;
      const value = ev.currentTarget.value;
      
      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_area_bool_value',
        areaId: areaId,
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
        cardConfig = {input_name: friendlyName,input_entity: entityId,...this.configuration['entities_popup'][entityId]};
        mode = "editor-element";
      }

      window.setTimeout(() => {
        
        popUp(translateEngine(this._hass, 'entity.edit_entity_popup_card'), {
          type: "custom:dwains-edit-entity-popup-card", 
          entity_id: entityId, 
          cardConfig: cardConfig, 
          mode: mode,
          existingCardEdit: cardConfig ? true : false,
        }, true, '');
      }, 50);
    }

    _handleEntityAddToFavoritesClick(ev){
      ev.stopPropagation();
      const entityId = ev.currentTarget.entity;

      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity_favorite',
        entityId: entityId,
        favorite: true,
      }).then(
          (resp) => {
              console.log(resp);
          },
          (err) => {
              console.error('Message failed!', err);
          }
      );
    }

    _handleEntityRemoveFromFavoritesClick(ev){
      ev.stopPropagation();
      const entityId = ev.currentTarget.entity;

      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity_favorite',
        entityId: entityId,
        favorite: false,
      }).then(
          (resp) => {
              console.log(resp);
          },
          (err) => {
              console.error('Message failed!', err);
          }
      );

    }
    

    _handleDwainsDashboardSettingsClick(ev){
      ev.stopPropagation();
      const disableClock = ev.currentTarget.disableClock;
      const amPmClock = ev.currentTarget.amPmClock;
      const disableWelcomeMessage = ev.currentTarget.disableWelcomeMessage;
      const v2Mode = ev.currentTarget.v2Mode;
      const weatherEntity = ev.currentTarget.weatherEntity;
      const alarmEntity = ev.currentTarget.alarmEntity;
      window.setTimeout(() => {
        popUp(translateEngine(this._hass, 'global.dwains_dashboard_settings'), {
            type: "custom:dwains-edit-homepage-header-card", 
            disableClock: disableClock,
            amPmClock: amPmClock,
            disableWelcomeMessage: disableWelcomeMessage,
            v2Mode: v2Mode,
            weatherEntity: weatherEntity,
            alarmEntity: alarmEntity,
          }, false, '');
      }, 50);
    }

    _handleAreaViewDisplayGroupedClicked(ev){
      ev.stopPropagation();

      const value = ev.currentTarget.value;
      this.areaViewDisplayGrouped = value;
      Cookies.set('dwains_dashboard_areaViewDisplayGrouped', value, { expires: 365 });
    }

    _handleAreaDisplayGroupedClicked(ev){
      ev.stopPropagation();

      const value = ev.currentTarget.value;
      this.areaDisplayGrouped = value;
      Cookies.set('dwains_dashboard_areaDisplayGrouped', value, { expires: 365 });
    }

    _handleFavoriteEditModeClicked(ev){
      ev.stopPropagation();
      const value = ev.currentTarget.value;

      if(value){
        this._sortable = [];
        const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
        for(var i=0; i<sortableElements.length; i++){
          this._sortable[i] = new Sortable(sortableElements[i], {
              forceFallback: true,
              animation: 150,
              dataIdAttr: "data-entity",
              handle: '.sortable-move',
              onEnd: function(event){ 
                console.log(event);
                hass().connection.sendMessagePromise({
                    type: 'dwains_dashboard/sort_entity',
                    sortData: JSON.stringify(this.toArray()),
                    sortType: 'favorite_sort_order',
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
      this.favoriteEditMode = value;
    }

    _handleAreaEditModeClicked(ev){
      ev.stopPropagation();
      const value = ev.currentTarget.value;

      if(value){
        this._sortable = [];
        const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
        for(var i=0; i<sortableElements.length; i++){
          const sortType = (this.areaDisplayGrouped ? 'grouped_sort_order' : 'sort_order');
          this._sortable[i] = new Sortable(sortableElements[i], {
              forceFallback: true,
              animation: 150,
              dataIdAttr: "data-area-id",
              handle: '.sortable-move',
              onEnd: function(event){ 
                console.log(event);
                hass().connection.sendMessagePromise({
                    type: 'dwains_dashboard/sort_area_button',
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
      this.areaEditMode = value;
    }

    _handleAreaViewEditModeClicked(ev){
      ev.stopPropagation();
      const value = ev.currentTarget.value;

      if(value){
        this._sortable = [];
        const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
        for(var i=0; i<sortableElements.length; i++){
          const sortType = (this.areaViewDisplayGrouped ? 'grouped_sort_order' : 'sort_order');
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
      this.areaViewEditMode = value;
    }

    _handleCustomCardEditClick(ev){
      ev.stopPropagation();
      const areaId = ev.currentTarget.area_id;
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

      const cardConfig = this.configuration.area_cards[areaId][filename];
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
        
        popUp(this._hass.localize("ui.components.entity.entity-picker.edit"), {
          type: "custom:dwains-create-custom-card-card", 
          area: areaId, 
          mode: "editor-element", 
          page: "areas",
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

    _renderAreaButtons(data){
      if(!this.areaDisplayGrouped){
        return html`
          <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration['homepage_header']['v2_mode'] ? "lg-grid-cols-4 xl-grid-cols-5" : ""} gap-4 sortable">
            ${data.map((i) => this._renderAreaButton(i))}
          </div>`;
      } else {     
        //Sort by floor
        data.sort(function (x, y) {
          let a = x.floor,
              b = y.floor;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        data.sort(function (x, y) {
          let a = x.grouped_sort_order,
              b = y.grouped_sort_order;
          return a == b ? 0 : a > b ? 1 : -1;
        });
           
        let group = data.reduce((r, a) => {
          //console.log("a", a);
          //console.log('r', r);
          r[a.floor] = [...r[a.floor] || [], a];
          return r;
         }, {});
        //console.log("group", group);


        return html`
        <div>
        ${Object.keys(group).map((key) => 
          html`
            <div class="mb-5">
              <h3 class="font-semibold capitalize text-gray">${key.replace(/_/g, " ")}</h3>
              <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration['homepage_header']['v2_mode'] ? "lg-grid-cols-4 xl-grid-cols-5" : ""} gap-4 sortable">
              ${Object.entries(group[key]).map(([k,v]) => html`${this._renderAreaButton(v)}`)}
              </div>
            </div>
          `
        )}
        </div>
        `;
      }
    }
    _renderAreaButtonCard(area, type) {
      return html`
        <div>
          <ha-card class="p-2">
            ${translateEngine(this._hass, 'area.title')}:<br>
            <span class="break-words">
            ${area.name}
            </span>
          </ha-card>
          <ha-card>
            <div class="card-actions">
              <mwc-button 
                .areaId="${area.area_id}"
                .key=${"disabled"}
                .value=${false}
                @click=${this._handleAreaEditBoolValueClick} 
              >
                ${translateEngine(this._hass, 'area.enable')}
              </mwc-button>
            </div>
          </ha-card>
        </div>
      `;
    }
    _renderAreaButton(data){
      const entitiesByDomain = this._entitiesByDomain(
        data.entities
      );

      //console.log(entitiesByDomain);

      const sensors = [];
      SENSOR_DOMAINS.forEach((domain) => {
        if (!(domain in entitiesByDomain)) {
          return;
        }
        DEVICE_CLASSES[domain].forEach((deviceClass) => {
          if (
            entitiesByDomain[domain].some(
              (entity) => entity.attributes.device_class === deviceClass
            )
          ) {
            sensors.push(
              this._average(entitiesByDomain, domain, deviceClass)
            );
          }
        });
      });

      return html`
        <div class="relative" data-area-id='${data.area.area_id}'>
          <div 
            class="flex justify-between h-44 p-3 area-button ${this.selectedArea == data.area.area_id && !this.configuration['homepage_header']['v2_mode'] ? 'current' : ''}"
            data-area-id='${data.area.area_id}'
            @click=${this._handleAreaClick} 
            .lightState=${this._isOn(entitiesByDomain, 'light')} 
            @dblclick="${this._handleAreaDoubleClick}"
          >
            <div class="h-full flex flex-wrap content-between">
              <div class="w-full ha-icon">
                ${this.configuration['areas'][data.area.area_id] ? html`
                  <ha-icon
                    class="h-14 w-14"
                    style="color: var(--primary-color);"
                    .icon=${this.configuration['areas'][data.area.area_id]['icon']}
                  ></ha-icon>` 
                  : ""
                }
              </div>
              <div class="w-full">
                <h3 class="font-semibold text-lg">${data.area.name}</h3>
                ${sensors.length
                  ? html`
                    <div class="sensors text-gray">
                      ${sensors.join(" - ")}
                    </div>`
                  : ""
                }
                <span class="text-gray text-sm capitalize">${this._climateState(entitiesByDomain, 'climate')}</span>
              </div>
            </div>
            <div class="row-span-2 text-right space-y-0.5 info">
              ${TOGGLE_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }
                const on = this._isOn(entitiesByDomain, domain);
                if(domain == 'light' || domain != 'light' && on){
                  return TOGGLE_DOMAINS.includes(domain)
                    ? html`
                      <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                        <ha-icon
                          class="${on ? 'on' : 'off'} w-6 h-6 mr-0.5"
                          .icon=${DOMAIN_STATE_ICONS[domain][on ? "on" : "off"]}
                          .domain=${domain}
                          .area_id=${data.area.area_id}
                          .state=${on}
                          @click=${this._toggle}
                        >
                        </ha-icon>
                        ${on}
                      </span><br>
                      `
                    : "";
                }
              })}
              ${ALERT_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }
                return DEVICE_CLASSES[domain].map((deviceClass) => {
                  const isOn = this._isOn(entitiesByDomain, domain, deviceClass);
                  if(isOn){
                    return html`
                      ${DOMAIN_STATE_ICONS[domain][deviceClass]
                        ? html`
                          <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                            <ha-icon
                              class="w-6 h-6 mr-0.5"
                              .icon=${DOMAIN_STATE_ICONS[domain][deviceClass]}
                            ></ha-icon> ${isOn}
                          </span><br>`
                        : ""}
                    `
                  }
                });
              })}
              ${OTHER_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }
                const isOn = this._isOn(entitiesByDomain, domain);
                if(isOn){
                  return OTHER_DOMAINS.includes(domain)
                    ? html`
                      <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                        <ha-icon
                          class="${isOn ? 'on' : 'off'} w-6 h-6 mr-0.5"
                          .icon=${DOMAIN_STATE_ICONS[domain][isOn ? "on" : "off"]}
                        >
                        </ha-icon>
                        ${isOn}
                      </span><br>
                      `
                    : "";
                }
              })}
            </div>
          </div>
          ${this.areaEditMode ? html`
            <ha-card>
              <div class="card-actions-multiple">
                <div class="sortable-move">
                  <ha-icon
                    .icon=${"mdi:cursor-move"}
                  >
                  </ha-icon>
                </div>
                <mwc-button 
                  .area_id=${data.area.area_id}
                  .area_icon=${this.configuration['areas'][data.area.area_id] && this.configuration['areas'][data.area.area_id]['icon'] ? this.configuration['areas'][data.area.area_id]['icon']: ""}
                  .floor=${this.configuration['areas'][data.area.area_id] && this.configuration['areas'][data.area.area_id]['floor'] ? this.configuration['areas'][data.area.area_id]['floor']: ""}
                  .disable_area=${this.configuration['areas'][data.area.area_id] && this.configuration['areas'][data.area.area_id]['disable_area'] ? this.configuration['areas'][data.area.area_id]['disable_area']: false}

                  @click=${this._handleAreaEditClick} 
                >
                  ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                </mwc-button>
              </div>
            </ha-card>
            ` : ""}
        </div>
      `;
    }

    
    _renderAreaViewCustomCards(data, position){
      return html`
      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 my-4">
        ${position == "bottom" ?  data.customCardsBottom.map((i) => 
          html`${this._renderAreaViewCustomCard(i)}`
        ) : data.customCardsTop.map((i) => 
          html`${this._renderAreaViewCustomCard(i)}`
        )}
      </div>
      `;
    }
    _renderAreaViewCustomCard(data){
      return html`
      <div class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg} xl-col-span-${data.colSpanXl} xl-row-span-${data.rowSpanXl} relative">
        <div>
          ${data.card}
        </div>
        ${this.areaViewEditMode ? html`
        <ha-card>
          <div class="card-actions">
            <mwc-button 
              @click=${this._handleCustomCardEditClick} 
              .area_id=${data.area_id}
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

    _renderAreaViewCards(data){
      if(!this.areaViewDisplayGrouped){
        data.cards.sort(function (x, y) {
          let a = x.sort_order,
              b = y.sort_order;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        return html`
        <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
          ${data.cards.map((i) => 
            html`${this._renderAreaViewCard(i)}`
          )}
        </div>
        `;
      } else {        
        let group = data.cards.reduce((r, a) => {
          //console.log("a", a);
          //console.log('r', r);
          r[a.domain] = [...r[a.domain] || [], a];
          return r;
         }, {});
        //console.log("group", group);

        let sortedGroup = Object.keys(group).sort((x,y) => {
          let a = this.configuration['devices'][x] && this.configuration['devices'][x]['sort_order'] ? this.configuration['devices'][x]['sort_order'] : 99,
              b = this.configuration['devices'][y] && this.configuration['devices'][y]['sort_order'] ? this.configuration['devices'][y]['sort_order'] : 99;
          return a == b ? 0 : a > b ? 1 : -1;
         });

        //console.log("sortedgroup", sortedGroup);

        data.cards.sort(function (x, y) {
          let a = x.grouped_sort_order,
              b = y.grouped_sort_order;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        //console.log(group);

        return html`
        <div>
        ${sortedGroup.map((key) => 
          html`
            <div class="mb-5">
              <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass, 'device.'+key)}</h3>
              <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
                ${Object.entries(group[key]).map(([k,v]) => html`${this._renderAreaViewCard(v)}`)}
              </div>
            </div>
          `
        )}
        </div>
        `;
      }
    }
    _renderAreaViewCard(data){
      return html`
      <div 
        data-entity='${data.entity}'
        class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg} xl-col-span-${data.colSpanXl} xl-row-span-${data.rowSpanXl} relative"
      >
        <div>
          ${data.card}
        </div>
        ${this.areaViewEditMode ? html`
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
                ${!data.isFavorite ? html `
                  <mwc-list-item
                    graphic="icon"
                    .entity="${data.entity}"
                    @click="${this._handleEntityAddToFavoritesClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:tag-heart"}></ha-icon>
                    </div>
                    ${translateEngine(this._hass, 'entity.add_to_favorites')}
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

    _renderAreaView(data){
        //Make the cards grid
        // var outObject = data.cards.reduce(function(a, e) {
        //   // GROUP BY estimated key (estKey), well, may be a just plain key
        //   // a -- Accumulator result object
        //   // e -- sequentally checked Element, the Element that is tested just at this itaration
        
        //   // new grouping name may be calculated, but must be based on real value of real field
        //   let estKey = (e['domain']); 
        
        //   (a[estKey] ? a[estKey] : (a[estKey] = null || [])).push(e);
        //   return a;
        // }, {});
        // Object.keys(outObject).forEach((key, index) => {
        //     //console.log(`${key}: ${outObject[key]}`);
        //     outObject[key].map(child => console.log(child));
        // });

        const visible = this.selectedArea == data.area.area_id ? "block" : "hidden";

        data.cards.sort(function (x, y) {
          let a = x.domain,
              b = y.domain;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        return html`
          <div class="w-full mb-12 ${visible}" id="${data.area.area_id}">
            <div class="flex justify-between">
              <div class="sticky top-0">
                <h2 class="font-semibold text-lg">
                  ${data.area.name}
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
                    ${!this.areaViewDisplayGrouped ? html `
                      <mwc-list-item
                        graphic="icon"
                        .value=${true}
                        @click=${this._handleAreaViewDisplayGroupedClicked}
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                        </div>
                        ${translateEngine(this._hass, 'entity.group')}
                      </mwc-list-item>` : html `
                      <mwc-list-item
                        graphic="icon"
                        .value=${false}
                        @click=${this._handleAreaViewDisplayGroupedClicked}
                      >
                        <div slot="graphic">
                        <ha-icon .icon=${"mdi:grid"}></ha-icon>
                        </div>
                        ${translateEngine(this._hass, 'entity.ungroup')}
                      </mwc-list-item>
                      `
                    }
                    ${this._hass.user.is_admin ? html`
                      ${this.areaViewEditMode ? html `
                        <mwc-list-item
                          graphic="icon"
                          .value=${false}
                          @click=${this._handleAreaViewEditModeClicked}
                        >
                          <div slot="graphic">
                            <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                          </div>
                          ${translateEngine(this._hass, 'global.disable_edit_mode')}
                        </mwc-list-item>` : html `
                        <mwc-list-item
                          graphic="icon"
                          .value=${true}
                          @click=${this._handleAreaViewEditModeClicked}
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

            ${this.areaViewEditMode ? html `
            <ha-card class="card-actions-centered">
              <mwc-button 
                .area=${data.area.area_id} 
                .key=${"disabled"} 
                .value=${true} 
                @click=${this._handleAreaDisableAllEntitiesClicked}
              >
                ${translateEngine(this._hass, 'entity.disable_all')}
              </mwc-button>
              <mwc-button 
                .area=${data.area.area_id} 
                .key=${"hidden"} 
                .value=${true} 
                @click=${this._handleAreaDisableAllEntitiesClicked}
              >
                ${translateEngine(this._hass, 'entity.hide_all')}
              </mwc-button>
            </ha-card>

            <button type="button" 
              @click=${this._addLovelaceCard}
              .area=${data.area.area_id}
              .areaName=${data.area.name}
              .position=${"top"}
              class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span class="mt-2 block text-sm font-medium text-gray">
                ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
              </span>
            </button>` : "" }

            ${this._renderAreaViewCustomCards(data, "top")}

            ${this._renderAreaViewCards(data)}

            ${this._renderAreaViewCustomCards(data, "bottom")}

            ${this.areaViewEditMode ? html `
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
                  <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass,'entity.disabled')}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                  ${data.entitiesDisabled.map((entity) => 
                      html`${this._renderAreaViewEntityCard(entity, 'disabled')}`
                  )}
                  </div>
                </div>` : ""
              }
            `: ""}

            ${this.areaViewEditMode ? html `
            <button type="button" 
              @click=${this._addLovelaceCard}
              .area=${data.area.area_id}
              .areaName=${data.area.name}
              .position=${"bottom"}
              class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span class="mt-2 block text-sm font-medium text-gray">
                ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
              </span>
            </button>` : "" }
          </div>`;
    }

    _renderFavoriteViewCard(data){
      return html`
      <div data-entity='${data.entity}' class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg}  relative">
        <div>
          ${data.card}
        </div>
        ${this.favoriteEditMode ? html`
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
                  @click="${this._handleEntityRemoveFromFavoritesClick}"
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:tag-heart"}></ha-icon>
                  </div>
                  ${translateEngine(this._hass, 'entity.remove_from_favorites')}
                </mwc-list-item>
            </ha-button-menu>
          </div>
        </ha-card>` : ""}
      </div>
      `;
    }
    _renderFavorites(){
      if(this.favorites.length == 0){
        return html``;
      }
      this.favorites.sort(function (x, y) {
        let a = x.favorite_sort_order,
            b = y.favorite_sort_order;
        return a == b ? 0 : a > b ? 1 : -1;
      });
      return html`
        <div id="favorites" class="mt-4">
          <div class="flex justify-between mb-2">
            <div>
              <h2 class="font-semibold text-lg">
                ${translateEngine(this._hass, 'favorite.title_plural')}
              </h2>
              <span class="text-gray">
                ${translateEngine(this._hass, 'favorite.all_favorites')}
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
                  ${this.favoriteEditMode ? html `
                    <mwc-list-item
                      graphic="icon"
                      .value=${false}
                      @click=${this._handleFavoriteEditModeClicked}
                    >
                      <div slot="graphic">
                        <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                      </div>
                      ${translateEngine(this._hass, 'global.disable_edit_mode')}
                    </mwc-list-item>` : html `
                    <mwc-list-item
                      graphic="icon"
                      .value=${true}
                      @click=${this._handleFavoriteEditModeClicked}
                    >
                      <div slot="graphic">
                        <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                      </div>
                      ${translateEngine(this._hass, 'global.enable_edit_mode')}
                    </mwc-list-item>
                    `
                  }
              </ha-button-menu>
              `: ""}
            </div>
          </div>
          <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4 sortable">
            ${this.favorites.map((i) => 
              html`${this._renderFavoriteViewCard(i)}`
            )}
          </div>
        </div>
        `;
    }
    
    render() {
      //console.log('render()');
      if(this.data == null || this.data.length === 0 ){
        return html``;
      } else {
        //Clock
        var d = new Date(),
        h = (d.getHours() < 10 ? "0" : "") + d.getHours(),
        m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes(),
        dateNice = d.toLocaleDateString(this._hass.locale.language, { weekday: 'long', month: 'short', day: 'numeric' }),
        greeting,
        currTimeAmPm = h >= 12 ? `${h - 12}:${m} pm` : `${h}:${m} am`;

        if(d.getHours() < 12){
          //Morning
          greeting = translateEngine(this._hass,'global.greeting_morning');
        } else if(d.getHours() < 18){
          //Afternoon
          greeting = translateEngine(this._hass,'global.greeting_afternoon');
        } else {
          //Evening
          greeting = translateEngine(this._hass,'global.greeting_evening');
        }

        //Weather
        let weatherEntity, weatherState, weatherIcon, weatherStateTranslated, weatherTemperature;
        if(this.configuration['homepage_header']['weather_entity']){
          weatherEntity = this.configuration['homepage_header']['weather_entity'];
          weatherState = this._hass.states[weatherEntity];
          if(weatherState){
            weatherIcon = WEATHER_ICONS[weatherState.state];
            weatherStateTranslated = this._hass.localize('component.weather.state._.'+weatherState.state);
            weatherTemperature = weatherState.attributes.temperature + this._hass.config.unit_system['temperature'];
          }
        }

        //Alarm
        let alarmEntity, alarmState, alarmStateTranslated, alarmIcon;
        if(this.configuration['homepage_header']['alarm_entity']){
          alarmEntity = this.configuration['homepage_header']['alarm_entity'];
          alarmState = this._hass.states[alarmEntity].state;
          if(alarmState){
            alarmIcon = ALARM_ICONS[alarmState];
            //console.log(alarmIcon);
            alarmStateTranslated = this._hass.localize(`component.alarm_control_panel.state._.${alarmState}`);
          }
        }
        
        return html`
            <div class="flex flex-wrap">
              <div class="w-full ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-w-1-2 xl-w-1-3"} ${window.location.hash ? (this.configuration['homepage_header']['v2_mode'] ? "hidden" : "hidden lg-block") : ""} p-4">
                <div class="flex justify-between mb-2">
                  <div>
                    ${this.configuration['homepage_header']['alarm_entity'] ? html`
                      <div class="area-button py-1 px-2" .entity=${this.configuration['homepage_header']['alarm_entity']} @click=${this._handleMoreInfo}>
                        <ha-icon icon="${alarmIcon}"></ha-icon> ${alarmStateTranslated}
                      </div>`: ""
                    }
                  </div>
                  
                  <div id="weather">
                    ${this.configuration['homepage_header']['weather_entity'] ? html`
                      <div class="area-button py-1 px-2" .entity=${this.configuration['homepage_header']['weather_entity']} @click=${this._handleMoreInfo}>
                        <ha-icon icon="${weatherIcon}"></ha-icon> ${weatherStateTranslated}, ${weatherTemperature}
                      </div>`: ""
                    }
                  </div>

                  <div>
                    ${this._hass.user.is_admin ? html`
                      <div 
                        class="p-1 ha-icon cursor-pointer" 
                        .disableClock=${this.configuration['homepage_header']['disable_clock'] ? true : false}
                        .amPmClock=${this.configuration['homepage_header']['am_pm_clock'] ? true : false}
                        .disableWelcomeMessage=${this.configuration['homepage_header']['disable_welcome_message'] ? true : false}
                        .v2Mode=${this.configuration['homepage_header']['v2_mode'] ? true : false}
                        .weatherEntity=${this.configuration['homepage_header']['weather_entity'] ? this.configuration['homepage_header']['weather_entity'] : ""}
                        .alarmEntity=${this.configuration['homepage_header']['alarm_entity'] ? this.configuration['homepage_header']['alarm_entity']: ""}
                        @click=${this._handleDwainsDashboardSettingsClick}
                      >
                        <ha-icon class="w-6 h-6" .icon=${"mdi:cog"}></ha-icon>
                      </div>
                    ` : ""}
                  </div>
                </div>
                <div class="mb-4 grid grid-cols-1 lg-grid-cols-2">
                  <div>
                    ${this.configuration['homepage_header']['disable_welcome_message'] ? '' : html`<h1 class="font-semibold text-xl">${greeting}, ${this._hass.user.name}</h1>`}
                    ${this.notificationCard}
                  </div>
                  ${this.configuration['homepage_header']['disable_clock'] ? "" : html`
                    <div class="text-right">
                      <div id="clock" class="mb-2 hidden lg-block">
                        <h2 class="font-semibold text-xl">${this.configuration['homepage_header']['am_pm_clock'] ? html`${currTimeAmPm}` : html`${h}:${m}`}</h2>
                        <span class="text-gray capitalize">${dateNice}</span>
                      </div>
                    </div>`
                  }
                </div>

                ${this.badgesCard}

                ${this._renderFavorites()}

                <div id="areas" class="mt-4">
                  <div class="flex justify-between mb-2">
                    <div>
                      <h2 class="font-semibold text-lg capitalize">
                        ${translateEngine(this._hass, 'area.title_plural')}
                      </h2>
                      <span class="text-gray">
                        ${this.data.length} ${translateEngine(this._hass, 'area.title_plural')}
                      </span>
                    </div>
                    <div>
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
                          ${!this.areaDisplayGrouped ? html `
                            <mwc-list-item
                              graphic="icon"
                              .value=${true}
                              @click=${this._handleAreaDisplayGroupedClicked}
                            >
                              <div slot="graphic">
                                <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                              </div>
                              ${translateEngine(this._hass, 'area.group_by_floor')}
                            </mwc-list-item>` : html `
                            <mwc-list-item
                              graphic="icon"
                              .value=${false}
                              @click=${this._handleAreaDisplayGroupedClicked}
                            >
                              <div slot="graphic">
                              <ha-icon .icon=${"mdi:grid"}></ha-icon>
                              </div>
                              ${translateEngine(this._hass, 'area.ungroup_by_floor')}
                            </mwc-list-item>
                            `
                          }
                          ${this._hass.user.is_admin ? html`
                            ${!this.areaEditMode ? html `
                              <mwc-list-item
                                graphic="icon"
                                .value=${true}
                                @click=${this._handleAreaEditModeClicked}
                              >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                                </div>
                                ${translateEngine(this._hass, 'global.enable_edit_mode')}
                              </mwc-list-item>` : html `
                              <mwc-list-item
                                graphic="icon"
                                .value=${false}
                                @click=${this._handleAreaEditModeClicked}
                              >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                                </div>
                                ${translateEngine(this._hass, 'global.disable_edit_mode')}
                              </mwc-list-item>
                              `
                            }
                          ` : ""}
                      </ha-button-menu>
                    </div>
                  </div>

                  ${this._renderAreaButtons(this.data)}

                  ${this.areaEditMode ? html `
                    ${this.disabledAreas.length ? html`
                      <div class="mb-5">
                        <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass,'area.disabled')}</h3>
                        <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                        ${this.disabledAreas.map((area) => 
                            html`${this._renderAreaButtonCard(area, 'disabled')}`
                        )}
                        </div>
                      </div>` : ""
                    }
                  `: ""}
                </div>
              </div>
              <div class="w-full ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-w-1-2 xl-w-2-3"} ${!window.location.hash ? (this.configuration['homepage_header']['v2_mode'] ? "hidden" : "hidden lg-block") : ""} p-4">
                ${this.data.map((i) => this._renderAreaView(i))}
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
        .card-actions-centered {
          display: flex;
          justify-content: space-around;
          padding: 0.25rem 0.5rem;
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
        .area-button .info ha-icon, .ha-icon ha-icon {
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
        .area-button {
          cursor: pointer;
          background: var( --ha-card-background, var(--card-background-color, white) );
          border-radius: var(--ha-card-border-radius, 4px);
          box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
          color: var(--test-primary-text-color, var(--primary-text-color));
        }
        .info-badge {
          /*background-color: var(--sidebar-icon-color); */
          color: var( --dwains-info-badge-color, var(--primary-text-color) );
          background-color: var(--dwains-info-badge-background, var(--secondary-background-color));
        }
        @media (min-width: 1024px) {
          .area-button.current {
            background: transparent;
            z-index: 1;
            position: relative;
          }
          .area-button.current::before {
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
        .break-words {
          overflow-wrap: break-word;
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
        .py-1 {
          padding-top: 0.25rem;
          padding-bottom: 0.25rem
        }
        .px-2 {
          padding-left: 0.5rem;
          padding-right: 0.5rem
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
  customElements.define("homepage-card", HomepageCard);
});