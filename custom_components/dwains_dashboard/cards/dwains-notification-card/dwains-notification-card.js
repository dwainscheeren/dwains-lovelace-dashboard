!function(t){var i={};function e(n){if(i[n])return i[n].exports;var o=i[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,e),o.l=!0,o.exports}e.m=t,e.c=i,e.d=function(t,i,n){e.o(t,i)||Object.defineProperty(t,i,{enumerable:!0,get:n})},e.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},e.t=function(t,i){if(1&i&&(t=e(t)),8&i)return t;if(4&i&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(e.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&i&&"string"!=typeof t)for(var o in t)e.d(n,o,function(i){return t[i]}.bind(null,o));return n},e.n=function(t){var i=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(i,"a",i),i},e.o=function(t,i){return Object.prototype.hasOwnProperty.call(t,i)},e.p="",e(e.s=0)}([function(t,i,e){const n=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(n).then(()=>{const t=customElements.get("hui-masonry-view")?Object.getPrototypeOf(customElements.get("hui-masonry-view")):Object.getPrototypeOf(customElements.get("hc-lovelace")),i=t.prototype.html,n=t.prototype.css;class o extends t{constructor(){super(),this.notifications=null}static get properties(){return{hass:{},config:{}}}setConfig(t){this.config=t}async _subcribeNotifications(){this._unsub||(this._unsub=await this.hass.connection.subscribeEvents(()=>this._notificationsUpdated(),"dwains_dashboard_notifications_updated"))}disconnectedCallback(){super.disconnectedCallback(),this._unsub&&(this._unsub(),this._unsub=void 0)}connectedCallback(){super.connectedCallback(),this._unsub||(this._subcribeNotifications(),this._notificationsUpdated())}async _notificationsUpdated(){this.notifications=await this.hass.callWS({type:"dwains_dashboard_notification/get"})}_handleDismiss(t){var i=t.target.notificationId;this.hass.callService("dwains_dashboard","notification_dismiss",{notification_id:i})}_renderNotification(t){return i`
        <div class="notification">
          ${t.message}
          ${!1===this.config.show_dismiss?i``:i`<ha-icon icon='mdi:close' .notificationId='${t.notification_id}' @click=${this._handleDismiss}</ha-icon>`}
        </div>
      `}_evalTemplate(t){return new Function("states","user","hass","variables","'use strict'; "+t).call(this,this.hass.states,this.hass.user,this.hass,this.config.variables)}_handleTap(){let t;this.config.navigation_path&&(history.pushState(null,"",this.config.navigation_path),t=new Event("location-changed",{composed:!0}),t.detail={replace:!1},window.dispatchEvent(t))}render(){var t;if(this.config.title){const i=this.config.title,e=i.trim();t="[[["===e.substring(0,3)&&"]]]"===e.slice(-3)?this._evalTemplate(e.slice(3,-3)):i}if(null==this.notifications||0===this.notifications.length)var e=i`
          ${this.hass.localize("ui.notification_drawer.empty")}
        `;else{var n;if(this.config.max_notifications&&this.notifications.length>this.config.max_notifications){var o=this.notifications.slice(0,this.config.max_notifications);n=i`
                      <div class="more-link" @click="${this._handleTap}">
                        and ${this.notifications.length-this.config.max_notifications} more<ha-icon icon='mdi:chevron-right'></ha-icon>
                      </div>
                    `}else o=this.notifications;e=i`
          <div id="notifications">
            ${o.map(t=>this._renderNotification(t))}
            ${n}
          </div>
        `}return i`
        ${this.config.style?i`
          <style>
            ${this.config.style}
          </style>
        `:i``}

        <ha-card style="background: transparent;">
          <div id="title">
            ${t}
          </div>
          ${e}
        </ha-card>
      `}static get styles(){return n`
        ha-card {
          box-shadow: none;
          color: var(--text-primary-color);
        }
        #title {
          padding-bottom: 3px;
        }
        .notification {
          filter: brightness(90%);
        }
        .notification ha-icon {
          height: 15px;
          width: 15px;
        }
        .more-link {
          font-weight: bold;
          font-size: 85%;
        }
      `}getCardSize(){return 2}}if(!customElements.get("dwains-notification-card")){customElements.define("dwains-notification-card",o);const t=e(1);console.info(`%c DWAINS-NOTIFICATION-CARD  \n%c       Version ${t.version}       `,"color: #2fbae5; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray")}})},function(t){t.exports=JSON.parse('{"name":"dwains-notification-card","private":true,"version":"0.0.4","description":"dwains-notification-card","scripts":{"build":"webpack","watch":"webpack --watch --mode=development","update-card-tools":"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools"},"keywords":[],"author":"Dwain Scheeren","license":"MIT","devDependencies":{"webpack":"^4.42.1","webpack-cli":"^3.3.11"},"dependencies":{"card-tools":"github:thomasloven/lovelace-card-tools"}}')}]);