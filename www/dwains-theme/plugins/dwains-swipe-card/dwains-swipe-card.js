import {
    LitElement,
    html,
    css
  } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

const VERSION = '0.0.1';
  
class DwainsSwipeCard extends LitElement {
  static get properties() {
		return {
			_config: {},
			_cards: {},
			_hass: {}
		};
	}

	async setConfig(config) {
        if (!config 
			&& ((!config.cards && !Array.isArray(config.cards)) 
				|| (!config.entities || !Array.isArray(config.entities)) ) 
		) {
            throw new Error('Card config incorrect');
        }
        this._config = config;
        this._refCards = [];

        if (window.loadCardHelpers) {
            this.helpers = await window.loadCardHelpers();
        }

        this.renderCard();
        
        this._transform = null;
    }

    renderCard() {
		const config = this._config;
		if(config.entities){
			const promises = config.entities.map(config => this.createCardElement(config));
			Promise.all(promises).then((cards) => {
				this._refCards = cards;
				//Removed some code here
			})
		} else {
			const promises = config.cards.map(config => this.createCardElement(config));
			Promise.all(promises).then((cards) => {
				this._refCards = cards;
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
    
    firstUpdated(){
        this.addEventListener('mousedown', this.mouseDown, false);
        this.addEventListener('touchestart', this.mouseDown, false);

        this.addEventListener('mouseup', this.mouseUp, false);
        this.addEventListener('toucheend', this.mouseUp, false);
    }

    updateDivPosition (event) {
        //var divRect = div.getBoundingClientRect()
        //var startX = seekbar.getBoundingClientRect().left
        var mouseX = event.clientX
        //div.style.transform = 'translateX(' + (mouseX - startX) + 'px)'
        this._transform = mouseX;
        console.log(mouseX);
        //div.style.left = mouseX - startX + 'px';
    }

    mouseUp() {
        console.log('mouseup')
        window.removeEventListener('mousemove', this.updateDivPosition, true);
    }

    mouseDown() {	
        console.log('mousedown');
        window.addEventListener('mousemove', this.updateDivPosition, true);
    }
	
	render() {
		if (!this._config || !this._hass || !this._refCards) {
			return html``;
    }

		return html`
            <div class="glider">
                <div class="glider-track" style="transform: translateX('${this._transform}')">
                    ${this._refCards}
                </div>
			</div>
		`;
	}

  	static get styles() {
	return [
    css`
        .glider {
            background: red;
        }
        .glider {
            margin: 0 auto;
            position: relative;
            overflow-x: hidden;
            overflow-y: hidden;
        }
        .glider-track {
            width: 100%;
            margin: 0;
            padding: 0;
            display: flex;
            z-index: 1;
        }
        .item {
            pointer-events: none;
        }
	  `
	];
	}

	getCardSize() {
		return 3;
	}
}

if(!customElements.get("dwains-swipe-card")) {
  customElements.define("dwains-swipe-card", DwainsSwipeCard);
  console.info(
    `%c DWAINS-SWIPE-CARD \n%c   Version ${VERSION}   `,
    'color: #2fbae5; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray',
  );
}
