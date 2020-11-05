const bases = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases).then(() => {

  const LitElement = customElements.get('hui-masonry-view')
    ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))
    : Object.getPrototypeOf(customElements.get('hc-lovelace'));

  const html = LitElement.prototype.html;

  const css = LitElement.prototype.css;

  class DwainsHeadingCard extends LitElement {
    constructor() {
      super();
    }

    setConfig(config) {
      this._config = JSON.parse(JSON.stringify(config));
    }

    render() {
      return html`
        <ha-card style="box-shadow: none;
        background: none;
        padding: 0px 16px 0px 0px !important;
        color: var(--dwains-theme-grey);
        font-weight: bold;
        font-size: 14px;">
          ${this._config.title}
        </ha-card>
      `;
    }

    getCardSize() {
      return 1;
    }
  }

  if (!customElements.get("dwains-heading-card")) {
    customElements.define("dwains-heading-card", DwainsHeadingCard);
    const pjson = require('../package.json');
    console.info(
      `%c DWAINS-HEADING-CARD \n%c    Version ${pjson.version}    `,
      "color: #2fbae5; font-weight: bold; background: black",
      "color: white; font-weight: bold; background: dimgray"
    );
  }
});