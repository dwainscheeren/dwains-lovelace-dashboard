!function(e){var t={};function o(n){if(t[n])return t[n].exports;var r=t[n]={i:n,l:!1,exports:{}};return e[n].call(r.exports,r,r.exports,o),r.l=!0,r.exports}o.m=e,o.c=t,o.d=function(e,t,n){o.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)o.d(n,r,function(t){return e[t]}.bind(null,r));return n},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o(o.s=1)}([function(e){e.exports=JSON.parse('{"name":"dwains-header-card","private":true,"version":"0.0.2","description":"dwains-header-card","scripts":{"build":"webpack","watch":"webpack --watch --mode=development","update-card-tools":"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools"},"keywords":[],"author":"Dwain Scheeren","license":"MIT","devDependencies":{"webpack":"^4.42.1","webpack-cli":"^3.3.11"},"dependencies":{"card-tools":"github:thomasloven/lovelace-card-tools"}}')},function(e,t,o){"use strict";function n(){return document.querySelector("hc-main")?document.querySelector("hc-main").hass:document.querySelector("home-assistant")?document.querySelector("home-assistant").hass:void 0}function r(e,t,o=null){if((e=new Event(e,{bubbles:!0,cancelable:!1,composed:!0})).detail=t||{},o)o.dispatchEvent(e);else{var n=function(){var e=document.querySelector("hc-main");return e=e?(e=(e=(e=e&&e.shadowRoot)&&e.querySelector("hc-lovelace"))&&e.shadowRoot)&&e.querySelector("hui-view")||e.querySelector("hui-panel-view"):(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=document.querySelector("home-assistant"))&&e.shadowRoot)&&e.querySelector("home-assistant-main"))&&e.shadowRoot)&&e.querySelector("app-drawer-layout partial-panel-resolver"))&&e.shadowRoot||e)&&e.querySelector("ha-panel-lovelace"))&&e.shadowRoot)&&e.querySelector("hui-root"))&&e.shadowRoot)&&e.querySelector("ha-app-layout"))&&e.querySelector("#view"))&&e.firstElementChild}();n&&n.dispatchEvent(e)}}o.r(t);let a=window.cardHelpers;const i=new Promise(async(e,t)=>{a&&e();const o=async()=>{a=await window.loadCardHelpers(),window.cardHelpers=a,e()};window.loadCardHelpers?o():window.addEventListener("load",async()=>{!async function(){if(customElements.get("hui-view"))return!0;await customElements.whenDefined("partial-panel-resolver");const e=document.createElement("partial-panel-resolver");if(e.hass={panels:[{url_path:"tmp",component_name:"lovelace"}]},e._updateRoutes(),await e.routerOptions.routes.tmp.load(),!customElements.get("ha-panel-lovelace"))return!1;const t=document.createElement("ha-panel-lovelace");t.hass=n(),void 0===t.hass&&(await new Promise(e=>{window.addEventListener("connection-status",t=>{console.log(t),e()},{once:!0})}),t.hass=n()),t.panel={config:{mode:null}},t._fetchConfig()}(),window.loadCardHelpers&&o()})});function c(e,t){const o={type:"error",error:e,origConfig:t},n=document.createElement("hui-error-card");return customElements.whenDefined("hui-error-card").then(()=>{const e=document.createElement("hui-error-card");e.setConfig(o),n.parentElement&&n.parentElement.replaceChild(e,n)}),i.then(()=>{r("ll-rebuild",{},n)}),n}function s(e,t){if(!t||"object"!=typeof t||!t.type)return c(`No ${e} type configured`,t);let o=t.type;if(o=o.startsWith("custom:")?o.substr("custom:".length):`hui-${o}-${e}`,customElements.get(o))return function(e,t){let o=document.createElement(e);try{o.setConfig(JSON.parse(JSON.stringify(t)))}catch(e){o=c(e,t)}return i.then(()=>{r("ll-rebuild",{},o)}),o}(o,t);const n=c(`Custom element doesn't exist: ${o}.`,t);n.style.display="None";const a=setTimeout(()=>{n.style.display=""},2e3);return customElements.whenDefined(o).then(()=>{clearTimeout(a),r("ll-rebuild",{},n)}),n}const l=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(l).then(()=>{const e=customElements.get("hui-masonry-view")?Object.getPrototypeOf(customElements.get("hui-masonry-view")):Object.getPrototypeOf(customElements.get("hc-lovelace")),t=e.prototype.html,r=e.prototype.css;class i extends e{constructor(){super()}setConfig(e){this._config=JSON.parse(JSON.stringify(e)),this._config.card&&(this.card=function(e){return a?a.createCardElement(e):s("card",e)}(this._config.card),this.card.hass=n())}renderNav(){return this._config.subtitle?t`
        <div
              style="cursor: pointer"
              @click="${this._handleClick}"
            >
              <ha-icon
                style="height: 30px; width: 30px; margin-left: -6px;"
                .icon="${this._config.icon}"
                id="icon"
              ></ha-icon>
              <h2>${this._config.subtitle}</h2>
            </div>
        `:t``}render(){return t`
        <ha-card>
          <div class="container">
            <div class="one">
              ${this.renderNav()}
              <h1 style="padding-top: ${this._config.subtitle?"0px":"16px"};">${this._config.title}</h1>
            </div>
            <div class="two">
              ${this.card}
            </div>
        </ha-card>
      `}set hass(e){this.card&&(this.card.hass=e)}_handleClick(){let e,t=window.location.pathname,o=t.substring(0,t.lastIndexOf("/"))+"/"+this._config.navigation_path;window.history.pushState(null,"",o),e=new Event("location-changed",{composed:!0}),e.detail={replace:!1},window.dispatchEvent(e)}static get styles(){return[r`
          ha-card {
            background-color: var(--app-header-background-color2);
            color: var(--app-header-text-color, white);
            margin-top: -2px;
            padding-left: 16px;
            box-shadow: none;
            border-radius: 0px;
          }
          ha-icon {
            padding-top: 3px;
            display: inline-block;
            margin: auto;
            --mdc-icon-size: 100%;
            --iron-icon-width: 100%;
            --iron-icon-height: 100%;
          }
          @media only screen and (min-width: 1466px) {
            ha-card {
              margin-top: 22px;
              border-radius: 4px;
            }
          }
          h1 {
            color: var(--app-header-text-color, white) !important;
            font-size: 1.5em !important;
            font-weight: bold;
            padding-top: 0px;
            padding-bottom: 20px !important;
            margin-top: 0px;
            margin-bottom: 0px;
          }
          h2 {
            font-size: 13px;
            font-weight: bold;
            padding-top: 8px;
            margin: 0px;
          }
          .container {
            width: 100%;
            height: auto;
            margin: auto;
            overflow: auto;
          }
          .one {
            width: 50%;
            float: left;
          }
          .two {
            width: 50%;
            float: left;
          }
        `]}getCardSize(){return 1}}if(!customElements.get("dwains-header-card")){customElements.define("dwains-header-card",i);const e=o(0);console.info(`%c DWAINS-HEADER-CARD \n%c    Version ${e.version}    `,"color: #2fbae5; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray")}})}]);