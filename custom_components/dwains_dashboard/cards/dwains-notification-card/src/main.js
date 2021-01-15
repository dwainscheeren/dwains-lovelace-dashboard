const bases = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases).then(() => {

  const LitElement = customElements.get('hui-masonry-view')
    ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))
    : Object.getPrototypeOf(customElements.get('hc-lovelace'));

  const html = LitElement.prototype.html;

  const css = LitElement.prototype.css;


  class DwainsNotificationCard extends LitElement {
    constructor() {
      super();

      this.notifications = null;
    }

    static get properties() {
      return {
        hass: {},
        config: {},
      };
    }

    setConfig(config) {
      this.config = config;
    }

    async _subcribeNotifications(){
      if (!this._unsub) {
        this._unsub = await this.hass.connection.subscribeEvents(() => this._notificationsUpdated(), "dwains_dashboard_notifications_updated");
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      if (this._unsub) {
        this._unsub();
        this._unsub = undefined;
      }
    }

    connectedCallback(){
      super.connectedCallback();
      if (!this._unsub) {
        this._subcribeNotifications();
        this._notificationsUpdated(); //Load notifications
      }
    }

    async _notificationsUpdated(){
      this.notifications = await this.hass.callWS({
        type: 'dwains_dashboard_notification/get'
      });
    }

    _handleDismiss(event) {
      var id = event.target.notificationId;
      this.hass.callService("dwains_dashboard", "notification_dismiss", {
        notification_id: id
      });   
    }

    _renderNotification(n) {
      return html`
        <div class="notification">
          ${n.message}
          ${this.config.show_dismiss === false ? html ``: 
          html`<ha-icon icon='mdi:close' .notificationId='${n.notification_id}' @click=${this._handleDismiss}</ha-icon>`}
        </div>
      `;
    }

    _evalTemplate(func){
      /* eslint no-new-func: 0 */
      return new Function('states', 'user', 'hass', 'variables',
        `'use strict'; ${func}`)
        .call(this, this.hass.states, this.hass.user, this.hass, this.config.variables);
    }

    _handleTap(){
      let e;

      if (!this.config.navigation_path) return;
        history.pushState(null, '', this.config.navigation_path);
        e = new Event('location-changed', { composed: true });
        e.detail = { replace: false };
        window.dispatchEvent(e);

      // if(this.config.tap_action){
      //   if(this.config.tap_action.action == 'navigate'){
      //     window.location.href = this.config.tap_action.navigation_path;
      //   }
      // }
    }

    render() {
      var title;

      if(this.config.title){
        const value = this.config.title;
        const trimmed = value.trim();

        if (
          trimmed.substring(0, 3) === '[[['
          && trimmed.slice(-3) === ']]]'
        ) {
          title = this._evalTemplate(trimmed.slice(3, -3));
        } else {
          title = value;
        }
      }

      if(this.notifications == null || this.notifications.length === 0){
        var notifications = html`
          ${this.hass.localize('ui.notification_drawer.empty')}
        `;
      } else {
        var moreText;

        if(this.config.max_notifications && this.notifications.length > this.config.max_notifications){
          var items = this.notifications.slice(0, this.config.max_notifications);
          moreText = html`
                      <div class="more-link" @click="${this._handleTap}">
                        and ${this.notifications.length-this.config.max_notifications} more<ha-icon icon='mdi:chevron-right'></ha-icon>
                      </div>
                    `;
        } else {
          var items = this.notifications;
        }

        var notifications = html`
          <div id="notifications">
            ${items.map((i) => this._renderNotification(i))}
            ${moreText}
          </div>
        `;

      }
      return html`
        ${this.config.style ? html`
          <style>
            ${this.config.style}
          </style>
        ` : html``}

        <ha-card style="background: transparent;">
          <div id="title">
            ${title}
          </div>
          ${notifications}
        </ha-card>
      `;
    }

    static get styles() {
      return css`
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
      `
    }
    
    getCardSize() {
      return 2;
    }
  }

  if(!customElements.get("dwains-notification-card")) {
    customElements.define("dwains-notification-card", DwainsNotificationCard);
    const pjson = require('../package.json');
    console.info(
      `%c DWAINS-NOTIFICATION-CARD  \n%c       Version ${pjson.version}       `,
      'color: #2fbae5; font-weight: bold; background: black',
      'color: white; font-weight: bold; background: dimgray',
    );
  }
});