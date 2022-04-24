import logging
from homeassistant.components.frontend import add_extra_js_url

DATA_EXTRA_MODULE_URL = 'frontend_extra_module_url'

_LOGGER = logging.getLogger(__name__)

from .const import VERSION

def load_plugins(hass, name):
    add_extra_js_url(hass, "/dwains_dashboard/js/dwains-dashboard.js?version="+VERSION)

    hass.http.register_static_path("/dwains_dashboard/js", hass.config.path(f"custom_components/{name}/js"), True)