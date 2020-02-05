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

## Scenes `scenes.yaml`

**This file is optional**

Scenes sections all scenes you want to be visible on the scenes page. You can [create scenes in the GUI](https://www.home-assistant.io/docs/scene/editor/).

## Scenes information

| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| entity | string | Required | scene.watching_tv | Scene entity_id |
| icon | string | far:play-circle | fas:couch | Icon to display |
| icon_color | string | var(--dwains-theme-header-text) | '#ffffff' | Icon color |
| background | string | optional | 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)' | Background color, you can use css styling here |

## Scenes example
```YAML
scenes:
  - entity: scene.watching_tv
    icon: fas:couch
    icon_color: '#ffffff'
    background: 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)'
```  