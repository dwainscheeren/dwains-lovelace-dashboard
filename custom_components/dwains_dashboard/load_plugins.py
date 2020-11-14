from aiohttp import web
from homeassistant.components.http import HomeAssistantView
import os.path
import logging

DATA_EXTRA_MODULE_URL = 'frontend_extra_module_url'

_LOGGER = logging.getLogger(__name__)


def load_plugins(hass, name):
    if DATA_EXTRA_MODULE_URL not in hass.data:
        hass.data[DATA_EXTRA_MODULE_URL] = set()
    url_set = hass.data[DATA_EXTRA_MODULE_URL]

    url_set.add("/dwains_dashboard/js/dwains-dashboard.js")
    #url_set.add("/dwains_dashboard/sidebar/dwains-sidebar.js")

    url_set.add("/dwains_dashboard/cards/button-card/button-card.js")
    url_set.add("/dwains_dashboard/cards/light-entity-card/light-entity-card.js")

    url_set.add("/dwains_dashboard/cards/dwains-header-card/dwains-header-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-heading-card/dwains-heading-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-wrapper-card/dwains-wrapper-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-flexbox-card/dwains-flexbox-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-hash-switch-card/dwains-hash-switch-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-weather-card/dwains-weather-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-notification-card/dwains-notification-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-collapse-card/dwains-collapse-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-cover-card/dwains-cover-card.js")
    url_set.add("/dwains_dashboard/cards/dwains-auto-entities-card/dwains-auto-entities-card.js")

    # button_card_path = f"{hass.config.path()}/www/community/button-card/button-card.js"
    # if os.path.isfile(button_card_path):
    #     _LOGGER.warning('Ja, je hebt HACS en button card geinstalleerd!')
    # else:
    #     _LOGGER.warning('Nee')

    hass.http.register_view(ModView(hass, name))

class ModView(HomeAssistantView):

    requires_auth = False

    def __init__(self, hass, domain):
        self.name = domain+"_server"
        self.url = '/'+domain+'/{filename:.*}'
        self.config_dir = hass.config.path()
        self.domain = domain

    async def get(self, request, filename):
        path = os.path.join(self.config_dir, 'custom_components', self.domain, filename)
        filecontent = ""

        try:
            with open(path, mode="r", encoding="utf-8", errors="ignore") as localfile:
                filecontent = localfile.read()
                localfile.close()
        except Exception as exception:
            return web.Response(status=404)

        return web.Response(body=filecontent, content_type="text/javascript", charset="utf-8")

    # name = "dwains_dashboard_script"
    # requires_auth = False

    # def __init__(self, hass, url):
    #     self.url = url
    #     self.config_dir = hass.config.path()

    # async def get(self, request):
    #     path = "{}/custom_components/dwains_dashboard/cards/dwains-cover-card/dwains-cover-card.js".format(self.config_dir)

    #     filecontent = ""

    #     try:
    #         with open(path, mode="r", encoding="utf-8", errors="ignore") as localfile:
    #             filecontent = localfile.read()
    #             localfile.close()
    #     except Exception as exception:
    #         pass

    #     return web.Response(body=filecontent, content_type="text/javascript", charset="utf-8")
