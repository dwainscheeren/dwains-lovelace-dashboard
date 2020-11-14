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

# Scenes `scenes.yaml`

**This file is optional**

Scenes sections all scenes you want to be visible on the scenes page. You can [create scenes in the GUI](https://www.home-assistant.io/docs/scene/editor/).

## Scenes information

| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| entity | string | Required | scene.watching_tv | Scene entity_id. Can be a scene entity or something like switch or input_boolean. |
| icon | string | far:play-circle | fas:couch | Icon to display |
| icon_color | string | var(--dwains-theme-header-text) | '#ffffff' | Icon color |
| background | string | optional | 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)' | Background color, you can use css styling here |

*NOTE: The entity_id can also be an `input_boolean` so you can hang some automations on it, and set it off when you want*

## Scenes example
```YAML
scenes:
  - entity: scene.watching_tv
    icon: fas:couch
    icon_color: '#ffffff'
    background: 'linear-gradient( 135deg, #FEB692 10%, #EA5455 100%)'
```  