import { lovelace_view, load_lovelace, lovelace, hass, async_lovelace_view } from "card-tools/src/hass";
import { popUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import {
    applyThemesOnElement,
    navigate,
    getLovelace,
    computeDomain
  } from 'custom-card-helpers';
  
import { css, html, LitElement } from 'lit-element';
import translateEngine from './translate-engine';

class DwainsBoardNavigationCard extends LitElement {
    static get styles() {
        return [
          css`
            :host {
                width: 100%;
                display: flex;
                flex-direction: column;
                background-color: var( --ha-card-background, var(--card-background-color, white) );
                height: auto;
                top: 0;
                z-index: 99999;
                position: fixed;
            }
            .mainNavItems {
                flex-grow: 1;

                display: flex;
                align-items: stretch;
                padding: 0.25rem;
                justify-content: space-between;

                overflow-x: scroll;

                scrollbar-width: none;
            }
            .mainNavItems::-webkit-scrollbar {
                height: 0px;
            }
            .mainNavItems::before, .mainNavItems::after {
                content: ''; /* Insert space before the first item and after the last one */
            }
            
            .mainNavItems div {
                padding: 0.5rem;
                color: var(--primary-text-color);
                position: relative;
                text-align: center;
                display: grid;
                cursor: pointer;
            }
            .mainNavItems div span {
                text-transform: capitalize;
            }
            .mainNavItems div.active {
                color: var(--sidebar-selected-icon-color);
            }

            .dwains-dashboard-nav {
                display: flex;
            }
            .toggle-sidebar {
                padding: 1.35rem;
                background: var(--secondary-background-color);
                display: none;
                cursor: pointer;
            }
            .sidebar-always_hidden {
                /* User has the sidebar hidden so always show the button */
                display: block !important;
            }
            /* bottom: 0; */
            /* padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); */
            @media only screen and (max-width: 768px) {
                :host {
                    position: sticky;
                    bottom: 0;
                    top: auto;
                    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
                }
            }
            @media only screen and (max-width: 1800px) and (hover: none) {
                :host {
                    position: sticky;
                    bottom: 0;
                    top: auto;
                    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
                }
            }            
            @media (max-width: 871px) {
                .mainNavItems div span {
                    display: none;
                }
                .toggle-sidebar {
                    display: block;
                    padding: 0.75rem;
                }
            }
          `
        ]
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

    static get properties() {
        return {
          hass: {},
          config: {},
          currentPath: {},
        };
    }

    setConfig(config) {
        this.hass = hass();

    }

    async connectedCallback(){
        super.connectedCallback();
  
        await this._loadConfig(); //Load configuration

        this.currentPath = document.location.pathname;

        // window.addEventListener('popstate', function (event) {
        //     //console.log(5, event.state);
        // });
        // window.addEventListener('hashchange', function() { 
        //     this.currentPath = document.location.pathname;
        // });

        await this.hass.connection.subscribeEvents(() => this._reloadCard(), "dwains_dashboard_navigation_card_reload");
    }

    async _reloadCard(){
      await this._loadConfig();
      this.requestUpdate();
    }

    async _loadConfig(){  
        //Load configuration
        this.configuration = await this.hass.callWS({
          type: 'dwains_dashboard/configuration/get'
        });
    }

    _menuClick(ev){
        const path = ev.currentTarget.path;
        navigate(window, path);

        this.currentPath = path;
    }

    _toggleSidebarClick(ev){
        fireEvent("hass-toggle-menu");
    }

    render() {
        if (!this.hass || this.currentPath == null || this.configuration == null || this.configuration.length === 0) {
            return html``;
        }

        //console.log(this.configuration);
        const more_pages = Object.entries(this.configuration['more_pages']).sort(function (x, y) {
            let a = x[1] && x[1].sort_order ? x[1].sort_order : 99,
                b = y[1] && y[1].sort_order ? y[1].sort_order : 99;
            return a == b ? 0 : a > b ? 1 : -1;
          });

        return html`
            <div class="dwains-dashboard-nav">
                <div
                    @click=${this._toggleSidebarClick}
                    class="toggle-sidebar sidebar-${this.hass.dockedSidebar}"
                >
                    <ha-icon icon="${"mdi:menu"}"></ha-icon>
                </div>
                <div class="mainNavItems">
                    <div
                        class="${document.location.pathname == '/dwains-dashboard/home' ? 'active' : ''}" 
                        @click=${this._menuClick}
                        .path=${"/dwains-dashboard/home"}
                    >
                        <ha-icon icon="${"mdi:home"}"></ha-icon>
                        <span>${translateEngine(this.hass, 'home.title')}</span>
                    </div>
                    <div
                        class="${document.location.pathname == '/dwains-dashboard/devices' && !window.location.hash ? 'active' : ''}" 
                        @click=${this._menuClick}
                        .path=${"/dwains-dashboard/devices"}
                    >
                        <ha-icon icon="${"mdi:format-list-bulleted-type"}"></ha-icon>
                        <span>${translateEngine(this.hass, 'device.title_plural')}</span>
                    </div>
                    ${Object.entries(this.configuration['devices']).map(([k,v]) => 
                        //, v["icon"]);
                        // k = path
                        html`
                            ${v["show_in_navbar"] ? html`
                                <div
                                    class="${document.location.pathname == '/dwains-dashboard/devices' && window.location.hash == '#'+k ? 'active' : ''}" 
                                    @click=${this._menuClick}
                                    .path=${"/dwains-dashboard/devices#"+k}
                                >
                                    <ha-icon icon="${v["icon"]}"></ha-icon>
                                    <span>${translateEngine(this.hass,'device.'+k)}</span>
                                </div>`: ""}
                        `
                    )}
                    ${Object.entries(more_pages).map(([k,v]) =>
                        //, v["icon"]);
                        // k = path
                        html`
                            ${v[1]["show_in_navbar"] ? html`
                                <div
                                    class="${document.location.pathname == '/dwains-dashboard/more_page_'+v[0].toLowerCase().replace("'", "_").replace(" ", "_") ? 'active' : ''}" 
                                    @click=${this._menuClick}
                                    .path=${"/dwains-dashboard/more_page_"+v[0].toLowerCase().replace("'", "_").replace(" ", "_")}
                                >
                                    <ha-icon icon="${v[1]["icon"]}"></ha-icon>
                                    <span>${v[1]["name"]}</span>
                                </div>`: ""}
                        `
                    )}
                    <div
                        class="${document.location.pathname == '/dwains-dashboard/more_page' ? 'active' : ''}" 
                        @click=${this._menuClick}
                        .path=${"/dwains-dashboard/more_page"}
                    >
                        <ha-icon icon="${"mdi:view-grid-outline"}"></ha-icon>
                        <span>${translateEngine(this.hass, 'more.title')}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

//customElements.define('dwainsboard-navigation-card', DwainsBoardNavigationCard);
(async () => {
    // Thanks Thomas Loven!
    await Promise.race([
        customElements.whenDefined("home-assistant"), 
        customElements.whenDefined("hc-main"),
        customElements.whenDefined('hui-masonry-view'), 
        customElements.whenDefined('hc-lovelace')
    ])
  
    if (!customElements.get("dwainsboard-navigation-card")) {
      customElements.define("dwainsboard-navigation-card", DwainsBoardNavigationCard);
    }
  })();


//DwainsDashboard
const bases = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases).then(() => {
    class DwainsDashboard {

        constructor(){     
            this._start_dd();

            const updater = this._locationChanged.bind(this);
            window.addEventListener("location-changed", updater);
            window.addEventListener("popstate", updater);

            hass().connection.subscribeEvents(() => this._reload(), "dwains_dashboard_reload");
        }
        
        async _loadData(){
            //Load configuration
            this.configuration = await hass().callWS({
                type: 'dwains_dashboard/configuration/get'
            });
        }

        _locationChanged(){
            let path = window.location.pathname;
            let nav_path = path.substring(1, path.lastIndexOf('/'));
        
            //Location has changed check if user is still in dwains dashboard
            if(nav_path == "dwains-dashboard"){
              this._dwains_theme();
              this._dwains_navbar();

              document.querySelector("home-assistant").addEventListener("hass-more-info", this._popup_card.bind(this));
            }
        }

        _popup_card(ev){
            if(!ev.detail || !ev.detail.entityId || !this.configuration) return;

            const domain = computeDomain(ev.detail.entityId);

            if(this.configuration["entities_popup"] && this.configuration["entities_popup"][ev.detail.entityId]){
                //This specific entity has a own popup
                if(this.configuration['entities'][ev.detail.entityId] && !this.configuration['entities'][ev.detail.entityId]['custom_popup']){
                    console.log('Please enable custom popup for this entity');
                } else {
                    const friendlyName = this.configuration['entities'][ev.detail.entityId] && this.configuration['entities'][ev.detail.entityId]['friendly_name'] ? 
                        this.configuration['entities'][ev.detail.entityId]['friendly_name'] 
                        :
                        (hass().states[ev.detail.entityId].attributes.friendly_name === undefined ? (ev.detail.entityId).replace(/_/g, " ") : hass().states[ev.detail.entityId].attributes.friendly_name); 
                        ;


                    window.setTimeout(() => {
                        fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
                        popUp(friendlyName, {input_entity: ev.detail.entityId,...this.configuration["entities_popup"][ev.detail.entityId]}, false, '');
                    }, 10);
                }
            } else if(this.configuration["devices_popup"] && this.configuration["devices_popup"][domain]){
                //Look if the domain of this entity has a custom popup
                const friendlyName = this.configuration['entities'][ev.detail.entityId] && this.configuration['entities'][ev.detail.entityId]['friendly_name'] ? 
                    this.configuration['entities'][ev.detail.entityId]['friendly_name'] 
                    :
                    (hass().states[ev.detail.entityId].attributes.friendly_name === undefined ? (ev.detail.entityId).replace(/_/g, " ") : hass().states[ev.detail.entityId].attributes.friendly_name); 
                    ;


                window.setTimeout(() => {
                    fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
                    popUp(friendlyName, {input_entity: ev.detail.entityId,...this.configuration["devices_popup"][domain]}, false, '');
                }, 10);
            }
        }

        async _start_dd(){
            const lovelace = await this._getLovelace();
            if (lovelace.config.dwains_dashboard) {
                this._loadData();
                document.querySelector("home-assistant").addEventListener("hass-more-info", this._popup_card.bind(this));

                this._dwains_navbar();
                this._dwains_theme();
            }
        }


        async _dwains_theme(){
            const root = this._getRoot();
            applyThemesOnElement(root.shadowRoot.querySelector('ha-app-layout').shadowRoot.querySelector('#wrapper'), {
                themes: {
                    "dwains-theme": { "ha-card-border-radius": "0.75rem"}
                }
            }, "dwains-theme", true);  
        }

        async _dwains_navbar(){
            const root = this._getRoot();
            
            root.shadowRoot.querySelector('app-header').querySelector('app-toolbar').style.display = 'none';
            root.shadowRoot.querySelector('ha-app-layout').shadowRoot.querySelector('#wrapper').querySelector('#contentContainer').style.paddingTop = '1px';

            await this._buildDwainsNavigation(root);
        }

        _reload() {
            const ll = lovelace_view();
            if (ll)
              fireEvent("config-refresh", {}, ll);
              let path = window.location.pathname;
              let nav_path = path.substring(1, path.lastIndexOf('/'));
        
              //Location check if user is in dwains dashboard
              if(nav_path == "dwains-dashboard"){
                setTimeout(function() {
                  document.location.reload()
                }, 1000);
            }
        }

        _sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        async _getLovelace() {
            let lovelace;
            while (!lovelace) {
                lovelace = getLovelace();
                if (!lovelace) {
                    await this._sleep(500);
                }
            }
            return lovelace;
        }

        _getRoot() {
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

        async _buildDwainsNavigation(root){
            if(!root.shadowRoot.querySelector('ha-app-layout').querySelector('dwainsboard-navigation-card')){
                const dwainsDashboardNavigationCard = document.createElement('dwainsboard-navigation-card');
                dwainsDashboardNavigationCard.hass = hass();

                root.shadowRoot.querySelector('ha-app-layout').appendChild(dwainsDashboardNavigationCard);
            }
        }
    }

    window.dwains_dashboard = window.dwains_dashboard || new DwainsDashboard();
});
