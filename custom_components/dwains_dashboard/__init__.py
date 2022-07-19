import logging
import yaml
import json
import os
import shutil

from .load_plugins import load_plugins
from .load_dashboard import load_dashboard
from .const import DOMAIN, VERSION
from .process_yaml import process_yaml, reload_configuration
from .notifications import notifications
from datetime import datetime

import voluptuous as vol
from homeassistant.core import HomeAssistant, callback
from homeassistant.components import frontend, websocket_api
from homeassistant.util import slugify

from collections import OrderedDict
from typing import Any, Mapping, MutableMapping, Optional

from homeassistant.helpers import discovery

from yaml.representer import Representer
import collections

_LOGGER = logging.getLogger(__name__)

async def async_setup(hass, config):
    #_LOGGER.warning("async_setup")

    #_LOGGER.warning(config)
    #_LOGGER.warning(hass.data[DOMAIN])

    # if not config.get(DOMAIN):
    #     _LOGGER.warning("no config")

    hass.data[DOMAIN] = {
        "notifications": {},
        "commands": {},
        'latest_version': ""
    }

    websocket_api.async_register_command(hass, websocket_get_configuration)
    websocket_api.async_register_command(hass, websocket_get_blueprints)

    websocket_api.async_register_command(hass, ws_handle_install_blueprint)
    websocket_api.async_register_command(hass, ws_handle_delete_blueprint)

    websocket_api.async_register_command(hass, ws_handle_add_card)
    websocket_api.async_register_command(hass, ws_handle_remove_card)

    websocket_api.async_register_command(hass, ws_handle_edit_entity)
    websocket_api.async_register_command(hass, ws_handle_edit_entity_card)
    websocket_api.async_register_command(hass, ws_handle_edit_entity_popup)
    websocket_api.async_register_command(hass, ws_handle_edit_entity_favorite)
    websocket_api.async_register_command(hass, ws_handle_edit_entity_bool_value)
    websocket_api.async_register_command(hass, ws_handle_edit_entities_bool_value)
    websocket_api.async_register_command(hass, ws_handle_edit_device_button)
    websocket_api.async_register_command(hass, ws_handle_edit_device_card)
    websocket_api.async_register_command(hass, ws_handle_edit_device_popup)
    websocket_api.async_register_command(hass, ws_handle_edit_device_bool_value)
    websocket_api.async_register_command(hass, ws_handle_remove_device_card)
    websocket_api.async_register_command(hass, ws_handle_remove_device_popup)
    websocket_api.async_register_command(hass, ws_handle_remove_entity_card)
    websocket_api.async_register_command(hass, ws_handle_remove_entity_popup)

    websocket_api.async_register_command(hass, ws_handle_edit_area_button)    
    websocket_api.async_register_command(hass, ws_handle_edit_area_bool_value)

    websocket_api.async_register_command(hass, ws_handle_edit_homepage_header)

    websocket_api.async_register_command(hass, ws_handle_edit_more_page_button)
    websocket_api.async_register_command(hass, ws_handle_edit_more_page)
    websocket_api.async_register_command(hass, ws_handle_remove_more_page)
    websocket_api.async_register_command(hass, ws_handle_add_more_page_to_navbar)

    websocket_api.async_register_command(hass, ws_handle_sort_area_button)
    websocket_api.async_register_command(hass, ws_handle_sort_device_button)
    websocket_api.async_register_command(hass, ws_handle_sort_entity)
    websocket_api.async_register_command(hass, ws_handle_sort_more_page)

    load_plugins(hass, DOMAIN)

    notifications(hass, DOMAIN)
    
    return True

yaml.add_representer(collections.OrderedDict, Representer.represent_dict)

