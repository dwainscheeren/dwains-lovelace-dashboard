# This is a fork from lovelace_gen
# Many thanks to Thomasloven! :D

import os
import logging
import json
import io
import time
from collections import OrderedDict
from typing import Any, Mapping, MutableMapping, Optional

import jinja2
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.util.yaml import loader
from homeassistant.exceptions import HomeAssistantError
from homeassistant.exceptions import TemplateError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.entity import async_generate_entity_id
from homeassistant.loader import bind_hass
from homeassistant.util import slugify
import homeassistant.util.dt as dt_util

DOMAIN = "dwains_theme"
_LOGGER = logging.getLogger(__name__)

def fromjson(value):
    return json.loads(value)

jinja = jinja2.Environment(loader=jinja2.FileSystemLoader("/"))

jinja.filters['fromjson'] = fromjson

dwains_theme_config = {}
dwains_theme_translations = {}
dwains_theme_icons = {}
dwains_theme_global = {}
dwains_theme_styles = {}

ATTR_CREATED_AT = "created_at"
ATTR_MESSAGE = "message"
ATTR_NOTIFICATION_ID = "notification_id"
ATTR_TITLE = "title"
ATTR_STATUS = "status"

ENTITY_ID_FORMAT = DOMAIN + ".{}"

EVENT_DWAINS_THEME_NOTIFICATIONS_UPDATED = "dwains_theme_notifications_updated"

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
@websocket_api.websocket_command({vol.Required("type"): "dwains_theme_notification/get"})
def websocket_get_notifications(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Mapping[str, Any],
) -> None:
    """Return a list of dwains_theme_notifications."""
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

def load_yaml(fname, args={}):
    try:
        ll_gen = False
        with open(fname, encoding="utf-8") as f:
            if f.readline().lower().startswith("# dwains_theme"):
                ll_gen = True

        if ll_gen:
            stream = io.StringIO(jinja.get_template(fname).render({
                **args, 
                "_d_t_config": dwains_theme_config, 
                "_d_t_trans": dwains_theme_translations,
                "_d_t_icons": dwains_theme_icons,
                "_d_t_global": dwains_theme_global,
                "_d_t_styles": dwains_theme_styles
                }))
            stream.name = fname
            return loader.yaml.load(stream, Loader=loader.SafeLineLoader) or OrderedDict()
        else:
            with open(fname, encoding="utf-8") as config_file:
                return loader.yaml.load(config_file, Loader=loader.SafeLineLoader) or OrderedDict()
    except loader.yaml.YAMLError as exc:
        _LOGGER.error(str(exc))
        raise HomeAssistantError(exc)
    except UnicodeDecodeError as exc:
        _LOGGER.error("Unable to read file %s: %s", fname, exc)
        raise HomeAssistantError(exc)


def _include_yaml(ldr, node):
    args = {}
    if isinstance(node.value, str):
        fn = node.value
    else:
        fn, args, *_ = ldr.construct_sequence(node)
    fname = os.path.abspath(os.path.join(os.path.dirname(ldr.name), fn))
    try:
        return loader._add_reference(load_yaml(fname, args), ldr, node)
    except FileNotFoundError as exc:
        _LOGGER.error("Unable to include file %s: %s", fname, exc);
        raise HomeAssistantError(exc)

loader.load_yaml = load_yaml
loader.yaml.SafeLoader.add_constructor("!include", _include_yaml)

