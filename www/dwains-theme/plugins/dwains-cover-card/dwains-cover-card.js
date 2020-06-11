import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

const VERSION = '0.0.3';

class DwainsCoverCard extends LitElement {

  static get properties() {
    return {
      hass: {},
      config: {},
      active: {}
    };
  }

  constructor() {
    super();
  }

  render() {
    
    var entity = this.config.entity;
    var stateObj = this.hass.states[entity];

    const name = stateObj.attributes.friendly_name === undefined
            ? stateObj.entity_id.split(".")[1].replace(/_/g, " ")
            : stateObj.attributes.friendly_name;

    if(stateObj.attributes.supported_features & 7 > 0){
      //Cover has flags for position active
      return html`
        <ha-card
            .header=${this.config.title || name}>
            <div class="slider">
                <span class="open">${this.hass.localize('component.cover.state._.open')} <span class="percentage" id="percentage">${stateObj.state === "closed" ? 0 : stateObj.attributes.current_position} %</span></span>
                <div class="outer">
                    <input 
                        type="range" 
                        class="range vertical-heighest-first round" 
                        .value="${stateObj.state === "closed" ? 0 : stateObj.attributes.current_position}" 
                        @change=${e => this._setPosition(stateObj, e.target.value)}
                    >
                </div>
                <span class="open">${this.hass.localize('component.cover.state._.closed')}</span>
            </div>
        </ha-card>
      `;
    } else {
      //Cover has only support for open,close,stop (11)
      return html`
        <ha-card
            .header=${this.config.title || name}>
            <div class="buttons">
              <ha-cover-controls
                  .hass="${this.hass}"
                  .stateObj="${stateObj}"
              ></ha-cover-controls>
            </div>
        </ha-card>
      `;
    }
  }

  _createRange(amount) {
    const items = [];
    for (let i = 0; i < amount; i++) {
      items.push(i);
    }
    return items;
  }

  _setPosition(state, value) {
    this.hass.callService("cover", "set_cover_position", {
        entity_id: state.entity_id,
        position: value
    });
  }

  _switch(state) {
      this.hass.callService("homeassistant", "toggle", {
        entity_id: state.entity_id    
      });
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = config;
  }

  getCardSize() {
    return 3;
  }
    
  static get styles() {
    return css`
        ha-card {
          padding: 0 0 15px 0px;
          display: block;
          position: relative;
          background: white;
          margin: 0 0 25px 0;
        }
        .card-header {
          font-size: 16px;
          text-align: center;
          padding-left: 0px;
          padding-right: 0px;
        }
        .slider {
          width: auto;
          text-align: center;
        }
        .buttons {
          height: 128px;
          width: auto;
          margin-left: 30px;
          margin-top: 48px;
        }
        .open, .closed {
          font-size: 13px;
          display: block
        }
        .percentage {
          color: #48c5ff;
        }
        .outer {
          height: 80px;
          padding-top: 60px;
          display: block;
        }

        input[type="range"].range
        {
            cursor: pointer;
            width: 120px !important;
            -webkit-appearance: none;
            z-index: 200;
            width: 60px;
            height: 15px;
            border: 1px solid #e6e6e6;
            background-color: #e6e6e6;
            background-image: -webkit-gradient(linear, 0% 0%, 0% 100%, from(#e6e6e6), to(#d2d2d2));
            background-image: -webkit-linear-gradient(right, #e6e6e6, #d2d2d2);
            background-image: -moz-linear-gradient(right, #e6e6e6, #d2d2d2);
            background-image: -ms-linear-gradient(right, #e6e6e6, #d2d2d2);
            background-image: -o-linear-gradient(right, #e6e6e6, #d2d2d2);
        }
        input[type="range"].range:focus
        {
            border: 0 !imporant;
            outline: none !important;
        }
        input[type="range"].range::-webkit-slider-thumb
        {
            -webkit-appearance: none;
            width: 15px;
            height: 15px;
            background-color: #555;
            background-image: -webkit-gradient(linear, 0% 0%, 0% 100%, from(#4DDBFF), to(#00CCFF));
            background-image: -webkit-linear-gradient(right, #4DDBFF, #00CCFF);
            background-image: -moz-linear-gradient(right, #4DDBFF, #00CCFF);
            background-image: -ms-linear-gradient(right, #4DDBFF, #00CCFF);
            background-image: -o-linear-gradient(right, #4DDBFF, #00CCFF);
        }
        input[type="range"].round {
            -webkit-border-radius: 20px;
            -moz-border-radius: 20px;
            border-radius: 20px;
        }
        input[type="range"].round::-webkit-slider-thumb {
            -webkit-border-radius: 5px;
            -moz-border-radius: 5px;
            -o-border-radius: 5px;
        }
        .vertical-heighest-first
        {
            -webkit-transform:rotate(270deg);
            -moz-transform:rotate(270deg);
            -o-transform:rotate(270deg);
            -ms-transform:rotate(270deg);
            transform:rotate(270deg);
        }
    `;
  }  
}

if(!customElements.get("dwains-cover-card")) {
  customElements.define("dwains-cover-card", DwainsCoverCard);
  console.info(
    `%c DWAINS-COVER-CARD \n%c   Version ${VERSION}   `,
    'color: #2fbae5; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray',
  );
}