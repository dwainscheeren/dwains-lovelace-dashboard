# This is a fork from lovelace_gen
# Many thanks to Thomasloven! :D

import os
import logging
import json
import io
import time
from collections import OrderedDict

import jinja2

from homeassistant.util.yaml import loader
from homeassistant.exceptions import HomeAssistantError

DOMAIN = "dwains_theme"
_LOGGER = logging.getLogger(__name__)

def fromjson(value):
    return json.loads(value)

jinja = jinja2.Environment(loader=jinja2.FileSystemLoader("/"))

jinja.filters['fromjson'] = fromjson

dwains_theme_config = {}
dwains_theme_translations = {}
dwains_theme_icons = {}
dwains_theme_information = {}

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
                "_d_t_information": dwains_theme_information
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
    #Load main config
    dwains_theme_config.update(config.get("dwains_theme")["configuration"]);
    _LOGGER.warning(dwains_theme_config);

    #Load translations
    language = dwains_theme_config["global"]["language"];
    dwains_theme_translations.update(config.get("dwains_theme")["translations"][language]);

    #Load information
    dwains_theme_information.update(config.get("dwains_theme")["information"]);

    #Load icons
    if ("icons" in config.get("dwains_theme")):
        if ("icons" in config.get("dwains_theme")["icons"]):
            icons_config = config.get("dwains_theme")["icons"]["icons"];
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
        dwains_theme_icons = {} #Make it empty so it can go from used to non-used.
        if isinstance(icons, dict):
            if ("icons" in icons):
                if isinstance(icons["icons"], dict):
                    dwains_theme_icons.update(icons["icons"]);

        #Reload lovelace
        _LOGGER.debug("reload lovelace")
        await hass.data["lovelace"].async_load(True)

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