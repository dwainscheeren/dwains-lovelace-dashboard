!function(e){var t={};function i(n){if(t[n])return t[n].exports;var a=t[n]={i:n,l:!1,exports:{}};return e[n].call(a.exports,a,a.exports,i),a.l=!0,a.exports}i.m=e,i.c=t,i.d=function(e,t,n){i.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},i.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},i.t=function(e,t){if(1&t&&(e=i(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(i.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var a in e)i.d(n,a,function(t){return e[t]}.bind(null,a));return n},i.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return i.d(t,"a",t),t},i.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},i.p="",i(i.s=0)}([function(e,t,i){const n=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(n).then(()=>{const e=customElements.get("hui-masonry-view")?Object.getPrototypeOf(customElements.get("hui-masonry-view")):Object.getPrototypeOf(customElements.get("hc-lovelace")),t=e.prototype.html,n=e.prototype.css,a=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW","N"],r={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",overcast:"mdi:weather-cloudy-arrow-right",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"};class s extends e{constructor(){super()}static get properties(){return{hass:{},_config:{}}}setConfig(e){if(!e.entity)throw new Error("Please define a weather entity");this._config=e}shouldUpdate(e){return function(e,t){return t.has("_config"),!0}(0,e)}renderMain(e){const i=r[e.state],n=this.hass.localize("component.weather.state._."+e.state);var a=e.attributes.temperature;if(this._config.tempsensor_entity&&this.hass.states[this._config.tempsensor_entity])a=Math.round(10*this.hass.states[this._config.tempsensor_entity].state)/10;return t`
        <div class="icon_state">
          <div class="weather_icon">
            <ha-icon icon="${i}"></ha-icon>
          </div>
          <div class="state">
            ${n}
          </div>
        </div>
        <div class="current">
          <span class="temperature">
            ${a}
          </span>
          <span class="unit"> 
            ${this.getUnit("temperature")}
          </span>
        </div>
      `}renderDetails(e){const i=this.hass.states["sun.sun"];let n,r;return i&&(n=new Date(i.attributes.next_rising),r=new Date(i.attributes.next_setting)),this.numberElements++,t`
        <ul class="variations ${this.numberElements>1?"spacer":""}">
          <li>
            <ha-icon icon="mdi:water-percent"></ha-icon>
            ${e.attributes.humidity}<span class="unit"> % </span>
          </li>
          <li>
            <ha-icon icon="mdi:weather-windy"></ha-icon> ${a[parseInt((e.attributes.wind_bearing+11.25)/22.5)]}
            ${e.attributes.wind_speed}<span class="unit">
              ${this.getUnit("length")}/h
            </span>
          </li>
          <li>
            <ha-icon icon="mdi:gauge"></ha-icon>
            ${e.attributes.pressure}
            <span class="unit">
              ${this.getUnit("air_pressure")}
            </span>
          </li>
          <li>
            <ha-icon icon="mdi:weather-fog"></ha-icon> ${e.attributes.visibility}<span class="unit">
              ${this.getUnit("length")}
            </span>
          </li>
          ${n?t`
                <li>
                  <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
                  ${n.toLocaleTimeString()}
                </li>
              `:""}
          ${r?t`
                <li>
                  <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
                  ${r.toLocaleTimeString()}
                </li>
              `:""}
        </ul>
      `}render(){if(!this._config||!this.hass)return t``;const e=this.hass.states[this._config.entity];return e?t`
        ${this._config.style?t`
          <style>
            ${this._config.style}
          </style>
        `:t``}

        <ha-card @click="${this._handleClick}">
          <div id="main">
            ${this.renderMain(e)}
          </div>
          <div id="details">
            ${this.renderDetails(e)}
          </div>
        </ha-card>
      `:t`
          <style>
            .not-found {
              flex: 1;
              background-color: yellow;
              padding: 8px;
            }
          </style>
          <ha-card>
            <div class="not-found">
              Entity not available: ${this._config.entity}
            </div>
          </ha-card>
        `}static get styles(){return n`
        ha-card {
          box-shadow: none;
          color: var(--text-primary-color);
          background: #1d1d1d;
          border-radius: 20px;
          padding: 4px;
        }

        #main {
          border: 2px solid #4c4d4e;
          border-radius: 20px;
          padding: 7px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #main .icon_state {
          display: flex;
          align-items: center;
        }
        #main .icon_state .weather_icon ha-icon {
          color: #f48f51;
          width: 25px;
        }
        #main .icon_state .state {
          padding-left: 5px;
        }
        #main .current {
          display: flex;
        }
        #main .current .temperature {  
          font-weight: 300;
          font-size: 1.5em;
        }
        #main .current .unit {
          font-size: 0.8em;
        }

        #details {
          margin-top: 5px;
        }
        .variations {
          display: flex;
          flex-flow: row wrap;
          justify-content: space-between;
          font-weight: 300;
          color: var(--primary-text-color);
          list-style: none;
          padding: 0 0.5em;
          margin: 0;
        }
        .variations ha-icon {
          height: 22px;
          margin-right: 3px;
          color: var(--paper-item-icon-color);
        }
        .variations li {
          flex-basis: auto;
          width: 50%;
        }
        .variations li:nth-child(2n) {
          text-align: right;
        }
        .variations li:nth-child(2n) ha-icon {
          margin-right: 0;
          margin-left: 8px;
          float: right;
        }
        .unit {
          font-size: 0.8em;
        }
      `}getUnit(e){const t=this.hass.config.unit_system.length;switch(e){case"air_pressure":return"km"===t?"hPa":"inHg";case"length":return t;case"precipitation":return"km"===t?"mm":"in";default:return this.hass.config.unit_system[e]||""}}_handleClick(){let e,t=window.location.pathname,i=t.substring(0,t.lastIndexOf("/"))+"/more_page_weather";window.history.pushState(null,"",i),e=new Event("location-changed",{composed:!0}),e.detail={replace:!1},window.dispatchEvent(e)}getCardSize(){return 2}}if(!customElements.get("dwains-weather-card")){customElements.define("dwains-weather-card",s);const e=i(1);console.info(`%c DWAINS-WEATHER-CARD \n%c    Version ${e.version}    `,"color: #2fbae5; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray")}})},function(e){e.exports=JSON.parse('{"name":"dwains-weather-card","private":true,"version":"0.0.5","description":"dwains-weather-card","scripts":{"build":"webpack","watch":"webpack --watch --mode=development","update-card-tools":"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools"},"keywords":[],"author":"Dwain Scheeren","license":"MIT","devDependencies":{"webpack":"^4.42.1","webpack-cli":"^3.3.11"},"dependencies":{"card-tools":"github:thomasloven/lovelace-card-tools"}}')}]);