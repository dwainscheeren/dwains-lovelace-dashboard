import { deviceID } from "card-tools/src/deviceId";
import { lovelace_view, provideHass, load_lovelace, lovelace, hass } from "card-tools/src/hass";
import { popUp, closePopUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import { moreInfo } from "card-tools/src/more-info.js";

class DwainsDashboard {

  async _load_lovelace() {
    console.log('_load_lovelace');
    if(!await load_lovelace()) {
      console.log('await');
      let timer = window.setTimeout(this._load_lovelace.bind(this), 100);
      this.test();
    } 
  }

  _connect() {
    if(!window.hassConnection) {
      window.setTimeout(() => this._connect(), 100);
    } else {
      window.hassConnection.then((conn) => this.connect(conn.conn));
    }
  }

  constructor() {
    this.cast = document.querySelector("hc-main") !== null;
    if(!this.cast) {
      window.setTimeout(this._load_lovelace.bind(this), 500);
      this._connect();
      document.querySelector("home-assistant").addEventListener("hass-more-info", this.popup_card.bind(this));
    } else {
      this.connect(hass().connection);
    }

    //this.test();

    const pjson = require('../package.json');
    console.info(
      `%c  DWAINS_DASHBOARD JS  \n%c    Version ${pjson.version}     `,
      "color: #2fbae5; font-weight: bold; background: black",
      "color: white; font-weight: bold; background: dimgray"
    );
  }

  test() {
    console.log('before');
    if(!lovelace()) return;
    const ll = lovelace();
    console.log(ll);
  }

  connect(conn) {
    this.conn = conn
    conn.subscribeEvents(() => this._reload(), "dwains_dashboard_reload");
  }

  _reload() {
    const ll = lovelace_view();
    if (ll)
      fireEvent("config-refresh", {}, ll);
  }

  popup_card(ev) {
    if(!lovelace()) return;
    const ll = lovelace();
    const data = {
      ...ll.config.dwains_dashboard_popup_cards,
      ...ll.config.views[ll.current_view].dwains_dashboard_popup_cards,
    };

    if(!ev.detail || !ev.detail.entityId) return;
    const d = data[ev.detail.entityId];
    if(!d) return;
    window.setTimeout(() => {
      fireEvent("hass-more-info", {entityId: "."}, document.querySelector("home-assistant"));
      popUp(d.title, d.card, d.large || false, d.style);
    }, 50);
  }
  
}


const bases = [customElements.whenDefined('home-assistant-main'), customElements.whenDefined('hui-view')];
Promise.race(bases).then(() => {
  window.dwains_dashboard = window.dwains_dashboard || new DwainsDashboard();
});