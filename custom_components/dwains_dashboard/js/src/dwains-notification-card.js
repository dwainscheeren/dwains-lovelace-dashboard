const bases = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases).then(() => {

  const LitElement = customElements.get('hui-masonry-view')
    ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))
    : Object.getPrototypeOf(customElements.get('hc-lovelace'));

  const html = LitElement.prototype.html;

  const css = LitElement.prototype.css;


  class DwainsNotificationCard extends LitElement {
    static get styles() {
      return css`
      ha-card {
        box-shadow: none;
        background: transparent;
        color: var(--primary-text-color);
      }
      .notification-button ha-icon {
        display: inline-block;
        margin: auto;
        --mdc-icon-size: 100% !important;
        --iron-icon-width: 100% !important;
        --iron-icon-height: 100% !important;
        cursor: pointer;
        opacity: 0.8;
      }
      .notification-button ha-icon:hover {
        opacity: 1.0;
      }
      .w-6 {
        width: 1.5rem;
      }
      .h-6 {
        height: 1.5rem;
      }
      .notification-button {
        background: var( --ha-card-background, var(--card-background-color, white) );
        border-radius: var(--ha-card-border-radius, 4px);
        box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
        color: var(--primary-text-color);
        padding: 0.5rem;
        font-size: .875rem;
        line-height: 1.25rem;
        font-weight: 500;
        margin-bottom: 0.25rem;
        margin-top: 0.25rem;
        display: flex;
        justify-content: space-between;
      }
      `
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

    async connectedCallback(){
      super.connectedCallback();

      if (!this._unsub) {
        this._subcribeNotifications();
        this._notificationsUpdated(); //Load notifications
      }

      // await this._loadData(); //Load areas
      // await this._hass.connection.subscribeEvents(() => this._reloadCard(), "dwains_dashboard_homepage_reload");
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

    async _notificationsUpdated(){
      this.notifications = await this.hass.callWS({
        type: 'dwains_dashboard_notification/get'
      });
      if(this.notifications == null || this.notifications.length === 0){
        this.requestUpdate();
      } else {
        this.requestUpdate();
      }
    }

    _handleDismiss(event) {
      var id = event.target.notificationId;
      this.hass.callService("dwains_dashboard", "notification_dismiss", {
        notification_id: id
      });   
      this._notificationsUpdated();
    }

    _evalTemplate(func){
      /* eslint no-new-func: 0 */
      return new Function('states', 'user', 'hass', 'variables',
        `'use strict'; ${func}`)
        .call(this, this.hass.states, this.hass.user, this.hass, this.config.variables);
    }

    _renderNotification(n) {
      return html`
        <div class="notification-button flex justify-between">
          <div>
            ${n.message}
          </div>
          <div>
            <ha-icon 
              class="h-6 w-6"
              icon=${"mdi:close"} 
              .notificationId=${n.notification_id} 
              @click=${this._handleDismiss}
            >
            </ha-icon>
          </div>
        </div>
      `;
    }

    render() {
      if(this.notifications == null || this.notifications.length === 0){
        // return html`
        //   ${this.hass.localize('ui.notification_drawer.empty')}
        // `;
      } else {
        return html`
        <ha-card>
          <div id="notifications">
            ${this.notifications.map((i) => this._renderNotification(i))}
          </div>
        </ha-card>
        `;

      }
    }
  }

  if(!customElements.get("dwains-notification-card")) {
    customElements.define("dwains-notification-card", DwainsNotificationCard);
  }
});