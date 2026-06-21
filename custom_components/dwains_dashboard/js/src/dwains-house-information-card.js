import { css, html, LitElement } from 'lit-element';
import { moreInfo } from "card-tools/src/more-info";
import { popUp } from "./dwains-popup";
import { fireEvent } from "card-tools/src/event";
import {
    computeDomain
} from 'custom-card-helpers';
import {
    STATES_OFF,
    UNAVAILABLE_STATES,
    ALERT_DOMAINS,
    COVER_DOMAINS,
    TOGGLE_DOMAINS,
    CLIMATE_DOMAINS,
    OTHER_DOMAINS,
    DEVICE_CLASSES,
    DOMAIN_STATE_ICONS
} from './variables';
import translateEngine from './translate-engine';
import { myComputeStateDisplay } from "./helpers";
//Herschreven
class DwainsHouseInformationCard extends LitElement {
    static get styles() {
        return css`
      ha-card {
        overflow: hidden;
      }
      .flex {
        display: flex;
      }
      .justify-center {
        justify-content: center;
      }
      .items-center {
        align-items: center;
      }
      .font-semibold {
        font-weight: 600;
      }
      h1, h2, h3, h4, h5, h6 {
        font-size: inherit;
      }
      blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
        margin: 0;
      }
      .p-2 {
        padding: 0.5rem;
      }
      .cursor-pointer {
        cursor: pointer;
      }
      .w-8 {
        width: 1.5rem;
      }
      .h-8 {
        height: 1.5rem;
      }
      .space-x-2>:not([hidden])~:not([hidden]) {
        --tw-space-x-reverse: 0;
        margin-right: calc(0.5rem * var(--tw-space-x-reverse));
        margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
      }
      .text-gray-500 {
        --tw-text-opacity: 1;
        color: rgba(107,114,128,var(--tw-text-opacity));
      }
      .capitalize {
          text-transform: capitalize;
      }
      .ha-icon ha-icon {
        display: inline-block;
        margin: auto;
        --mdc-icon-size: 100% !important;
        --iron-icon-width: 100% !important;
        --iron-icon-height: 100% !important;
      }
      .text-center {
        text-align: center;
      }
      .rounded-full {
        border-radius: 9999px;
      }
      .not_home {
        filter: grayscale(100%);
      }
      .domain-badge-card h3 {
        margin-top: 0.4rem;
      }
      .m-auto {
        margin: 0 auto;
      }
      .round-badge {
        background-color: var(--dwains-house-information-badge-background, var(--sidebar-icon-color));
      }
      .badge-icon {
        color: var(--dwains-house-information-badge-color, var(--ha-card-background, var(--card-background-color, white) ) );
      }

      .dd-header-tabs{
        overflow-x:auto;
        overscroll-behavior-x:contain;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;
        display:flex;
        flex-direction:row;
        align-items:center;
        gap:8px;
        padding:4px 8px;
        height:110px;
        margin:0 .25rem !important;
        background:rgba(var(--rgb-card-background-color),.08);
        border:0 !important;
        border-radius:12px;
        --ha-tabs-selection-bar-height:0;
        --mdc-ripple-color:transparent;
      }

      .dd-header-tabs::-webkit-scrollbar{display:none}

      @media (max-width:600px){
        .dd-header-tabs ha-tab{
          flex:0 0 auto;
          min-width:68px;
        }
        .dd-header-tabs{
          padding-inline:6px;
          gap:6px;
        }
      }

      dwains-house-information-card ha-card{
        border:0 !important;
        box-shadow:none !important;
        --ha-card-border-width:0;
      }

      .dd-header-tabs ha-tab{
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        flex:1 1 0;
        min-width:60px;
        max-width:88px;
        padding:0 4px;
        --mdc-tab-text-label-color-default:var(--secondary-text-color);
        --mdc-tab-color-default:var(--secondary-text-color);
        --mdc-tab-text-transform:capitalize;
        --mdc-typography-button-text-transform:none;
      }

      .dd-header-tabs h3{
        font-size:1rem;
        line-height:1.3;
        font-weight:500;
        margin:10px 0 2px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .dd-header-tabs span{
        font-size:.92rem;
        line-height:1.25;
      }
      .loading-component {
        height: 110px;
      }
      `
    }

