import { hass } from "card-tools/src/hass";
import { moreInfo } from "card-tools/src/more-info";
import { popUp, closePopUp } from "card-tools/src/popup";
import { fireEvent } from "card-tools/src/event";
import {
  computeStateDisplay,
  computeStateDomain,
  computeDomain
} from 'custom-card-helpers';
import { css, html, LitElement } from 'lit-element';
import { 
  STATES_OFF,
  UNAVAILABLE_STATES,
  ALERT_DOMAINS,
  TOGGLE_DOMAINS,
  CLIMATE_DOMAINS,
  OTHER_DOMAINS,
  DEVICE_CLASSES,
  DOMAIN_STATE_ICONS
 } from './variables'
 import translateEngine from './translate-engine';
 import { closePopup } from "./helpers";

const bases2 = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];
Promise.race(bases2).then(() => {

  class DwainsHouseInformationMoreInfoCard extends LitElement {
    static get styles() {
      return css`
      .p-20px {
        padding: 20px;
      }
      .flex {
        display: flex;
      }
      .grid-flow-row-dense {
        grid-auto-flow: row dense
      
      }
      .grid-cols-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr))
      }
      .grid {
        display: grid;
        gap: 1rem;
      }
      @media (min-width: 1024px) {
        .lg-grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr))
        }
      }
      @media (min-width: 1536px) {
        .xl-col-span-4 {
            grid-column: span 4 / span 4
        }
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
      .space-x-2>:not([hidden])~:not([hidden]) {
        --tw-space-x-reverse: 0;
        margin-right: calc(0.5rem * var(--tw-space-x-reverse));
        margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
      }
      .capitalize {
          text-transform: capitalize;
      }
      .icon ha-state-icon {
        display: inline-block;
        margin: auto;
        --mdc-icon-size: 100% !important;
        --iron-icon-width: 100% !important;
        --iron-icon-height: 100% !important;

        width: 1.5rem;
        height: 1.5rem;
      }
      .icon {
        padding: 0.75rem;
        background-color: var(--secondary-background-color);
        border-radius: 999px;
      }
      .information {
        line-height: 1.10;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .information .state {
        font-size: 0.9rem;
        line-height: 1.25rem;
        color: var(--paper-item-body-secondary-color, var(--secondary-text-color));
      }
      .handle-button {
        background-color: var(--secondary-background-color);
        border-radius: var(--ha-card-border-radius, 4px);
        color: var(--primary-text-color);
        display: block;
        text-align: center;
        padding: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 1rem;
      }
      .single-button {

      }
      .two-buttons {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2,minmax(0,1fr));
      }
      `
    }

    static get properties() {
      return {
        hass: {},
        configuration: {},
      }
    }


    setConfig(config) {
      if (!config.domain || !config.entities) {
        throw new Error("Specify an domain from within HA domains and specify entities list");
      }
      
      this.hass = hass();
      this._config = config;
      this.domain = config.domain;
      this.deviceClass = config.deviceClass;
      this.entities = config.entities
    }

    async connectedCallback(){
      super.connectedCallback();
      await this._loadData(); //Load data
    }

    async _loadData(){
      //Load configuration
      this.configuration = await this.hass.callWS({
        type: 'dwains_dashboard/configuration/get'
      });
    }
    
    _currentOn() {
      const entitiesStates = [];
      const deviceClass = this.deviceClass;

      for (const entity of this.entities) {
        const stateObj = this.hass.states[entity.entity_id];

        if (!stateObj) {
          continue;
        }

        entitiesStates.push({
          area: entity.area,
          stateObj: stateObj
        });
      } 

      //console.log(entitiesStates);

      if (!entitiesStates) {
        return undefined;
      }

      if(this.domain == 'climate'){
        const climateStates = [];
        for(const climate of entitiesStates){
          if(climate.stateObj.attributes['hvac_action'] && climate.stateObj.attributes['hvac_action'] != 'idle'){
            if(!UNAVAILABLE_STATES.includes(climate.stateObj.attributes['hvac_action']) && !STATES_OFF.includes(climate.stateObj.attributes['hvac_action'])){
              climateStates.push({
                area: climate.area,
                stateObj: climate.stateObj
              });
            }
          } else if(!climate.stateObj.attributes['hvac_action']){
            if(!UNAVAILABLE_STATES.includes(climate.stateObj.state) && !STATES_OFF.includes(climate.stateObj.state)){
              climateStates.push({
                area: climate.area,
                stateObj: climate.stateObj
              });
            }
          }
        }
        return climateStates;
      } else {
      
        return((
          deviceClass
            ? entitiesStates.filter(
                (entity) => entity.stateObj.attributes.device_class === deviceClass
              )
            : entitiesStates
        ).filter(
          (entity) =>
            !UNAVAILABLE_STATES.includes(entity.stateObj.state) &&
            !STATES_OFF.includes(entity.stateObj.state)
        ));
      }
    }

    _navigateToDevices(ev){
      const domain = ev.currentTarget.domain;

      closePopup();

      let e;
      let path = window.location.pathname;
      let nav_path = path.substring(0, path.lastIndexOf('/')) + "/devices#"+domain;
      window.history.pushState(null, '', nav_path);
      e = new Event('location-changed', { composed: true });
      e.detail = { replace: false };
      window.dispatchEvent(e);
    }
    _handleMoreInfo(ev){
      const entityId = ev.currentTarget.entity;
      moreInfo(entityId);
    }
    _toggleEntity(ev){
      const entityId = ev.currentTarget.entity;

      const turnOn = STATES_OFF.includes(this.hass.states[entityId].state);
      const stateDomain = computeDomain(entityId);

      if(stateDomain == 'binary_sensor' || stateDomain == 'sensor'){
        moreInfo(entityId);
        return;
      } else {
        const serviceDomain = stateDomain === "group" ? "homeassistant" : stateDomain;

        let service;
        switch (stateDomain) {
          case "lock":
            service = turnOn ? "unlock" : "lock";
            break;
          case "cover":
            service = turnOn ? "open_cover" : "close_cover";
            break;
          default:
            service = turnOn ? "turn_on" : "turn_off";
        }

        this.hass.callService(serviceDomain, service, { entity_id: entityId });
      }
    }

    _handleTurnAllOffClicked(ev){
      const currentOn = this._currentOn();
      if(currentOn.length == 0){
        closePopup();
      }
      currentOn.map((entity) => {
        const entityId = entity.stateObj.entity_id;
        const stateDomain = computeDomain(entityId);
        const serviceDomain = stateDomain === "group" ? "homeassistant" : stateDomain;
        let service;
        switch (stateDomain) {
          case "lock":
            service = "lock";
            break;
          case "cover":
            service = "close_cover";
            break;
          default:
            service = "turn_off";
        }

        this.hass.callService(serviceDomain, service, { entity_id: entityId });
      });
    }

    _renderEntityBadgeCard(stateObj){
      const name = this.configuration['entities'] && this.configuration['entities'][stateObj.entity_id] && this.configuration['entities'][stateObj.entity_id]['friendly_name'] ? this.configuration['entities'][stateObj.entity_id]['friendly_name'] : (stateObj.attributes.friendly_name === undefined ? (stateObj.entity_id).replace(/_/g, " ") : stateObj.attributes.friendly_name);

      return html`
      <entity-badge>
        <div class="flex space-x-2 p-2">
          <div>
            <div class="icon cursor-pointer">
              <ha-state-icon
                tabindex="-1"
                data-domain=${computeStateDomain(stateObj)}
                data-state=${stateObj.state}
                .state=${stateObj}
                .entity=${stateObj.entity_id}
                @click=${this._toggleEntity}
              ></ha-state-icon>
            </div>
          </div>
          <div class="cursor-pointer information" .entity=${stateObj.entity_id} @click=${this._handleMoreInfo}>
            <h1 class="font-semibold">${name}</h1>
            <span class="state">
              ${computeStateDisplay(
                this.hass.localize,
                stateObj,
                this.hass.locale
              )}
            </span>
          </div>
        </div>
      </entity-badge>
      `;
    }

    render() {
      if (!this.hass || !this._config || !this.configuration || this.configuration.length === 0) {
        return html``;
      }
      const currentOn = this._currentOn();
      if(currentOn.length == 0){
        closePopup();
      }
      //console.log(currentOn);

      let turnAllOff = false;
      if(this.domain == 'light' || this.domain == 'switch') {
        turnAllOff = true;
      }

      let group = currentOn.reduce((r, a) => {
        //console.log("a", a);
        //console.log('r', r);
        r[a.area.area_id] = [...r[a.area.area_id] || [], a];
        return r;
       }, {});

       //console.log(group);

      return html`
      <div class="p-20px">
        ${Object.keys(group).map((key) => 
          html `
            <div class="mb-5">
              <h3 class="font-semibold capitalize text-gray">${key}</div>
              <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4">
                ${Object.entries(group[key]).map(([k,v]) => 
                  html`${this._renderEntityBadgeCard(v.stateObj)}`
                )}
              </div>
            </div>
          `
        )}

        <div class="${turnAllOff ? 'two-buttons' : 'single-button'}">
          ${turnAllOff ? html`
          <div class="handle-button" @click=${this._handleTurnAllOffClicked}>
            ${translateEngine(this.hass,'device.turn_all_off')}
          </div>
          ` : ""}
          <div class="handle-button" @click=${this._navigateToDevices} .domain=${this.domain}>
            ${translateEngine(this.hass, 'device.see_all')} 
            <ha-icon
              .icon=${"mdi:chevron-right"}
            ></ha-icon>
          </div>
        </div>
      </div>
      `;
      

      
    }
  }
  customElements.define("dwains-house-information-more-info-card", DwainsHouseInformationMoreInfoCard);

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

      paper-tabs {
        height: 110px;
        margin: 0 0.25rem !important;
      }
      paper-tabs paper-tab {
        padding: 0 0.25rem !important;
      }
      .loading-component {
        height: 110px;
      }
      `
    }

    static get properties() {
      return {
        persons: {},
        domains: {},
        hass: {},
      }
    }

    /**
     * @param {any} hass
     */
    // set hass(hass) {
    //   console.log('test');
    // }


    setConfig(config) {      
      this.hass = hass();
    }

    async connectedCallback(){
      super.connectedCallback();
      await this._loadData(); //Load data
    }

    async _reloadCard(){
      await this._loadData();
      this.requestUpdate();
    }

    async _loadData(){
      this.areas = await this.hass.callWS({
        type: "config/area_registry/list"
      });
      this.devices = await this.hass.callWS({
        type: "config/device_registry/list"
      });
      this.entities = await this.hass.callWS({
        type: "config/entity_registry/list"
      });

      //Load configuration
      this.configuration = await this.hass.callWS({
        type: 'dwains_dashboard/configuration/get'
      });
      
      if(this.areas == null || this.areas.length === 0 
      || this.devices == null || this.devices.length === 0
      || this.entities == null || this.entities.length === 0
      || this.configuration == null || this.configuration.length === 0
      ){
      } else {
        const domains = [];
        const persons = [];

        //Loop throught the person because persons doesnt hang into an area but we still want persons :D
        for(const entity of this.entities){
          const domain = computeDomain(entity.entity_id);
          if(domain == 'person'){
            if(
              !(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['disabled'])
              &&
              !(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['excluded'])
            ){
              persons.push(entity.entity_id);
            }
          }
        }

        //Loop throught all areas to get all entities assigned to an area to populate the data group
        for(const area of this.areas){
          if(
            !(this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['disabled'])
          ){
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

                if(!disableEntity && !excludeEntity){                
                  const domain = computeDomain(entity.entity_id);

                  if (
                    !TOGGLE_DOMAINS.includes(domain) &&
                    !ALERT_DOMAINS.includes(domain) &&
                    !CLIMATE_DOMAINS.includes(domain) &&
                    !OTHER_DOMAINS.includes(domain)
                  ) {
                    continue;
                  }    
                  
                  if (!(domain in domains)) {
                    domains[domain] = {domain: domain, entities: []};
                  }
                  domains[domain].entities.push({
                    entity_id: entity.entity_id,
                    area: area,
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
    
    _handleMoreInfo(ev){
      if(ev.currentTarget.entity){
        moreInfo(ev.currentTarget.entity);
      } else {
        const domain = ev.currentTarget.domain;
        const deviceClass = ev.currentTarget.deviceClass;
        window.setTimeout(() => {
          fireEvent("hass-more-info", {entityId: ""}, document.querySelector("home-assistant"));
          popUp(translateEngine(this.hass, 'device.'+domain), {
            type: "custom:dwains-house-information-more-info-card", 
            domain: domain,
            entities: this.domains[domain]['entities'],
            deviceClass: deviceClass,
          }, true, '');
        }, 50);
      }
    }

    _navigateToDevices(ev){
      const domain = ev.currentTarget.domain;

      let e;
      let path = window.location.pathname;
      let nav_path = path.substring(0, path.lastIndexOf('/')) + "/devices#"+domain;
      window.history.pushState(null, '', nav_path);
      e = new Event('location-changed', { composed: true });
      e.detail = { replace: false };
      window.dispatchEvent(e);
    }
    
    _isOn(entities, domain, deviceClass) {
      if (!entities) {
        return undefined;
      }
      return((
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

    _isOnClimate(entities, domain){
      if (!entities) {
        return undefined;
      }
      const climateStates = [];
      for(const climate of entities){
        if(climate.attributes['hvac_action'] && climate.attributes['hvac_action'] != 'idle'){
          if(!UNAVAILABLE_STATES.includes(climate.attributes['hvac_action']) && !STATES_OFF.includes(climate.attributes['hvac_action'])){
            climateStates.push(climate.entity_id);
          }
        } else if(!climate.attributes['hvac_action']){
          if(!UNAVAILABLE_STATES.includes(climate.state) && !STATES_OFF.includes(climate.state)){
            climateStates.push(climate.entity_id);
          }
        }
      }
      return climateStates.length;
    }


    _renderDomain(domain){
      const entitiesByDomain = [];

      for (const entity of domain.entities) {
        const stateObj = this.hass.states[entity.entity_id];

        if (!stateObj) {
          continue;
        }

        entitiesByDomain.push(stateObj);
      } 

      if(TOGGLE_DOMAINS.includes(domain.domain)) {
        //If domain is in toggle domains (light, fan, switch)
        const on = this._isOn(entitiesByDomain, domain);
        if(on){
          return this._renderDomainBadgeCard(domain.domain, translateEngine(this.hass, 'device.'+domain.domain), DOMAIN_STATE_ICONS[domain.domain][on ? "on" : "off"],on,'');
        }
      } else if (ALERT_DOMAINS.includes(domain.domain)) {
        //If domain is alert domain binary_sensor (check device_classes ("motion", "door", "window"))
        return DEVICE_CLASSES[domain.domain].map((deviceClass) => {
          const on = this._isOn(entitiesByDomain, domain.domain, deviceClass);
          if(on){
            return this._renderDomainBadgeCard(domain.domain, translateEngine(this.hass, 'device.'+deviceClass), DOMAIN_STATE_ICONS[domain.domain][deviceClass],on,deviceClass);
          }
        });
      } else if(CLIMATE_DOMAINS.includes(domain.domain)) {
        //Its climate domain
        const on = this._isOnClimate(entitiesByDomain, domain.domain);
        if(on){
          return this._renderDomainBadgeCard(domain.domain, translateEngine(this.hass, 'device.'+domain.domain), DOMAIN_STATE_ICONS[domain.domain][on ? "on" : "off"],on,'');
        }
      } else if (OTHER_DOMAINS.includes(domain.domain)) {
        //Its other domain
        const on = this._isOn(entitiesByDomain, domain);
        if(on){
          return this._renderDomainBadgeCard(domain.domain, translateEngine(this.hass, 'device.'+domain.domain), DOMAIN_STATE_ICONS[domain.domain][on ? "on" : "off"],on,'');
        }
      }
    }
    _renderDomainBadgeCard(domain, name, icon, count,deviceClass){
      let translatedStatus;
      if(deviceClass == 'window' || deviceClass == 'door' || domain == 'lock'){
        translatedStatus = translateEngine(this.hass, 'device.open')
      } else {
        translatedStatus = translateEngine(this.hass, 'device.on')
      }
      //@click=${this._navigateToDevices}
      return html`
      <paper-tab>
        <div class="text-center cursor-pointer domain-badge-card" .domain=${domain} .deviceClass=${deviceClass} @click=${this._handleMoreInfo}>
          <div class="rounded-full flex items-center justify-center m-auto round-badge" style="width: 50px; height: 50px;">
            <div class="">
              <ha-icon
                class="w-8 h-8 badge-icon"
                .icon=${this.configuration['devices'][domain] && this.configuration['devices'][domain]['icon'] ? this.configuration['devices'][domain]['icon'] : icon}
              ></ha-icon>
            </div>
          </div>
          <h3 class="capitalize">${name}</h3>
          <span class="text-gray-500">
          ${count} ${translatedStatus}
          </span>
        </div>
      </paper-tab>
      `;
    }

    _renderPersonCard(entity_id){
      const stateObj = this.hass.states[entity_id];
      if(stateObj && stateObj.attributes){
        let imageUrl =
          stateObj.attributes.entity_picture_local ||
          stateObj.attributes.entity_picture;
        if (imageUrl && this.hass) {
          imageUrl = this.hass.hassUrl(imageUrl);
        }
        const name = (stateObj.attributes.friendly_name === undefined ? (stateObj.entity_id).replace(/_/g, " ") : stateObj.attributes.friendly_name);

        return html`
        <paper-tab>
          <div class="text-center cursor-pointer" .entity=${entity_id} @click=${this._handleMoreInfo}>
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
            ${computeStateDisplay(
              this.hass.localize,
              stateObj,
              this.hass.locale
            )}
            </span>
          </div>
        </paper-tab>`;
      }
    }

    render() {
      if (!this.hass) {
        return html`<ha-card><div class="loading-component"></div></ha-card>`;
      }
      if(this.domains == null || Object.keys(this.domains).length === 0){
        return html`<ha-card><div class="loading-component"></div></ha-card>`;
      } else {
        return html`
        <ha-card>
          <paper-tabs selected="0" scrollable hide-scroll-buttons>
            ${this.persons.map((entity) => this._renderPersonCard(entity))}
            ${Object.values(this.domains).map((domain) => this._renderDomain(domain))}
          </paper-tabs>
        </ha-card>
        `;
        /**
          <div id="badges" class="p-2">
            <div class="flex space-x-2">
              ${this.persons.map((entity) => this._renderPersonCard(entity))}

              ${Object.values(this.domains).map((domain) => this._renderDomain(domain))}
            </div>
          </div>
         */
      }
    }
  }
  customElements.define("dwains-house-information-card", DwainsHouseInformationCard);
});