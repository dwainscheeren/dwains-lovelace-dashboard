import { deviceID } from "card-tools/src/deviceId";
import { lovelace_view, load_lovelace, lovelace, hass } from "card-tools/src/hass";
import { popUp, closePopUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import { moreInfo } from "card-tools/src/more-info.js";
import {
  applyThemesOnElement
} from 'custom-card-helpers';

window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

class DwainsDashboard {

  async _load_lovelace() {
    //console.log('_load_lovelace');
    if(!await load_lovelace()) {
      //console.log('await');
      let timer = window.setTimeout(this._load_lovelace.bind(this), 100);
      this.test();
    } 
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async _getConfig() {
    let lovelace_load;
    while(!lovelace_load) {
      lovelace_load = lovelace();
      if(!lovelace_load) {
        await this.sleep(500);
      }
    }
    // console.log(lovelace_load);
    // return lovelace_load;
    this.lovelace_load = lovelace_load;
    this.frontend_stuff();
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
      this._connect();
      document.querySelector("home-assistant").addEventListener("hass-more-info", this.popup_card.bind(this));
    } else {
      this.connect(hass().connection);
    }

    window.setTimeout(this._getConfig.bind(this), 500);

    const updater = this.update.bind(this);
    window.addEventListener("location-changed", updater);
    window.addEventListener("popstate", updater);

    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'https://fonts.googleapis.com/css?family=Open+Sans&display=swap';
    link.media = 'all';
    document.getElementsByTagName('head')[0].appendChild(link);

    const pjson = require('../package.json');
    console.info(
      `%c  DWAINS_DASHBOARD JS  \n%c    Version ${pjson.version}     `,
      "color: #2fbae5; font-weight: bold; background: black",
      "color: white; font-weight: bold; background: dimgray"
    );
  }

  update(){
    let path = window.location.pathname;
    let nav_path = path.substring(1, path.lastIndexOf('/'));

    //Location has changed check if user is still in dwains dashboard
    if(nav_path == "dwains-dashboard"){
      this.frontend_stuff();
    }
  }

  getRoot() {
    let root = document.querySelector('home-assistant');
    root = root && root.shadowRoot;
    root = root && root.querySelector('home-assistant-main');
    root = root && root.shadowRoot;
    root = root && root.querySelector('app-drawer-layout partial-panel-resolver');
    root = root && root.shadowRoot || root;
    root = root && root.querySelector('ha-panel-lovelace');
    root = root && root.shadowRoot;
    root = root && root.querySelector('hui-root');
    return root;
  }

  frontend_stuff(){
    let lovelace = this.lovelace_load;
    if(lovelace.config.dwains_dashboard) {
      this.custom_header(lovelace.config.dwains_dashboard);
      this.set_theme(lovelace.config.dwains_dashboard);

      //console.log(lovelace.config.dwains_dashboard);
    }
  }

  custom_header(config){
    const root = this.getRoot();

    if(!root.getAttribute("data-dwains-dashboard-header")){
      //console.log('Start the custom header')

      root.setAttribute("data-dwains-dashboard-header", true);

      //Hide prev/next buttons
      //root.shadowRoot.querySelector('app-header').querySelector('app-toolbar').querySelector('ha-tabs').shadowRoot.querySelector('paper-icon-button').style.display = 'none';
      root.shadowRoot.querySelector('app-header').querySelector('app-toolbar').querySelector('ha-tabs').shadowRoot.querySelectorAll('paper-icon-button').forEach(el => {
        el.style.display = 'none';
      });

      //Check if mobile or tablet, if yes put nav as footer
      if(window.mobileAndTabletCheck()){
        // let isIOS = (/iPad|iPhone|iPod/.test(navigator.platform) ||
        //   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
        //   !window.MSStream;
        // if(isIOS){
        //   root.shadowRoot.querySelector('#view').style.cssText = 'top: 0; position: absolute; width: 100%; height: 100%;';
        //   root.shadowRoot.querySelector('app-header').style.cssText = 'top: auto; bottom: 0px; height: 80px;';
        // } else {
        //   root.shadowRoot.querySelector('#view').style.cssText = 'margin-top: -64px;';
        //   root.shadowRoot.querySelector('app-header').style.cssText = 'top: auto; bottom: 0px;';
        // }

        root.shadowRoot.querySelector('#view').style.cssText = 'margin-top: -64px;';
        root.shadowRoot.querySelector('app-header').style.cssText = 'top: auto; bottom: 0px;';

        //Hide menu button
        root.shadowRoot.querySelector('app-header').querySelector('app-toolbar').querySelector('ha-button-menu').style.display = 'none';  
      } 

      //Hide other tabs except the first 5 ones
      // const css = '#tabsContent > ::slotted(:not(#selectionBar):nth-child(n+6)) { display: none !important; }';
      // let style = document.createElement('style');
      // style.setAttribute('id', 'customHeaderStyle');
      // root.shadowRoot.querySelector('app-header').querySelector('app-toolbar').querySelector('ha-button-menu').shadowRoot.appendChild(style); //prepend
      // style.type = 'text/css';
      // if (style.styleSheet){
      //   // This is required for IE8 and below.
      //   style.styleSheet.cssText = css;
      // } else {
      //   style.appendChild(document.createTextNode(css));
      // }
    }
  }

  set_theme(config){
    const root = this.getRoot();

    if(!root.getAttribute("data-dwains-dashboard-theme")){
      //console.log('Start the theme set')

      root.setAttribute("data-dwains-dashboard-theme", true);

      //See if user has set default HA theme or Dwains Theme handling
      if(config.theme !== "HA selected theme"){
        // console.log(hass().states["sun.sun"]);
        // const userThemeSettings = hass().selectedTheme;
        // console.log(userThemeSettings);
        // console.log(document.querySelector("home-assistant").hass.themes.darkMode);
        // console.log(hass().themes);
        // console.log(JSON.parse(config.themes));

        let sunState = "";
        if(hass().states["sun.sun"]){
          sunState = hass().states["sun.sun"].state;
        } else {
          console.log('sun.sun not available!');
        }
        const themes = {themes: JSON.parse(config.themes.replace(/placeholder_primary_color/g, config.primary_color))}
        let theme = "dwains-theme-light";

        switch(config.theme) {
          case "Auto Mode (Dark/Light)":
            if(sunState == "above_horizon"){
              theme = "dwains-theme-light"
            } else {
              theme = "dwains-theme-dark"
            }
            break;
          case "Auto Mode (Black/White)":
            if(sunState == "above_horizon"){
              theme = "dwains-theme-white"
            } else {
              theme = "dwains-theme-black"
            }
            break;
          case "Dark Mode":
            theme = "dwains-theme-dark"
            break;
          case "Light Mode":
            theme = "dwains-theme-light"
            break;
          case "Black Mode":
            theme = "dwains-theme-black"
            break;
          case "White Mode":
            theme = "dwains-theme-white"
            break;
          default:
            theme = "dwains-theme-light"
            break;
        }

        applyThemesOnElement(root, themes, theme, true);

      }
    }

  }

  connect(conn) {
    this.conn = conn
    conn.subscribeEvents(() => this._reload(), "dwains_dashboard_reload");
  }

  _reload() {
    const ll = lovelace_view();
    if (ll)
      fireEvent("config-refresh", {}, ll);
      let path = window.location.pathname;
      let nav_path = path.substring(1, path.lastIndexOf('/'));

      //Location check if user is in dwains dashboard
      //if(nav_path == "dwains-dashboard"){
        setTimeout(function() {
          document.location.reload()
        }, 5000);
      //}
  }

  popup_card(ev) {
    if(!lovelace()) return;
    const ll = lovelace();
    const data = {
      ...ll.config.dwains_dashboard.popup_cards,
    };
    if(!ev.detail || !ev.detail.entityId) return;

    //Make an array with custom popups set by user
    const d = data[ev.detail.entityId];
    let cardData;
    let cardTitle;
    let customCard = false;

    if(!d || 0 === d.length) {
      //Entity doesn't have a custom popup, let's check if it needs a global popup
      const domain = ev.detail.entityId.split(".")[0];
      let popupData;

      if(popupData = ll.config.dwains_dashboard[domain+'_popup']){
        cardData = JSON.parse(JSON.stringify(popupData.card).replace(/domain.placeholder/g, ev.detail.entityId));
        cardTitle = hass().states[ev.detail.entityId].attributes.friendly_name;
        customCard = true;
      }
    } else {
      cardData = d.card;
      cardTitle = d.title !== null ? d.title : "";
      customCard = true;
    }

    if(customCard === true){
      window.setTimeout(() => {
        fireEvent("hass-more-info", {entityId: "."}, document.querySelector("home-assistant"));
        popUp(cardTitle, cardData, false, '');
      }, 50);
    } else {
      return;
    }
  }
  
}


const bases = [customElements.whenDefined('home-assistant-main'), customElements.whenDefined('hui-view')];
Promise.race(bases).then(() => {
  window.dwains_dashboard = window.dwains_dashboard || new DwainsDashboard();
});