    static get properties() {
        return {
            _hass: { type: Object },
            configuration: { type: Object },
            domains: { type: Object },
            persons: { type: Array }
        }
    }

    setConfig(config) {
        this.configuration = config;
    }

    set hass(hass) {
        this._hass = hass;
        this.requestUpdate();
    }

    async connectedCallback() {
        super.connectedCallback();
        await this._loadData(); //Load data
    }

    async _reloadCard() {
        await this._loadData();
        this.requestUpdate();
    }

    async _loadData() {
        this.areas = await this._hass.callWS({
            type: "config/area_registry/list"
        });
        this.devices = await this._hass.callWS({
            type: "config/device_registry/list"
        });
        this.entities = await this._hass.callWS({
            type: "config/entity_registry/list"
        });

        //Load configuration
        this.configuration = await this._hass.callWS({
            type: 'dwains_dashboard/configuration/get'
        });

        if (this.areas == null || this.areas.length === 0
            || this.devices == null || this.devices.length === 0
            || this.entities == null || this.entities.length === 0
            || this.configuration == null || this.configuration.length === 0
        ) {
        } else {
            const domains = [];
            const persons = [];

            //Loop throught the person because persons doesnt hang into an area but we still want persons :D
            for (const entity of this.entities) {
                const domain = computeDomain(entity.entity_id);
                if (domain == 'person') {
                    if (
                        !(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['disabled'])
                        &&
                        !(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['excluded'])
                    ) {
                        persons.push(entity.entity_id);
                    }
                }
            }

            //Loop throught all areas to get all entities assigned to an area to populate the data group
            for (const area of this.areas) {
                if (
                    !(this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['disabled'])
                ) {
                    const areaDevices = new Set();
                    const areaEntities = new Set();
                    const areaCardsByDomain = [];
                    const areaEntitiesNoState = [];

                    // Find all devices linked to this area
                    for (const device of this.devices) {
                        if (device.area_id === area.area_id) {
                            areaDevices.add(device.id);
                        }
                    }

                    // Find all entities directly linked to this area
                    // or linked to a device linked to this area.
                    for (const entity of this.entities) {
                        if (
                            entity.area_id
                                ? entity.area_id === area.area_id
                                : areaDevices.has(entity.device_id)
                        ) {
                            const disableEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['disabled'] ? true : false) : false;
                            const excludeEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['excluded'] ? true : false) : false;

                            if (!disableEntity && !excludeEntity) {
                                const friendlyName = this.configuration['entities'][entity.entity_id] ? this.configuration['entities'][entity.entity_id]['friendly_name'] : "";
                                const domain = computeDomain(entity.entity_id);

                                if (
                                    !TOGGLE_DOMAINS.includes(domain) &&
                                    !ALERT_DOMAINS.includes(domain) &&
                                    !COVER_DOMAINS.includes(domain) &&
                                    !CLIMATE_DOMAINS.includes(domain) &&
                                    !OTHER_DOMAINS.includes(domain)
                                ) {
                                    continue;
                                }

                                if (!(domain in domains)) {
                                    domains[domain] = { domain: domain, entities: [] };
                                }
                                domains[domain].entities.push({
                                    entity_id: entity.entity_id,
                                    area: area,
                                    friendlyName: friendlyName,
                                });
                            }

                        }
                    }
                }
            }
            this.domains = domains;
            this.persons = persons;
        }
    }

    _handleMoreInfo(ev) {
        if (ev.currentTarget.entity) {
            moreInfo(ev.currentTarget.entity);
        } else {
            const domain = ev.currentTarget.domain;
            const deviceClass = ev.currentTarget.deviceClass;
            window.setTimeout(() => {
                fireEvent("hass-more-info", { entityId: "" }, document.querySelector("home-assistant"));
                popUp(translateEngine(this._hass, 'device.' + domain), {
                    type: "custom:dwains-house-information-more-info-card",
                    domain: domain,
                    entities: this.domains[domain]['entities'],
                    deviceClass: deviceClass,
                }, true, '');
            }, 50);
        }
    }

    _isOn(entities, domain, deviceClass) {
        if (!entities) {
            return undefined;
        }
        return ((
            deviceClass
                ? entities.filter(
                    (entity) => entity.attributes.device_class === deviceClass
                )
                : entities
        ).filter(
            (entity) =>
                !UNAVAILABLE_STATES.includes(entity.state) &&
                !STATES_OFF.includes(entity.state)
        ).length);
    }

    _isOnCover(entities, domain, deviceClass) {
        if (!entities) {
            return undefined;
        }

        return ((
            deviceClass
                ? entities.filter(
                    (entity) => entity.attributes.device_class === deviceClass
                )
                : entities
        ).filter(
            (entity) =>
                !UNAVAILABLE_STATES.includes(entity.state) &&
                !STATES_OFF.includes(entity.state) &&
                !this.configuration['homepage_header']['invert_cover']
        ).length);
    }

    _isOffCover(entities, domain, deviceClass) {
        if (!entities) {
            return undefined;
        }

        return ((
            deviceClass
                ? entities.filter(
                    (entity) => entity.attributes.device_class === deviceClass
                )
                : entities
        ).filter(
            (entity) =>
                !UNAVAILABLE_STATES.includes(entity.state) &&
                STATES_OFF.includes(entity.state) &&
                this.configuration['homepage_header']['invert_cover']
        ).length);

    }

    _isOnClimate(entities, domain) {
        if (!entities) {
            return undefined;
        }
        const climateStates = [];
        for (const climate of entities) {
            if (climate.attributes['hvac_action'] && climate.attributes['hvac_action'] != 'idle') {
                if (!UNAVAILABLE_STATES.includes(climate.attributes['hvac_action']) && !STATES_OFF.includes(climate.attributes['hvac_action'])) {
                    climateStates.push(climate.entity_id);
                }
            } else if (!climate.attributes['hvac_action']) {
                if (!UNAVAILABLE_STATES.includes(climate.state) && !STATES_OFF.includes(climate.state)) {
                    climateStates.push(climate.entity_id);
                }
            }
        }
        return climateStates.length;
    }


    _renderDomain(domain) {
        const entitiesByDomain = [];

        for (const entity of domain.entities) {
            const stateObj = this._hass.states[entity.entity_id];

            if (!stateObj) {
                continue;
            }

            entitiesByDomain.push(stateObj);
        }

        if (TOGGLE_DOMAINS.includes(domain.domain)) {
            //If domain is in toggle domains (light, fan, switch)
            const on = this._isOn(entitiesByDomain, domain);
            if (on) {
                return this._renderDomainBadgeCard(domain.domain, translateEngine(this._hass, 'device.' + domain.domain), DOMAIN_STATE_ICONS[domain.domain][on ? "on" : "off"], on, '');
            }
        } else if (ALERT_DOMAINS.includes(domain.domain)) {
            //If domain is alert domain binary_sensor (check device_classes ("motion", "door", "window"))
            return DEVICE_CLASSES[domain.domain].map((deviceClass) => {
                const on = this._isOn(entitiesByDomain, domain.domain, deviceClass);
                if (on) {
                    return this._renderDomainBadgeCard(domain.domain, translateEngine(this._hass, 'device.' + deviceClass), DOMAIN_STATE_ICONS[domain.domain][deviceClass], on, deviceClass);
                }
            });
        } else if (COVER_DOMAINS.includes(domain.domain)) {
            //If domain is cover domain binary_sensor (check device_classes ("garage","shutter"))
            return DEVICE_CLASSES[domain.domain].map((deviceClass) => {
                const on = this._isOnCover(entitiesByDomain, domain.domain, deviceClass);
                const off = this._isOffCover(entitiesByDomain, domain.domain, deviceClass);
                if (on) {
                    return this._renderDomainBadgeCard(domain.domain, translateEngine(this._hass, 'device.' + deviceClass), DOMAIN_STATE_ICONS[domain.domain][deviceClass], on, deviceClass);
                }
                if (off) {
                    return this._renderDomainBadgeCard(domain.domain, translateEngine(this._hass, 'device.' + deviceClass), DOMAIN_STATE_ICONS[domain.domain][deviceClass], off, deviceClass);
                }
            });
        } else if (CLIMATE_DOMAINS.includes(domain.domain)) {
            //Its climate domain
            const on = this._isOnClimate(entitiesByDomain, domain.domain);
            if (on) {
                return this._renderDomainBadgeCard(domain.domain, translateEngine(this._hass, 'device.' + domain.domain), DOMAIN_STATE_ICONS[domain.domain][on ? "on" : "off"], on, '');
            }
        } else if (OTHER_DOMAINS.includes(domain.domain)) {
            //Its other domain
            const on = this._isOn(entitiesByDomain, domain);
            if (on) {
                return this._renderDomainBadgeCard(domain.domain, translateEngine(this._hass, 'device.' + domain.domain), DOMAIN_STATE_ICONS[domain.domain][on ? "on" : "off"], on, '');
            }
        }
    }
    _renderDomainBadgeCard(domain, name, icon, count, deviceClass) {
        let translatedStatus;
        if ((deviceClass == 'window' || deviceClass == 'door' || domain == 'cover' || domain == 'lock') && !this.configuration['homepage_header']['invert_cover']) {
            translatedStatus = translateEngine(this._hass, 'device.open')
        } else if (this.configuration['homepage_header']['invert_cover'] && domain == 'cover') {
            translatedStatus = translateEngine(this._hass, 'device.closed')
        } else {
            translatedStatus = translateEngine(this._hass, 'device.on')

        }
        return html`
      <ha-tab class="dd-header-tab">
        <div slot="icon" class="text-center cursor-pointer domain-badge-card" .domain=${domain} .deviceClass=${deviceClass} @click=${this._handleMoreInfo}>
          <div class="rounded-full flex items-center justify-center m-auto round-badge" style="width: 54px; height: 54px;">
            <div class="">
              <ha-icon
                class="w-8 h-8 badge-icon"
                .icon=${this.configuration['devices'][domain] && this.configuration['devices'][domain]['icon'] ? this.configuration['devices'][domain]['icon'] : icon}
              ></ha-icon>
            </div>
          </div>
          <h3 class="capitalize mt-2 mb-1 text-sm font-medium">${name}</h3>
          <span class="text-gray-500 text-xs">
            ${count} ${translatedStatus}
          </span>
        </div>
      </ha-tab>
      `;
    }

    _renderPersonCard(entity_id) {
        const stateObj = this._hass.states[entity_id];
        if (stateObj && stateObj.attributes) {
            let imageUrl =
                stateObj.attributes.entity_picture_local ||
                stateObj.attributes.entity_picture;
            if (imageUrl && this._hass) {
                imageUrl = this._hass.hassUrl(imageUrl);
            }
            const name = (stateObj.attributes.friendly_name === undefined ? (stateObj.entity_id).replace(/_/g, " ") : stateObj.attributes.friendly_name);
            return html`
                <ha-tab class="dd-header-tab">
                <div slot="icon" class="text-center cursor-pointer" .entity=${entity_id} @click=${this._handleMoreInfo}>
                    ${imageUrl ? html`
                    <img src="${imageUrl}" width="50" class="rounded-full m-auto ${stateObj.state}">
                    ` : html`
                    <div class="rounded-full flex items-center justify-center m-auto round-badge" style="width: 50px; height: 50px; margin-bottom: 6px;">
                    <div class="">
                        <ha-icon
                        class="w-8 h-8 badge-icon"
                        .icon=${"mdi:account"}
                        ></ha-icon>
                    </div>
                    </div>
                    `}
                    <h3 class="capitalize">${name.split(' ')[0]}</h3>
                    <span class="text-gray-500">
                    ${myComputeStateDisplay(
                        this._hass.localize,
                        stateObj,
                        this._hass.locale
                    )}
                    </span>
                </div>
                </ha-tab>`;
        }
    }

    render() {
        if (!this._hass) {
            return html``;
        }
        if (this.domains == null || Object.keys(this.domains).length === 0) {
            return html``;
        } else {
            return html`
                <ha-card>
                <ha-tabs class="dd-header-tabs" .activeIndex=${0} scrollable hide-scroll-buttons>
                    ${this.persons.map((entity) => this._renderPersonCard(entity))}
                    ${Object.values(this.domains).map((domain) => this._renderDomain(domain))}
                </ha-tabs>
                </ha-card>
            `;
        }
    }
}

customElements.define("dwains-house-information-card", DwainsHouseInformationCard);
