import logging

DATA_EXTRA_MODULE_URL = 'frontend_extra_module_url'

_LOGGER = logging.getLogger(__name__)

def load_plugins(hass, name):
    if DATA_EXTRA_MODULE_URL not in hass.data:
        hass.data[DATA_EXTRA_MODULE_URL] = set()

    url_set = set()
    url_set.add("/dwains_dashboard/js/dwains-dashboard.js")

    url_set.add("/dwains_dashboard/cards/button-card/button-card.js")
    url_set.add("/dwains_dashboard/cards/light-entity-card/light-entity-card.js")

    url_set.add("/dwains_dashboard/cards/dwains-header-card/dwains-header-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-heading-card/dwains-heading-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-wrapper-card/dwains-wrapper-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-flexbox-card/dwains-flexbox-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-hash-switch-card/dwains-hash-switch-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-weather-card/dwains-weather-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-notification-card/dwains-notification-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-collapse-card/dwains-collapse-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-cover-card/dwains-cover-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-auto-entities-card/dwains-auto-entities-card.js")

    hass.data[DATA_EXTRA_MODULE_URL].update(url_set)

    hass.http.register_static_path("/dwains_dashboard/js", hass.config.path(f"custom_components/{name}/js"), True)
    hass.http.register_static_path("/dwains_dashboard/cards", hass.config.path(f"custom_components/{name}/cards"), True)