@callback
@websocket_api.websocket_command({vol.Required("type"): "dwains_dashboard/configuration/get"})
def websocket_get_configuration(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Mapping[str, Any],
) -> None:
    """Return a list of configuration."""
    if os.path.exists(hass.config.path("dwains-dashboard/configs/areas.yaml")):
        with open(hass.config.path("dwains-dashboard/configs/areas.yaml")) as f:
            areas = yaml.safe_load(f)
    else:
        areas = OrderedDict()

    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")):
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    if os.path.exists(hass.config.path("dwains-dashboard/configs/devices.yaml")):
        with open(hass.config.path("dwains-dashboard/configs/devices.yaml")) as f:
            devices = yaml.safe_load(f)
    else:
        devices = OrderedDict()

    if os.path.exists(hass.config.path("dwains-dashboard/configs/settings.yaml")):
        with open(hass.config.path("dwains-dashboard/configs/settings.yaml")) as f:
            homepage_header = yaml.safe_load(f)
    else:
        homepage_header = OrderedDict()

    area_cards = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/configs/cards/areas")):
        for subdir in os.listdir(hass.config.path("dwains-dashboard/configs/cards/areas")):
            #_LOGGER.warning(subdir) #Subdir name
            area_cards[subdir] = {}
            for fname in os.listdir(hass.config.path("dwains-dashboard/configs/cards/areas/"+subdir)):
                if fname.endswith('.yaml'):
                    #_LOGGER.warning(fname) #Card filename
                    with open(hass.config.path("dwains-dashboard/configs/cards/areas/"+subdir+"/"+fname)) as f:
                        filecontent = yaml.safe_load(f)
                        area_cards[subdir].update({fname: filecontent})

    device_cards = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/configs/cards/devices")):
        for subdir in os.listdir(hass.config.path("dwains-dashboard/configs/cards/devices")):
            #_LOGGER.warning(subdir) #Subdir name
            device_cards[subdir] = {}
            for fname in os.listdir(hass.config.path("dwains-dashboard/configs/cards/devices/"+subdir)):
                if fname.endswith('.yaml'):
                    #_LOGGER.warning(fname) #Card filename
                    with open(hass.config.path("dwains-dashboard/configs/cards/devices/"+subdir+"/"+fname)) as f:
                        filecontent = yaml.safe_load(f)
                        device_cards[subdir].update({fname: filecontent})


    entity_cards = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/configs/cards/entities")):
        for fname in os.listdir(hass.config.path("dwains-dashboard/configs/cards/entities")):
            if fname.endswith('.yaml'):
                with open(hass.config.path("dwains-dashboard/configs/cards/entities/"+fname)) as f:
                    filecontent = yaml.safe_load(f)
                    entity_cards.update({fname.replace(".yaml",""): filecontent})

    entities_popup = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/configs/cards/entities_popup")):
        for fname in os.listdir(hass.config.path("dwains-dashboard/configs/cards/entities_popup")):
            if fname.endswith('.yaml'):
                with open(hass.config.path("dwains-dashboard/configs/cards/entities_popup/"+fname)) as f:
                    filecontent = yaml.safe_load(f)
                    entities_popup.update({fname.replace(".yaml",""): filecontent})
    
    devices_card = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/configs/cards/devices_card")):
        for fname in os.listdir(hass.config.path("dwains-dashboard/configs/cards/devices_card")):
            if fname.endswith('.yaml'):
                with open(hass.config.path("dwains-dashboard/configs/cards/devices_card/"+fname)) as f:
                    filecontent = yaml.safe_load(f)
                    devices_card.update({fname.replace(".yaml",""): filecontent})

    devices_popup = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/configs/cards/devices_popup")):
        for fname in os.listdir(hass.config.path("dwains-dashboard/configs/cards/devices_popup")):
            if fname.endswith('.yaml'):
                with open(hass.config.path("dwains-dashboard/configs/cards/devices_popup/"+fname)) as f:
                    filecontent = yaml.safe_load(f)
                    devices_popup.update({fname.replace(".yaml",""): filecontent})

    more_pages = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/configs/more_pages")):
        for subdir in os.listdir(hass.config.path("dwains-dashboard/configs/more_pages")):
            if (os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/page.yaml"))) and (os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml"))):
                with open(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml")) as f:
                    filecontent = yaml.safe_load(f)
                    more_pages[subdir] = filecontent

    #_LOGGER.warning(cards)

    connection.send_result(
        msg["id"],
        {
            "areas": areas,
            "area_cards": area_cards,
            "device_cards": device_cards,
            "entity_cards": entity_cards,
            "entities_popup": entities_popup,
            "entities": entities,
            "devices": devices,
            "homepage_header": homepage_header,
            "more_pages": more_pages,
            "installed_version": VERSION,
            "devices_card": devices_card,
            "devices_popup": devices_popup,

        }
    )


#get_blueprints
@callback
@websocket_api.websocket_command({vol.Required("type"): "dwains_dashboard/get_blueprints"})
def websocket_get_blueprints(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: Mapping[str, Any],
) -> None:
    """Return a list of installed blueprints."""

    blueprints = {}
    if os.path.isdir(hass.config.path("dwains-dashboard/blueprints")):
        for fname in os.listdir(hass.config.path("dwains-dashboard/blueprints")):
            if fname.endswith('.yaml'):
                #_LOGGER.warning(fname) #Card filename
                with open(hass.config.path("dwains-dashboard/blueprints/"+fname)) as f:
                    filecontent = yaml.safe_load(f)
                    blueprints[fname] = filecontent


    connection.send_result(
        msg["id"],
        {
            "blueprints": blueprints,
        }
    )


#install_blueprint
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/install_blueprint",
        vol.Required("yamlCode"): str,
    }
)
@websocket_api.async_response
async def ws_handle_install_blueprint(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle save new blueprint."""
    
    filecontent = json.loads(msg["yamlCode"])

    #_LOGGER.warning(filecontent)

    if not filecontent.get("blueprint"):
        _LOGGER.warning('no blueprint data')
        connection.send_result(
            msg["id"],
            {
                "error": "Blueprint has invalid data"
            },
        )
        return

    if not filecontent.get("card"):
        _LOGGER.warning('no card')
        connection.send_result(
            msg["id"],
            {
                "error": "Blueprint has no card"
            },
        )
        return

    filename = slugify(filecontent["blueprint"]["name"])+".yaml"

    if filecontent.get("button_card_templates"):
        if not os.path.exists(hass.config.path("dwains-dashboard/button_card_templates/blueprints")):
            os.makedirs(hass.config.path("dwains-dashboard/button_card_templates/blueprints"))
        
        with open(hass.config.path("dwains-dashboard/button_card_templates/blueprints/"+filename), 'w') as f:
            yaml.dump(filecontent.get("button_card_templates"), f, default_flow_style=False, sort_keys=False)

        filecontent.pop("button_card_templates")

    if filecontent.get("apexcharts_card_templates"):
        if not os.path.exists(hass.config.path("dwains-dashboard/apexcharts_card_templates/blueprints")):
            os.makedirs(hass.config.path("dwains-dashboard/apexcharts_card_templates/blueprints"))
        
        with open(hass.config.path("dwains-dashboard/apexcharts_card_templates/blueprints/"+filename), 'w') as f:
            yaml.dump(filecontent.get("apexcharts_card_templates"), f, default_flow_style=False, sort_keys=False)

        filecontent.pop("apexcharts_card_templates")

    if not os.path.exists(hass.config.path("dwains-dashboard/blueprints")):
        os.makedirs(hass.config.path("dwains-dashboard/blueprints"))
    
    with open(hass.config.path("dwains-dashboard/blueprints/"+filename), 'w') as f:
        yaml.dump(filecontent, f, default_flow_style=False, sort_keys=False)

    #reload_configuration(hass)


    connection.send_result(
        msg["id"],
        {
            "succesfull": filename
        },
    )



#delete_blueprint
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/delete_blueprint",
        vol.Required("blueprint"): str,
    }
)
@websocket_api.async_response
async def ws_handle_delete_blueprint(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle delete blueprint."""
    
    filename = hass.config.path("dwains-dashboard/blueprints/"+msg["blueprint"])

    if os.path.exists(filename):
        os.remove(filename)
    
    connection.send_result(
        msg["id"],
        {
            "succesfull": "Blueprint deleted succesfull"
        },
    )



#edit_area_button
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_area_button",
        vol.Optional("icon"): str,
        vol.Optional("areaId"): str,
        vol.Optional("floor"): str,
        vol.Optional("disableArea"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_area_button(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle saving editing area button."""
    
    if(msg["areaId"]):
        if os.path.exists(hass.config.path("dwains-dashboard/configs/areas.yaml")):
            with open(hass.config.path("dwains-dashboard/configs/areas.yaml")) as f:
                areas = yaml.safe_load(f)
        else:
            areas = OrderedDict()

        area = areas.get(msg["areaId"])

        if not area:
            areas[msg["areaId"]] = OrderedDict()

        areas[msg["areaId"]].update({
            "icon": msg["icon"],
            "floor": msg["floor"],
            "disabled": msg["disableArea"],
        })

        if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
            os.makedirs(hass.config.path("dwains-dashboard/configs"))

        with open(hass.config.path("dwains-dashboard/configs/areas.yaml"), 'w') as f:
            yaml.dump(areas, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Area button saved"
        },
    )


 
#edit_area_bool_value
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_area_bool_value",
        vol.Required("areaId"): str,
        vol.Optional("key"): str,
        vol.Optional("value"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_area_bool_value(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit area bool value command."""

    if os.path.exists(hass.config.path("dwains-dashboard/configs/areas.yaml")):
        with open(hass.config.path("dwains-dashboard/configs/areas.yaml")) as f:
            areas = yaml.safe_load(f)
    else:
        areas = OrderedDict()

    area = areas.get(msg["areaId"])

    if not area:
        areas[msg["areaId"]] = OrderedDict()

    areas[msg["areaId"]].update({
            msg["key"]: msg["value"]
        })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/areas.yaml"), 'w') as f:
        yaml.dump(areas, f, default_flow_style=False, sort_keys=False)


    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Area bool value set succesfully"
        },
    )




#edit_homepage_header
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_homepage_header",
        vol.Optional("disableClock"): bool,
        vol.Optional("amPmClock"): bool,
        vol.Optional("disableWelcomeMessage"): bool,
        vol.Optional("v2Mode"): bool,
        vol.Optional("weatherEntity"): str,
        vol.Optional("alarmEntity"): str,

    }
)
@websocket_api.async_response
async def ws_handle_edit_homepage_header(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle saving editing homepage header."""
    
    if os.path.exists(hass.config.path("dwains-dashboard/configs/settings.yaml")):
        with open(hass.config.path("dwains-dashboard/configs/settings.yaml")) as f:
            homepage_header = yaml.safe_load(f)
    else:
        homepage_header = OrderedDict()

    homepage_header.update({
        "disable_clock": msg["disableClock"],
        "am_pm_clock": msg["amPmClock"],
        "disable_welcome_message": msg["disableWelcomeMessage"],
        "v2_mode": msg["v2Mode"],
        "weather_entity": msg["weatherEntity"],
        "alarm_entity": msg["alarmEntity"],
    })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/settings.yaml"), 'w') as f:
        yaml.dump(homepage_header, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Homepage header saved"
        },
    )


#edit_device_button
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_device_button",
        vol.Optional("icon"): str,
        vol.Optional("device"): str,
        vol.Optional("showInNavbar"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_device_button(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle saving editing area button."""
    
    if(msg["device"]):
        if os.path.exists(hass.config.path("dwains-dashboard/configs/devices.yaml")):
            with open(hass.config.path("dwains-dashboard/configs/devices.yaml")) as f:
                devices = yaml.safe_load(f)
        else:
            devices = OrderedDict()

        device = devices.get(msg["device"])

        if not device:
            devices[msg["device"]] = OrderedDict()

        devices[msg["device"]].update({
            "icon": msg["icon"],
            "show_in_navbar": msg["showInNavbar"],
        })

        if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
            os.makedirs(hass.config.path("dwains-dashboard/configs"))

        with open(hass.config.path("dwains-dashboard/configs/devices.yaml"), 'w') as f:
            yaml.dump(devices, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")
    hass.bus.async_fire("dwains_dashboard_navigation_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Device button saved"
        },
    )




#edit_device_card
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_device_card",
        vol.Required("cardData"): str,
        vol.Required("domain"): str,
    }
)
@websocket_api.async_response
async def ws_handle_edit_device_card(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle saving device card."""

    filecontent = json.loads(msg["cardData"])

    path = "dwains-dashboard/configs/cards/devices_card/"
    filename = hass.config.path(path+"/"+msg['domain']+".yaml")

    os.makedirs(os.path.dirname(filename), exist_ok=True) #Create the folder if not exists     

    ff = open(filename, 'w+')
    yaml.dump(yaml.safe_load(json.dumps(filecontent)), ff, default_flow_style=False)
    
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Device card saved"
        },
    )



#remove_device_card
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/remove_device_card",
        vol.Required("domain"): str,
    }
)
@websocket_api.async_response
async def ws_handle_remove_device_card(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle remove domain card command."""

    path = "dwains-dashboard/configs/cards/devices_card"
    filename = hass.config.path(path+"/"+msg["domain"]+".yaml")

    if os.path.exists(filename):
        os.remove(filename)

    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")
    
    connection.send_result(
        msg["id"],
        {
            "succesfull": "Entity card removed succesfully"
        },
    )


#edit_device_popup
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_device_popup",
        vol.Required("cardData"): str,
        vol.Required("domain"): str,
    }
)
@websocket_api.async_response
async def ws_handle_edit_device_popup(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle saving device popup."""

    filecontent = json.loads(msg["cardData"])

    path = "dwains-dashboard/configs/cards/devices_popup/"
    filename = hass.config.path(path+"/"+msg['domain']+".yaml")

    os.makedirs(os.path.dirname(filename), exist_ok=True) #Create the folder if not exists     

    ff = open(filename, 'w+')
    yaml.dump(yaml.safe_load(json.dumps(filecontent)), ff, default_flow_style=False)
    
    hass.bus.async_fire("dwains_dashboard_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Device popup saved"
        },
    )



#remove_device_popup
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/remove_device_popup",
        vol.Required("domain"): str,
    }
)
@websocket_api.async_response
async def ws_handle_remove_device_popup(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle remove domain popup command."""

    path = "dwains-dashboard/configs/cards/devices_popup"
    filename = hass.config.path(path+"/"+msg["domain"]+".yaml")

    if os.path.exists(filename):
        os.remove(filename)

    hass.bus.async_fire("dwains_dashboard_reload")
    
    connection.send_result(
        msg["id"],
        {
            "succesfull": "Device popup removed succesfully"
        },
    )



#remove_entity_card
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/remove_entity_card",
        vol.Required("entityId"): str,
    }
)
@websocket_api.async_response
async def ws_handle_remove_entity_card(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle remove entity card command."""

    path = "dwains-dashboard/configs/cards/entities"
    filename = hass.config.path(path+"/"+msg["entityId"]+".yaml")

    if os.path.exists(filename):
        os.remove(filename)

    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")
    
    connection.send_result(
        msg["id"],
        {
            "succesfull": "Entity card removed succesfully"
        },
    )


#remove_entity_popup
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/remove_entity_popup",
        vol.Required("entityId"): str,
    }
)
@websocket_api.async_response
async def ws_handle_remove_entity_popup(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle remove entity card command."""

    path = "dwains-dashboard/configs/cards/entities_popup"
    filename = hass.config.path(path+"/"+msg["entityId"]+".yaml")

    if os.path.exists(filename):
        os.remove(filename)

    hass.bus.async_fire("dwains_dashboard_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Entity card removed succesfully"
        },
    )



