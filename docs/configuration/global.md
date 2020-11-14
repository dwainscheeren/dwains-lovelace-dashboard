
[< Go back to Home](../index.md)

### [Configuration](index.md)
* [global.yaml](global.md)
* [rooms.yaml](rooms.md)
* [house_information.yaml](house_information.md)
* [scenes.yaml](scenes.md)
* [cameras.yaml](cameras.md)
* [persons.yaml](persons.md)
* [icons.yaml](icons.md)
* [more_page.yaml](more_page.md)

---

# Global `global.yaml` 

**This file is required!**

The global section. Dwains theme uses this to build the pages.

## Global information

| Name | Type | Required | Example | Description |
|---------------------|--------|----------|----------------------------------|---------------------------------------------------------------------------------------------|
| language | string | Yes! | English (en), Dutch (nl), German (de), French (fr), Danish (da), Italian (it), Spanish (es), Swedish (se) | Other languages coming soon.. |
| weather | string | No | weather.dark_sky<br>**Make sure you got the weather component installed!** | Weather (Ex: [Dark Sky Weather Integration](https://www.home-assistant.io/integrations/weather.darksky/)) |
| outside_temperature | string | No | sensor.dark_sky_temperature | Outside temperature (Ex: [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| outside_humidity | string | No | sensor.dark_sky_humidity | Outside humidity (Ex: [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| alarm | string | No | alarm_control_panel.alarm_sys | Alarm entity. [Read more here](https://www.home-assistant.io/integrations/manual/) |
| inside_temperature | string | No | climate.living_room | Inside temperature sensor |
| safety_ok_strings | list | No | ["Ok", "Idle", "off"] | [Read more here](https://dwainscheeren.github.io/lovelace-dwains-theme/configuration/rooms.html) |


## Global example
```YAML
global:
  language: en
  weather: weather.dark_sky
  outside_temperature: sensor.dark_sky_temperature
  outside_humidity: sensor.dark_sky_humidity
  alarm: alarm_control_panel.alarm_system
  inside_temperature: climate.living_room
  safety_ok_strings: ["Ok", "Idle", "off"]
```  