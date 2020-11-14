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

# Icons `icons.yaml`

**This file is required but can be empty!**

With this file you can override the default icons that are loaded in Dwains Theme.

[Take a look here](../how-tos/how-to-choose-icon.md) on how to choose an icon and how to install Font Awesome.

## Icons information

| Name | Type | Default (fallback) | Description |
|------------------------|--------|--------------------------------|-------------------------------------|
| menu_back | string | mdi:chevron-left | Back icon in the header |
| menu_home | string | mdi:home | Home page icon |
| menu_lights | string | mdi:lightbulb-group | Lights page icon |
| menu_scenes | string | mdi:play-circle-outline | Scenes page icon |
| menu_cameras | string | mdi:cctv | Cameras page icon (default for dynamics page) |
| menu_more_page | string | mdi:menu | More page icon |
| light_on | string | mdi:lightbulb | Light on icon |
| light_off | string | mdi:lightbulb-outline | Light off icon |
| climate | string | mdi:thermometer | Climate icon |
| climate_heating | string | mdi:radiator | Climate heating icon |
| climate_auto | string | mdi:clock-check | Climate automode icon |
| climate_off | string | mdi:radiator-off | Climate off icon |
| climate_heat | string | mdi:radiator | Climate heat icon |
| climate_cool | string | mdi:snowflake | Climate cool icon |
| climate_heat_cool | string | mdi:sync | Climate heat/cool icon |
| climate_dry | string | mdi:water-percent | Climate dry icon |
| climate_fan_only | string | mdi:fan | Climate fan only icon |
| window_open | string | mdi:window-open-variant | Window open icon |
| window_closed | string | mdi:window-closed-variant | Window closed icon |
| door_open | string | mdi:door-open | Door open icon |
| door_closed | string | mdi:door-closed | Door closed icon |
| motion_on | string | mdi:motion-sensor | Motion on icon |
| motion_off | string | fas:walking | Motion off icon |
| cover | string | mdi:window-shutter | Cover icon |
| device | string | mdi:power-plug | Device icon |
| media_player | string | mdi:play-pause | Media player icon |
| vacuum | string | mdi:robot-vacuum | Vacuum icon |
| plant | string | mdi:flower | Plant icon |
| alarm_disarmed | string | mdi:lock-open-variant-outline | Alarm disarmed icon |
| alarm_pending | string | mdi:home-lock | Alarm pending icon |
| alarm_armed_away | string | mdi:home-lock | Alarm armed away mode |
| alarm_armed_home | string | mdi:home-lock | Alarm armed home mode |
| more_page_house_information | string | mdi:home | House information icon on more page |
| more_page_house_data | string | mdi:information-outline | House all data icon on more page |
| more_page_settings | string | mdi:cogs | Theme settings icon on more page |
| more_page_list_chevron | string | mdi:chevron-right | Right chevron icon on more page |

## Icons example
```YAML
icons:
  #Menu icons
  menu_back: 'fas:smile-wink'
  menu_home: 'fas:smile-wink'
```    