#edit_entity
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_entity",
        vol.Required("entity"): str,
        vol.Optional("friendlyName"): str,
        vol.Optional("disableEntity"): bool,
        vol.Optional("hideEntity"): bool,
        vol.Optional("excludeEntity"): bool,
        vol.Optional("rowSpan"): str,
        vol.Optional("colSpan"): str,
        vol.Optional("rowSpanLg"): str,
        vol.Optional("colSpanLg"): str,
        vol.Optional("rowSpanXl"): str,
        vol.Optional("colSpanXl"): str,
        vol.Optional("customCard"): bool,
        vol.Optional("customPopup"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_entity(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle saving editing entity."""

    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/entities.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    entity = entities.get(msg["entity"])

    if not entity:
        entities[msg["entity"]] = OrderedDict()

    entities[msg["entity"]].update({
            "hidden": msg["hideEntity"],
            "excluded": msg["excludeEntity"],
            "disabled": msg["disableEntity"],
            "friendly_name": msg["friendlyName"],
            "col_span": msg["colSpan"],
            "row_span": msg["rowSpan"],
            "col_span_lg": msg["colSpanLg"],
            "row_span_lg": msg["rowSpanLg"],
            "col_span_xl": msg["colSpanXl"],
            "row_span_xl": msg["rowSpanXl"],
            "custom_card": msg["customCard"],
            "custom_popup": msg["customPopup"],
        })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/entities.yaml"), 'w') as f:
        yaml.dump(entities, f, default_flow_style=False, sort_keys=False)


    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Entity saved"
        },
    )



#edit_entity_card
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_entity_card",
        vol.Required("cardData"): str,
        vol.Required("entityId"): str,
    }
)
@websocket_api.async_response
async def ws_handle_edit_entity_card(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit entity card command."""

    filecontent = json.loads(msg["cardData"])

    path = "dwains-dashboard/configs/cards/entities/"
    filename = hass.config.path(path+"/"+msg['entityId']+".yaml")

    os.makedirs(os.path.dirname(filename), exist_ok=True) #Create the folder if not exists     

    ff = open(filename, 'w+')
    yaml.dump(yaml.safe_load(json.dumps(filecontent)), ff, default_flow_style=False)

    #Enable use custom card for the entity settings by default
    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/entities.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    entity = entities.get(msg["entityId"])

    if not entity:
        entities[msg["entityId"]] = OrderedDict()

    entities[msg["entityId"]].update({
            "custom_card": True,
        })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/entities.yaml"), 'w') as f:
        yaml.dump(entities, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Card added succesfully"
        },
    )

    
#edit_entity_popup
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_entity_popup",
        vol.Required("cardData"): str,
        vol.Required("entityId"): str,
    }
)
@websocket_api.async_response
async def ws_handle_edit_entity_popup(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit entity popup command."""

    filecontent = json.loads(msg["cardData"])

    path = "dwains-dashboard/configs/cards/entities_popup/"
    filename = hass.config.path(path+"/"+msg['entityId']+".yaml")

    os.makedirs(os.path.dirname(filename), exist_ok=True) #Create the folder if not exists     

    ff = open(filename, 'w+')
    yaml.dump(yaml.safe_load(json.dumps(filecontent)), ff, default_flow_style=False)

    #Enable use custom card for the entity settings by default
    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/entities.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    entity = entities.get(msg["entityId"])

    if not entity:
        entities[msg["entityId"]] = OrderedDict()

    entities[msg["entityId"]].update({
            "custom_popup": True,
        })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/entities.yaml"), 'w') as f:
        yaml.dump(entities, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Popup added succesfully"
        },
    )


    
#edit_entity_favorite
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_entity_favorite",
        vol.Required("entityId"): str,
        vol.Optional("favorite"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_entity_favorite(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit entity favorite command."""

    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/entities.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    entity = entities.get(msg["entityId"])

    if not entity:
        entities[msg["entityId"]] = OrderedDict()

    entities[msg["entityId"]].update({
            "favorite": msg["favorite"]
        })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/entities.yaml"), 'w') as f:
        yaml.dump(entities, f, default_flow_style=False, sort_keys=False)


    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Popup added succesfully"
        },
    )

 
