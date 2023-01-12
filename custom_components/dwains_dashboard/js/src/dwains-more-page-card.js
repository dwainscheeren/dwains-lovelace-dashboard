import { hass } from "card-tools/src/hass";
import { popUp, closePopUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import { mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement } from 'lit-element';

const bases2 = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases2).then(() => {
    const cardHelpers = window.loadCardHelpers()
    ? window.loadCardHelpers()
    : undefined;

    class MorePageCard extends LitElement {
        static get properties() {
          return {
            card: {},
            _hass: {},
            configuration: {},
          };
        }

         /**
         * @param {any} hass
         */
        set hass(hass) {
          if(this.card == null || this.card.length === 0) return;
          this.card.hass = hass;
        }
    
        async setConfig(config) {
          this._hass = hass();

          this.name = config.name;
          this.foldername = config.foldername;
          this.icon = config.icon;
          this.showInNavbar = config.showInNavbar;
          this.cardConfig = config.card;
          
          if(Array.isArray(config.card)){
            // const cards = [];
            // config.card.forEach(async(item) => cards.push(await this.createCardElement2(item)));
            // this.cards = cards;
            // this.mode = 'multiple';
            this.card = await this.createCardElement2({ 
              type: "vertical-stack",
              cards: config.card,
            });
          } else {
            this.card = await this.createCardElement2(config.card);
          }
        }

        async connectedCallback(){
          super.connectedCallback();
    
          await this._loadData(); //Load data
    
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

        async createCardElement2(config){
          const cardHelper = await cardHelpers;
          const element = await cardHelper.createCardElement(config);
          element.hass = hass();    
          return element;
        }

        _handleEditMorePageClicked(ev){
          const more_page = this.foldername;
          const name = this.configuration['more_pages'][more_page] && this.configuration['more_pages'][more_page]['name'] ? this.configuration['more_pages'][more_page]['name'] : "";
          const icon = this.configuration['more_pages'][more_page] && this.configuration['more_pages'][more_page]['icon'] ? this.configuration['more_pages'][more_page]['icon'] : "";
          const showInNavbar = this.configuration['more_pages'][more_page] && this.configuration['more_pages'][more_page]['show_in_navbar'] ? this.configuration['more_pages'][more_page]['show_in_navbar'] : false;
          window.setTimeout(() => {
            fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
            popUp(this._hass.localize("ui.components.entity.entity-picker.edit"), {
              type: "custom:dwains-edit-more-page-card", 
              more_page: more_page,
              name: name,
              icon: icon,
              showInNavbar: showInNavbar,
              foldername: more_page,
              mode: "editor-element",
              cardConfig: this.cardConfig,
            }, true, '');
          }, 50);
        }

        render() {    
          if(this.configuration == null || this.configuration.length === 0){
            return html``;
          } 

          return html`
              <div id="more-page">
                <div class="flex justify-between mb-2">
                  <div>
                    <h2 class="font-semibold text-lg capitalize">
                      ${this.name}
                    </h2>
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
                            @click="${this._handleEditMorePageClicked}"
                          >
                            <div slot="graphic">
                              <ha-icon .icon=${"mdi:cog"}></ha-icon>
                            </div>
                            ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                          </mwc-list-item>
                    </ha-button-menu>
                    `: ""}
                  </div>
                </div>

                ${this.card}
              </div>
            `;

          // if(this.mode == 'single'){
          //   return html`
          //     <div id="more-page">
          //       ${this.card}
          //     </div>
          //   `;
          // } else {
          //   console.log(this.cards);
          //   return html`
          //     <div id="more-page">
          //       cardsss:
          //       ${Object.entries(this.cards).map(card => console.log(card))}
          //       ${this.cards.map(card => console.log(card))}
          //     </div>
          //   `;
          // }
        }
    
        static get styles() {
          return css`
            #more-page {
              padding: 1rem;
            }
            .justify-between {
              justify-content: space-between;
            }
            .flex {
                display: flex;
            }
            .mb-2 {
                margin-bottom: 0.5rem;
            }
            .font-semibold {
              font-weight: 600;
            }
            .text-lg {
                font-size: 1.125rem;
                line-height: 1.75rem;
            }
            .capitalize {
              text-transform: capitalize;
            }
          `
        }
    
        
      }
      customElements.define("more-page-card", MorePageCard);
});