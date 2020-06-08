import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

const VERSION = "0.0.3";

class DwainsCollapseCard extends LitElement {
  constructor() {
    super();
  }

  static get properties() {
    return {
      _config: {},
      _refCards: {},
      _hass: {},
      _width: { attribute: false, type: Number },
    };
  }

  async setConfig(config) {
    if (
      !config &&
      ((!config.cards && !Array.isArray(config.cards)))
    ) {
      throw new Error("Card config incorrect");
    }
    this._config = config;
    this._refCards = [];
    this.open = false;

    if (window.loadCardHelpers) {
      this.helpers = await window.loadCardHelpers();
    }

    this.renderCard();
  }

  renderCard() {
    const config = this._config;

    const promises = config.cards.map((config) =>
      this.createCardElement(config)
    );
    Promise.all(promises).then((cards) => {
      this._refCards = cards;
      this.requestUpdate();
      //Removed some code here
    });
    
  }

  async createCardElement(cardConfig) {
    const createError = (error, config) => {
      return createThing("hui-error-card", {
        type: "error",
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
    if (tag.startsWith("divider")) {
      tag = `hui-divider-row`;
    } else if (tag.startsWith("custom:")) {
      tag = tag.substr("custom:".length);
    } else {
      tag = `hui-${tag}-card`;
    }

    const element = createThing(tag, cardConfig);

    if (cardConfig.item_classes) {
      //console.log(cardConfig.grid);
      element.className = "item " + cardConfig.item_classes;
    } else {
      if (this._config.items_classes) {
        element.className = "item " + this._config.items_classes;
      } else {
        element.className = "item";
      }
    }

    element.hass = this._hass;
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this.createCardElement(cardConfig).then(() => {
          this.renderCard();
        });
      },
      { once: true }
    );
    return element;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._refCards) {
      this._refCards.forEach((card) => {
        card.hass = hass;
      });
    }
  }

  toggle(ev) {
    if (ev) {
      ev.stopPropagation();
    }
    this.open = !this.open;
    this.requestUpdate();
  }

  render() {
    if (!this._config || !this._hass || !this._refCards) {
      return html``;
    }

    var widthTest = 0;

    for (let k in this._refCards) {
      if (this._refCards[k]) {
        widthTest = widthTest + parseInt(this._refCards[k].offsetWidth);
      }
    }

    var items = widthTest / 61;

    var maxItems = Math.floor(this._width / 61);

    var hideToggle = items <= maxItems ? true : false;

    return html`
      <div class="wrapper">
        <div
          class="items ${this.open ? "expanded" : "collapsed"}"
          ?open=${this.open}
        >
          ${this._refCards}
        </div>

        <div class="toggle" @click=${this.toggle} ?hidden=${hideToggle}>
          <ha-icon
            icon=${this.open ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </div>
      </div>
    `;
  }

  updated(changedProperties) {
    this._width = parseFloat(
      getComputedStyle(this).getPropertyValue("width"),
      10
    );
  }

  static get styles() {
    return [
      css`
        :host {
          display: block;
        }
        .wrapper {
        }
        .items {
          display: flex;
          flex-wrap: wrap;
          max-height: 70px;
          transition: max-height 0.15s ease-out;
          overflow: hidden;
        }
        .items .item {
        }
        .items.collapsed {
          //flex: 0;
        }
        .items[open] {
          max-height: 500px;
          transition: max-height 0.25s ease-in;
        }
        .toggle {
          padding: 1px 0;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          color: white;
          text-align: center;
          width: 80px;
          margin: 0 auto;
        }
      `,
    ];
  }

  getCardSize() {
    return 3;
  }
}

if (!customElements.get("dwains-collapse-card")) {
  customElements.define("dwains-collapse-card", DwainsCollapseCard);
  console.info(
    `%c DWAINS-COLLAPSE-CARD \n%c    Version ${VERSION}     `,
    "color: #2fbae5; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray"
  );
}
