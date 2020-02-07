
[< Go back to Home](../index.md)

### [Configuration](index.md)
* [global.yaml](global.md)
* [rooms.yaml](rooms.md)
* [house_information.yaml](house_information.md)
* [scenes.yaml](scenes.md)
* [cameras.yaml](cameras.md)
* [persons.yaml](persons.md)
* [icons.yaml](icons.md)

---

# Global `global.yaml` 

**This file is required!**

The global section. Dwains theme uses this to build the pages.

## Global information

| Name | Type | Required | Example | Description |
|---------------------|--------|----------|----------------------------------|---------------------------------------------------------------------------------------------|
| language | string | Yes! | en | Language of my theme. It only supports English (en) and Dutch (nl) for now! Other languages coming soon.. |
| weather | string | No | weather.dark_sky | Weather (I use [Dark Sky Weather](https://www.home-assistant.io/integrations/weather.darksky/)) |
| outside_temperature | string | No | sensor.dark_sky_temperature | Outside temperature (I use [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| outside_humidity | string | No | sensor.dark_sky_humidity | Outside humidity (I use [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| alarm | string | No | alarm_control_panel.alarm_sys | Alarm entity. [Read more here](https://www.home-assistant.io/integrations/manual/) |
| inside_temperature | string | No | climate.living_room | Inside temperature sensor |


## Global example
```YAML
global:
  language: en
  weather: weather.dark_sky
  outside_temperature: sensor.dark_sky_temperature
  outside_humidity: sensor.dark_sky_humidity
  alarm: alarm_control_panel.alarm_system
  inside_temperature: climate.living_room
```  