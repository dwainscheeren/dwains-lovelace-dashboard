/**
Dwains Weather Card
Inspired by: bramkragten/weather-card and kalkih/simple-weather-card
**/
const bases = [customElements.whenDefined('home-assistant-main'), customElements.whenDefined('hui-view')];
Promise.race(bases).then(() => {

  const LitElement = customElements.get('home-assistant-main')
    ? Object.getPrototypeOf(customElements.get('home-assistant-main'))
    : Object.getPrototypeOf(customElements.get('hui-view'));

  const html = LitElement.prototype.html;

  const css = LitElement.prototype.css;

  const windDirections = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
    "N"
  ];

  const weatherIcons = {
    "clear-night": "mdi:weather-night",
    cloudy: "mdi:weather-cloudy",
    overcast: "mdi:weather-cloudy-arrow-right",
    fog: "mdi:weather-fog",
    hail: "mdi:weather-hail",
    lightning: "mdi:weather-lightning",
    "lightning-rainy": "mdi:weather-lightning-rainy",
    partlycloudy: "mdi:weather-partly-cloudy",
    pouring: "mdi:weather-pouring",
    rainy: "mdi:weather-rainy",
    snowy: "mdi:weather-snowy",
    "snowy-rainy": "mdi:weather-snowy-rainy",
    sunny: "mdi:weather-sunny",
    windy: "mdi:weather-windy",
    "windy-variant": "mdi:weather-windy-variant",
  };

  const fireEvent = (node, type, detail, options) => {
    options = options || {};
    detail = detail === null || detail === undefined ? {} : detail;
    const event = new Event(type, {
      bubbles: options.bubbles === undefined ? true : options.bubbles,
      cancelable: Boolean(options.cancelable),
      composed: options.composed === undefined ? true : options.composed
    });
    event.detail = detail;
    node.dispatchEvent(event);
    return event;
  };

  function hasConfigOrEntityChanged(element, changedProps) {
    if (changedProps.has("_config")) {
      return true;
    }

    return true;
  }

  class DwainsWeatherCard extends LitElement {
    constructor() {
      super();
    }

    static get properties() {
      return {
        hass: {},
        _config: {},
      };
    }

    setConfig(config) {
      if (!config.entity) {
        throw new Error("Please define a weather entity");
      }
      this._config = config;
    }

    shouldUpdate(changedProps) {
      return hasConfigOrEntityChanged(this, changedProps);
    }

    renderMain(stateObj){
      const icon = weatherIcons[stateObj.state];
      const state = this.hass.localize('component.weather.state._.'+stateObj.state);
      var temperature = stateObj.attributes.temperature;

      if(this._config.tempsensor_entity && this.hass.states[this._config.tempsensor_entity]){
        var temperature = (Math.round(this.hass.states[this._config.tempsensor_entity].state * 10) / 10);
      }

      return html`
        <div class="icon_state">
          <div class="weather_icon">
            <ha-icon icon="${icon}"></ha-icon>
          </div>
          <div class="state">
            ${state}
          </div>
        </div>
        <div class="current">
          <span class="temperature">
            ${temperature}
          </span>
          <span class="unit"> 
            ${this.getUnit("temperature")}
          </span>
        </div>
      `;
    }

    renderDetails(stateObj) {
      const sun = this.hass.states["sun.sun"];
      let next_rising;
      let next_setting;

      if (sun) {
        next_rising = new Date(sun.attributes.next_rising);
        next_setting = new Date(sun.attributes.next_setting);
      }

      this.numberElements++;

      return html`
        <ul class="variations ${this.numberElements > 1 ? "spacer" : ""}">
          <li>
            <ha-icon icon="mdi:water-percent"></ha-icon>
            ${stateObj.attributes.humidity}<span class="unit"> % </span>
          </li>
          <li>
            <ha-icon icon="mdi:weather-windy"></ha-icon> ${windDirections[
              parseInt((stateObj.attributes.wind_bearing + 11.25) / 22.5)
            ]}
            ${stateObj.attributes.wind_speed}<span class="unit">
              ${this.getUnit("length")}/h
            </span>
          </li>
          <li>
            <ha-icon icon="mdi:gauge"></ha-icon>
            ${stateObj.attributes.pressure}
            <span class="unit">
              ${this.getUnit("air_pressure")}
            </span>
          </li>
          <li>
            <ha-icon icon="mdi:weather-fog"></ha-icon> ${stateObj.attributes
              .visibility}<span class="unit">
              ${this.getUnit("length")}
            </span>
          </li>
          ${next_rising
            ? html`
                <li>
                  <ha-icon icon="mdi:weather-sunset-up"></ha-icon>
                  ${next_rising.toLocaleTimeString()}
                </li>
              `
            : ""}
          ${next_setting
            ? html`
                <li>
                  <ha-icon icon="mdi:weather-sunset-down"></ha-icon>
                  ${next_setting.toLocaleTimeString()}
                </li>
              `
            : ""}
        </ul>
      `;
    }

    render() {
      //Check if config and hass is loaded
      if (!this._config || !this.hass) {
        return html``;
      }

      //Check if its a valid weather entity
      const stateObj = this.hass.states[this._config.entity];
      if (!stateObj) {
        return html`
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
        `;
      }

      //Render the card
      var title;

      return html`
        ${this._config.style ? html`
          <style>
            ${this._config.style}
          </style>
        ` : html``}

        <ha-card @click="${this._handleClick}">
          <div id="main">
            ${this.renderMain(stateObj)}
          </div>
          <div id="details">
            ${this.renderDetails(stateObj)}
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
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
      `
    }


    getUnit(measure) {
      const lengthUnit = this.hass.config.unit_system.length;
      switch (measure) {
        case "air_pressure":
          return lengthUnit === "km" ? "hPa" : "inHg";
        case "length":
          return lengthUnit;
        case "precipitation":
          return lengthUnit === "km" ? "mm" : "in";
        default:
          return this.hass.config.unit_system[measure] || "";
      }
    }

    _handleClick() {
      //fireEvent(this, "hass-more-info", { entityId: this._config.entity });
      let e;
      let path = window.location.pathname;
      let nav_path = path.substring(0, path.lastIndexOf('/')) + "/more_page_weather";
      window.history.pushState(null, '', nav_path);
      e = new Event('location-changed', { composed: true });
      e.detail = { replace: false };
      window.dispatchEvent(e);
    }
    
    getCardSize() {
      return 2;
    }
  }
    

  if(!customElements.get("dwains-weather-card")) {
    customElements.define("dwains-weather-card", DwainsWeatherCard);
    const pjson = require('../package.json');
    console.info(
      `%c DWAINS-WEATHER-CARD \n%c    Version ${pjson.version}    `,
      'color: #2fbae5; font-weight: bold; background: black',
      'color: white; font-weight: bold; background: dimgray',
    );
  }
});