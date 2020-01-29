# Configuration

Dwains Theme settings are loaded from the file `dwains-theme.yaml` in the root of your Home Assistant folder.

This config file can have the following sections: `global`, `house_information`, `scenes`, `cameras`, `persons`, `rooms`, `more`.
Only `global` and `rooms` are required!

Each section is explained below.

**If you edit something inside `dwains-theme.yaml`, you always need to restart Home Assistant for any changes to be visible.**

*NOTE: You can always look in the dwains-theme-sample.yaml file for some inspiration.

___

## Global (required)
The global section. My theme uses this to build the pages.

#### Global information
| Name | Type | Required | Example | Description |
|---------------------|--------|----------|----------------------------------|---------------------------------------------------------------------------------------------|
| weather | string | No | weather.dark_sky | Weather (I use [Dark Sky Weather](https://www.home-assistant.io/integrations/weather.darksky/)) |
| outside_temperature | string | No | sensor.dark_sky_temperature | Outside temperature (I use [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| outside_humidity | string | No | sensor.dark_sky_humidity | Outside humidity (I use [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| alarm | string | No | alarm_control_panel.alarm_system | Alarm entity. [Read more here](https://www.home-assistant.io/integrations/manual/) |
| climate | string | No | climate.living_room | Global climate temperature |
| language | string | No | en | Language of my theme. It only supports English for now! Dutch and German coming soon.. |
| calendar | list | No | - calendar.old_paper | List of calendar entities |

#### Global example
```YAML
global:
    weather: weather.dark_sky
    outside_temperature: sensor.dark_sky_temperature
    outside_humidity: sensor.dark_sky_humidity
    alarm: alarm_control_panel.alarm_system
    climate: climate.living_room
    language: en
    
    calendar:
      - calendar.old_paper
      - calendar.residual_waste
```  

___


## House information
House information, for  entities you want on the house_information page.

#### House information, information
| Name | Type | Default | Example | Description |
|--------|--------|-------------|---------------------------------|-----------------------------------|
| entity | string | Required | binary_sensor.frontdoor_contact | entity_id |
| type | string | Entity type | door | Type of entity `door`, `doorbell` |

#### House information example
```YAML
house_information:
  - entity: binary_sensor.frontdoor_contact
    type: door
  - entity: binary_sensor.doorbell_button
    type: doorbell
```  

___

## Scenes (optional)
Scenes sections all scenes you want to be visible on the scenes page. You can [create scenes in the GUI](https://www.home-assistant.io/docs/scene/editor/).

#### Scenes information
| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| entity | string | Required | scene.watching_tv | Scene entity_id |
| icon | string | play-circle-outline | fal:couch | Icon to display |
| icon_color | string | var(--dwains-theme-header-text) | '#ffffff' | Icon color |
| background | string | optional | 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)' | Background color, you can use css styling here |

#### Scenes example
```YAML
scenes:
  - entity: scene.watching_tv
    icon: fal:couch
    icon_color: '#ffffff'
    background: 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%'
```  
___

## Cameras (optional)
Cameras sections, all cameras you want to be visible on the cameras page.

#### Cameras information
| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| entity | string | Required | camera.driveway_camera | Camera entity_id |

#### Cameras example
```YAML
cameras:
  - entity: camera.driveway_camera
``` 

___

## Persons (optional)
Persons sections, all persons you want to be visible on the homepage. [How to create persons](https://www.home-assistant.io/integrations/person/).

#### Persons information
| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| entity | string | Required | scene.watching_tv | Scene entity_id |
| icon | string | play-circle-outline | fal:couch | Icon to display |
| icon_color | string | var(--dwains-theme-header-text) | '#ffffff' | Icon color |
| background | string | optional | 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)' | Background color, you can use css styling here |

#### Persons example
```YAML
persons: 
  - name: Dwain
    track: person.dwain
    picture: 'foldername/images/persons/dwain.jpg'
```    
___

## Rooms (required)
Rooms sections, all rooms of your house. This is where my theme is all about :D

#### Rooms information
| Name | Type | Default | Example | Description |
|--------------|--------------------------|--------------------|-------------------------------------|-----------------------------------------------------------------------------------|
| name | string | Required | Hallway | Room name |
| icon | string | mdi:square-outline | fas:key | Room icon |
| light | string (entity or group) | Not required | light.hallway | Single light entity or group entity with all lights |
| temperature | string (entity) | Not required | sensor.hallway_temperature | Temperature sensor entity |
| climate | string (entity) | Not required | climate.hallway_climate | Climate entity |
| humidity | string (entity) | Not required | sensor.halway_humidity | Humidity sensor entity |
| motion | string (entity or group) | Not required | binary_sensor.hallway_sensor_motion | Motion sensor(s). Can be binary_sensor or a group of binary_sensors |
| door | string (entity or group) | Not required | binary_sensor.hallway_door_contact | Door contact(s). Can be binary_sensor or a group of binary_sensors |
| window | string (entity or group) | Not required | group.hallway_windows | Window sensor(s). Can be binary_sensor or a group of binary_sensors |
| cover | string (entity or group) | Not required | group.hallway_covers | Cover(s) (blinds, rolling_shutters etc). Can be single cover or a group of covers |
| vacuum | string (entity) | Not required | vacuum.roborock | Vacuum entity |
| plant | string (entity or group) | Not required | plant.hallway_plant | Plant(s). Can be single plant or a group of plants |
| media_player | string (entity or group) | Not required | media_player.awesome_hallway_tv | Media player(s). Can be single media_player or a group of media_players |

#### Rooms example
```YAML
rooms:
  - name: Hallway
    icon: fal:key-skeleton
    light: light.hallway
    temperature: sensor.hallway_temperature
    climate: climate.hallway_climate
    humidity: sensor.halway_humidity
    motion: binary_sensor.hallway_sensor_motion
    door: binary_sensor.hallway_door_contact
    window: binary_sensor.hallway_window_contact
    cover: group.hallway_covers
    vacuum: vacuum.roborock
    plant: plant.hallway_plant
    media_player: media_player.awesome_hallway_tv
```    
___

## More extend (optional)
With the more extend section you can add own views/pages to my theme. You can access these from the More page (hamburger icon in menu)

#### More extend information
| Name | Type | Default | Example | Description |
|------------|--------|--------------------|-------------------------------------------------------|------------------------------------------------|
| name | string | Required | Statistics | Name of the page |
| icon | string | mdi:square-outline | 'far:chart-area' | Icon to display |
| path | string | Required | 'user-package-sample/views/main/more/statistics.yaml' | Path to the file view |

#### More extend example
```YAML
more:
  - name: Statistics
    icon: 'far:chart-area'
    path: 'user-package-sample/views/main/more/statistics.yaml'
```    

The content of this `statistics.yaml` file then can be:
```YAML
- type: custom:mod-card
  style: |
    ha-card {
      padding: 8px;
    }
  card:
    type: custom:layout-card
    min_columns: 1
    max_columns: 1
    layout: horizontal
    justify_content: start
    cards:
      - type: custom:mini-graph-card
        hour24: true
        action: none
        entities:
          - sensor.dsmr_day_consumption_electricity_merged
```