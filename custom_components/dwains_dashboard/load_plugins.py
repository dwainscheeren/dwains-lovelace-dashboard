import logging
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig

DATA_EXTRA_MODULE_URL = 'frontend_extra_module_url'

_LOGGER = logging.getLogger(__name__)

from .const import VERSION

async def load_plugins(hass, name):
    add_extra_js_url(hass, "/dwains_dashboard/js/dwains-dashboard.js?version="+VERSION)

    await hass.http.async_register_static_paths([StaticPathConfig("/dwains_dashboard/js", "/config/custom_components/dwains_dashboard/js", True)])
