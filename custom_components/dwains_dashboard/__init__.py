import logging

from .load_plugins import load_plugins
from .load_dashboard import load_dashboard
from .const import DOMAIN
from .process_yaml import process_yaml
from .notifications import notifications

from homeassistant.components import frontend

from collections import OrderedDict
from typing import Any, Mapping, MutableMapping, Optional

from homeassistant.helpers import discovery


_LOGGER = logging.getLogger(__name__)

async def async_setup(hass, config):
    #_LOGGER.warning("async_setup")

    hass.data[DOMAIN] = {
        "notifications": {},
        "commands": {},
        'latest_version': ""
    }

    load_plugins(hass, DOMAIN)

    notifications(hass, DOMAIN)
    
    return True

async def async_setup_entry(hass, config_entry):
    #_LOGGER.warning("async_setup_entry")

    # _LOGGER.error(print(hass.data["hass_customize"]))
    # for test in hass.data["hass_customize"].items():
    #     _LOGGER.warning(test)

    process_yaml(hass, config_entry)

    load_dashboard(hass, config_entry)

    config_entry.add_update_listener(_update_listener) 

    hass.async_add_job(
        hass.config_entries.async_forward_entry_setup(
            config_entry, "sensor"
        )
    )

    return True

async def async_remove_entry(hass, config_entry):
    _LOGGER.warning("Dwains Dashboard is now uninstalled.")

    frontend.async_remove_panel(hass, "dwains-dashboard")

async def _update_listener(hass, config_entry):
    _LOGGER.warning('Update_listener called')

    process_yaml(hass, config_entry)

    hass.bus.async_fire("dwains_dashboard_reload")

    #register_modules(hass, config_entry.options)
    #load_dashboard(hass, config_entry)

    return True