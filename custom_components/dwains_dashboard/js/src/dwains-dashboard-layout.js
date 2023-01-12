import { LitElement, html,css } from "lit";

class DwainsDashboardLayout extends LitElement {
  setConfig(_config) {}

  static get properties() {
    return {
      cards: {},
    };
  }

  static get styles() {
    return [
      css`
      #dwains_dashboard {
        nmax-width: 1465px;
        padding-bottom: 50px;
        margin: 0 auto;
        font-family: "Open Sans", sans-serif !important;
        padding-top: 60px;
      }
      @media only screen and (max-width: 768px) {
        #dwains_dashboard {
          padding-top: 1px;
          padding-bottom: 50px;
        }
      }
      @media only screen and (max-width: 1800px) and (hover: none) {
        #dwains_dashboard {
          padding-top: 1px;
          padding-bottom: 50px;
        }
      }
      `
    ]
  }

  render() {
    if(!this.cards) {
      return html``;
    }
    return html`
      <div id="dwains_dashboard" style="">
        ${this.cards.map((card) => html`${card}`)}
      </div>
    `;
  }
}

(async () => {
  // Thanks Thomas Loven!
  await Promise.race([
    customElements.whenDefined("home-assistant"), 
    customElements.whenDefined("hc-main"),
    customElements.whenDefined('hui-masonry-view'), 
    customElements.whenDefined('hc-lovelace')
  ])

  if (!customElements.get("dwains-dashboard-layout")) {
    customElements.define("dwains-dashboard-layout", DwainsDashboardLayout);
    const pjson = require('../package.json');
    console.info(
      `%c DWAINS-DASHBOARD-JS \n%c    Version ${pjson.version}    `,
      "color: #2fbae5; font-weight: bold; background: black",
      "color: white; font-weight: bold; background: dimgray"
    );
  }
})();