async def async_setup(hass, config):
    #Notifications part setup
    """Set up the dwains theme notification component."""
    dwains_theme_notifications: MutableMapping[str, MutableMapping] = OrderedDict()
    hass.data[DOMAIN] = {"notifications": dwains_theme_notifications}

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
        dwains_theme_notifications[entity_id] = {
            ATTR_MESSAGE: message,
            ATTR_NOTIFICATION_ID: notification_id,
            ATTR_STATUS: STATUS_UNREAD,
            ATTR_TITLE: title,
            ATTR_CREATED_AT: dt_util.utcnow(),
        }

        hass.bus.async_fire(EVENT_DWAINS_THEME_NOTIFICATIONS_UPDATED)

    @callback
    def dismiss_service(call):
        """Handle the dismiss notification service call."""
        notification_id = call.data.get(ATTR_NOTIFICATION_ID)
        entity_id = ENTITY_ID_FORMAT.format(slugify(notification_id))

        if entity_id not in dwains_theme_notifications:
            return

        hass.states.async_remove(entity_id)

        del dwains_theme_notifications[entity_id]
        hass.bus.async_fire(EVENT_DWAINS_THEME_NOTIFICATIONS_UPDATED)

    @callback
    def mark_read_service(call):
        """Handle the mark_read notification service call."""
        notification_id = call.data.get(ATTR_NOTIFICATION_ID)
        entity_id = ENTITY_ID_FORMAT.format(slugify(notification_id))

        if entity_id not in dwains_theme_notifications:
            _LOGGER.error(
                "Marking dwains theme_notification read failed: "
                "Notification ID %s not found.",
                notification_id,
            )
            return

        dwains_theme_notifications[entity_id][ATTR_STATUS] = STATUS_READ
        hass.bus.async_fire(EVENT_DWAINS_THEME_NOTIFICATIONS_UPDATED)

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


    #Load main config
    dwains_theme_config.update(config.get("dwains_theme")["configuration"]);
    #_LOGGER.warning(dwains_theme_config);

    #Load translations
    language = dwains_theme_config["global"]["language"];
    dwains_theme_translations.update(config.get("dwains_theme")["translations"][language]);

    #Load global
    dwains_theme_global.update(config.get("dwains_theme")["global"]);

    #Load styles
    dwains_theme_styles.update(config.get("dwains_theme")["global"]);

    #Load icons
    if ("icons" in config.get("dwains_theme")["configuration"]):
        if config.get("dwains_theme")["configuration"]["icons"]:
            icons_config = config.get("dwains_theme")["configuration"]["icons"];
            dwains_theme_icons.update(icons_config);

    async def handle_reload(call):
        #Service call to reload Dwains Theme config
        _LOGGER.debug("reload config")

        #Main config
        config_new = OrderedDict()
        for fname in loader._find_files(hass.config.path("dwains-theme/configs/"), "*.yaml"):
            loaded_yaml = load_yaml(fname)
            if isinstance(loaded_yaml, dict):
                config_new.update(loaded_yaml)

        dwains_theme_config.update(config_new)

        #Translations
        language = dwains_theme_config["global"]["language"];
        translations = load_yaml(hass.config.path("dwains-theme/translations/"+language+".yaml"))

        dwains_theme_translations.update(translations[language])

        #Icons
        icons = load_yaml(hass.config.path("dwains-theme/configs/icons.yaml"))
        dwains_theme_icons.clear()
        if isinstance(icons, dict):
            if ("icons" in icons):
                dwains_theme_icons.update(icons["icons"]);

        #Reload lovelace
        _LOGGER.debug("reload lovelace")        
        #await hass.data["lovelace"].async_load(True)
        #Use browser_mod to reload lovelace (because it can)
        await hass.services.async_call("browser_mod", "lovelace_reload")

    # Register service dwains_theme.reload
    hass.services.async_register(DOMAIN, "reload", handle_reload)

    return True

# Allow redefinition of node anchors
import yaml

def compose_node(self, parent, index):
    if self.check_event(yaml.events.AliasEvent):
        event = self.get_event()
        anchor = event.anchor
        if anchor not in self.anchors:
            raise yaml.composer.ComposerError(None, None, "found undefined alias %r"
                    % anchor, event.start_mark)
        return self.anchors[anchor]
    event = self.peek_event()
    anchor = event.anchor
    self.descend_resolver(parent, index)
    if self.check_event(yaml.events.ScalarEvent):
        node = self.compose_scalar_node(anchor)
    elif self.check_event(yaml.events.SequenceStartEvent):
        node = self.compose_sequence_node(anchor)
    elif self.check_event(yaml.events.MappingStartEvent):
        node = self.compose_mapping_node(anchor)
    self.ascend_resolver()
    return node

yaml.composer.Composer.compose_node = compose_node