#edit_entity_bool_value
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_entity_bool_value",
        vol.Required("entityId"): str,
        vol.Optional("key"): str,
        vol.Optional("value"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_entity_bool_value(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit entity bool value command."""

    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/entities.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    entity = entities.get(msg["entityId"])

    if not entity:
        entities[msg["entityId"]] = OrderedDict()

    entities[msg["entityId"]].update({
            msg["key"]: msg["value"]
        })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/entities.yaml"), 'w') as f:
        yaml.dump(entities, f, default_flow_style=False, sort_keys=False)


    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Entity bool value set succesfully"
        },
    )



#edit_entities_bool_value
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_entities_bool_value",
        vol.Required("entities"): str,
        vol.Optional("key"): str,
        vol.Optional("value"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_entities_bool_value(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit entities bool value command."""

    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/entities.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    entitiesInput = json.loads(msg["entities"])

    _LOGGER.warning(entitiesInput)

    for num, entityId in enumerate(entitiesInput, start=1):
        entity = entities.get(entityId)

        if not entity:
            entities[entityId] = OrderedDict()

        entities[entityId].update({
            msg["key"]: msg["value"]
        })

    _LOGGER.warning(entities)

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/entities.yaml"), 'w') as f:
        yaml.dump(entities, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Entities bool value set succesfully"
        },
    )

#add_card
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/add_card",
        vol.Optional("card_data"): str,
        vol.Optional("area_id"): str,
        vol.Optional("domain"): str,
        vol.Optional("position"): str,
        vol.Optional("filename"): str,
        vol.Optional("page"): str,
        vol.Optional("rowSpan"): str,
        vol.Optional("colSpan"): str,
        vol.Optional("rowSpanLg"): str,
        vol.Optional("colSpanLg"): str,
        vol.Optional("rowSpanXl"): str,
        vol.Optional("colSpanXl"): str,

    }
)
@websocket_api.async_response
async def ws_handle_add_card(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle add new card command."""
    
    if not msg["filename"]:
        type = json.loads(msg["card_data"])['type']
    else:
        type = msg["filename"]

    if type:
        filecontent = json.loads(msg["card_data"])

        #filecontent.update({"position": msg["position"]})
        filecontent["col_span"] = msg["colSpan"]
        filecontent["row_span"] = msg["rowSpan"]
        filecontent["col_span_lg"] = msg["colSpanLg"]
        filecontent["row_span_lg"] = msg["rowSpanLg"]
        filecontent["col_span_xl"] = msg["colSpanXl"]
        filecontent["row_span_xl"] = msg["rowSpanXl"]
        filecontent['position'] = msg["position"]

        if(msg["page"] == 'areas'):
            path = "dwains-dashboard/configs/cards/areas/"+msg['area_id']
        elif(msg["page"] == 'devices'):
            path = "dwains-dashboard/configs/cards/devices/"+msg['domain']
        filename = hass.config.path(path+"/"+type+".yaml")

        os.makedirs(os.path.dirname(filename), exist_ok=True) #Create the folder if not exists 

        if not msg["filename"]:
            if os.path.exists(filename) and os.stat(filename).st_size != 0:
                filename = hass.config.path(path+"/"+type+datetime.now().strftime("%Y%m%d%H%M%S")+".yaml")
                os.makedirs(os.path.dirname(filename), exist_ok=True)
        

        ff = open(filename, 'w+')
        yaml.dump(yaml.safe_load(json.dumps(filecontent)), ff, default_flow_style=False)

        hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
        hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

        connection.send_result(
            msg["id"],
            {
                "succesfull": "card added succesfully"
            },
        )

#remove_card
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/remove_card",
        vol.Optional("area_id"): str,
        vol.Optional("domain"): str,
        vol.Optional("filename"): str,
        vol.Optional("page"): str,
    }
)
@websocket_api.async_response
async def ws_handle_remove_card(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle remove card command."""

    if(msg["domain"]):
        path = "dwains-dashboard/configs/cards/devices/"+msg['domain']
    else:
        path = "dwains-dashboard/configs/cards/areas/"+msg['area_id']

    filename = hass.config.path(path+"/"+msg["filename"]+".yaml")

    if os.path.exists(filename):
        os.remove(filename)

    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")
    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "card removed succesfully"
        },
    )


