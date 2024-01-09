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

from homeassistant.util.yaml import Secrets, loader
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN, VERSION

_LOGGER = logging.getLogger(__name__)

def fromjson(value):
    return json.loads(value)

jinja = jinja2.Environment(loader=jinja2.FileSystemLoader("/"))

jinja.filters['fromjson'] = fromjson

dwains_dashboard_more_pages = {}
llgen_config = {}

def load_yamll(fname, secrets = None, args={}):
    try:
        process_yaml = False
        with open(fname, encoding="utf-8") as f:
            if f.readline().lower().startswith(("# dwains_dashboard", "# dwains_theme", "# lovelace_gen", "#dwains_dashboard")):
                process_yaml = True

        if process_yaml:
            stream = io.StringIO(jinja.get_template(fname).render({
                **args, 
                "_dd_more_pages": dwains_dashboard_more_pages,
                "_global": llgen_config
                }))
            stream.name = fname
            return loader.yaml.load(stream, Loader=lambda _stream: loader.PythonSafeLoader(_stream, secrets)) or OrderedDict()
        else:
            with open(fname, encoding="utf-8") as config_file:
                return loader.yaml.load(config_file, Loader=lambda stream: loader.PythonSafeLoader(stream, secrets)) or OrderedDict()
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
        return loader._add_reference(load_yamll(fname, ldr.secrets, args=args), ldr, node)
    except FileNotFoundError as exc:
        _LOGGER.error("Unable to include file %s: %s", fname, exc);
        raise HomeAssistantError(exc)

loader.load_yaml = load_yamll
loader.PythonSafeLoader.add_constructor("!include", _include_yaml)

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
    if os.path.exists(hass.config.path("hki-user/config")):
        _LOGGER.warning("HKI Installed!")
        for fname in loader._find_files(hass.config.path("hki-user/config"), "*.yaml"):
            loaded_yaml = load_yamll(fname)
            if isinstance(loaded_yaml, dict):
                llgen_config.update(loaded_yaml)

    if os.path.exists(hass.config.path("dwains-dashboard/configs")):
        if os.path.isdir(hass.config.path("dwains-dashboard/configs/more_pages")):
            for subdir in os.listdir(hass.config.path("dwains-dashboard/configs/more_pages")):
                #Lets check if there is a page.yaml in the more_pages folder
                if os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/page.yaml")):
                    #Page.yaml exists now check if there is a config.yaml otherwise create it
                    if not os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml")):
                        with open(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml"), 'w') as f:
                            page_config = OrderedDict()
                            page_config.update({
                                "name": subdir,
                                "icon": "mdi:puzzle"
                            })
                            yaml.safe_dump(page_config, f, default_flow_style=False)
                            dwains_dashboard_more_pages[subdir] = {
                                "name": subdir,
                                "icon": "mdi:puzzle",
                                "path": "dwains-dashboard/configs/more_pages/"+subdir+"/page.yaml",
                            }
                    else:
                        with open(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml")) as f:
                            filecontent = yaml.safe_load(f)
                            if "name" in filecontent and "icon" in filecontent:
                                dwains_dashboard_more_pages[subdir] = {
                                    "name": filecontent["name"],
                                    "icon": filecontent["icon"],
                                    "path": "dwains-dashboard/configs/more_pages/"+subdir+"/page.yaml",
                                }
        
        hass.bus.async_fire("dwains_dashboard_reload")

    async def handle_reload(call):
        #Service call to reload Dwains Theme config
        _LOGGER.warning("Reload Dwains Dashboard Configuration")

        reload_configuration(hass)

    # Register service dwains_dashboard.reload
    hass.services.async_register(DOMAIN, "reload", handle_reload)

def reload_configuration(hass):
    if os.path.exists(hass.config.path("dwains-dashboard/configs")):
        if os.path.isdir(hass.config.path("dwains-dashboard/configs/more_pages")):
            for subdir in os.listdir(hass.config.path("dwains-dashboard/configs/more_pages")):
                #Lets check if there is a page.yaml in the more_pages folder
                if os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/page.yaml")):
                    #Page.yaml exists now check if there is a config.yaml otherwise create it
                    if not os.path.exists(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml")):
                        with open(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml"), 'w') as f:
                            page_config = OrderedDict()
                            page_config.update({
                                "name": subdir,
                                "icon": "mdi:puzzle"
                            })
                            yaml.safe_dump(page_config, f, default_flow_style=False)
                            dwains_dashboard_more_pages[subdir] = {
                                "name": subdir,
                                "icon": "mdi:puzzle",
                                "path": "dwains-dashboard/configs/more_pages/"+subdir+"/page.yaml",
                            }
                    else:
                        with open(hass.config.path("dwains-dashboard/configs/more_pages/"+subdir+"/config.yaml")) as f:
                            filecontent = yaml.safe_load(f)
                            dwains_dashboard_more_pages[subdir] = {
                                "name": filecontent["name"],
                                "icon": filecontent["icon"],
                                "path": "dwains-dashboard/configs/more_pages/"+subdir+"/page.yaml",
                            }

    hass.bus.async_fire("dwains_dashboard_reload")