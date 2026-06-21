import { hass } from "card-tools/src/hass";
import { moreInfo } from "card-tools/src/more-info";
import { popUp } from "./dwains-popup";
import { mdiDotsVertical, mdiCog } from "@mdi/js";
import { css, html, LitElement } from 'lit-element';
import Cookies from 'js-cookie'
import {
  WEATHER_ICONS,
  STATES_OFF,
  UNAVAILABLE_STATES,
  SENSOR_DOMAINS,
  ALERT_DOMAINS,
  COVER_DOMAINS,
  TOGGLE_DOMAINS,
  CLIMATE_DOMAINS,
  OTHER_DOMAINS,
  DEVICE_CLASSES,
  DOMAIN_STATE_ICONS,
  ALARM_ICONS,
 } from './variables'
import { computeDomain} from 'custom-card-helpers';
import Sortable from 'sortablejs/modular/sortable.complete.esm.js';
import translateEngine from './translate-engine';

function getDwainsHass() {
  return (window.__dd_get_hass && window.__dd_get_hass()) || hass();
}


	  class HomepageCard extends LitElement {
    static get properties() {
      return {
        data: {},
        favorites: {},
        favoriteEditMode: {},
        selectedArea: {},
        areaEditMode: {},
        areaViewEditMode: {},
        areaViewDisplayGrouped: {},
        areaDisplayGrouped: {},
      };
    }

	    async loadHelpers() {
	      if (window.__dd_wait_card_helpers) {
	        return await window.__dd_wait_card_helpers();
	      }
	      if (typeof window.loadCardHelpers === 'function') {
	        return await window.loadCardHelpers();
	      } else {
        console.warn('loadCardHelpers is not available, ensure you are running a compatible version of Home Assistant');
      }
    }

    /**
     * @param {any} hass
     */
    set hass(hass) {
      if(this.startedUp){
        this._update_hass(hass);
      }
    }

	    _update_hass(hass){
	      this._hass = hass;

	      //console.log('set hass runned');
	      if(this.data == null || this.data.length === 0) return;

      //Only update the cards for the opened area page.
	      this.data.forEach((data) => {
	        if(data.area.area_id == this.selectedArea){
	          data.cards.forEach((item) => {
	            if(item.card) item.card.hass = hass;
	          });
	          data.customCardsTop.forEach((item) => {
	            if(item.card) item.card.hass = hass;
	          });
	          data.customCardsBottom.forEach((item) => {
	            if(item.card) item.card.hass = hass;
	          });
	        }
	      });

	      if(this.favorites.length != 0){
	        this.favorites.forEach((item) => {
	          if(item.card) item.card.hass = hass;
	        })
	      }
	      if(this.badgesCard) this.badgesCard.hass = hass;

	      if(this.timeout) return;
	      this.timeout = true;
	      if(this.areaEditMode || this.favoriteEditMode || this.areaViewEditMode){
	        window.setTimeout(() => {this.timeout = false;}, 1000);
	      } else {
	        window.setTimeout(() => {this.timeout = false;}, 100);
	      }
	      this.requestUpdate();

	    }

    async setConfig(config) {
      this.startedUp = false;
      this.timeout = false;

	      this._hass = getDwainsHass();

      this.cardHelpers = await this.loadHelpers();

      this.selectedArea = window.location.hash.substring(1);
      this.areaEditMode = false;
      this.favoriteEditMode = false;
      this.areaViewEditMode = false;
      this.areaViewDisplayGrouped = Cookies.get('dwains_dashboard_areaViewDisplayGrouped') ? (Cookies.get('dwains_dashboard_areaViewDisplayGrouped') == "false" ? false : true) : false;
      this.areaDisplayGrouped = Cookies.get('dwains_dashboard_areaDisplayGrouped') ? (Cookies.get('dwains_dashboard_areaDisplayGrouped') == "false" ? false : true) : false;

      this._config = config;
    }

	    async connectedCallback(){
	      super.connectedCallback();

	      await this._loadData(); //Load areas

	      if(!this._unsub){
	        this._unsub = await this._hass.connection.subscribeEvents(() => this._reloadCard(), "dwains_dashboard_homepage_card_reload");
	      }
	      this._scheduleIconRepoke();
	    }

	    disconnectedCallback(){
	      super.disconnectedCallback();
	      if(this._unsub){
	        Promise.resolve(this._unsub()).catch(() => {});
	        this._unsub = undefined;
	      }
	      if(this.__masonryRO){
	        this.__masonryRO.disconnect();
	        this.__masonryRO = undefined;
	      }
	    }

	    updated(){
	      this._scheduleIconRepoke();
	      this._layoutMasonry();
	    }

	    _repokeIcons(){
	      try {
	        if(!this.shadowRoot) return;
	        this.shadowRoot.querySelectorAll(".area-button ha-icon").forEach((iconEl) => {
	          const icon = iconEl.icon;
	          if(!icon || icon.indexOf(":") < 1) return;
	          const root = iconEl.shadowRoot;
	          const svgIcon = root && root.querySelector("ha-svg-icon");
	          if(svgIcon && svgIcon.path) return;
	          const path = root && root.querySelector("svg path");
	          if(path && (path.getAttribute("d") || "").length) return;
	          iconEl.icon = "";
	          iconEl.icon = icon;
	        });
	      } catch (_) {}
	    }

	    _scheduleIconRepoke(){
	      if(this.__iconRepokeScheduled) return;
	      this.__iconRepokeScheduled = true;
	      const delays = [60, 300, 900, 2000, 4000, 8000, 12000];
	      delays.forEach((delay, index) => setTimeout(() => {
	        if(index === delays.length - 1) this.__iconRepokeScheduled = false;
	        this._repokeIcons();
	      }, delay));
	    }

	    _layoutMasonry(){
	      try {
	        if(!this.shadowRoot) return;
	        const grids = this.shadowRoot.querySelectorAll(".dd-masonry");
	        if(!grids.length) return;
	        if(!this.__masonryRO && "ResizeObserver" in window){
	          this.__masonryRO = new ResizeObserver(() => {
	            if(this.__masonryRaf) return;
	            this.__masonryRaf = requestAnimationFrame(() => {
	              this.__masonryRaf = 0;
	              this._applyMasonrySpans();
	            });
	          });
	        }
	        grids.forEach((grid) => {
	          Array.from(grid.children).forEach((item) => {
	            try {
	              if(this.__masonryRO) this.__masonryRO.observe(item);
	            } catch (_) {}
	          });
	        });
	        this._applyMasonrySpans();
	      } catch (_) {}
	    }

	    _applyMasonrySpans(){
	      try {
	        if(!this.shadowRoot) return;
	        const edit = this.areaViewEditMode || this.favoriteEditMode;
	        this.shadowRoot.querySelectorAll(".dd-masonry").forEach((grid) => {
	          if(edit){
	            grid.style.gridAutoRows = "auto";
	            grid.style.alignItems = "stretch";
	            grid.style.rowGap = "1rem";
	            Array.from(grid.children).forEach((item) => item.style.gridRowEnd = "");
	          } else {
	            grid.style.gridAutoRows = "";
	            grid.style.alignItems = "";
	            grid.style.rowGap = "";
	            Array.from(grid.children).forEach((item) => {
	              const height = item.getBoundingClientRect().height;
	              if(height > 0) item.style.gridRowEnd = "span " + (Math.ceil(height) + 16);
	            });
	          }
	        });
	      } catch (_) {}
	    }

    async _reloadCard(){
      await this._loadData();
      this.requestUpdate();
    }

    async _loadData(){
      this.startedUp = false;

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
	      this.floors = await this._hass.callWS({
	        type: "config/floor_registry/list"
	      }).catch(() => []);

      const data = [];
      const disabledAreas = [];
      const favorites = [];

      if(this.areas == null || this.areas.length === 0
      || this.devices == null || this.devices.length === 0
      || this.entities == null || this.entities.length === 0
      || this.configuration == null || this.configuration.length === 0
      ){
      } else {
        //For activating the ha-icon-picker
        const loader = document.createElement("hui-masonry-view");
        loader.lovelace = { editMode: true };
        loader.willUpdate(new Map());
        //End for the ha-icon-picker

        this.notificationCard = await this.createCardElement2({
          type: "custom:dwains-notification-card",
          hass: this._hass,
        });

        this.badgesCard = await this.createCardElement2({
          type: "custom:dwains-house-information-card",
          hass: this._hass,
        });


        //Favorites load part
        if(this.configuration['entities']){
          const favoritesEntities = [];
          Object.entries(this.configuration['entities']).map( async([entity,v]) => {
            if(v['favorite']){
              const domain = computeDomain(entity);
              const hideEntity = this.configuration['entities'][entity] ? (this.configuration['entities'][entity]['hidden'] ? true : false) : false;
              const excludeEntity = this.configuration['entities'][entity] ? (this.configuration['entities'][entity]['excluded'] ? true : false) : false;
              const friendlyName = this.configuration['entities'][entity] ? this.configuration['entities'][entity]['friendly_name'] : "";
              const customCard = this.configuration['entities'][entity] && this.configuration['entities'][entity]['custom_card'] ? this.configuration['entities'][entity]['custom_card'] : false;
              const customPopup = this.configuration['entities'][entity] && this.configuration['entities'][entity]['custom_popup'] ? this.configuration['entities'][entity]['custom_popup'] : false;
              const isFavorite = this.configuration['entities'][entity] && this.configuration['entities'][entity]['favorite'] ? this.configuration['entities'][entity]['favorite'] : false;

              let cardConfig = {};
              let rowSpan = "1";
              let colSpan = "1";
              let rowSpanLg = "1";
              let colSpanLg = "1";
              let rowSpanXl = "1";
              let colSpanXl = "1";
              if(customCard && this.configuration['entity_cards'] && this.configuration['entity_cards'][entity]){
                //If entity has a custom card set by user
                cardConfig = {input_name: friendlyName, input_entity: entity,...this.configuration['entity_cards'][entity]};
              } else if(this.configuration['devices_card'][domain]){
                //If domain has a custom card set by user
                cardConfig = {input_name: friendlyName, input_entity: entity,...this.configuration['devices_card'][domain]};
	              } else if (domain === 'sensor' && this._hass && this._hass.states[entity].attributes.unit_of_measurement
	              && !this.configuration['homepage_header']['disable_sensor_graph']) {
	                cardConfig = {
	                  graph: "line",
	                  type: "sensor",
	                  hours_to_show: 24,
	                  detail: 1,
	                  entity: entity,
	                  ...(friendlyName ? { name: friendlyName } : {})
	                };
	              } else {
                switch(domain) {
	                  default:
                    // cardConfig = {
                    //   type: "custom:dwains-button-card",
                    //   friendly_name: friendlyName
                    // };
	                    cardConfig = friendlyName ? {
	                      type: "tile",
	                      name: friendlyName,
	                    } : {
	                      type: "tile",
	                    }
	                    break;
	                  case "camera":
	                    cardConfig = {
	                      type: "picture-entity",
	                      camera_view: "auto"
	                    };
                    rowSpan = "2";
                    colSpan = "2";
                    rowSpanLg = "2";
                    colSpanLg = "2";
                    rowSpanXl = "2";
                    colSpanXl = "2";
                    break;
                  case "climate":
                    // cardConfig = {
                    //   type: "custom:dwains-thermostat-card",
                    //   friendly_name: friendlyName
                    // };
	                    cardConfig = friendlyName ? {
	                      type: "thermostat",
	                      name: friendlyName,
	                      features: [
                        {
                          type: "climate-fan-modes",
                          fan_modes: ["quiet","low","medium","high"],
                        },
                        {
                          type: "climate-hvac-modes",
                          hvac_modes: ["heat_cool","heat","dry","fan_only","cool","off"]
	                        }
	                      ]
	                    } : {
	                      type: "thermostat",
	                      features: [
	                        {
	                          type: "climate-fan-modes",
	                          fan_modes: ["quiet","low","medium","high"],
	                        },
	                        {
	                          type: "climate-hvac-modes",
	                          hvac_modes: ["heat_cool","heat","dry","fan_only","cool","off"]
	                        }
	                      ]
	                    }
	                    break;
                  case "cover":
                    // cardConfig = {
                    //   type: "custom:dwains-cover-card",
                    //   friendly_name: friendlyName
                    // };
	                    cardConfig = friendlyName ? {
	                      type: "tile",
	                      name: friendlyName,
	                      features: [
                        {
                          type: "cover-open-close"
                        },
                        {
                          type: "cover-position"
	                        }
	                      ]
	                    } : {
	                      type: "tile",
	                      features: [
	                        {
	                          type: "cover-open-close"
	                        },
	                        {
	                          type: "cover-position"
	                        }
	                      ]
	                    }
	                    break;
                  case "light":
                    // cardConfig = {
                    //   type: "custom:dwains-light-card",
                    //   friendly_name: friendlyName
                    // };
	                    cardConfig = friendlyName ? {
	                      type: "tile",
	                      name: friendlyName,
	                      features: [
                        {
                          type: "light-brightness",
	                        }
	                      ]
	                    } : {
	                      type: "tile",
	                      features: [
	                        {
	                          type: "light-brightness",
	                        }
	                      ]
	                    };
	                    break;
                }

                cardConfig = {entity: entity,...cardConfig};
              }

              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['row_span']){
                rowSpan = this.configuration['entities'][entity]['row_span'];
              }
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['col_span']){
                colSpan = this.configuration['entities'][entity]['col_span'];
              }
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['row_span_lg']){
                rowSpanLg = this.configuration['entities'][entity]['row_span_lg'];
              }
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['col_span_lg']){
                colSpanLg = this.configuration['entities'][entity]['col_span_lg'];
              }
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['row_span_xl']){
                rowSpanXl = this.configuration['entities'][entity]['row_span_xl'];
              }
              if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['col_span_xl']){
                colSpanXl = this.configuration['entities'][entity]['col_span_xl'];
              }

	              favoritesEntities.push({
                domain: domain,
                entity: entity,
                rowSpan: rowSpan,
                colSpan: colSpan,
                rowSpanLg: rowSpanLg,
                colSpanLg: colSpanLg,
                rowSpanXl: rowSpanXl,
                colSpanXl: colSpanXl,
                friendlyName: friendlyName,
                hideEntity: hideEntity,
                excludeEntity: excludeEntity,
	                card: await this.createCardElement2(cardConfig),
                customCard: customCard,
                customPopup: customPopup,
                isFavorite: isFavorite,
                favorite_sort_order: (this.configuration['entities'][entity] && this.configuration['entities'][entity]['favorite_sort_order'] ? this.configuration['entities'][entity]['favorite_sort_order']: 99),
              });
            }
          });

          this.favorites = favoritesEntities;
        }

        for(const area of this.areas){
          if(this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['disabled']){
            disabledAreas.push(area);
          } else {
            // //Check if selectedArea is empty (no hash and this is first area to loop throug so set it)
            // if(this.selectedArea.length === 0){
            //   this.selectedArea = area.area_id;
            // }

            const areaDevices = new Set();
            const areaEntities = new Set();
            const areaCardsByDomain = [];
            const areaEntitiesNoState = [];
            const areaEntitiesHidden = [];
            const areaEntitiesDisabled = [];
            const areaCustomCardsTop = [];
            const areaCustomCardsBottom = [];

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
                if(entity.hidden_by){
                  continue;
                }
                const disableEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['disabled'] ? true : false) : false;
                if(disableEntity){
                  areaEntitiesDisabled.push(entity.entity_id);
                  continue;
                }
                const domain = entity.entity_id.substr(0, entity.entity_id.indexOf("."));
                const stateObj = this._hass.states[entity.entity_id];

                if (stateObj) {
                  const hideEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['hidden'] ? true : false) : false;
                  const excludeEntity = this.configuration['entities'][entity.entity_id] ? (this.configuration['entities'][entity.entity_id]['excluded'] ? true : false) : false;
                  const friendlyName = this.configuration['entities'][entity.entity_id] ? this.configuration['entities'][entity.entity_id]['friendly_name'] : "";
                  const customCard = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['custom_card'] ? this.configuration['entities'][entity.entity_id]['custom_card'] : false;
                  const customPopup = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['custom_popup'] ? this.configuration['entities'][entity.entity_id]['custom_popup'] : false;
                  const isFavorite = this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['favorite'] ? this.configuration['entities'][entity.entity_id]['favorite'] : false;

                  if(hideEntity){
                    areaEntitiesHidden.push(entity.entity_id);

                    //Also add the entity to the normal area entities because a hidden entity is still used in area button (states)
                    areaEntities.add(entity.entity_id);
                  } else {
                    let cardConfig = {};
                    let rowSpan = "1";
                    let colSpan = "1";
                    let rowSpanLg = "1";
                    let colSpanLg = "1";
                    let rowSpanXl = "1";
                    let colSpanXl = "1";
                    if(customCard && this.configuration['entity_cards'] && this.configuration['entity_cards'][entity.entity_id]){
                      //If entity has a custom card set by user
                      cardConfig = {input_name: friendlyName,input_entity: entity.entity_id,...this.configuration['entity_cards'][entity.entity_id]};
                    } else if(this.configuration['devices_card'][domain]){
                      //If domain has a custom card set by user
                      cardConfig = {input_name: friendlyName,input_entity: entity.entity_id,...this.configuration['devices_card'][domain]};
	                    } else if (domain === 'sensor' && this._hass && this._hass.states[entity.entity_id].attributes.unit_of_measurement
	                    && !this.configuration['homepage_header']['disable_sensor_graph']) {
	                      cardConfig = {
	                        graph: "line",
	                        type: "sensor",
	                        hours_to_show: 24,
	                        detail: 1,
	                        entity: entity.entity_id,
	                        ...(friendlyName ? { name: friendlyName } : {})
	                      };
	                    } else {
                      switch(domain) {
	                        default:
                          // cardConfig = {
                          //   type: "custom:dwains-button-card",
                          //   friendly_name: friendlyName
                          // };
	                          cardConfig = friendlyName ? {
	                            type: "tile",
	                            name: friendlyName,
	                          } : {
	                            type: "tile",
	                          }
	                          break;
	                        case "camera":
	                          cardConfig = {
	                            type: "picture-entity",
	                            camera_view: "auto"
	                          };
                          rowSpan = "2";
                          colSpan = "2";
                          rowSpanLg = "2";
                          colSpanLg = "2";
                          rowSpanXl = "2";
                          colSpanXl = "2";
                          break;
                        case "climate":
                          // cardConfig = {
                          //   type: "custom:dwains-thermostat-card",
                          //   friendly_name: friendlyName
                          // };
	                          cardConfig = friendlyName ? {
	                            type: "thermostat",
	                            name: friendlyName,
	                            features: [
                              {
                                type: "climate-fan-modes",
                                fan_modes: ["quiet","low","medium","high"],
                              },
                              {
                                type: "climate-hvac-modes",
                                hvac_modes: ["heat_cool","heat","dry","fan_only","cool","off"]
	                              }
	                            ]
	                          } : {
	                            type: "thermostat",
	                            features: [
	                              {
	                                type: "climate-fan-modes",
	                                fan_modes: ["quiet","low","medium","high"],
	                              },
	                              {
	                                type: "climate-hvac-modes",
	                                hvac_modes: ["heat_cool","heat","dry","fan_only","cool","off"]
	                              }
	                            ]
	                          }
	                          break;
                        case "cover":
                          // cardConfig = {
                          //   type: "custom:dwains-cover-card",
                          //   friendly_name: friendlyName
                          // };
	                          cardConfig = friendlyName ? {
	                            type: "tile",
	                            name: friendlyName,
	                            features: [
                              {
                                type: "cover-open-close"
                              },
                              {
                                type: "cover-position"
	                              }
	                            ]
	                          } : {
	                            type: "tile",
	                            features: [
	                              {
	                                type: "cover-open-close"
	                              },
	                              {
	                                type: "cover-position"
	                              }
	                            ]
	                          }
	                          break;
                        case "light":
                          // cardConfig = {
                          //   type: "custom:dwains-light-card",
                          //   friendly_name: friendlyName
                          // };
	                          cardConfig = friendlyName ? {
	                            type: "tile",
	                            name: friendlyName,
	                            features: [
                              {
                                type: "light-brightness",
	                              }
	                            ]
	                          } : {
	                            type: "tile",
	                            features: [
	                              {
	                                type: "light-brightness",
	                              }
	                            ]
	                          };
	                          break;
                      }

                      cardConfig = {entity: entity.entity_id,...cardConfig};
                    }

                    if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['row_span']){
                      rowSpan = this.configuration['entities'][entity.entity_id]['row_span'];
                    }
                    if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['col_span']){
                      colSpan = this.configuration['entities'][entity.entity_id]['col_span'];
                    }
                    if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['row_span_lg']){
                      rowSpanLg = this.configuration['entities'][entity.entity_id]['row_span_lg'];
                    }
                    if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['col_span_lg']){
                      colSpanLg = this.configuration['entities'][entity.entity_id]['col_span_lg'];
                    }
                    if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['row_span_xl']){
                      rowSpanXl = this.configuration['entities'][entity.entity_id]['row_span_xl'];
                    }
                    if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['col_span_xl']){
                      colSpanXl = this.configuration['entities'][entity.entity_id]['col_span_xl'];
                    }


                    areaCardsByDomain.push({
                      domain: domain,
                      entity: entity.entity_id,
                      rowSpan: rowSpan,
                      colSpan: colSpan,
                      rowSpanLg: rowSpanLg,
                      colSpanLg: colSpanLg,
                      rowSpanXl: rowSpanXl,
                      colSpanXl: colSpanXl,
                      friendlyName: friendlyName,
                      hideEntity: hideEntity,
                      excludeEntity: excludeEntity,
	                      card: this.createCardElement2(cardConfig),
                      customCard: customCard,
                      customPopup: customPopup,
                      isFavorite: isFavorite,
                      sort_order: (this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['sort_order'] ? this.configuration['entities'][entity.entity_id]['sort_order']: 99),
                      grouped_sort_order: (this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['grouped_sort_order'] ? this.configuration['entities'][entity.entity_id]['grouped_sort_order']: 99),
                    });

                    areaEntities.add(entity.entity_id);
                  }
                } else {
                  areaEntitiesNoState.push(entity.entity_id);
                }
              }
            }

            //Custom cards
            if(this.configuration.area_cards.length !== 0){
              if(this.configuration.area_cards[area.area_id]){
                //console.log(Object.entries(this.configuration.area_cards[area.area_id]));
                Object.entries(this.configuration.area_cards[area.area_id]).map(async ([k,v]) => {
                  const card = await this.createCardElement2(v);
                  const rowSpan = v["row_span"] ? v["row_span"] : "1";
                  const colSpan = v["col_span"] ? v["col_span"] : "1";
                  const rowSpanLg = v["row_span_lg"] ? v["row_span_lg"] : "1";
                  const colSpanLg = v["col_span_lg"] ? v["col_span_lg"] : "1";
                  const rowSpanXl = v["row_span_xl"] ? v["row_span_xl"] : "1";
                  const colSpanXl = v["col_span_xl"] ? v["col_span_xl"] : "1";

                  if(v["position"] == 'bottom'){
                    areaCustomCardsBottom.push({
                      card: card,
                      filename: k,
                      area_id: area.area_id,
                      rowSpan: rowSpan,
                      colSpan: colSpan,
                      rowSpanLg: rowSpanLg,
                      colSpanLg: colSpanLg,
                      rowSpanXl: rowSpanXl,
                      colSpanXl: colSpanXl,
                    });
                  } else {
                    areaCustomCardsTop.push({
                      card: card,
                      filename: k,
                      area_id: area.area_id,
                      rowSpan: rowSpan,
                      colSpan: colSpan,
                      rowSpanLg: rowSpanLg,
                      colSpanLg: colSpanLg,
                      rowSpanXl: rowSpanXl,
                      colSpanXl: colSpanXl,
                    });
                  }
                });
              }
            }

            //if(areaCardsByDomain.length != 0){
              data.push({
                entitiesNoState: areaEntitiesNoState,
                entitiesHidden: areaEntitiesHidden,
                entitiesDisabled: areaEntitiesDisabled,
                entities: areaEntities,
                area: area,
                cards: areaCardsByDomain,
                customCardsTop: areaCustomCardsTop,
                customCardsBottom: areaCustomCardsBottom,
	                floor: ((this.floors || []).find((floor) => floor.floor_id === area.floor_id) || {}).name || translateEngine(this._hass, 'area.no_floor'),
	                floorLevel: ((this.floors || []).find((floor) => floor.floor_id === area.floor_id) || {}).level ?? 9999,
                sort_order: (this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['sort_order'] ? this.configuration['areas'][area.area_id]['sort_order']: 99),
                grouped_sort_order: (this.configuration['areas'][area.area_id] && this.configuration['areas'][area.area_id]['grouped_sort_order'] ? this.configuration['areas'][area.area_id]['grouped_sort_order']: 99),
              });
            //}
          }
        }

        data.sort(function (x, y) {
          let a = x.sort_order,
              b = y.sort_order;
          return a == b ? 0 : a > b ? 1 : -1;
        });

	        //Check if selectedArea is empty (no hash and this is first area to loop throug so set it)
	        if(this.selectedArea.length === 0){
	          this.selectedArea = data[0]['area']['area_id'];
	        }

	        await Promise.all(data.flatMap((area) => area && area.cards || []).map(async (item) => {
	          try {
	            if(item) item.card = await item.card;
	          } catch (_) {
	            if(item) item.card = null;
	          }
	        }));

	        this.data = data;
        this.disabledAreas = disabledAreas;

        this.startedUp = true;
      }
    }

    _average(data, domain, deviceClass) {
      const entities = data[domain].filter((entity) =>
        deviceClass ? entity.attributes.device_class === deviceClass : true
      );
      if (!entities) {
        return undefined;
      }
      let uom;
      const values = entities.filter((entity) => {
        if (
          !entity.attributes.unit_of_measurement ||
          isNaN(Number(entity.state))
        ) {
          return false;
        }
        // if(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['excluded']){
        //   return false;
        // }
        if (!uom) {
          uom = entity.attributes.unit_of_measurement;
          return true;
        }
        return entity.attributes.unit_of_measurement === uom;
      });
      if (!values.length) {
        return undefined;
      }
      const sum = values.reduce(
        (total, entity) => total + Number(entity.state),
        0
      );
      return `${Math.round((sum / values.length)*10)/10}${uom}`;
    }

    _isOn(data, domain, deviceClass) {
      const entities = data[domain];
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
          //&& !(this.configuration['entities'][entity.entity_id] && this.configuration['entities'][entity.entity_id]['excluded'])
      ).length);
    }

    _climateState(data, domain){
      const entities = data[domain];
      if (!entities) {
        return undefined;
      }
      const climateStates = [];
      for(const climate of entities){
        //if(!(this.configuration['entities'][climate.entity_id] && this.configuration['entities'][climate.entity_id]['excluded'])){
          if(climate.attributes['hvac_action'] && climate.attributes['hvac_action'] != 'idle'){
            const targetTemp = climate.attributes['temperature'] ? ' (' + climate.attributes['temperature'] + this._hass.config.unit_system['temperature'] +')' : "";
            climateStates.push(this._hass.localize(`state_attributes.climate.hvac_action.${climate.attributes['hvac_action']}`)+targetTemp);
          } else if(!climate.attributes['hvac_action']){
            if(!UNAVAILABLE_STATES.includes(climate.state) && !STATES_OFF.includes(climate.state)){
              const targetTemp = climate.attributes['temperature'] ? ' (' + climate.attributes['temperature'] + this._hass.config.unit_system['temperature'] +')' : "";
              climateStates.push(this._hass.localize(`component.climate.state._.${climate.state}`)+targetTemp);
            }
          }
        //}
      }
      return climateStates.length == 0 ? "" : climateStates.join(", ");
    }

    _handleAreaDisableAllEntitiesClicked(ev){
      const areaId = ev.currentTarget.area;
      const data = this.data.find((data) => data.area.area_id == areaId);
      const key = ev.currentTarget.key;
      const value = ev.currentTarget.value;

      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entities_bool_value',
        entities: JSON.stringify([...data.entities]),
        key: key,
        value: value,
      }).then(
          (resp) => {
              console.log(resp);
          },
          (err) => {
              console.error('Message failed!', err);
          }
      );
    }

    _handleAreaClick(event){
      var id = event.currentTarget.dataset.areaId;
      window.location.hash = id;
      this.selectedArea = id;
      window.scrollTo(0,0);
      //this.requestUpdate();
      this._update_hass(this._hass);
    }

    _handleAreaDoubleClick(event){
      const areaId = event.currentTarget.dataset.areaId;
      const lightState = event.currentTarget.lightState;
      this._hass.callService(
        'light',
        (lightState ? "turn_off" : "turn_on"),
        undefined,
        {
          area_id: areaId,
        }
      );
    }

    _backButtonClick(){
      window.location.hash = "";
      //this.requestUpdate();
      this._update_hass(this._hass);
    }

    _handleMoreInfo(ev){
      moreInfo(ev.currentTarget.entity);
    }

    _entitiesByDomain(entities){
      const entitiesByDomain = {};

      for (const entity of entities) {
          if(this.configuration['entities'][entity] && this.configuration['entities'][entity]['excluded']){
            continue;
          }

          const domain = entity.substr(0, entity.indexOf("."));

          if (
            !TOGGLE_DOMAINS.includes(domain) &&
            !SENSOR_DOMAINS.includes(domain) &&
            !ALERT_DOMAINS.includes(domain) &&
            !CLIMATE_DOMAINS.includes(domain) &&
            !OTHER_DOMAINS.includes(domain)
          ) {
            //console.log(domain);
            continue;
          }

          const stateObj = this._hass.states[entity];

          if (!stateObj) {
            continue;
          }

          if (
            (SENSOR_DOMAINS.includes(domain) || ALERT_DOMAINS.includes(domain)) &&
            !DEVICE_CLASSES[domain].includes(
              stateObj.attributes.device_class || ""
            )
          ) {
            //console.log(domain);
            continue;
          }

          if (!(domain in entitiesByDomain)) {
            entitiesByDomain[domain] = [];
          }
          entitiesByDomain[domain].push(stateObj);
      }
      return entitiesByDomain;
    }

    async createCardElement2(config){
      // Zorg ervoor dat this.cardHelpers geladen is voordat je verder gaat.
      if (!this.cardHelpers) {
        console.error("Card helpers zijn niet geladen.");
        return;
      }

      const element = await this.cardHelpers.createCardElement(config);
      element.hass = this._hass; // Gebruik this._hass, zorg ervoor dat deze correct is ingesteld.

      return element;
    }


    _toggle(ev) {
      ev.stopPropagation();
      const domain = ev.currentTarget.domain;
      if (TOGGLE_DOMAINS.includes(domain)) {
        this._hass.callService(
          domain,
          (ev.currentTarget.state ? "turn_off" : "turn_on"),
          undefined,
          {
            area_id: ev.currentTarget.area_id,
          }
        );
      }
    }

    _addLovelaceCard(ev) {
      ev.stopPropagation();
      const area = ev.currentTarget.area;
      const areaName = ev.currentTarget.areaName;
      const position = ev.currentTarget.position;

      window.setTimeout(() => {

        popUp(translateEngine(this._hass, 'entity.add_card_to') + areaName, {
          type: "custom:dwains-create-custom-card-card",
          area: area,
          position: position,
          page: "areas",
          name: areaName,
        }, true, '');
      }, 50);
    }

    _handleAreaEditClick(ev) {
      ev.stopPropagation();
      const areaId = ev.currentTarget.area_id;
      const icon = ev.currentTarget.area_icon;
      const floor = ev.currentTarget.floor;
      const disableArea = ev.currentTarget.disable_area;
      window.setTimeout(() => {

        popUp(translateEngine(this._hass, 'area.edit_area_button'), {
          type: "custom:dwains-edit-area-button-card",
          areaId: areaId,
          icon: icon,
          floor: floor,
          disableArea: disableArea,
        }, false, '');
      }, 50);
    }

    _handleEntityEditClick(ev) {
      ev.stopPropagation();
      const entity = ev.currentTarget.entity;
      const friendlyName = ev.currentTarget.friendlyName;
      const hideEntity = ev.currentTarget.hideEntity;
      const disableEntity = ev.currentTarget.disableEntity;
      const excludeEntity = ev.currentTarget.excludeEntity;
      const colSpan = ev.currentTarget.colSpan;
      const rowSpan = ev.currentTarget.rowSpan;
      const colSpanLg = ev.currentTarget.colSpanLg;
      const rowSpanLg = ev.currentTarget.rowSpanLg;
      const colSpanXl = ev.currentTarget.colSpanXl;
      const rowSpanXl = ev.currentTarget.rowSpanXl;
      const customCard = ev.currentTarget.customCard;
      const customPopup = ev.currentTarget.customPopup;
      window.setTimeout(() => {

        popUp(translateEngine(this._hass, 'entity.edit_entity'), {
          type: "custom:dwains-edit-entity-card",
          entity: entity,
          friendlyName: friendlyName,
          hideEntity: hideEntity,
          disableEntity: disableEntity,
          excludeEntity: excludeEntity,
          colSpan: colSpan,
          rowSpan: rowSpan,
          colSpanLg: colSpanLg,
          rowSpanLg: rowSpanLg,
          colSpanXl: colSpanXl,
          rowSpanXl: rowSpanXl,
          customCard: customCard,
          customPopup: customPopup,
        }, false, '');
      }, 50);

    }

    _handleEntityEditBoolValueClick(ev) {
      ev.stopPropagation();
      const entityId = ev.currentTarget.entity;
      const key = ev.currentTarget.key;
      const value = ev.currentTarget.value;

      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity_bool_value',
        entityId: entityId,
        key: key,
        value: value,
      }).then(
          (resp) => {
              console.log(resp);
          },
          (err) => {
              console.error('Message failed!', err);
          }
      );

    }
    _handleAreaEditBoolValueClick(ev) {
      ev.stopPropagation();
      const areaId = ev.currentTarget.areaId;
      const key = ev.currentTarget.key;
      const value = ev.currentTarget.value;

      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_area_bool_value',
        areaId: areaId,
        key: key,
        value: value,
      }).then(
          (resp) => {
              console.log(resp);
          },
          (err) => {
              console.error('Message failed!', err);
          }
      );

    }

    _handleEntityEditCardClick(ev) {
      ev.stopPropagation();
      const entityId = ev.currentTarget.entity;

      let cardConfig, mode;
      if(this.configuration['entity_cards'] && this.configuration['entity_cards'][entityId]){
        //cardConfig = this.configuration['entity_cards'][entityId];
        const friendlyName = this.configuration['entities'][entityId] ? this.configuration['entities'][entityId]['friendly_name'] : "";
        cardConfig = {input_name: friendlyName,input_entity: entityId,...this.configuration['entity_cards'][entityId]};
        mode = "editor-element";
      }

      window.setTimeout(() => {

        popUp(translateEngine(this._hass, 'entity.edit_entity_card'), {
          type: "custom:dwains-edit-entity-card-card",
          entity_id: entityId,
          cardConfig: cardConfig,
          mode: mode,
          existingCardEdit: cardConfig ? true : false,
        }, true, '');
      }, 50);
    }

    _handleEntityEditPopupClick(ev) {
      ev.stopPropagation();
      const entityId = ev.currentTarget.entity;

      let cardConfig, mode;
      if(this.configuration['entities_popup'] && this.configuration['entities_popup'][entityId]){
        //cardConfig = this.configuration['entities_popup'][entityId];
        const friendlyName = this.configuration['entities'][entityId] ? this.configuration['entities'][entityId]['friendly_name'] : "";
        cardConfig = {input_name: friendlyName,input_entity: entityId,...this.configuration['entities_popup'][entityId]};
        mode = "editor-element";
      }

      window.setTimeout(() => {

        popUp(translateEngine(this._hass, 'entity.edit_entity_popup_card'), {
          type: "custom:dwains-edit-entity-popup-card",
          entity_id: entityId,
          cardConfig: cardConfig,
          mode: mode,
          existingCardEdit: cardConfig ? true : false,
        }, true, '');
      }, 50);
    }

    _handleEntityAddToFavoritesClick(ev){
      ev.stopPropagation();
      const entityId = ev.currentTarget.entity;

      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity_favorite',
        entityId: entityId,
        favorite: true,
      }).then(
          (resp) => {
              console.log(resp);
          },
          (err) => {
              console.error('Message failed!', err);
          }
      );
    }

    _handleEntityRemoveFromFavoritesClick(ev){
      ev.stopPropagation();
      const entityId = ev.currentTarget.entity;

      this._hass.connection.sendMessagePromise({
        type: 'dwains_dashboard/edit_entity_favorite',
        entityId: entityId,
        favorite: false,
      }).then(
          (resp) => {
              console.log(resp);
          },
          (err) => {
              console.error('Message failed!', err);
          }
      );

    }


    _handleDwainsDashboardSettingsClick(ev){
      ev.stopPropagation();
      //console.log('disableSensorGraph', this.configuration['homepage_header']['disable_sensor_graph']);
      const disableClock = ev.currentTarget.disableClock;
      const amPmClock = ev.currentTarget.amPmClock;
      const disableWelcomeMessage = ev.currentTarget.disableWelcomeMessage;
      const v2Mode = ev.currentTarget.v2Mode;
      const disableSensorGraph = ev.currentTarget.disableSensorGraph;
      const invertCover = ev.currentTarget.invertCover;
      const weatherEntity = ev.currentTarget.weatherEntity;
      const alarmEntity = ev.currentTarget.alarmEntity;
      //console.log('disableSensorGraph2', disableSensorGraph);
      window.setTimeout(() => {
        popUp(translateEngine(this._hass, 'global.dwains_dashboard_settings'), {
            type: "custom:dwains-edit-homepage-header-card",
            disableClock: disableClock,
            amPmClock: amPmClock,
            disableWelcomeMessage: disableWelcomeMessage,
            v2Mode: v2Mode,
            disableSensorGraph: disableSensorGraph,
            invertCover: invertCover,
            weatherEntity: weatherEntity,
            alarmEntity: alarmEntity,
          }, false, '');
      }, 50);
    }

    _handleAreaViewDisplayGroupedClicked(ev){
      ev.stopPropagation();

      const value = ev.currentTarget.value;
      this.areaViewDisplayGrouped = value;
      Cookies.set('dwains_dashboard_areaViewDisplayGrouped', value, { expires: 365 });
    }

    _handleAreaDisplayGroupedClicked(ev){
      ev.stopPropagation();

      const value = ev.currentTarget.value;
      this.areaDisplayGrouped = value;
      Cookies.set('dwains_dashboard_areaDisplayGrouped', value, { expires: 365 });
    }

    _handleFavoriteEditModeClicked(ev){
      ev.stopPropagation();
      const value = ev.currentTarget.value;

      if(value){
        this._sortable = [];
        const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
        for(var i=0; i<sortableElements.length; i++){
          this._sortable[i] = new Sortable(sortableElements[i], {
              forceFallback: true,
              animation: 150,
              dataIdAttr: "data-entity",
              handle: '.sortable-move',
              onEnd: function(event){
                console.log(event);
                hass().connection.sendMessagePromise({
                    type: 'dwains_dashboard/sort_entity',
                    sortData: JSON.stringify(this.toArray()),
                    sortType: 'favorite_sort_order',
                  }).then(
                      (resp) => {
                          console.log(resp);
                      },
                      (err) => {
                          console.error('Message failed!', err);
                      }
                  );
              }
          });
        }
      } else {
        this._sortable.forEach(sortElement => sortElement.destroy());
        this._sortable = undefined;
      }
      this.favoriteEditMode = value;
    }

    _handleAreaEditModeClicked(ev){
      ev.stopPropagation();
      const value = ev.currentTarget.value;

      if(value){
        this._sortable = [];
        const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
        for(var i=0; i<sortableElements.length; i++){
          const sortType = (this.areaDisplayGrouped ? 'grouped_sort_order' : 'sort_order');
          this._sortable[i] = new Sortable(sortableElements[i], {
              forceFallback: true,
              animation: 150,
              dataIdAttr: "data-area-id",
              handle: '.sortable-move',
              onEnd: function(event){
                console.log(event);
                hass().connection.sendMessagePromise({
                    type: 'dwains_dashboard/sort_area_button',
                    sortData: JSON.stringify(this.toArray()),
                    sortType: sortType
                  }).then(
                      (resp) => {
                          console.log(resp);
                      },
                      (err) => {
                          console.error('Message failed!', err);
                      }
                  );
              }
          });
        }
      } else {
        this._sortable.forEach(sortElement => sortElement.destroy());
        this._sortable = undefined;
      }
      this.areaEditMode = value;
    }

    _handleAreaViewEditModeClicked(ev){
      ev.stopPropagation();
      const value = ev.currentTarget.value;

      if(value){
        this._sortable = [];
        const sortableElements = this.shadowRoot.querySelectorAll('.sortable');
        for(var i=0; i<sortableElements.length; i++){
          const sortType = (this.areaViewDisplayGrouped ? 'grouped_sort_order' : 'sort_order');
          this._sortable[i] = new Sortable(sortableElements[i], {
              forceFallback: true,
              animation: 150,
              dataIdAttr: "data-entity",
              handle: '.sortable-move',
              onEnd: function(event){
                hass().connection.sendMessagePromise({
                    type: 'dwains_dashboard/sort_entity',
                    sortData: JSON.stringify(this.toArray()),
                    sortType: sortType
                  }).then(
                      (resp) => {
                          console.log(resp);
                      },
                      (err) => {
                          console.error('Message failed!', err);
                      }
                  );
              }
          });
        }
      } else {
        this._sortable.forEach(sortElement => sortElement.destroy());
        this._sortable = undefined;
      }
      this.areaViewEditMode = value;
    }

    _handleCustomCardEditClick(ev){
      ev.stopPropagation();
      const areaId = ev.currentTarget.area_id;
      const filename = ev.currentTarget.filename;

      const loader = document.createElement("hui-masonry-view");
      loader.lovelace = { editMode: true };
      loader.willUpdate(new Map());

      const colSpan = ev.currentTarget.colSpan;
      const rowSpan = ev.currentTarget.rowSpan;
      const colSpanLg = ev.currentTarget.colSpanLg;
      const rowSpanLg = ev.currentTarget.rowSpanLg;
      const colSpanXl = ev.currentTarget.colSpanXl;
      const rowSpanXl = ev.currentTarget.rowSpanXl;

      const cardConfig = this.configuration.area_cards[areaId][filename];
      var position = "top";
      if(cardConfig["position"]){
        //Config has the DD position key, but editor doesnt understand that so remove it and parse it to editor
        position = cardConfig["position"];
        delete cardConfig["position"];
      }

      delete cardConfig["col_span"];
      delete cardConfig["row_span"];
      delete cardConfig["col_span_lg"];
      delete cardConfig["row_span_lg"];
      delete cardConfig["col_span_xl"];
      delete cardConfig["row_span_xl"];

      window.setTimeout(() => {

        popUp(this._hass.localize("ui.components.entity.entity-picker.edit"), {
          type: "custom:dwains-create-custom-card-card",
          area: areaId,
          mode: "editor-element",
          page: "areas",
          cardConfig: cardConfig,
          position: position,
          filename: filename,
          colSpan: colSpan,
          rowSpan: rowSpan,
          colSpanLg: colSpanLg,
          rowSpanLg: rowSpanLg,
          colSpanXl: colSpanXl,
          rowSpanXl: rowSpanXl,
          }, true, '');
      }, 50);
    }

    _renderAreaButtons(data){
      if(!this.areaDisplayGrouped){
        return html`
          <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration['homepage_header']['v2_mode'] ? "lg-grid-cols-4 xl-grid-cols-5" : ""} gap-4 sortable">
            ${data.map((i) => this._renderAreaButton(i))}
          </div>`;
      } else {
        //Sort by floor
        data.sort(function (x, y) {
          let a = x.floor,
              b = y.floor;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        data.sort(function (x, y) {
          let a = x.grouped_sort_order,
              b = y.grouped_sort_order;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        let group = data.reduce((r, a) => {
          //console.log("a", a);
          //console.log('r', r);
          r[a.floor] = [...r[a.floor] || [], a];
          return r;
         }, {});
        //console.log("group", group);


        return html`
        <div>
        ${Object.keys(group).map((key) =>
          html`
            <div class="mb-5">
              <h3 class="font-semibold capitalize text-gray">${key.replace(/_/g, " ")}</h3>
              <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration['homepage_header']['v2_mode'] ? "lg-grid-cols-4 xl-grid-cols-5" : ""} gap-4 sortable">
              ${Object.entries(group[key]).map(([k,v]) => html`${this._renderAreaButton(v)}`)}
              </div>
            </div>
          `
        )}
        </div>
        `;
      }
    }
    _renderAreaButtonCard(area, type) {
      return html`
        <div>
          <ha-card class="p-2">
            ${translateEngine(this._hass, 'area.title')}:<br>
            <span class="break-words">
            ${area.name}
            </span>
          </ha-card>
          <ha-card>
            <div class="card-actions">
              <ha-button
                .areaId="${area.area_id}"
                .key=${"disabled"}
                .value=${false}
                @click=${this._handleAreaEditBoolValueClick}
              >
                ${translateEngine(this._hass, 'area.enable')}
              </ha-button>
            </div>
          </ha-card>
        </div>
      `;
    }
    _renderAreaButton(data){
      const entitiesByDomain = this._entitiesByDomain(
        data.entities
      );

      //console.log(entitiesByDomain);

      const sensors = [];
      SENSOR_DOMAINS.forEach((domain) => {
        if (!(domain in entitiesByDomain)) {
          return;
        }
        DEVICE_CLASSES[domain].forEach((deviceClass) => {
          if (
            entitiesByDomain[domain].some(
              (entity) => entity.attributes.device_class === deviceClass
            )
          ) {
            sensors.push(
              this._average(entitiesByDomain, domain, deviceClass)
            );
          }
        });
      });

      return html`
        <div class="relative" data-area-id='${data.area.area_id}'>
          <div
            class="flex justify-between h-44 p-3 area-button ${this.selectedArea == data.area.area_id && !this.configuration['homepage_header']['v2_mode'] ? 'current' : ''}"
            data-area-id='${data.area.area_id}'
            @click=${this._handleAreaClick}
            .lightState=${this._isOn(entitiesByDomain, 'light')}
            @dblclick="${this._handleAreaDoubleClick}"
          >
            <div class="h-full flex flex-wrap content-between">
              <div class="w-full ha-icon">
                ${this.configuration['areas'][data.area.area_id] && this.configuration['areas'][data.area.area_id]['icon'] ? html`
                  <ha-icon
                    class="h-14 w-14"
                    style="color: var(--primary-color);"
                    .hass=${this._hass}
                    .icon=${this.configuration['areas'][data.area.area_id]['icon']}
                  ></ha-icon>` : ""}
              </div>
              <div class="w-full">
                <h3 class="font-semibold text-lg">${data.area.name}</h3>
                ${sensors.length
                  ? html`
                    <div class="sensors text-gray">
                      ${sensors.join(" - ")}
                    </div>`
                  : ""
                }
                <span class="text-gray text-sm capitalize">${this._climateState(entitiesByDomain, 'climate')}</span>
              </div>
            </div>
            <div class="row-span-2 text-right space-y-0.5 info">
              ${TOGGLE_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }
                const on = this._isOn(entitiesByDomain, domain);
                if(domain == 'light' || domain != 'light' && on){
                  return TOGGLE_DOMAINS.includes(domain)
                    ? html`
                      <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                        <ha-icon
                          class="${on ? 'on' : 'off'} w-6 h-6 mr-0.5"
                          .icon=${DOMAIN_STATE_ICONS[domain][on ? "on" : "off"]}
                          .domain=${domain}
                          .area_id=${data.area.area_id}
                          .state=${on}
                          @click=${this._toggle}
                        >
                        </ha-icon>
                        ${on}
                      </span><br>
                      `
                    : "";
                }
              })}
              ${ALERT_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }
                return DEVICE_CLASSES[domain].map((deviceClass) => {
                  const isOn = this._isOn(entitiesByDomain, domain, deviceClass);
                  if(isOn){
                    return html`
                      ${DOMAIN_STATE_ICONS[domain][deviceClass]
                        ? html`
                          <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                            <ha-icon
                              class="w-6 h-6 mr-0.5"
                              .icon=${DOMAIN_STATE_ICONS[domain][deviceClass]}
                            ></ha-icon> ${isOn}
                          </span><br>`
                        : ""}
                    `
                  }
                });
              })}
              ${COVER_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }
                return DEVICE_CLASSES[domain].map((deviceClass) => {
                  const isOn = this._isOn(entitiesByDomain, domain, deviceClass);
                  if(isOn){
                    return html`
                      ${DOMAIN_STATE_ICONS[domain][deviceClass]
                        ? html`
                          <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                            <ha-icon
                              class="w-6 h-6 mr-0.5"
                              .icon=${DOMAIN_STATE_ICONS[domain][deviceClass]}
                            ></ha-icon> ${isOn}
                          </span><br>`
                        : ""}
                    `
                  }
                });
              })}
              ${OTHER_DOMAINS.map((domain) => {
                if (!(domain in entitiesByDomain)) {
                  return "";
                }
                const isOn = this._isOn(entitiesByDomain, domain);
                if(isOn){
                  return OTHER_DOMAINS.includes(domain)
                    ? html`
                      <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                        <ha-icon
                          class="${isOn ? 'on' : 'off'} w-6 h-6 mr-0.5"
                          .icon=${DOMAIN_STATE_ICONS[domain][isOn ? "on" : "off"]}
                        >
                        </ha-icon>
                        ${isOn}
                      </span><br>
                      `
                    : "";
                }
              })}
            </div>
          </div>
          ${this.areaEditMode ? html`
            <ha-card>
              <div class="card-actions-multiple">
                <div class="sortable-move">
                  <ha-icon
                    .icon=${"mdi:cursor-move"}
                  >
                  </ha-icon>
                </div>
                <ha-button
                  .area_id=${data.area.area_id}
                  .area_icon=${this.configuration['areas'][data.area.area_id] && this.configuration['areas'][data.area.area_id]['icon'] ? this.configuration['areas'][data.area.area_id]['icon']: ""}
                  .floor=${this.configuration['areas'][data.area.area_id] && this.configuration['areas'][data.area.area_id]['floor'] ? this.configuration['areas'][data.area.area_id]['floor']: ""}
                  .disable_area=${this.configuration['areas'][data.area.area_id] && this.configuration['areas'][data.area.area_id]['disable_area'] ? this.configuration['areas'][data.area.area_id]['disable_area']: false}

                  @click=${this._handleAreaEditClick}
                >
                  ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                </ha-button>
              </div>
            </ha-card>
            ` : ""}
        </div>
      `;
    }


    _renderAreaViewCustomCards(data, position){
      return html`
      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 my-4">
        ${position == "bottom" ?  data.customCardsBottom.map((i) =>
          html`${this._renderAreaViewCustomCard(i)}`
        ) : data.customCardsTop.map((i) =>
          html`${this._renderAreaViewCustomCard(i)}`
        )}
      </div>
      `;
    }
	    _renderAreaViewCustomCard(data){
	      return html`
	      <div class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg} xl-col-span-${data.colSpanXl} xl-row-span-${data.rowSpanXl} relative">
	        <div>
	          <dd-lazy-card .card=${data.card}></dd-lazy-card>
	        </div>
        ${this.areaViewEditMode ? html`
        <ha-card>
          <div class="card-actions">
            <ha-button
              @click=${this._handleCustomCardEditClick}
              .area_id=${data.area_id}
              .filename=${data.filename}
              .rowSpan=${data.rowSpan}
              .colSpan=${data.colSpan}
              .rowSpanLg=${data.rowSpanLg}
              .colSpanLg=${data.colSpanLg}
              .rowSpanXl=${data.rowSpanXl}
              .colSpanXl=${data.colSpanXl}
            >
            ${this._hass.localize("ui.components.entity.entity-picker.edit")}
            </ha-button>
          </div>
        </ha-card>` : ""}
      </div>
      `;
    }

	    _hideUnavailableEntitiesEnabled(){
	      return !!(this.configuration && this.configuration.homepage_header && this.configuration.homepage_header.hide_unavailable_entities);
	    }

	    _filterUnavailableCards(cards){
	      if(this.areaViewEditMode || this.favoriteEditMode || !this._hideUnavailableEntitiesEnabled()){
	        return cards;
	      }
	      return cards.filter((card) => {
	        const stateObj = this._hass.states[card.entity];
	        return !(stateObj && stateObj.state === "unavailable");
	      });
	    }

	    _renderAreaViewCards(data){
	      const cards = this._filterUnavailableCards(data.cards);
	      if(!this.areaViewDisplayGrouped){
	        cards.sort(function (x, y) {
	          let a = x.sort_order,
	              b = y.sort_order;
	          return a == b ? 0 : a > b ? 1 : -1;
	        });

	        return html`
	        <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable dd-masonry">
	          ${cards.map((i) =>
	            html`${this._renderAreaViewCard(i)}`
	          )}
	        </div>
	        `;
	      } else {
	        let group = cards.reduce((r, a) => {
          //console.log("a", a);
          //console.log('r', r);
          r[a.domain] = [...r[a.domain] || [], a];
          return r;
         }, {});
        //console.log("group", group);

        let sortedGroup = Object.keys(group).sort((x,y) => {
          let a = this.configuration['devices'][x] && this.configuration['devices'][x]['sort_order'] ? this.configuration['devices'][x]['sort_order'] : 99,
              b = this.configuration['devices'][y] && this.configuration['devices'][y]['sort_order'] ? this.configuration['devices'][y]['sort_order'] : 99;
          return a == b ? 0 : a > b ? 1 : -1;
         });

        //console.log("sortedgroup", sortedGroup);

	        cards.sort(function (x, y) {
          let a = x.grouped_sort_order,
              b = y.grouped_sort_order;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        //console.log(group);

        return html`
        <div>
        ${sortedGroup.map((key) =>
          html`
            <div class="mb-5">
              <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass, 'device.'+key)}</h3>
              <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
                ${Object.entries(group[key]).map(([k,v]) => html`${this._renderAreaViewCard(v)}`)}
              </div>
            </div>
          `
        )}
        </div>
        `;
      }
    }
    _renderAreaViewCard(data){
      return html`
	      <div
	        data-entity='${data.entity}'
	        class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg} xl-col-span-${data.colSpanXl} xl-row-span-${data.rowSpanXl} relative"
	      >
	        <div>
	          <dd-lazy-card .card=${data.card}></dd-lazy-card>
	        </div>
        ${this.areaViewEditMode ? html`
        <ha-card>
          <div class="card-actions-multiple">
            <div class="sortable-move">
              <ha-icon
                .icon=${"mdi:cursor-move"}
              >
              </ha-icon>
            </div>
            <ha-dropdown
              class="ha-icon-overflow-menu-overflow"
              corner="BOTTOM_START"
              absolute
            >
              <ha-icon-button
                .label=${this._hass.localize("ui.common.overflow_menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>
                <ha-list-item
                  graphic="icon"
                  .entity="${data.entity}"
                  .friendlyName="${data.friendlyName}"
                  .disableEntity=${data.disableEntity}
                  .hideEntity=${data.hideEntity}
                  .excludeEntity=${data.excludeEntity}
                  .rowSpan=${data.rowSpan}
                  .colSpan=${data.colSpan}
                  .rowSpanLg=${data.rowSpanLg}
                  .colSpanLg=${data.colSpanLg}
                  .rowSpanXl=${data.rowSpanXl}
                  .colSpanXl=${data.colSpanXl}
                  .customCard=${data.customCard}
                  .customPopup=${data.customPopup}
                  @click=${this._handleEntityEditClick}
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:cog"}></ha-icon>
                  </div>
                  ${translateEngine(this._hass, 'entity.settings')}
                </ha-list-item>
                ${data.entity != 't' ? html `
                  <ha-list-item
                    graphic="icon"
                    .entity="${data.entity}"
                    @click="${this._handleEntityEditCardClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                    </div>
                    ${translateEngine(this._hass, 'entity.entity_card')}
                  </ha-list-item>` : ""
                }
                ${data.entity != 't' ? html `
                  <ha-list-item
                    graphic="icon"
                    .entity="${data.entity}"
                    @click="${this._handleEntityEditPopupClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                    </div>
                    ${translateEngine(this._hass, 'entity.popup_card')}
                  </ha-list-item>` : ""
                }
                ${!data.isFavorite ? html `
                  <ha-list-item
                    graphic="icon"
                    .entity="${data.entity}"
                    @click="${this._handleEntityAddToFavoritesClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:tag-heart"}></ha-icon>
                    </div>
                    ${translateEngine(this._hass, 'entity.add_to_favorites')}
                  </ha-list-item>` : ""
                }
                <ha-list-item
                  graphic="icon"
                  .entity="${data.entity}"
                  .key=${"excluded"}
                  .value=${true}
                  @click=${this._handleEntityEditBoolValueClick}
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:table-eye-off"}></ha-icon>
                  </div>
                  ${translateEngine(this._hass, 'entity.exclude')}
                </ha-list-item>
                <ha-list-item
                  graphic="icon"
                  .entity="${data.entity}"
                  .key=${"hidden"}
                  .value=${true}
                  @click=${this._handleEntityEditBoolValueClick}
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:eye-off"}></ha-icon>
                  </div>
                  ${translateEngine(this._hass, 'entity.hide')}
                </ha-list-item>
                <ha-list-item
                  graphic="icon"
                  .entity="${data.entity}"
                  .key=${"disabled"}
                  .value=${true}
                  @click=${this._handleEntityEditBoolValueClick}
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:tray-remove"}></ha-icon>
                  </div>
                  ${translateEngine(this._hass, 'entity.disable')}
                </ha-list-item>
            </ha-dropdown>
          </div>
        </ha-card>` : ""}
      </div>
      `;
    }
    _renderAreaViewEntityCard(entity, type) {
      return html`
        <div>
          <ha-card class="p-2">
            ${translateEngine(this._hass, 'entity.title')}:<br>
            <span class="break-words">
            ${entity}
            </span>
          </ha-card>
          <ha-card>
            <div class="card-actions">
              ${type == 'hidden' ? html`
              <ha-button
                .entity="${entity}"
                .key=${"hidden"}
                .value=${false}
                @click=${this._handleEntityEditBoolValueClick}
              >
                ${translateEngine(this._hass, 'entity.unhide')}
              </ha-button>`: ""}
              ${type == 'disabled' ? html`
              <ha-button
                .entity="${entity}"
                .key=${"disabled"}
                .value=${false}
                @click=${this._handleEntityEditBoolValueClick}
              >
                ${translateEngine(this._hass, 'entity.enable')}
              </ha-button>`: ""}
            </div>
          </ha-card>
        </div>
      `;
    }

    _renderAreaView(data){
        //Make the cards grid
        // var outObject = data.cards.reduce(function(a, e) {
        //   // GROUP BY estimated key (estKey), well, may be a just plain key
        //   // a -- Accumulator result object
        //   // e -- sequentally checked Element, the Element that is tested just at this itaration

        //   // new grouping name may be calculated, but must be based on real value of real field
        //   let estKey = (e['domain']);

        //   (a[estKey] ? a[estKey] : (a[estKey] = null || [])).push(e);
        //   return a;
        // }, {});
        // Object.keys(outObject).forEach((key, index) => {
        //     //console.log(`${key}: ${outObject[key]}`);
        //     outObject[key].map(child => console.log(child));
        // });

	        this.__ddVisited = this.__ddVisited || {};
	        if(this.selectedArea == data.area.area_id){
	          this.__ddVisited[data.area.area_id] = true;
	        }

	        if(!this.__ddVisited[data.area.area_id]){
	          return html``;
	        }

        const visible = this.selectedArea == data.area.area_id ? "block" : "hidden";

        data.cards.sort(function (x, y) {
          let a = x.domain,
              b = y.domain;
          return a == b ? 0 : a > b ? 1 : -1;
        });

        return html`
          <div class="w-full mb-12 ${visible}" id="${data.area.area_id}">
            <div class="flex justify-between">
              <div class="sticky top-0">
                <h2 class="font-semibold text-lg">
                  ${data.area.name}
                </h2>
                <span class="text-gray">
                  ${data.cards.length} ${translateEngine(this._hass, 'entity.title_plural')}
                </span>
              </div>
              <div>
                <ha-dropdown
                  class="ha-icon-overflow-menu-overflow"
                  corner="BOTTOM_START"
                  absolute
                >
                  <ha-icon-button
                    .label=${this._hass.localize("ui.common.overflow_menu")}
                    .path=${mdiDotsVertical}
                    slot="trigger"
                  ></ha-icon-button>
                    ${!this.areaViewDisplayGrouped ? html `
                      <ha-list-item
                        graphic="icon"
                        .value=${true}
                        @click=${this._handleAreaViewDisplayGroupedClicked}
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                        </div>
                        ${translateEngine(this._hass, 'entity.group')}
                      </ha-list-item>` : html `
                      <ha-list-item
                        graphic="icon"
                        .value=${false}
                        @click=${this._handleAreaViewDisplayGroupedClicked}
                      >
                        <div slot="graphic">
                        <ha-icon .icon=${"mdi:grid"}></ha-icon>
                        </div>
                        ${translateEngine(this._hass, 'entity.ungroup')}
                      </ha-list-item>
                      `
                    }
                    ${this._hass.user.is_admin ? html`
                      ${this.areaViewEditMode ? html `
                        <ha-list-item
                          graphic="icon"
                          .value=${false}
                          @click=${this._handleAreaViewEditModeClicked}
                        >
                          <div slot="graphic">
                            <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                          </div>
                          ${translateEngine(this._hass, 'global.disable_edit_mode')}
                        </ha-list-item>` : html `
                        <ha-list-item
                          graphic="icon"
                          .value=${true}
                          @click=${this._handleAreaViewEditModeClicked}
                        >
                          <div slot="graphic">
                            <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                          </div>
                          ${translateEngine(this._hass, 'global.enable_edit_mode')}
                        </ha-list-item>
                        `
                      }
                    ` : ""}
                </ha-dropdown>
              </div>
            </div>

            ${this.areaViewEditMode ? html `
            <ha-card class="card-actions-centered">
              <ha-button
                .area=${data.area.area_id}
                .key=${"disabled"}
                .value=${true}
                @click=${this._handleAreaDisableAllEntitiesClicked}
              >
                ${translateEngine(this._hass, 'entity.disable_all')}
              </ha-button>
              <ha-button
                .area=${data.area.area_id}
                .key=${"hidden"}
                .value=${true}
                @click=${this._handleAreaDisableAllEntitiesClicked}
              >
                ${translateEngine(this._hass, 'entity.hide_all')}
              </ha-button>
            </ha-card>

            <button type="button"
              @click=${this._addLovelaceCard}
              .area=${data.area.area_id}
              .areaName=${data.area.name}
              .position=${"top"}
              class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span class="mt-2 block text-sm font-medium text-gray">
                ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
              </span>
            </button>` : "" }

            ${this._renderAreaViewCustomCards(data, "top")}

            ${this._renderAreaViewCards(data)}

            ${this._renderAreaViewCustomCards(data, "bottom")}

            ${this.areaViewEditMode ? html `
              ${data.entitiesNoState.length ? html`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass, 'entity.unavailable')}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                  ${data.entitiesNoState.map((entity) =>
                      html`${this._renderAreaViewEntityCard(entity, 'noState')}`
                  )}
                  </div>
                </div>` : ""
              }
              ${data.entitiesHidden.length ? html`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass, 'entity.hidden')}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                  ${data.entitiesHidden.map((entity) =>
                      html`${this._renderAreaViewEntityCard(entity, 'hidden')}`
                  )}
                  </div>
                </div>` : ""
              }
              ${data.entitiesDisabled.length ? html`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass,'entity.disabled')}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                  ${data.entitiesDisabled.map((entity) =>
                      html`${this._renderAreaViewEntityCard(entity, 'disabled')}`
                  )}
                  </div>
                </div>` : ""
              }
            `: ""}

            ${this.areaViewEditMode ? html `
            <button type="button"
              @click=${this._addLovelaceCard}
              .area=${data.area.area_id}
              .areaName=${data.area.name}
              .position=${"bottom"}
              class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span class="mt-2 block text-sm font-medium text-gray">
                ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
              </span>
            </button>` : "" }
          </div>`;
    }

	    _renderFavoriteViewCard(data){
	      return html`
	      <div data-entity='${data.entity}' class="col-span-${data.colSpan} row-span-${data.rowSpan} lg-col-span-${data.colSpanLg} lg-row-span-${data.rowSpanLg}  relative">
	        <div>
	          <dd-lazy-card .card=${data.card}></dd-lazy-card>
	        </div>
        ${this.favoriteEditMode ? html`
        <ha-card>
          <div class="card-actions-multiple">
            <div class="sortable-move">
              <ha-icon
                .icon=${"mdi:cursor-move"}
              >
              </ha-icon>
            </div>
            <ha-dropdown
              class="ha-icon-overflow-menu-overflow"
              corner="BOTTOM_START"
              absolute
            >
              <ha-icon-button
                .label=${this._hass.localize("ui.common.overflow_menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>
                <ha-list-item
                  graphic="icon"
                  .entity="${data.entity}"
                  .friendlyName="${data.friendlyName}"
                  .disableEntity=${data.disableEntity}
                  .hideEntity=${data.hideEntity}
                  .excludeEntity=${data.excludeEntity}
                  .rowSpan=${data.rowSpan}
                  .colSpan=${data.colSpan}
                  .rowSpanLg=${data.rowSpanLg}
                  .colSpanLg=${data.colSpanLg}
                  .rowSpanXl=${data.rowSpanXl}
                  .colSpanXl=${data.colSpanXl}
                  .customCard=${data.customCard}
                  .customPopup=${data.customPopup}
                  @click=${this._handleEntityEditClick}
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:cog"}></ha-icon>
                  </div>
                  ${translateEngine(this._hass, 'entity.settings')}
                </ha-list-item>
                ${data.entity != 't' ? html `
                  <ha-list-item
                    graphic="icon"
                    .entity="${data.entity}"
                    @click="${this._handleEntityEditCardClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                    </div>
                    ${translateEngine(this._hass, 'entity.entity_card')}
                  </ha-list-item>` : ""
                }
                ${data.entity != 't' ? html `
                  <ha-list-item
                    graphic="icon"
                    .entity="${data.entity}"
                    @click="${this._handleEntityEditPopupClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                    </div>
                    ${translateEngine(this._hass, 'entity.popup_card')}
                  </ha-list-item>` : ""
                }
                <ha-list-item
                  graphic="icon"
                  .entity="${data.entity}"
                  @click="${this._handleEntityRemoveFromFavoritesClick}"
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:tag-heart"}></ha-icon>
                  </div>
                  ${translateEngine(this._hass, 'entity.remove_from_favorites')}
                </ha-list-item>
            </ha-dropdown>
          </div>
        </ha-card>` : ""}
      </div>
      `;
    }
    _renderFavorites(){
      if(this.favorites.length == 0){
        return html``;
      }
      this.favorites.sort(function (x, y) {
        let a = x.favorite_sort_order,
            b = y.favorite_sort_order;
        return a == b ? 0 : a > b ? 1 : -1;
      });
      return html`
        <div id="favorites" class="mt-4">
          <div class="flex justify-between mb-2">
            <div>
              <h2 class="font-semibold text-lg">
                ${translateEngine(this._hass, 'favorite.title_plural')}
              </h2>
              <span class="text-gray">
                ${translateEngine(this._hass, 'favorite.all_favorites')}
              </span>
            </div>
            <div>
              ${this._hass.user.is_admin ? html`
              <ha-dropdown
                class="ha-icon-overflow-menu-overflow"
                corner="BOTTOM_END"
                absolute
              >
                <ha-icon-button
                  .label=${this._hass.localize("ui.common.overflow_menu")}
                  .path=${mdiDotsVertical}
                  slot="trigger"
                ></ha-icon-button>
                  ${this.favoriteEditMode ? html `
                    <ha-list-item
                      graphic="icon"
                      .value=${false}
                      @click=${this._handleFavoriteEditModeClicked}
                    >
                      <div slot="graphic">
                        <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                      </div>
                      ${translateEngine(this._hass, 'global.disable_edit_mode')}
                    </ha-list-item>` : html `
                    <ha-list-item
                      graphic="icon"
                      .value=${true}
                      @click=${this._handleFavoriteEditModeClicked}
                    >
                      <div slot="graphic">
                        <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                      </div>
                      ${translateEngine(this._hass, 'global.enable_edit_mode')}
                    </ha-list-item>
                    `
                  }
              </ha-dropdown>
              `: ""}
            </div>
          </div>
          <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4 sortable">
            ${this.favorites.map((i) =>
              html`${this._renderFavoriteViewCard(i)}`
            )}
          </div>
        </div>
        `;
    }

    render() {
      //console.log('render()');
      if(this.data == null || this.data.length === 0 ){
        return html``;
      } else {
        //Clock
        var d = new Date(),
        h = (d.getHours() < 10 ? "0" : "") + d.getHours(),
        m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes(),
        dateNice = d.toLocaleDateString(this._hass.locale.language, { weekday: 'long', month: 'short', day: 'numeric' }),
        greeting,
        currTimeAmPm = h >= 12 ? `${h - 12}:${m} pm` : `${h}:${m} am`;

        if(d.getHours() < 12){
          //Morning
          greeting = translateEngine(this._hass,'global.greeting_morning');
        } else if(d.getHours() < 18){
          //Afternoon
          greeting = translateEngine(this._hass,'global.greeting_afternoon');
        } else {
          //Evening
          greeting = translateEngine(this._hass,'global.greeting_evening');
        }

        //Weather
        let weatherEntity, weatherState, weatherIcon, weatherStateTranslated, weatherTemperature;
        if(this.configuration['homepage_header']['weather_entity']){
          weatherEntity = this.configuration['homepage_header']['weather_entity'];
          weatherState = this._hass.states[weatherEntity];
          if(weatherState){
            weatherIcon = WEATHER_ICONS[weatherState.state];

            const lang = this._hass.selectedLanguage || this._hass.language;
            const resources = this._hass.resources && this._hass.resources[lang] ? this._hass.resources[lang] : {};
            weatherStateTranslated = resources["component.weather.entity_component._.state." + weatherState.state]
              || this._hass.localize(`component.weather.entity_component._.state.${weatherState.state}`)
              || weatherState.state;

            weatherTemperature = weatherState.attributes.temperature + this._hass.config.unit_system['temperature'];
          }
        }

        //Alarm
        let alarmEntity, alarmState, alarmStateTranslated, alarmIcon;
        if(this.configuration['homepage_header']['alarm_entity']){
          alarmEntity = this.configuration['homepage_header']['alarm_entity'];
          alarmState = this._hass.states[alarmEntity].state;
          if(alarmState){
            alarmIcon = ALARM_ICONS[alarmState];
            //console.log(alarmIcon);
            alarmStateTranslated = this._hass.localize(`component.alarm_control_panel.state._.${alarmState}`);
          }
        }

        return html`
            <div class="flex flex-wrap">
              <div class="w-full ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-w-1-2 xl-w-1-3"} ${window.location.hash ? (this.configuration['homepage_header']['v2_mode'] ? "hidden" : "hidden lg-block") : ""} p-4">
                <div class="flex justify-between mb-2">
                  <div>
                    ${this.configuration['homepage_header']['alarm_entity'] ? html`
                      <div class="area-button py-1 px-2" .entity=${this.configuration['homepage_header']['alarm_entity']} @click=${this._handleMoreInfo}>
                        <ha-icon icon="${alarmIcon}"></ha-icon> ${alarmStateTranslated}
                      </div>`: ""
                    }
                  </div>

                  <div id="weather">
                    ${this.configuration['homepage_header']['weather_entity'] ? html`
                      <div class="area-button py-1 px-2" .entity=${this.configuration['homepage_header']['weather_entity']} @click=${this._handleMoreInfo}>
                        <ha-icon icon="${weatherIcon}"></ha-icon> ${weatherStateTranslated}, ${weatherTemperature}
                      </div>`: ""
                    }
                  </div>

                  <div>
                    ${this._hass.user.is_admin ? html`
                      <div
                        class="p-1 ha-icon cursor-pointer"
                        .disableClock=${this.configuration['homepage_header']['disable_clock'] ? true : false}
                        .amPmClock=${this.configuration['homepage_header']['am_pm_clock'] ? true : false}
                        .disableWelcomeMessage=${this.configuration['homepage_header']['disable_welcome_message'] ? true : false}
                        .v2Mode=${this.configuration['homepage_header']['v2_mode'] ? true : false}
                        .disableSensorGraph=${this.configuration['homepage_header']['disable_sensor_graph'] ? true : false}
                        .weatherEntity=${this.configuration['homepage_header']['weather_entity'] ? this.configuration['homepage_header']['weather_entity'] : ""}
                        .alarmEntity=${this.configuration['homepage_header']['alarm_entity'] ? this.configuration['homepage_header']['alarm_entity']: ""}
                        @click=${this._handleDwainsDashboardSettingsClick}
                      >
                        <ha-icon class="w-6 h-6" .icon=${"mdi:cog"}></ha-icon>
                      </div>
                    ` : ""}
                  </div>
                </div>
                <div class="mb-4 grid grid-cols-1 lg-grid-cols-2">
                  <div>
                    ${this.configuration['homepage_header']['disable_welcome_message'] ? '' : html`<h1 class="font-semibold text-xl">${greeting}, ${this._hass.user.name}</h1>`}
                    ${this.notificationCard}
                  </div>
                  ${this.configuration['homepage_header']['disable_clock'] ? "" : html`
                    <div class="text-right">
                      <div id="clock" class="mb-2 hidden lg-block">
                        <h2 class="font-semibold text-xl">${this.configuration['homepage_header']['am_pm_clock'] ? html`${currTimeAmPm}` : html`${h}:${m}`}</h2>
                        <span class="text-gray capitalize">${dateNice}</span>
                      </div>
                    </div>`
                  }
                </div>

                ${this.badgesCard}

                ${this._renderFavorites()}

                <div id="areas" class="mt-4">
                  <div class="flex justify-between mb-2">
                    <div>
                      <h2 class="font-semibold text-lg capitalize">
                        ${translateEngine(this._hass, 'area.title_plural')}
                      </h2>
                      <span class="text-gray">
                        ${this.data.length} ${translateEngine(this._hass, 'area.title_plural')}
                      </span>
                    </div>
                    <div>
                      <ha-dropdown
                        class="ha-icon-overflow-menu-overflow"
                        corner="BOTTOM_END"
                        absolute
                      >
                        <ha-icon-button
                          .label=${this._hass.localize("ui.common.overflow_menu")}
                          .path=${mdiDotsVertical}
                          slot="trigger"
                        ></ha-icon-button>
                          ${!this.areaDisplayGrouped ? html `
                            <ha-list-item
                              graphic="icon"
                              .value=${true}
                              @click=${this._handleAreaDisplayGroupedClicked}
                            >
                              <div slot="graphic">
                                <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                              </div>
                              ${translateEngine(this._hass, 'area.group_by_floor')}
                            </ha-list-item>` : html `
                            <ha-list-item
                              graphic="icon"
                              .value=${false}
                              @click=${this._handleAreaDisplayGroupedClicked}
                            >
                              <div slot="graphic">
                              <ha-icon .icon=${"mdi:grid"}></ha-icon>
                              </div>
                              ${translateEngine(this._hass, 'area.ungroup_by_floor')}
                            </ha-list-item>
                            `
                          }
                          ${this._hass.user.is_admin ? html`
                            ${!this.areaEditMode ? html `
                              <ha-list-item
                                graphic="icon"
                                .value=${true}
                                @click=${this._handleAreaEditModeClicked}
                              >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                                </div>
                                ${translateEngine(this._hass, 'global.enable_edit_mode')}
                              </ha-list-item>` : html `
                              <ha-list-item
                                graphic="icon"
                                .value=${false}
                                @click=${this._handleAreaEditModeClicked}
                              >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${mdiCog}></ha-svg-icon>
                                </div>
                                ${translateEngine(this._hass, 'global.disable_edit_mode')}
                              </ha-list-item>
                              `
                            }
                          ` : ""}
                      </ha-dropdown>
                    </div>
                  </div>

                  ${this._renderAreaButtons(this.data)}

                  ${this.areaEditMode ? html `
                    ${this.disabledAreas.length ? html`
                      <div class="mb-5">
                        <h3 class="font-semibold capitalize text-gray">${translateEngine(this._hass,'area.disabled')}</h3>
                        <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                        ${this.disabledAreas.map((area) =>
                            html`${this._renderAreaButtonCard(area, 'disabled')}`
                        )}
                        </div>
                      </div>` : ""
                    }
                  `: ""}
                </div>
              </div>
              <div class="w-full ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-w-1-2 xl-w-2-3"} ${!window.location.hash ? (this.configuration['homepage_header']['v2_mode'] ? "hidden" : "hidden lg-block") : ""} p-4">
                ${this.data.map((i) => this._renderAreaView(i))}
              </div>
            </div>
            <div class="sticky z-30 bottom-0 ${!window.location.hash ? "hidden" : ""} ${this.configuration['homepage_header']['v2_mode'] ? "" : "lg-hidden"} text-right">
              <div @click=${this._backButtonClick} class="back-button">
                  <div class="button">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  </div>
              </div>
            </div>
        `;
      }
    }

    static get styles() {
      return css`
        .back-button {
          margin-right: 1rem;
          margin-bottom: 3.4rem;
          display: inline-block;
        }
        .back-button .button {
          background-color: var(--secondary-background-color);
          padding: 0.75rem;
          border-radius: 9999px;
          margin-bottom: env(safe-area-inset-bottom);
        }
        .card-actions {
          text-align: right;
        }
        .card-actions-centered {
          display: flex;
          justify-content: space-around;
          padding: 0.25rem 0.5rem;
        }
        .card-actions-multiple {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0.5rem;
        }
        .sortable-move {
          cursor: -webkit-grabbing;
          cursor: grab;
          margin: auto 0;
        }
        .area-button .info ha-icon, .ha-icon ha-icon {
          display: inline-block;
          margin: auto;
          --mdc-icon-size: 100% !important;
          --iron-icon-width: 100% !important;
          --iron-icon-height: 100% !important;
        }
        #badges {
          cursor: pointer;
          background: var( --ha-card-background, var(--card-background-color, white) );
          box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
          color: var(--primary-text-color);
        }
        .area-button {
          cursor: pointer;
          background: var( --ha-card-background, var(--card-background-color, white) );
          border-radius: var(--ha-card-border-radius, 4px);
          box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
          color: var(--test-primary-text-color, var(--primary-text-color));
        }
        .info-badge {
          /*background-color: var(--sidebar-icon-color); */
          color: var( --dwains-info-badge-color, var(--primary-text-color) );
          background-color: var(--dwains-info-badge-background, var(--secondary-background-color));
        }
        @media (min-width: 1024px) {
          .area-button.current {
            background: transparent;
            z-index: 1;
            position: relative;
          }
          .area-button.current::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: .12;
            z-index: -1;
            background: var(--sidebar-selected-icon-color);
            border-radius: var(--ha-card-border-radius, 4px);
          }
        }
        /*styling tailwind dwains version*/
        *, ::after, ::before {
          box-sizing: border-box;
        }
        h1,h2,h3 {
          margin: 0;
        }
        h3 {
          font-size: 1em;
        }
        .absolute {
          position: absolute
        }
        .break-words {
          overflow-wrap: break-word;
        }
        .relative {
            position: relative
        }
        .sticky {
            position: -webkit-sticky;
            position: sticky
        }
        .top-0 {
            top: 0px
        }
        .bottom-0 {
            bottom: 0px
        }
        .z-30 {
            z-index: 7;
        }
        .col-span-1 {
            grid-column: span 1 / span 1
        }
        .col-span-2 {
            grid-column: span 2 / span 2
        }
        .row-span-1 {
            grid-row: span 1 / span 1
        }
        .row-span-2 {
            grid-row: span 2 / span 2
        }
        .my-4 {
            margin-top: 1rem;
            margin-bottom: 1rem
        }
        .mx-auto {
          margin-left: auto;
          margin-right: auto
        }
        .mb-2 {
            margin-bottom: 0.5rem
        }
        .mb-4 {
            margin-bottom: 1rem
        }
        .mt-4 {
            margin-top: 1rem
        }
        .mr-0\.5 {
            margin-right: 0.125rem
        }
        .mr-0 {
            margin-right: 0px
        }
        .mb-12 {
            margin-bottom: 3rem
        }
        .mb-5 {
            margin-bottom: 1.25rem
        }
        .mb-16 {
            margin-bottom: 4rem
        }
        .ml-4 {
            margin-left: 1rem
        }
        .block {
            display: block
        }
        .inline-block {
            display: inline-block
        }
        .flex {
            display: flex
        }
        .inline-flex {
            display: inline-flex
        }
        .grid {
            display: grid
        }
        .hidden {
            display: none
        }
        .h-6 {
            height: 1.5rem
        }
        .h-44 {
            height: 11rem
        }
        .h-full {
            height: 100%
        }
        .h-14 {
            height: 3.5rem
        }
        .h-8 {
            height: 2rem
        }
        .w-full {
            width: 100%
        }
        .w-6 {
            width: 1.5rem
        }
        .w-14 {
            width: 3.5rem
        }
        .w-8 {
            width: 2rem
        }
        .w-12 {
          width: 3rem
        }
        .cursor-pointer {
            cursor: pointer
        }
        .grid-flow-row-dense {
            grid-auto-flow: row dense
        }
        .grid-cols-1 {
            grid-template-columns: repeat(1, minmax(0, 1fr))
        }
        .grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr))
        }
        .flex-wrap {
            flex-wrap: wrap
        }
        .content-between {
            align-content: space-between
        }
        .items-center {
            align-items: center
        }
        .justify-between {
            justify-content: space-between
        }
        .gap-4 {
            gap: 1rem
        }
        .space-y-0.5 > :not([hidden]) ~ :not([hidden]) {
            --tw-space-y-reverse: 0;
            margin-top: calc(0.125rem * calc(1 - var(--tw-space-y-reverse)));
            margin-bottom: calc(0.125rem * var(--tw-space-y-reverse))
        }
        .space-y-0 > :not([hidden]) ~ :not([hidden]) {
            --tw-space-y-reverse: 0;
            margin-top: calc(0px * calc(1 - var(--tw-space-y-reverse)));
            margin-bottom: calc(0px * var(--tw-space-y-reverse))
        }
        .rounded {
            border-radius: 0.25rem
        }
        .rounded-md {
            border-radius: 0.375rem
        }
        .bg-gray-800 {
            --tw-bg-opacity: 1;
            background-color: rgb(31 41 55 / var(--tw-bg-opacity))
        }
        .rounded-lg {
          border-radius: 0.5rem
        }
        .border-2 {
            border-width: 2px
        }
        .border-dashed {
            border-style: dashed
        }
        .border-gray-300 {
            --tw-border-opacity: 1;
            border-color: rgb(209 213 219 / var(--tw-border-opacity))
        }
        .bg-gray-800 {
            --tw-bg-opacity: 1;
            background-color: rgb(31 41 55 / var(--tw-bg-opacity))
        }
        .bg-opacity-50 {
            --tw-bg-opacity: 0.5
        }
        .p-2 {
          padding: 0.5rem;
        }
        .p-4 {
            padding: 1rem
        }
        .p-1 {
            padding: 0.25rem
        }
        .p-3 {
            padding: 0.75rem
        }
        .px-1 {
            padding-left: 0.25rem;
            padding-right: 0.25rem
        }
        .p-12 {
          padding: 3rem
        }
        .py-0\.5 {
            padding-top: 0.125rem;
            padding-bottom: 0.125rem
        }
        .py-0 {
            padding-top: 0px;
            padding-bottom: 0px
        }
        .py-1 {
          padding-top: 0.25rem;
          padding-bottom: 0.25rem
        }
        .px-2 {
          padding-left: 0.5rem;
          padding-right: 0.5rem
        }
        .text-center {
          text-align: center
        }
        .text-right {
            text-align: right
        }
        .text-xl {
            font-size: 1.5rem;
            line-height: 2rem
        }
        .text-lg {
            font-size: 1.125rem;
            line-height: 1.75rem
        }
        .text-sm {
            font-size: 0.875rem;
            line-height: 1.25rem
        }
        .text-xs {
            font-size: 0.75rem;
            line-height: 1rem
        }
        .font-semibold {
            font-weight: 600
        }
        .font-medium {
            font-weight: 500
        }
        .capitalize {
            text-transform: capitalize
        }
        .text-gray {
            color: var(--paper-item-body-secondary-color, var(--secondary-text-color));
        }
        .text-white {
            --tw-text-opacity: 1;
            color: rgb(255 255 255 / var(--tw-text-opacity))
        }
        @media (min-width: 768px) {
            .md-grid-cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr))
            }
        }
        @media (min-width: 1024px) {
            .lg-col-span-1 {
                grid-column: span 1 / span 1
            }
            .lg-col-span-3 {
                grid-column: span 3 / span 3
            }
            .lg-col-span-2 {
                grid-column: span 2 / span 2
            }
            .lg-row-span-1 {
                grid-row: span 1 / span 1
            }
            .lg-row-span-3 {
                grid-row: span 3 / span 3
            }
            .lg-row-span-2 {
                grid-row: span 2 / span 2
            }
            .lg-block {
                display: block
            }
            .lg-hidden {
                display: none
            }
            .lg-w-1-2 {
                width: 50%
            }
            .lg-grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr))
            }
            .lg-grid-cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr))
            }
            .lg-grid-cols-4 {
              grid-template-columns: repeat(4, minmax(0, 1fr))
            }
        }
        @media (min-width: 1536px) {
          .xl-col-span-1 {
              grid-column: span 1 / span 1
          }
          .xl-col-span-4 {
              grid-column: span 4 / span 4
          }
          .xl-col-span-2 {
              grid-column: span 2 / span 2
          }
          .xl-row-span-1 {
              grid-row: span 1 / span 1
          }
          .xl-row-span-4 {
              grid-row: span 4 / span 4
          }
          .xl-row-span-2 {
              grid-row: span 2 / span 2
          }
          .xl-w-1-3 {
              width: 33.333333%
          }
          .xl-w-2-3 {
              width: 66.666667%
          }
          .xl-grid-cols-4 {
              grid-template-columns: repeat(4, minmax(0, 1fr))
          }
          .xl-grid-cols-5 {
            grid-template-columns: repeat(5, minmax(0, 1fr))
          }
      }
      `
    }


  }
  customElements.define("homepage-card", HomepageCard);