#edit_more_page_button
#NOT USED
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_more_page_button",
        vol.Optional("more_page"): str,
        vol.Optional("name"): str,
        vol.Optional("icon"): str,
        vol.Optional("showInNavbar"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_more_page_button(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle saving editing more page button."""
    
    if(msg["more_page"]):
        if os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["more_page"]+"/config.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["more_page"]+"/config.yaml")).st_size != 0:
            with open(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["more_page"]+"/config.yaml")) as f:
                configFile = yaml.safe_load(f)
        else:
            configFile = OrderedDict()

        configFile.update({
            "name": msg["name"],
            "icon": msg["icon"],
            "show_in_navbar": msg["showInNavbar"],
        })

        with open(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["more_page"]+"/config.yaml"), 'w') as f:
            yaml.dump(configFile, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_homepage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "More page button saved"
        },
    )


#edit_more_page
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_more_page",
        vol.Optional("card_data"): str,
        vol.Optional("foldername"): str,
        vol.Optional("name"): str,
        vol.Optional("icon"): str,
        vol.Optional("showInNavbar"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_more_page(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit more page command."""
    
    if not msg["foldername"]:
        more_page_folder = slugify(msg["name"])
    else:
        more_page_folder = msg["foldername"]

    filecontent = json.loads(msg["card_data"])

    path_to_more_page = hass.config.path("dwains-dashboard/configs/more_pages/"+more_page_folder+"/page.yaml")

    os.makedirs(os.path.dirname(path_to_more_page), exist_ok=True) #Create the folder if not exists 

    if not msg["foldername"]:
        if os.path.exists(path_to_more_page) and os.stat(path_to_more_page).st_size != 0:
            more_page_folder = more_page_folder+datetime.now().strftime("%Y%m%d%H%M%S")
            path_to_more_page = hass.config.path("dwains-dashboard/configs/more_pages/"+more_page_folder+"/page.yaml")
            os.makedirs(os.path.dirname(path_to_more_page), exist_ok=True)
    

    ff = open(path_to_more_page, 'w+')
    yaml.dump(yaml.safe_load(json.dumps(filecontent)), ff, default_flow_style=False)

    #config.yaml
    configFile = OrderedDict()
    configFile.update({
        "name": msg["name"],
        "icon": msg["icon"],
        "show_in_navbar": msg["showInNavbar"],
    })

    with open(hass.config.path("dwains-dashboard/configs/more_pages/"+more_page_folder+"/config.yaml"), 'w') as f:
        yaml.dump(configFile, f, default_flow_style=False, sort_keys=False)
    #end config.yaml

    #call reload config to rebuild the yaml for pages too

    hass.bus.async_fire("dwains_dashboard_reload")
    hass.bus.async_fire("dwains_dashboard_navigation_card_reload")

    #hass.services.call(DOMAIN, "reload")

    reload_configuration(hass)

    connection.send_result(
        msg["id"],
        {
            "succesfull": "More page saved succesfully"
        },
    )


#remove_more_page
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/remove_more_page",
        vol.Required("foldername"): str,
    }
)
@websocket_api.async_response
async def ws_handle_remove_more_page(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle remove more page command."""

    path_to_more_page = hass.config.path("dwains-dashboard/configs/more_pages/"+msg["foldername"]+"/page.yaml")

    if os.path.exists(path_to_more_page):
        #remove folder and content
        shutil.rmtree(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["foldername"]), ignore_errors=True)

    hass.bus.async_fire("dwains_dashboard_navigation_card_reload")
    reload_configuration(hass)
    hass.bus.async_fire("dwains_dashboard_reload")
    
    connection.send_result(
        msg["id"],
        {
            "succesfull": "More page removed succesfully"
        },
    )



#add_more_page_to_navbar
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/add_more_page_to_navbar",
        vol.Required("more_page"): str,
    }
)
@websocket_api.async_response
async def ws_handle_add_more_page_to_navbar(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle add more page to navbar command."""

    # if os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["more_page"]+"/config.yaml")):
    #     with open(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["more_page"]+"/config.yaml")) as f:
    #         configFile = yaml.safe_load(f)
    #     else:
    #         configFile = OrderedDict()

    #     configFile.update({
    #         "show_in_navbar": "True"
    #     })

    #     with open(hass.config.path("dwains-dashboard/configs/more_pages/"+msg["more_page"]+"/config.yaml"), 'w') as f:
    #         yaml.safe_dump(configFile, f, default_flow_style=False)

    #call reload config to rebuild the yaml for pages too
    hass.bus.async_fire("dwains_dashboard_reload")
    hass.bus.async_fire("dwains_dashboard_navigation_card_reload")

    reload_configuration(hass)

    connection.send_result(
        msg["id"],
        {
            "succesfull": "More page removed succesfully"
        },
    )


#sort_area_button
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/sort_area_button",
        vol.Required("sortData"): str,
        vol.Required("sortType"): str,
    }
)
@websocket_api.async_response
async def ws_handle_sort_area_button(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle sort area buttons command."""

    sortData = json.loads(msg["sortData"])

    sortType = msg["sortType"]

    if os.path.exists(hass.config.path("dwains-dashboard/configs/areas.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/areas.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/areas.yaml")) as f:
            areas = yaml.safe_load(f)
    else:
        areas = OrderedDict()

    for num, area_id in enumerate(sortData, start=1):
        if areas.get(area_id):
            areas[area_id].update({
                sortType: num,
            })
        else:
            areas[area_id] = OrderedDict({
                sortType: num,
            })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/areas.yaml"), 'w') as f:
        yaml.dump(areas, f, default_flow_style=False, sort_keys=False)

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Area buttons sorted succesfully"
        },
    )




#edit_device_bool_value
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/edit_device_bool_value",
        vol.Required("device"): str,
        vol.Optional("key"): str,
        vol.Optional("value"): bool,
    }
)
@websocket_api.async_response
async def ws_handle_edit_device_bool_value(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle edit device bool value command."""

    if os.path.exists(hass.config.path("dwains-dashboard/configs/devices.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/devices.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/devices.yaml")) as f:
            devices = yaml.safe_load(f)
    else:
        devices = OrderedDict()

    entity = devices.get(msg["device"])

    if not entity:
        devices[msg["device"]] = OrderedDict()

    devices[msg["device"]].update({
            msg["key"]: msg["value"]
        })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/devices.yaml"), 'w') as f:
        yaml.dump(devices, f, default_flow_style=False, sort_keys=False)

    hass.bus.async_fire("dwains_dashboard_devicespage_card_reload")

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Device bool value set succesfully"
        },
    )



