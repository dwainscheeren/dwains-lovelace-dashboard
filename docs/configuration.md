# Configuration

Dwains Theme configuration is loaded from the files inside the folder `dwains-theme/configs/`.

This folder can have the following files: `global.yaml`, `house_information.yaml`, `scenes.yaml`, `cameras.yaml`, `persons.yaml`, `rooms.yaml`, `more_addons.yaml`.
Only the files `global.yaml` and `rooms.yaml` are required!

Each file content is explained below.

**If you edit something inside a file of the `dwains-theme/configs/` folder, you always need to restart Home Assistant for any changes to be visible.**

*HINT: You can always look in the `dwains-theme/configs-samples` folder files for some inspiration.*

*HINT: For the icons I mostly use Font Awesome, [read here how to choose and use icons](link.md).*

*HINT: Some entries can have a single entity or a group [read here how to make a group](https://www.home-assistant.io/integrations/group/). (You can use `user-package-sample/groups.yaml`).*

___

## Global (required) `global.yaml` 
The global section. Dwains theme uses this to build the pages.

#### Global information

| Name | Type | Required | Example | Description |
|---------------------|--------|----------|----------------------------------|---------------------------------------------------------------------------------------------|
| language | string | No | en | Language of my theme. It only supports English for now! Dutch and German coming soon.. |
| weather | string | No | weather.dark_sky | Weather (I use [Dark Sky Weather](https://www.home-assistant.io/integrations/weather.darksky/)) |
| outside_temperature | string | No | sensor.dark_sky_temperature | Outside temperature (I use [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| outside_humidity | string | No | sensor.dark_sky_humidity | Outside humidity (I use [Dark Sky Sensor](https://www.home-assistant.io/integrations/darksky/)) |
| alarm | string | No | alarm_control_panel.alarm_sys | Alarm entity. [Read more here](https://www.home-assistant.io/integrations/manual/) |
| inside_temperature | string | No | climate.living_room | Inside temperature sensor |


#### Global example
```YAML
global:
  language: en
  weather: weather.dark_sky
  outside_temperature: sensor.dark_sky_temperature
  outside_humidity: sensor.dark_sky_humidity
  alarm: alarm_control_panel.alarm_system
  inside_temperature: climate.living_room
```  
___

## Rooms (required) `rooms.yaml`
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
| motion | string (entity or group) | Not required | binary_sensor.hallway_motion | Motion sensor(s). Can be binary_sensor or a group of binary_sensors |
| door | string (entity or group) | Not required | binary_sensor.hallway_door | Door contact(s). Can be binary_sensor or a group of binary_sensors |
| window | string (entity or group) | Not required | group.hallway_windows | Window sensor(s). Can be binary_sensor or a group of binary_sensors |
| cover | string (entity or group) | Not required | group.hallway_covers | Cover(s) (blinds, rolling_shutters etc). Can be single cover or a group of covers |
| vacuum | string (entity) | Not required | vacuum.roborock | Vacuum entity |
| plant | string (entity or group) | Not required | plant.hallway_plant | Plant(s). Can be single plant or a group of plants |
| media_player | string (entity or group) | Not required | media_player.hallway_tv | Media player(s). Can be single media_player or a group of media_players |

#### Rooms example
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
    vacuum: vacuum.roborock
    plant: plant.hallway_plant
    media_player: media_player.awesome_hallway_tv
```    
___

## House information `house_information.yaml`
House information a page which shows your favorite entities, a house calendar and what is going on in your house regarding motion, doors and windows.

#### House information section

| Name | Type | Default | Example | Description |
|------------|--------|--------------|-------------------------------------------------------|------------------------------------------------|
| favorites | object | Not required | See house information favorites | A object with favorite entities |
| calendar | object | Not required | See house information calendar | Icon to display |

#### House information example
```YAML
house_information:
  favorites:
    - entity: binary_sensor.doorbell_button
      icon_on: fas:bell
      icon_off: fas:bell
    - entity: binary_sensor.hallway_door_contact
      icon_on: fas:door-open
      icon_off: fas:door-closed

  calendar:
    - calendar.trash
    - calendar.birthdays
```  

#### House information -> Favorites

| Name | Type | Default | Example | Description |
|----------|--------|---------------------|---------------------------------|--------------------------|
| entity | string | Required | binary_sensor.frontdoor_contact | entity_id |
| icon_on | string | Default entity icon | fas:bell-school | Icon when entity is on |
| icon_off | string | Default entity icon | far:bell-school | Icon when entitiy is off |

#### House information -> Calendar

Just a list of calendar entities

```YAML
  calendar:
    - calendar.trash
    - calendar.birthdays
```  


___

## Scenes (optional) `scenes.yaml`
Scenes sections all scenes you want to be visible on the scenes page. You can [create scenes in the GUI](https://www.home-assistant.io/docs/scene/editor/).

#### Scenes information

| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| entity | string | Required | scene.watching_tv | Scene entity_id |
| icon | string | far:play-circle | fas:couch | Icon to display |
| icon_color | string | var(--dwains-theme-header-text) | '#ffffff' | Icon color |
| background | string | optional | 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)' | Background color, you can use css styling here |

#### Scenes example
```YAML
scenes:
  - entity: scene.watching_tv
    icon: fas:couch
    icon_color: '#ffffff'
    background: 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)'
```  
___

## Cameras (optional) `cameras.yaml`
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

## Persons (optional) `persons.yaml`
Persons sections, all persons you want to be visible on the homepage. [How to create persons](https://www.home-assistant.io/integrations/person/).

#### Persons information

| Name | Type | Default | Example | Description |
|--------------|--------|-------------------------|-------------------------------------------------------|------------------------------------------------|
| name | string | Required | Dwain | Name of person |
| track | string | Required | person.dwain | Person entity |
| picture_path | string | A auto generated avatar | 'foldername/images/persons/dwain.jpg' | Path to person picture |

#### Persons example
```YAML
persons: 
  - name: Dwain
    track: person.dwain
    picture_path: 'foldername/images/persons/dwain.jpg'
```    
___

## More addons (optional) `more_addons.yaml`
With the more addons section you can add own views/pages to my theme. You can access these from the More page (hamburger icon in menu).

#### More addons information

| Name | Type | Default | Example | Description |
|------------|--------|--------------------|-------------------------------------------------------|------------------------------------------------|
| name | string | Required | Statistics | Name of the page |
| icon | string | fas:puzzle-piece | fas:beer | Icon to display |
| path | string | Required | 'user-package-sample/views/main/more/statistics.yaml' | Path to the file view |

#### More addons example
```YAML
more_addons:
  - name: Statistics
    icon: far:chart-area
    path: 'user-package-sample/views/main/more/addons/statistics.yaml'
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