import logging
from homeassistant.components.frontend import add_extra_js_url

DATA_EXTRA_MODULE_URL = 'frontend_extra_module_url'

_LOGGER = logging.getLogger(__name__)

def load_plugins(hass, name):
    add_extra_js_url(hass, "/dwains_dashboard/js/dwains-dashboard.js")

    #Cards by others
    add_extra_js_url(hass, "/dwains_dashboard/cards/button-card/button-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/light-entity-card/light-entity-card.js")
    #Cards by dwains
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-header-card/dwains-header-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-heading-card/dwains-heading-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-wrapper-card/dwains-wrapper-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-flexbox-card/dwains-flexbox-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-hash-switch-card/dwains-hash-switch-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-weather-card/dwains-weather-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-notification-card/dwains-notification-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-collapse-card/dwains-collapse-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-cover-card/dwains-cover-card.js")
    add_extra_js_url(hass, "/dwains_dashboard/cards/dwains-auto-entities-card/dwains-auto-entities-card.js")

    hass.http.register_static_path("/dwains_dashboard/js", hass.config.path(f"custom_components/{name}/js"), True)
    hass.http.register_static_path("/dwains_dashboard/cards", hass.config.path(f"custom_components/{name}/cards"), True)