#sort_device_button
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/sort_device_button",
        vol.Required("sortData"): str,
    }
)
@websocket_api.async_response
async def ws_handle_sort_device_button(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle sort device buttons command."""

    sortData = json.loads(msg["sortData"])

    if os.path.exists(hass.config.path("dwains-dashboard/configs/devices.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/devices.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/devices.yaml")) as f:
            devices = yaml.safe_load(f)
    else:
        devices = OrderedDict()

    for num, device_id in enumerate(sortData, start=1):
        if devices.get(device_id):
            devices[device_id].update({
                "sort_order": num,
            })
        else:
            devices[device_id] = OrderedDict({
                "sort_order": num,
            })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/devices.yaml"), 'w') as f:
        yaml.dump(devices, f, default_flow_style=False, sort_keys=False)

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Device buttons sorted succesfully"
        },
    )

#sort_entity
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/sort_entity",
        vol.Required("sortData"): str,
        vol.Required("sortType"): str,
    }
)
@websocket_api.async_response
async def ws_handle_sort_entity(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle sort entity cards."""

    sortData = json.loads(msg["sortData"])

    sortType = msg["sortType"]

    if os.path.exists(hass.config.path("dwains-dashboard/configs/entities.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/entities.yaml")).st_size != 0:
        with open(hass.config.path("dwains-dashboard/configs/entities.yaml")) as f:
            entities = yaml.safe_load(f)
    else:
        entities = OrderedDict()

    for num, entity_id in enumerate(sortData, start=1):
        if entities.get(entity_id):
            entities[entity_id].update({
                sortType: num,
            })
        else:
            entities[entity_id] = OrderedDict({
                sortType: num,
            })

    if not os.path.exists(hass.config.path("dwains-dashboard/configs")):
        os.makedirs(hass.config.path("dwains-dashboard/configs"))

    with open(hass.config.path("dwains-dashboard/configs/entities.yaml"), 'w') as f:
        yaml.dump(entities, f, default_flow_style=False, sort_keys=False)

    connection.send_result(
        msg["id"],
        {
            "succesfull": "Entity cards sorted succesfully"
        },
    )



#sort_more_page
@websocket_api.websocket_command(
    {
        vol.Required("type"): "dwains_dashboard/sort_more_page",
        vol.Required("sortData"): str,
    }
)
@websocket_api.async_response
async def ws_handle_sort_more_page(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Handle sort more pages command."""

    sortData = json.loads(msg["sortData"])

    for num, more_page in enumerate(sortData, start=1):
        if os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+more_page+"/config.yaml")) and os.stat(hass.config.path("dwains-dashboard/configs/more_pages/"+more_page+"/config.yaml")).st_size != 0:
            with open(hass.config.path("dwains-dashboard/configs/more_pages/"+more_page+"/config.yaml")) as f:
                configFile = yaml.safe_load(f)
        else:
            configFile = OrderedDict()

        configFile.update({
            "sort_order": num,
        })

        with open(hass.config.path("dwains-dashboard/configs/more_pages/"+more_page+"/config.yaml"), 'w') as f:
            yaml.dump(configFile, f, default_flow_style=False, sort_keys=False)

    connection.send_result(
        msg["id"],
        {
            "succesfull": "More pages sorted succesfully"
        },
    )


async def async_setup_entry(hass, config_entry):
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

    return True