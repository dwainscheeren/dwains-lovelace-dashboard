import os
import logging
import json
import io
import time
import voluptuous as vol
import homeassistant.util.dt as dt_util

from collections import OrderedDict
from typing import Any, Mapping, MutableMapping, Optional

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.entity import Entity, async_generate_entity_id
from homeassistant.loader import bind_hass
from homeassistant.util import slugify

from .const import DOMAIN

ATTR_CREATED_AT = "created_at"
ATTR_MESSAGE = "message"
ATTR_NOTIFICATION_ID = "notification_id"
ATTR_TITLE = "title"
ATTR_STATUS = "status"

ENTITY_ID_FORMAT = DOMAIN + ".{}"

EVENT_DWAINS_dashboard_NOTIFICATIONS_UPDATED = "dwains_dashboard_notifications_updated"

SERVICE_CREATE = "notification_create"
SERVICE_DISMISS = "notification_dismiss"
SERVICE_MARK_READ = "notification_mark_read"

SCHEMA_SERVICE_CREATE = vol.Schema(
    {
        vol.Required(ATTR_MESSAGE): cv.template,
        vol.Optional(ATTR_TITLE): cv.template,
        vol.Optional(ATTR_NOTIFICATION_ID): cv.string,
    }
)

SCHEMA_SERVICE_DISMISS = vol.Schema({vol.Required(ATTR_NOTIFICATION_ID): cv.string})

SCHEMA_SERVICE_MARK_READ = vol.Schema({vol.Required(ATTR_NOTIFICATION_ID): cv.string})

DEFAULT_OBJECT_ID = "notification"

STATE = "notifying"
STATUS_UNREAD = "unread"
STATUS_READ = "read"

#Notifications part
@bind_hass
def create(hass, message, title=None, notification_id=None):
    """Generate a notification."""
    hass.add_job(async_create, hass, message, title, notification_id)

@bind_hass
def dismiss(hass, notification_id):
    """Remove a notification."""
    hass.add_job(async_dismiss, hass, notification_id)

@callback
@bind_hass
def async_create(
    hass: HomeAssistant,
    message: str,
    title: Optional[str] = None,
    notification_id: Optional[str] = None,
) -> None:
    """Generate a notification."""
    data = {
        key: value
        for key, value in [
            (ATTR_TITLE, title),
            (ATTR_MESSAGE, message),
            (ATTR_NOTIFICATION_ID, notification_id),
        ]
        if value is not None
    }

    hass.async_create_task(hass.services.async_call(DOMAIN, SERVICE_CREATE, data))

@callback
@bind_hass
def async_dismiss(hass: HomeAssistant, notification_id: str) -> None:
    """Remove a notification."""
    data = {ATTR_NOTIFICATION_ID: notification_id}

    hass.async_create_task(hass.services.async_call(DOMAIN, SERVICE_DISMISS, data))

@callback
@websocket_api.websocket_command({vol.Required("type"): "dwains_dashboard_notification/get"})
def websocket_get_notifications(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Mapping[str, Any],
) -> None:
    """Return a list of dwains_dashboard_notifications."""
    connection.send_message(
        websocket_api.result_message(
            msg["id"],
            [
                {
                    key: data[key]
                    for key in (
                        ATTR_NOTIFICATION_ID,
                        ATTR_MESSAGE,
                        ATTR_STATUS,
                        ATTR_TITLE,
                        ATTR_CREATED_AT,
                    )
                }
                for data in hass.data[DOMAIN]["notifications"].values()
            ],
        )
    )
#End notifications part

def notifications(hass, name):
     #Notifications part setup
    """Set up the dwains dashboard notification component."""
    
    dwains_dashboard_notifications: MutableMapping[str, MutableMapping] = OrderedDict()
    hass.data[DOMAIN]["notifications"] = dwains_dashboard_notifications

    @callback
    def create_service(call):
        """Handle a create notification service call."""
        title = call.data.get(ATTR_TITLE)
        message = call.data.get(ATTR_MESSAGE)
        notification_id = call.data.get(ATTR_NOTIFICATION_ID)

        if notification_id is not None:
            entity_id = ENTITY_ID_FORMAT.format(slugify(notification_id))
        else:
            entity_id = async_generate_entity_id(
                ENTITY_ID_FORMAT, DEFAULT_OBJECT_ID, hass=hass
            )
            notification_id = entity_id.split(".")[1]

        attr = {}
        if title is not None:
            try:
                title.hass = hass
                title = title.async_render()
            except TemplateError as ex:
                _LOGGER.error("Error rendering title %s: %s", title, ex)
                title = title.template

            attr[ATTR_TITLE] = title

        try:
            message.hass = hass
            message = message.async_render()
        except TemplateError as ex:
            _LOGGER.error("Error rendering message %s: %s", message, ex)
            message = message.template

        attr[ATTR_MESSAGE] = message

        hass.states.async_set(entity_id, STATE, attr)

        # Store notification and fire event
        # This will eventually replace state machine storage
        dwains_dashboard_notifications[entity_id] = {
            ATTR_MESSAGE: message,
            ATTR_NOTIFICATION_ID: notification_id,
            ATTR_STATUS: STATUS_UNREAD,
            ATTR_TITLE: title,
            ATTR_CREATED_AT: dt_util.utcnow(),
        }

        hass.bus.async_fire(EVENT_DWAINS_dashboard_NOTIFICATIONS_UPDATED)

    @callback
    def dismiss_service(call):
        """Handle the dismiss notification service call."""
        notification_id = call.data.get(ATTR_NOTIFICATION_ID)
        entity_id = ENTITY_ID_FORMAT.format(slugify(notification_id))

        if entity_id not in dwains_dashboard_notifications:
            return

        hass.states.async_remove(entity_id)

        del dwains_dashboard_notifications[entity_id]
        hass.bus.async_fire(EVENT_DWAINS_dashboard_NOTIFICATIONS_UPDATED)

    @callback
    def mark_read_service(call):
        """Handle the mark_read notification service call."""
        notification_id = call.data.get(ATTR_NOTIFICATION_ID)
        entity_id = ENTITY_ID_FORMAT.format(slugify(notification_id))

        if entity_id not in dwains_dashboard_notifications:
            _LOGGER.error(
                "Marking dwains dashboard_notification read failed: "
                "Notification ID %s not found.",
                notification_id,
            )
            return

        dwains_dashboard_notifications[entity_id][ATTR_STATUS] = STATUS_READ
        hass.bus.async_fire(EVENT_DWAINS_dashboard_NOTIFICATIONS_UPDATED)

    hass.services.async_register(
        DOMAIN, SERVICE_CREATE, create_service, SCHEMA_SERVICE_CREATE
    )

    hass.services.async_register(
        DOMAIN, SERVICE_DISMISS, dismiss_service, SCHEMA_SERVICE_DISMISS
    )

    hass.services.async_register(
        DOMAIN, SERVICE_MARK_READ, mark_read_service, SCHEMA_SERVICE_MARK_READ
    )

    hass.components.websocket_api.async_register_command(websocket_get_notifications)
    #End notifications part setup