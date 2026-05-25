import logging
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import HomeAssistantHTTP
from homeassistant.components.http import StaticPathConfig

DATA_EXTRA_MODULE_URL = 'frontend_extra_module_url'

_LOGGER = logging.getLogger(__name__)

from .const import VERSION

async def load_plugins(hass, name):
    #_LOGGER.warning(f"load_plugins() version: {VERSION}")

    # Load the tiny layout preload FIRST so the custom view layout element is
    # defined before HA renders the dashboard view (the big bundle loads async
    # and otherwise loses the race -> "Configuration error" on the whole view).
    add_extra_js_url(hass, f"/dwains_dashboard/js/dwains-dashboard-layout.js?version={VERSION}")
    add_extra_js_url(hass, f"/dwains_dashboard/js/dwains-dashboard.js?version={VERSION}")

    await hass.http.async_register_static_paths(
        [StaticPathConfig("/dwains_dashboard/js", hass.config.path(f"custom_components/{name}/js"), True)]
    )
