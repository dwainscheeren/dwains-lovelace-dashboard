from homeassistant.helpers.entity import Entity
from datetime import datetime, timedelta
from homeassistant.util import Throttle

from .const import DOMAIN, VERSION

import logging

import asyncio
import aiohttp
import async_timeout
import json
from homeassistant.helpers.aiohttp_client import async_get_clientsession

_LOGGER = logging.getLogger(__name__)
_RESOURCE = "https://dwains-dashboard.dwainscheeren.nl/version?v="+VERSION

MIN_TIME_BETWEEN_UPDATES = timedelta(minutes=800)

async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Setup sensor platform."""
    #_LOGGER.error("async_setup_platform called")
    async_add_entities([LatestVersionSensor()])


async def async_setup_entry(hass, config_entry, async_add_devices):
    """Setup sensor platform."""
    #_LOGGER.error("async_setup_entry called")

    data = LatestVersion(hass)
    async_add_devices([LatestVersionSensor(data)])


class LatestVersionSensor(Entity):
    """Latest version sensor."""

    def __init__(self, data):
        """Initialize the sensor."""
        self._state = None
        self.data = data

    @property
    def unique_id(self):
        """Return a unique ID to use for this sensor."""
        return (
            "dwains-dashboard-latest-version"
        )

    @property
    def name(self):
        """Return the name of the sensor."""
        return "Dwains Dashboard Latest version"

    @property
    def icon(self):
        """Return the icon of the sensor."""
        return "mdi:alpha-d-box"

    @property
    def state(self):
        """Return the state of the sensor."""
        return self._state

    @property
    def unit_of_measurement(self):
        """Return the unit of measurement."""
        return "latest version"

    # def update(self):
    #     """Fetch new state data for the sensor.
    #     This is the only method that should fetch new data for Home Assistant.
    #     """
    #     self._state = self.hass.data[DOMAIN]['latest_version']

    async def async_update(self):
        await self.data.update()
        self._state = self.hass.data[DOMAIN]['latest_version']

class LatestVersion:

    def __init__(self, hass):
        self._hass = hass

    @Throttle(MIN_TIME_BETWEEN_UPDATES)
    async def update(self):

        session = async_get_clientsession(self._hass)

        try:
            with async_timeout.timeout(10):
                response = await session.get(_RESOURCE)
            result = await response.read()
            data = json.loads(result)
            if "latest_version" in data:
                #_LOGGER.error(data)
                self._hass.data[DOMAIN]['latest_version'] = json.loads(result)["latest_version"] 
        except ValueError as err:
            _LOGGER.error("Dwains Dashboard version check failed %s", err.args)
        except (asyncio.TimeoutError, aiohttp.ClientError) as err:
            _LOGGER.error("Dwains Dashboard version check failed %s", repr(err))