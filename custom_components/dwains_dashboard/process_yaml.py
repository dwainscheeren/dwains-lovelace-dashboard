import logging
import yaml
import os
import logging
import json
import io
import time
from collections import OrderedDict
import jinja2
import shutil

from homeassistant.util.yaml import loader
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN, VERSION

_LOGGER = logging.getLogger(__name__)

def fromjson(value):
    return json.loads(value)

jinja = jinja2.Environment(loader=jinja2.FileSystemLoader("/"))

jinja.filters['fromjson'] = fromjson

dwains_dashboard_config = {}
dwains_dashboard_translations = {}
dwains_dashboard_icons = {}
dwains_dashboard_global = {}
dwains_dashboard_customize = {}
llgen_config = {}

def load_yaml(fname, args={}):
    try:
        process_yaml = False
        with open(fname, encoding="utf-8") as f:
            if f.readline().lower().startswith(("# dwains_dashboard", "# dwains_theme", "# lovelace_gen")):
                process_yaml = True

        if process_yaml:
            stream = io.StringIO(jinja.get_template(fname).render({
                **args, 
                "_dd_config": dwains_dashboard_config, 
                "_dd_trans": dwains_dashboard_translations,
                "_dd_icons": dwains_dashboard_icons,
                "_dd_global": dwains_dashboard_global,
                "_dd_customize": dwains_dashboard_customize,
                "_global": llgen_config
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

def process_yaml(hass, config_entry):

    #_LOGGER.warning('Start of function to process all yaml files!')

    #Check for HKI intallation
    if os.path.exists(hass.config.path("homekit-infused/user/config")):
        _LOGGER.warning("HKI Installed!")
        for fname in loader._find_files(hass.config.path("homekit-infused/user/config"), "*.yaml"):
            loaded_yaml = load_yaml(fname)
            if isinstance(loaded_yaml, dict):
                llgen_config.update(loaded_yaml)

    #_LOGGER.error(llgen_config)


    for fname in os.listdir(hass.config.path("custom_components/dwains_dashboard/installation/configs")):
        if not os.path.isfile(hass.config.path("dwains-dashboard/configs/"+fname)):
            _LOGGER.debug("Copy: "+fname)
            os.makedirs(hass.config.path("dwains-dashboard/addons"), exist_ok=True)
            os.makedirs(hass.config.path("dwains-dashboard/configs"), exist_ok=True)
            shutil.copy2(
                hass.config.path("custom_components/dwains_dashboard/installation/configs/"+fname),
                hass.config.path("dwains-dashboard/configs")
            )

    if os.path.exists(hass.config.path("dwains-dashboard/configs")):
        
        entity_popups = OrderedDict()
        # Get custom entity popups if set
        if ("customize_path" in config_entry.options):
            if os.path.exists(hass.config.path(config_entry.options["customize_path"])):
                #_LOGGER.warning("Process customize.yaml")
                customize_file = load_yaml(hass.config.path(config_entry.options["customize_path"]))

                for key, values in customize_file.items():
                    if ("dwains_dashboard_popup" in values):
                        data = values.get("dwains_dashboard_popup_data", "")
                        title = values.get("dwains_dashboard_popup_title", "")
                        entity_popups[key] = OrderedDict(
                            {
                                "popup_path": values["dwains_dashboard_popup"],
                                "popup_data": data,
                                "popup_title": title
                            }
                        )

        dwains_dashboard_customize.update(
            [
                ("entity_popups", entity_popups)
            ]
        )
        #_LOGGER.error(dwains_dashboard_customize)

        #Main config
        for fname in loader._find_files(hass.config.path("dwains-dashboard/configs/"), "*.yaml"):
            loaded_yaml = load_yaml(fname)
            if isinstance(loaded_yaml, dict):
                dwains_dashboard_config.update(loaded_yaml)
        #_LOGGER.error(dwains_dashboard_config)


        #Set defaults for safety_ok_strings and battery_empty_strings if not set in globals.yaml
        if ("safety_ok_strings" not in dwains_dashboard_config["global"]):
            dwains_dashboard_config["global"].update(
                [
                    ("safety_ok_strings", ['Ok', 'Idle', 'off'])
                ]
            )
        if ("battery_empty_strings" not in dwains_dashboard_config["global"]):
            dwains_dashboard_config["global"].update(
                [
                    ("battery_empty_strings", ['unavailable'])
                ]
            )

        #_LOGGER.error(dwains_dashboard_config)
        

        #Translations
        language = dwains_dashboard_config["global"]["language"];
        translations = load_yaml(hass.config.path("custom_components/dwains_dashboard/lovelace/translations/"+language+".yaml"))

        dwains_dashboard_translations.update(translations[language])

        #Load themes
        themes = OrderedDict()
        for fname in loader._find_files(hass.config.path("custom_components/dwains_dashboard/lovelace/themes"), "*.yaml"):
            loaded_yaml = load_yaml(fname)
            if isinstance(loaded_yaml, dict):
                themes.update(loaded_yaml)
        
        if ("theme" in config_entry.options):
            config_theme = config_entry.options["theme"]
        else:
            config_theme = "Auto Mode (Dark/Light)"

        if ("primary_color" in config_entry.options):
            config_primary_color = config_entry.options["primary_color"]
        else:
            config_primary_color = ""


        dwains_dashboard_global.update(
            [
                ("version", VERSION),
                ("theme", config_theme),
                ("primary_color", config_primary_color),
                ("themes", json.dumps(themes))
            ]
        )

        #_LOGGER.error(dwains_dashboard_global)

        #Icons
        icons = load_yaml(hass.config.path("dwains-dashboard/configs/icons.yaml"))
        dwains_dashboard_icons.clear()
        if isinstance(icons, dict):
            if ("icons" in icons):
                dwains_dashboard_icons.update(icons["icons"]);
        
        hass.bus.async_fire("dwains_dashboard_reload")

    async def handle_reload(call):
        #Service call to reload Dwains Theme config
        _LOGGER.debug("Reload Dwains Dashboard Configuration")

        reload_configuration(hass)

    # Register service dwains_dashboard.reload
    hass.services.async_register(DOMAIN, "reload", handle_reload)


    async def handle_installed(call):
        #Service call to Change the installed key in global config for Dwains dashboard
        _LOGGER.debug("Handle installed")

        #Copy example config folder to root config path
        # from distutils.dir_util import copy_tree
        # fromDirectory = hass.config.path("custom_components/dwains_dashboard/installation/configs")
        # toDirectory = hass.config.path("dwains-dashboard/configs")
        # copy_tree(fromDirectory, toDirectory)


        doc = load_yaml(hass.config.path("dwains-dashboard/configs/global.yaml"))
        doc['global']['installed'] = 'true'
        with open(hass.config.path("dwains-dashboard/configs/global.yaml"), 'w') as f:
            yaml.safe_dump(doc, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

        reload_configuration(hass)

    # Register service dwains_dashboard.installed
    hass.services.async_register(DOMAIN, "installed", handle_installed)

def reload_configuration(hass):
    if os.path.exists(hass.config.path("dwains-dashboard/configs")):
        #Main config
        config_new = OrderedDict()
        for fname in loader._find_files(hass.config.path("dwains-dashboard/configs/"), "*.yaml"):
            loaded_yaml = load_yaml(fname)
            if isinstance(loaded_yaml, dict):
                config_new.update(loaded_yaml)

        dwains_dashboard_config.update(config_new)

        #Set defaults for safety_ok_strings and battery_empty_strings if not set in globals.yaml
        if ("safety_ok_strings" not in dwains_dashboard_config["global"]):
            dwains_dashboard_config["global"].update(
                [
                    ("safety_ok_strings", ['Ok', 'Idle', 'off'])
                ]
            )
        if ("battery_empty_strings" not in dwains_dashboard_config["global"]):
            dwains_dashboard_config["global"].update(
                [
                    ("battery_empty_strings", ['unavailable'])
                ]
            )

        #Translations
        language = dwains_dashboard_config["global"]["language"];
        translations = load_yaml(hass.config.path("custom_components/dwains_dashboard/lovelace/translations/"+language+".yaml"))

        dwains_dashboard_translations.update(translations[language])

        #Icons
        icons = load_yaml(hass.config.path("dwains-dashboard/configs/icons.yaml"))
        dwains_dashboard_icons.clear()
        if isinstance(icons, dict):
            if ("icons" in icons):
                dwains_dashboard_icons.update(icons["icons"]);

    hass.bus.async_fire("dwains_dashboard_reload")