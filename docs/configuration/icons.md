[< Go back to Home](../index.md)

### Configuration
* [global.yaml](global.md)
* [rooms.yaml](rooms.md)
* [house_information.yaml](house_information.md)
* [scenes.yaml](scenes.md)
* [cameras.yaml](cameras.md)
* [persons.yaml](persons.md)
* [icons.yaml](icons.md)

---

# Icons `icons.yaml`

**This file is optional**

With this file you can override the default icons that are loaded in Dwains Theme.

## Icons information

| Name | Type | Default (fallback) | Description |
|------------------------|--------|--------------------------------|-------------------------------------|
| menu_back | string | fas:chevron-left | Back icon in the header |
| menu_home | string | mdi:home | Home page icon |
| menu_lights | string | mdi:lightbulb-group | Lights page icon |
| menu_scenes | string | mdi:play-circle-outline | Scenes page icon |
| menu_cameras | string | mdi:cctv | Cameras page icon |
| menu_more | string | mdi:menu | More page icon |
| light_on | string | fas:lightbulb | Light on icon |
| light_off | string | far:lightbulb | Light off icon |
| climate | string | fas:thermometer-three-quarters | Climate icon |
| climate_heating | string | mdi:radiator | Climate heating icon |
| climate_auto | string | far:clock | Climate automode icon |
| climate_off | string | fas:power-off | Climate off icon |
| climate_heat | string | fas:fire-alt | Climate heat icon |
| window_open | string | mdi:window-open-variant | Window open icon |
| window_closed | string | mdi:window-closed-variant | Window closed icon |
| door_open | string | mdi:door-open | Door open icon |
| door_closed | string | mdi:door-closed | Door closed icon |
| motion_on | string | mdi:motion-sensor | Motion on icon |
| motion_off | string | far:walking | Motion off icon |
| cover | string | mdi:window-shutter | Cover icon |
| device | string | mdi:power-plug | Device icon |
| media_player | string | fas:play | Media player icon |
| vacuum | string | mdi:robot-vacuum | Vacuum icon |
| plant | string | fas:leaf | Plant icon |
| alarm_disarmed | string | mdi:lock-open-variant-outline | Alarm disarmed icon |
| alarm_pending | string | mdi:home-lock | Alarm pending icon |
| alarm_armed_away | string | mdi:home-lock | Alarm armed away mode |
| alarm_armed_home | string | mdi:home-lock | Alarm armed home mode |
| more_house_information | string | fas:home | House information icon on more page |
| more_all_data | string | fas:clinic-medical | House all data icon on more page |
| more_settings | string | fas:cogs | Theme settings icon on more page |
| more_list_chevron | string | mdi:chevron-right | Right chevron icon on more page |

## Icons example
```YAML
icons:
  #Menu icons
  menu_back: 'fas:smile-wink'
  menu_home: 'fas:smile-wink'
```    