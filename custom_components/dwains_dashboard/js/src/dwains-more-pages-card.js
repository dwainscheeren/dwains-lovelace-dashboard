import { lovelace_view, hass } from "card-tools/src/hass";
import {
  navigate
} from 'custom-card-helpers';
import { popUp, closePopUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import { mdiDotsVertical, mdiNotePlus, mdiCog } from "@mdi/js";
import { css, html, LitElement } from 'lit-element';
import translateEngine from './translate-engine';
import Sortable from 'sortablejs/modular/sortable.complete.esm.js';
import { closePopup } from "./helpers";

const bases2 = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases2).then(() => {
    const cardHelpers = window.loadCardHelpers()
    ? window.loadCardHelpers()
    : undefined;

    class DwainsEditMorePageCard extends LitElement {
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
        this.foldername = config.foldername ? config.foldername : "";
        if(config.cardConfig){
          const cardConfig = config.cardConfig;
          delete cardConfig["input_entity"];
          delete cardConfig["input_name"];
          this.cardConfig = cardConfig;
        } else {
          this.cardConfig = "";
        }  
  
        this.name = config.name ? config.name : "";
        this.icon = config.icon ? config.icon : "";
        this.showInNavbar = config.showInNavbar ? config.showInNavbar : false;

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
        this.cardConfig = ev.detail.config;
        this.mode = 'editor-element';
        this.requestUpdate();
      }
      magicStuffSecond(ev){
        //console.log(ev);
      }
      _sendCard(){
        const cardData = JSON.stringify(this.cardConfig);

        if(!this.name){
          alert(translateEngine(this.hass, 'more.name_required'));
          return;
        }

        if(this.showInNavbar && !this.icon){
          alert(translateEngine(this.hass, 'more.icon_required'));
          return;
        }

        //console.log(cardData);
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/edit_more_page',
          card_data: cardData,
          foldername: this.foldername,
          name: this.name,
          icon: this.icon,
          showInNavbar: this.showInNavbar,
        }).then(
            (resp) => {
                console.log(resp);
                const ll = lovelace_view();
                if (ll)
                  fireEvent("config-refresh", {}, ll);
                  let path = window.location.pathname;
                  let nav_path = path.substring(1, path.lastIndexOf('/'));
            
                  //Location check if user is in dwains dashboard
                  if(nav_path == "dwains-dashboard"){
                    setTimeout(function() {
                      document.location.reload()
                    }, 1000);
                }
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

      //More page settings
      _iconPickerChange(ev){
        this.icon = ev.detail['value'];
      }
      _showInMainNavbarValueChanged(ev) {
        this.showInNavbar = ev.target.checked;
      }
      _nameChanged(e) {
        this.name = e.target.value;
      }
      //End more page settings

      _removeMorePage(ev){
        this.hass.connection.sendMessagePromise({
          type: 'dwains_dashboard/remove_more_page',
          foldername: this.foldername,
        }).then(
            (resp) => {
                console.log(resp);
                closePopup();
                document.location = 'more_page';
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
            "card": this.blueprints["blueprints"][blueprint]['card']
        };
      }
      _installBlueprintYamlChanged(e) {
        this.installBlueprintYaml = e.target.yaml;
      }
      _handleInstallBlueprintClicked(ev) {
        if(!this.installBlueprintYaml){
          alert(translateEngine(this.hass, 'blueprint.yaml_required'));
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
          return html``;
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
                              ${v[1]["blueprint"]["type"] == "page" ? html`
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
              <h1 style="font-size: 17px; font-weight: bold;"></h1>
              <hui-card-picker
                @config-changed=${this.magicStuff}
                .hass=${this.hass}
                .lovelace=${{views: []}}
              ></hui-card-picker>
            </div>
          `;
        }
        if(this.mode == 'editor-element') {

          return html`
            <div class="edit-element">
              <div class="more-page-settings">
                <paper-input 
                  .label=${translateEngine(this.hass,'more.name')}
                  .value=${this.name}
                  @value-changed=${this._nameChanged}
                ></paper-input>
                <ha-icon-picker
                  .label=${translateEngine(this.hass,'more.icon')}
                  .value=${this.icon}
                  @value-changed=${this._iconPickerChange}
                ></ha-icon-picker>
                <mwc-formfield .label=${translateEngine(this.hass,'more.add_navbar')}>
                  <ha-checkbox
                    @change=${this._showInMainNavbarValueChanged}
                    .checked=${this.showInNavbar}
                  ></ha-checkbox>
                </mwc-formfield>
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
                ${this.foldername ? html `<mwc-button @click=${this._removeMorePage}>${this.hass.localize("ui.common.remove")}</mwc-button>` : ""}
                <mwc-button @click=${this._sendCard}>${this.hass.localize("ui.common.submit")}</mwc-button>
              </div>
            </div>
          `;
        }
      }
    }
    customElements.define("dwains-edit-more-page-card", DwainsEditMorePageCard);


    class MorePagesCard extends LitElement {
        static get properties() {
          return {
            configuration: {},
            editMode: {},
          };
        }
    
        /**
         * @param {any} hass
         */
        set hass(hass) {
          if(this.data == null || this.data.length === 0) return;
          Object.values(this.data).map((data) => {
            data.cards.forEach((item) => {
              item.card.hass = hass;
            });
            data.customCardsTop.forEach((item) => {
              item.card.hass = hass;
            });
            data.customCardsBottom.forEach((item) => {
              item.card.hass = hass;
            });
          });
          this._hass = hass;
          this.requestUpdate();
        }
    
        setConfig(config) {
          this._hass = hass();
          this.editMode = false;
        }
    
        async connectedCallback(){
          //console.log('connectedCallBack');
          super.connectedCallback();
    
          await this._loadData(); //Load areas
    
          await this._hass.connection.subscribeEvents(() => this._reloadCard(), "dwains_dashboard_more_pages_reload");
        }
    
        async _reloadCard(){
          await this._loadData();
          this.requestUpdate();
        }
    
        async _loadData(){    
          //Load configuration
          this.configuration = await this._hass.callWS({
            type: 'dwains_dashboard/configuration/get'
          });
          
          if(this.configuration == null || this.configuration.length === 0
          ){
          } else {
            
            //for the ha-icon-picker?
            const loader = document.createElement("hui-masonry-view");
            loader.lovelace = { editMode: true };
            loader.willUpdate(new Map());
            //end for the ha-icon-picker
          }
        }
  
        _handleMorePageClick(ev){
          const path = ev.currentTarget.path;
          navigate(window, "/dwains-dashboard/more_page_"+path);
          this.requestUpdate();
        }

        // _handleMorePageEditClick(ev) {
        //   ev.stopPropagation();
          
        //   const more_page = ev.currentTarget.more_page;
        //   const name = ev.currentTarget.name;
        //   const icon = ev.currentTarget.more_page_icon;
        //   const showInNavbar = ev.currentTarget.showInNavbar;
        //   window.setTimeout(() => {
        //     fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
        //     popUp(translateEngine(this._hass, 'more.edit'), {
        //       type: "custom:dwains-edit-more-page-card", 
        //       more_page: more_page,
        //       name: name,
        //       icon: icon,
        //       showInNavbar: showInNavbar,
        //     }, false, '');
        //   }, 50);
        // }
        _handleCreateMorePageClicked(ev){
          ev.stopPropagation();
          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(translateEngine(this._hass, 'more.create'), {
              type: "custom:dwains-edit-more-page-card", 
            }, true, '');
          }, 50);

        }
        _handleRemoveMorePageClicked(ev){
          this._hass.connection.sendMessagePromise({
            type: 'dwains_dashboard/remove_more_page',
            foldername: ev.currentTarget.more_page,
          }).then(
              (resp) => {
                  console.log(resp);
              },
              (err) => {
                  console.error('Message failed!', err);
              }
          );
        }
        _handleAddToNavbarClick(ev){
          const morePage = ev.currentTarget.more_page;
          this._hass.connection.sendMessagePromise({
            type: 'dwains_dashboard/remove_more_page',
            foldername: ev.currentTarget.more_page,
          }).then(
              (resp) => {
                  console.log(resp);
              },
              (err) => {
                  console.error('Message failed!', err);
              }
          );
        }

        _handleEditModeClicked(ev){
          ev.stopPropagation();
          const value = ev.currentTarget.value;
    
          if(value){
            this._sortable = [];
            const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
            for(var i=0; i<sortableElements.length; i++){
              this._sortable[i] = new Sortable(sortableElements[i], {
                  forceFallback: true,
                  animation: 150,
                  dataIdAttr: "data-more_page",
                  handle: '.sortable-move',
                  onEnd: function(event){ 
                    console.log(event);
                    hass().connection.sendMessagePromise({
                        type: 'dwains_dashboard/sort_more_page',
                        sortData: JSON.stringify(this.toArray()),
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
          this.editMode = value;
        }


        _renderPageButton(key, data){
          if(!data.name){
            return html``;
          }
          
          return html`
            <div class="relative" data-more_page="${key}">
              <div class="flex justify-between h-44 p-3 more-page-button" .path=${key} @click=${this._handleMorePageClick}>
                <div class="h-full flex flex-wrap content-between">
                  <div class="w-full ha-icon">
                    ${this.configuration['more_pages'][key] && this.configuration['more_pages'][key]['icon'] ? html`
                      <ha-icon
                        class="h-14 w-14"
                        style="color: var(--primary-color);"
                        .icon=${this.configuration['more_pages'][key]['icon']}
                      ></ha-icon>` 
                      : ""
                    }
                  </div>
                  <div class="w-full">
                    <h3 class="font-semibold text-lg capitalize">${data.name.replace(/_/g, " ")}</h3>
                  </div>
                </div>
              </div>
            ${this.editMode ? html`
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
                        .more_page=${key}
                        @click=${this._handleRemoveMorePageClicked}
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:trash-can"}></ha-icon>
                        </div>
                        ${this._hass.localize("ui.common.remove")}
                      </mwc-list-item>
                      ${!data.show_in_navbar == 9 ? html `
                        <mwc-list-item
                          graphic="icon"
                          .more_page="${key}"
                          @click="${this._handleAddToNavbarClick}"
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:tag-plus"}></ha-icon>
                          </div>
                          ${translateEngine(this._hass, 'more.add_navbar')}
                        </mwc-list-item>` : ""
                      }
                  </ha-button-menu>
                </div>
              </ha-card>` : ""}
            </div>
          `;
        }

        render() {    
          if(this.configuration == null || this.configuration.length === 0){
            return html``;
          } else {
            const more_pages = Object.entries(this.configuration['more_pages']).sort(function (x, y) {
              let a = x[1].sort_order,
                  b = y[1].sort_order;
              return a == b ? 0 : a > b ? 1 : -1;
            });

            //console.log(1,this.configuration['more_pages']);
            return html`
                <div id="more_pages" class="p-4">
                    <div class="flex justify-between mb-2">
                    <div>
                        <h2 class="font-semibold text-lg capitalize">
                        ${translateEngine(this._hass, 'more.title_plural')}
                        </h2>
                        <span class="text-gray-700">
                        ${Object.keys(this.configuration['more_pages']).length} ${translateEngine(this._hass, 'more.pages')}
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
                            <mwc-list-item
                                graphic="icon"
                                @click="${this._handleCreateMorePageClicked}"
                            >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${mdiNotePlus}></ha-svg-icon>
                                </div>
                                ${translateEngine(this._hass, 'more.create')}
                            </mwc-list-item>
                            ${this.editMode ? html `
                            <mwc-list-item
                              graphic="icon"
                              .value=${false}
                              @click=${this._handleEditModeClicked}
                            >
                              <div slot="graphic">
                                <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                              </div>
                              ${translateEngine(this._hass, 'global.disable_edit_mode')}
                            </mwc-list-item>` : html `
                            <mwc-list-item
                              graphic="icon"
                              .value=${true}
                              @click=${this._handleEditModeClicked}
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

                    <div class="grid grid-cols-2 md-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
                      ${Object.entries(more_pages).map(([k,v]) => this._renderPageButton(v[0],v[1]))}
                    </div>
                </div>
            `;
            //  ${Object.entries(this.configuration['more_pages']).map(([k,v]) => this._renderPageButton(k,v))}
          }
        }
    
        static get styles() {
          return css`
            .sortable-move {
              cursor: -webkit-grabbing;
              cursor: grab;
              margin: auto 0;
            }
            .card-actions-multiple {
              display: flex;
              justify-content: space-between;
              padding: 0.25rem 0.5rem;
            }
            .more-page-button .info ha-icon, .ha-icon ha-icon {
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
            .more-page-button {
              cursor: pointer;
              background: var( --ha-card-background, var(--card-background-color, white) );
              border-radius: var(--ha-card-border-radius, 4px);
              box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
              color: var(--test-primary-text-color, var(--primary-text-color));
            }
            .info-badge {
              /*background-color: var(--sidebar-icon-color);
              color: var( --ha-card-background, var(--card-background-color, white) );*/
              background-color: var(--secondary-background-color);
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
          }
          `
        }
    
        
      }
      customElements.define("more-pages-card", MorePagesCard);
});