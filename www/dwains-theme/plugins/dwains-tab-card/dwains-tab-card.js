import {
	LitElement,
	html,
	css
  } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";
	
const VERSION = '0.0.1';
  
class DwainsTabCard extends LitElement {
  constructor() {
		super();
	}

	static get properties() {
		return {
			_config: {},
			_cards: {},
			_hass: {}
		};
	}

	async setConfig(config) {
        if (!config 
			&& ((!config.tabs && !Array.isArray(config.tabs)) 
				|| (!config.entities || !Array.isArray(config.entities)) ) 
		) {
            throw new Error('Card config incorrect');
        }

        window.addEventListener("location-changed", () => this.test(new Map()));

        this._config = config;
        this._refCards = [];

        if (window.loadCardHelpers) {
            this.helpers = await window.loadCardHelpers();
        }

		this.renderCard();
    }

    test(changedProperties) {
      console.log('test');
    }

    renderCard() {
		const config = this._config;
		if(config.entities){
			const promises = config.entities.map(config => this.createCardElement(config));
			Promise.all(promises).then((cards) => {
				this._refCards = cards;
				this.requestUpdate();
				//Removed some code here
			})
		} else {
			const promises = config.tabs.map(config => this.createCardElement(config));
			Promise.all(promises).then((tabs) => {
				this._refTabs = tabs;
				this.requestUpdate();
				//Removed some code here
			})
		}
    }

    async createCardElement(cardConfig) {
        const createError = (error, config) => {
            return createThing('hui-error-card', {
                type: 'error',
                error,
                config,
            });
        };
        
        const createThing = (tag, config) => {
            if (this.helpers) {
                return this.helpers.createCardElement(config);
            }
            
			const element = document.createElement(tag);

            try {
                element.setConfig(config);
            } catch (err) {
                console.error(tag, err);
                return createError(err.message, config);
            }
            return element;
        };

        let tag = cardConfig.type;
        if (tag.startsWith('divider')) {
            tag = `hui-divider-row`;
        } else if (tag.startsWith('custom:')) {
            tag = tag.substr('custom:'.length);
        } else {
            tag = `hui-${tag}-card`;
        }

		const element = createThing(tag, cardConfig);

		//console.log(element);
		
		if(cardConfig.item_classes){
			//console.log(cardConfig.grid);
			element.className = "item " + cardConfig.item_classes;
	  	} else {
			if(this._config.items_classes){
				element.className = "item " + this._config.items_classes;
		  	} else {
				element.className = "item";
			}
		}

        element.hass = this._hass;
        element.addEventListener(
            'll-rebuild',
            ev => {
                ev.stopPropagation();
                this.createCardElement(cardConfig).then(() => {
                    this.renderCard();
                });
            },
            { once: true },
        );     
        return element;     
    }

    set hass(hass) {
        this._hass = hass
        if (this._refCards) {
            this._refCards.forEach((card) => {
                card.hass = hass;
            });
        }
	}
	
	render() {
		if (!this._config || !this._hass || !this._refTabs) {
			return html``;
		}

		//console.log(this._refCards);

		var padding;
		if(this._config.padding){
			padding = 'padding';
		}

		return html`
			<div class="wrapper ${padding}">
				<div class="row">
				  ${this._refTabs}
				</div>
			</div>
		`;
	}

  	static get styles() {
	return [
	  css`
		  .wrapper {
        background: red;
      }
	  `
	];
	}

	getCardSize() {
		return 3;
	}
}
  
if(!customElements.get("dwains-tab-card")) {
  customElements.define("dwains-tab-card", DwainsTabCard);
  console.info(
    `%c DWAINS-TAB-CARD \n%c  Version ${VERSION}  `,
    'color: #2fbae5; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray',
  );
}