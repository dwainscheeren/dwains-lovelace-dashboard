[< Go back to Home](../index.md)

### Configuration
* [global.yaml](configuration/global.md)
* [rooms.yaml](configuration/rooms.md)
* [house_information.yaml](configuration/house_information.md)
* [scenes.yaml](configuration/scenes.md)
* [cameras.yaml](configuration/cameras.md)
* [persons.yaml](configuration/persons.yaml)
* [icons.yaml](configuration/icons.yaml)

---

# Rooms `rooms.yaml`

**This file is required!**

Rooms sections, all rooms of your house. This is where my theme is all about :D

## Rooms information

| Name | Type | Default | Example | Description |
|--------------|---------------------------|--------------------|--------------------------------------------------------------|-----------------------------------------------------------------------------------|
| name | string | Required | Hallway | Room name |
| icon | string | mdi:square-outline | fas:key | Room icon |
| light | string <br>(entity or group) | Not required | light.hallway<br> or <br>group.hallway_lights | Single light entity or group entity (with only light entities inside) |
| temperature | string  (entity) | Not required | sensor.hallway_temperature | Temperature sensor entity |
| climate | string <br>(entity) | Not required | climate.hallway_climate | Climate entity |
| humidity | string <br>(entity) | Not required | sensor.halway_humidity | Humidity sensor entity |
| motion | string <br>(entity or group) | Not required | binary_sensor.hallway_motion<br> or <br>group.hallway_motion_sensors | Motion sensor(s). Can be binary_sensor or a group of binary_sensors |
| door | string <br>(entity or group) | Not required | binary_sensor.hallway_door<br> or <br>group.hallway_doors | Door contact(s). Can be binary_sensor or a group of binary_sensors |
| window | string <br>(entity or group) | Not required | binary_sensor.hallway_window<br> or <br>group.hallway_windows | Window sensor(s). Can be binary_sensor or a group of binary_sensors |
| cover | string <br>(entity or group) | Not required | cover.hallway<br> or <br>group.hallway_covers | Cover(s) (blinds, rolling_shutters etc). Can be single cover or a group of covers |
| vacuum | object | Not required | See room vacuum below | Vacuum |
| plant | string <br>(entity or group) | Not required | plant.hallway_plant<br> or <br>group.hallway_plants | Plant(s). Can be single plant or a group of plants |
| media_player | string <br>(entity or group) | Not required | media_player.hallway_tv<br> or <br>group.hallway_tvs | Media player(s). Can be single media_player or a group of media_players |

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
```    

### Room -> Vacuum

| Name | Type | Default | Example | Description |
|----------|--------|---------------------|---------------------|---------------------------------------------------------|
| entity | string | Required | vacuum.rockrobo | entity_id |
| camera | string | Not required | camera.rockrobo_map | If you have rooted your roborock paste the camera here. |

Example for vacuum inside a room:
```
    vacuum: 
      entity: vacuum.rockrobo
      camera: camera.rockrobo_map
````