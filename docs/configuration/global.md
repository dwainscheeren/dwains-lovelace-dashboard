
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

The global section. Dwains Dashboard uses this to build the pages.

## Global information

| Name | Type | Required | Example | Description |
|---------------------|--------|----------|----------------------------------|---------------------------------------------------------------------------------------------|
| weather | string | No | weather.dark_sky<br>**Make sure you got the weather component installed!** | Weather (Ex: [Dark Sky Weather Integration](https://www.home-assistant.io/integrations/weather.darksky/)) |
| outside_temperature | string | No | sensor.dark_sky_temperature | Outside temperature (Ex: [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| outside_humidity | string | No | sensor.dark_sky_humidity | Outside humidity (Ex: [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| alarm | string | No | alarm_control_panel.alarm_sys | Alarm entity. [Read more here](https://www.home-assistant.io/integrations/manual/) |
| inside_temperature | string | No | climate.living_room | Inside temperature sensor |
| batery_empty_string | list | No | See example below | A list of states the empty batteries are shown for |
| safety_ok_strings | list | No | See example below | [Read more about safety for rooms here](rooms.md) |
| show_covers | string | No | Default to open  | Use closed or partly_closed. For example in the header it default shows all open covers if you only want to see closed covers use set this key and use closed |
| custom_popups | array | No | See example below | [Read more about custom popups here](../addons/popup.md) | 


## Global example
```YAML
global:
  weather: weather.dark_sky
  outside_temperature: sensor.dark_sky_temperature
  outside_humidity: sensor.dark_sky_humidity
  alarm: alarm_control_panel.alarm_system
  inside_temperature: climate.living_room
  battery_empty_strings:
    - "unavailable"
  safety_ok_strings: 
    - "Ok"
    - "Idle"
    - "off"
  show_covers: closed

  custom_popups:
    - domain: cover
      path: 'dwains-dashboard/addons/popups/cover/popup.yaml'
```  