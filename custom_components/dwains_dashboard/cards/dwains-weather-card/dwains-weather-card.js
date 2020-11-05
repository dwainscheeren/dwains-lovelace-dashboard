!function(t){var e={};function i(n){if(e[n])return e[n].exports;var a=e[n]={i:n,l:!1,exports:{}};return t[n].call(a.exports,a,a.exports,i),a.l=!0,a.exports}i.m=t,i.c=e,i.d=function(t,e,n){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(i.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var a in t)i.d(n,a,function(e){return t[e]}.bind(null,a));return n},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=0)}([function(t,e,i){const n=[customElements.whenDefined("home-assistant-main"),customElements.whenDefined("hui-view")];Promise.race(n).then(()=>{const t=customElements.get("home-assistant-main")?Object.getPrototypeOf(customElements.get("home-assistant-main")):Object.getPrototypeOf(customElements.get("hui-view")),e=t.prototype.html,n=t.prototype.css,a=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW","N"],r={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",overcast:"mdi:weather-cloudy-arrow-right",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"};class s extends t{constructor(){super()}static get properties(){return{hass:{},_config:{}}}setConfig(t){if(!t.entity)throw new Error("Please define a weather entity");this._config=t}shouldUpdate(t){return function(t,e){return e.has("_config"),!0}(0,t)}renderMain(t){const i=r[t.state],n=this.hass.localize("component.weather.state._."+t.state);var a=t.attributes.temperature;if(this._config.tempsensor_entity&&this.hass.states[this._config.tempsensor_entity])a=Math.round(10*this.hass.states[this._config.tempsensor_entity].state)/10;return e`
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
    `}renderDetails(t){const i=this.hass.states["sun.sun"];let n,r;return i&&(n=new Date(i.attributes.next_rising),r=new Date(i.attributes.next_setting)),this.numberElements++,e`
      <ul class="variations ${this.numberElements>1?"spacer":""}">
        <li>
          <ha-icon icon="mdi:water-percent"></ha-icon>
          ${t.attributes.humidity}<span class="unit"> % </span>
        </li>
        <li>
          <ha-icon icon="mdi:weather-windy"></ha-icon> ${a[parseInt((t.attributes.wind_bearing+11.25)/22.5)]}
          ${t.attributes.wind_speed}<span class="unit">
            ${this.getUnit("length")}/h
          </span>
        </li>
        <li>
          <ha-icon icon="mdi:gauge"></ha-icon>
          ${t.attributes.pressure}
          <span class="unit">
            ${this.getUnit("air_pressure")}
          </span>
        </li>
        <li>
          <ha-icon icon="mdi:weather-fog"></ha-icon> ${t.attributes.visibility}<span class="unit">
            ${this.getUnit("length")}
          </span>
        </li>
        ${n?e`
              <li>
                <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
                ${n.toLocaleTimeString()}
              </li>
            `:""}
        ${r?e`
              <li>
                <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
                ${r.toLocaleTimeString()}
              </li>
            `:""}
      </ul>
    `}render(){if(!this._config||!this.hass)return e``;const t=this.hass.states[this._config.entity];return t?e`
      ${this._config.style?e`
        <style>
          ${this._config.style}
        </style>
      `:e``}

      <ha-card @click="${this._handleClick}">
        <div id="main">
          ${this.renderMain(t)}
        </div>
        <div id="details">
          ${this.renderDetails(t)}
        </div>
      </ha-card>
    `:e`
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
    `}getUnit(t){const e=this.hass.config.unit_system.length;switch(t){case"air_pressure":return"km"===e?"hPa":"inHg";case"length":return e;case"precipitation":return"km"===e?"mm":"in";default:return this.hass.config.unit_system[t]||""}}_handleClick(){let t,e=window.location.pathname,i=e.substring(0,e.lastIndexOf("/"))+"/more_page_weather";window.history.pushState(null,"",i),t=new Event("location-changed",{composed:!0}),t.detail={replace:!1},window.dispatchEvent(t)}getCardSize(){return 2}}if(!customElements.get("dwains-weather-card")){customElements.define("dwains-weather-card",s);const t=i(1);console.info(`%c DWAINS-WEATHER-CARD \n%c    Version ${t.version}    `,"color: #2fbae5; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray")}})},function(t){t.exports=JSON.parse('{"name":"dwains-weather-card","private":true,"version":"0.0.4","description":"dwains-weather-card","scripts":{"build":"webpack","watch":"webpack --watch --mode=development","update-card-tools":"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools"},"keywords":[],"author":"Dwain Scheeren","license":"MIT","devDependencies":{"webpack":"^4.42.1","webpack-cli":"^3.3.11"},"dependencies":{"card-tools":"github:thomasloven/lovelace-card-tools"}}')}]);