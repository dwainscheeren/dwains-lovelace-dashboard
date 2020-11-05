!function(e){var t={};function r(s){if(t[s])return t[s].exports;var i=t[s]={i:s,l:!1,exports:{}};return e[s].call(i.exports,i,i.exports,r),i.l=!0,i.exports}r.m=e,r.c=t,r.d=function(e,t,s){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:s})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var s=Object.create(null);if(r.r(s),Object.defineProperty(s,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)r.d(s,i,function(t){return e[t]}.bind(null,i));return s},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=0)}([function(e,t,r){const s=[customElements.whenDefined("home-assistant-main"),customElements.whenDefined("hui-view")];Promise.race(s).then(()=>{const e=customElements.get("home-assistant-main")?Object.getPrototypeOf(customElements.get("home-assistant-main")):Object.getPrototypeOf(customElements.get("hui-view")),t=e.prototype.html,s=e.prototype.css;class i extends e{constructor(){super()}static get properties(){return{_config:{},_refCards:{},_hass:{},_width:{attribute:!1,type:Number}}}async setConfig(e){if(!e&&!e.cards&&!Array.isArray(e.cards))throw new Error("Card config incorrect");this._config=e,this._refCards=[],this.open=!1,window.loadCardHelpers&&(this.helpers=await window.loadCardHelpers()),this.renderCard()}renderCard(){const e=this._config.cards.map(e=>this.createCardElement(e));Promise.all(e).then(e=>{this._refCards=e,this.requestUpdate()})}async createCardElement(e){const t=(e,r)=>{if(this.helpers)return this.helpers.createCardElement(r);const s=document.createElement(e);try{s.setConfig(r)}catch(s){return console.error(e,s),((e,r)=>t("hui-error-card",{type:"error",error:e,config:r}))(s.message,r)}return s};let r=e.type;r=r.startsWith("divider")?"hui-divider-row":r.startsWith("custom:")?r.substr("custom:".length):`hui-${r}-card`;const s=t(r,e);return e.item_classes?s.className="item "+e.item_classes:this._config.items_classes?s.className="item "+this._config.items_classes:s.className="item",s.hass=this._hass,s.addEventListener("ll-rebuild",t=>{t.stopPropagation(),this.createCardElement(e).then(()=>{this.renderCard()})},{once:!0}),s}set hass(e){this._hass=e,this._refCards&&this._refCards.forEach(t=>{t.hass=e})}toggle(e){e&&e.stopPropagation(),this.open=!this.open,this.requestUpdate()}render(){if(!this._config||!this._hass||!this._refCards)return t``;var e=0;for(let t in this._refCards)this._refCards[t]&&(e+=parseInt(this._refCards[t].offsetWidth));var r=e/61<=Math.floor(this._width/61);return t`
        <div class="wrapper">
          <div
            class="items ${this.open?"expanded":"collapsed"}"
            ?open=${this.open}
          >
            ${this._refCards}
          </div>

          <div class="toggle" @click=${this.toggle} ?hidden=${r}>
            <ha-icon
              icon=${this.open?"mdi:chevron-up":"mdi:chevron-down"}
            ></ha-icon>
          </div>
        </div>
      `}updated(e){this._width=parseFloat(getComputedStyle(this).getPropertyValue("width"),10)}static get styles(){return[s`
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
        `]}getCardSize(){return 3}}if(!customElements.get("dwains-collapse-card")){customElements.define("dwains-collapse-card",i);const e=r(1);console.info(`%c DWAINS-COLLAPSE-CARD \n%c    Version ${e.version}     `,"color: #2fbae5; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray")}})},function(e){e.exports=JSON.parse('{"name":"dwains-collapse-card","private":true,"version":"0.0.4","description":"dwains-collapse-card","scripts":{"build":"webpack","watch":"webpack --watch --mode=development","update-card-tools":"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools"},"keywords":[],"author":"Dwain Scheeren","license":"MIT","devDependencies":{"webpack":"^4.42.1","webpack-cli":"^3.3.11"},"dependencies":{"card-tools":"github:thomasloven/lovelace-card-tools","lit-element":"^2.2.1","lit-html":"^1.1.2"}}')}]);