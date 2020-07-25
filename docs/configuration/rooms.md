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
* [dynamic_page.yaml](dynamic_page.md)

---

# Rooms `rooms.yaml`

**This file is required!**

Rooms sections, all rooms of your house. This is where my theme is all about :D

## Rooms information

| Name         | Type                         | Default            | Example                                                              | Description                                                                       |
|--------------|------------------------------|--------------------|----------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| name         | string                       | Required           | Hallway                                                              | Room name                                                                         |
| icon         | string                       | mdi:square-outline | fas:key                                                              | Room icon                                                                         |
| light        | string <br>(entity or group) | Not required       | light.hallway<br> or <br>group.hallway_lights                        | Single light entity or group entity (with only light entities inside)             |
| lock     | string <br>(entity)          | Not required       | lock.halway                                               | Lock entity                                                            |
| temperature  | string  (entity)             | Not required       | sensor.hallway_temperature                                           | Temperature sensor entity                                                         |
| climate      | string <br>(entity)          | Not required       | climate.hallway_climate                                              | Climate entity                                                                    |
| humidity     | string <br>(entity)          | Not required       | sensor.halway_humidity                                               | Humidity sensor entity                                                            |
| pressure     | string <br>(entity)          | Not required       | sensor.halway_pressure                                               | Pressure sensor entity                                                            |
| motion       | string <br>(entity or group) | Not required       | binary_sensor.hallway_motion<br> or <br>group.hallway_motion_sensors | Motion sensor(s). Can be binary_sensor or a group of binary_sensors               |
| door         | string <br>(entity or group) | Not required       | binary_sensor.hallway_door<br> or <br>group.hallway_doors            | Door contact(s). Can be binary_sensor or a group of binary_sensors                |
| window       | string <br>(entity or group) | Not required       | binary_sensor.hallway_window<br> or <br>group.hallway_windows        | Window sensor(s). Can be binary_sensor or a group of binary_sensors               |
| cover        | string <br>(entity or group) | Not required       | cover.hallway<br> or <br>group.hallway_covers                        | Cover(s) (blinds, rolling_shutters etc). Can be single cover or a group of covers |
| vacuum       | object                       | Not required       | See room vacuum below                                                | Vacuum                                                                            |
| plant        | string <br>(entity or group) | Not required       | plant.hallway_plant<br> or <br>group.hallway_plants                  | Plant(s). Can be single plant or a group of plants                                |
| media_player | string <br>(entity or group) | Not required       | media_player.hallway_tv<br> or <br>group.hallway_tvs                 | Media player(s). Can be single media_player or a group of media_players           |
| device | string <br>(entity or group) | Not required       | binary_sensor.dishwasher<br> or <br>group.kitchen_devices                 | Device(s). Can be single device (sensor, switch, binary_sensor etc) or a group of devices           |
| safety       | string <br>(entity or group) | Not required       | binary_sensor.smoke_alarm<br> or <br>group.kitchen_smoke             | Device(s). Can be single device (sensor, switch, binary_sensor etc) or a group of devices. Configuration for ok states is in [global.yaml](https://dwainscheeren.github.io/lovelace-dwains-theme/configuration/global.html)           |
| more_entities | object | Optional | See example below | If you want to show some more entities for a room (opens in new view, accessible from icon in header top right). |
| page_entities | object | Optional | See example below | If you want to show some additional entities on room page (visibile on room page itself). |
| addons       | object                       | Not required       |                                                                      | Rooms support addons, they are called *rooms addons.* [Read more here](../addons/rooms.md)                                                                       |

## Rooms example
```YAML
rooms:
  - name: Hallway
    icon: fas:key
    light: light.hallway
    temperature: sensor.hallway_temperature
    climate: climate.hallway_climate
    humidity: sensor.halway_humidity
    motion: binary_sensor.hallway_sensor_motion
    door: binary_sensor.hallway_door_contact
    safety: sensor.kitchen_nest_protect_smoke_ok
    window: binary_sensor.hallway_window_contact
    cover: group.hallway_covers
    vacuum: 
      entity: vacuum.rockrobo
      camera: camera.rockrobo_map
    plant: plant.hallway_plant
    media_player: media_player.awesome_hallway_tv
  - name: Garage
    icon: fas:garage
    light: group.garage_lights
    door: group.garage_doors
    more_entities:
      entities:
        - entity: sensor.smokedetector_battery_level
        - entity: sensor.gasmeter_battery_level
  - name: Bedroom
    icon: fal:bed
    more_entities:
      columns: 2 #optional
      entities:
        - entity: sensor.name1
        - entity: sensor.name2
    page_entities:
      columns: 1 #optional
      show_title: 'false' #optional
      entities:
        - entity: sensor.name1
        - entity: sensor.name2
```    

### More_entities object

Example for using some additional entities in a room (opens in new view, accessible from icon in header top right):
```YAML
    more_entities:
      columns: 2 #optional
      entities:
        - entity: sensor.name1
        - entity: sensor.name2
```

### Page_entities object

Example for showing some entities in the room page itself:
```YAML
    page_entities:
      columns: 1 #optional
      show_title: 'false' #optional
      entities:
        - entity: sensor.name1
        - entity: sensor.name2
```

### Vacuum object

| Name | Type | Default | Example | Description |
|----------|--------|---------------------|---------------------|---------------------------------------------------------|
| advanced_view | string | false | 'true' | Enable advance view (read below) |
| entity | string | Required | vacuum.rockrobo | entity_id |
| camera | string | Not required | camera.rockrobo_map | If you have rooted your roborock paste the camera here. |

Example for vacuum inside a room:
```YAML
    vacuum: 
      advanced_view: 'true'
      entity: vacuum.rockrobo
      camera: camera.rockrobo_map
```

The advanced view loads an custom lovelace card with a live map (if you have a camera entity) or some nice animation of your vacuum. 

To enable this advanced view, put `advanced_view: 'true'` in your vacuum config.

Go to HACS and install the plugin Vacuum card (by denysdovhan) and add the following code to your `custom_resources.yaml` ([look here for instructions](../how-tos/custom-cards.md) on how to do this):
```YAML
- type: module
  url: /hacsfiles/vacuum-card/vacuum-card.js
```
