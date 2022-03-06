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

# Persons `persons.yaml`

**This file is optional**

Persons sections, all persons you want to be visible on the homepage. [How to create persons](https://www.home-assistant.io/integrations/person/). Go to your HA people settings to set an avatar for a person.

## Persons information

| Name | Type | Default | Example | Description |
|--------------|--------|-------------------------|-------------------------------------------------------|------------------------------------------------|
| name | string | Required | Dwain | Name of person |
| track | string | Required | person.dwain | Person entity |
| show_map | string | Optional (default: 'true') | 'true' or 'false' | If you want to show map of device tracker on person page |
| more_entities | object | Optional | See example below | If you want to show some more entities for a person (opens in new view, accessible from icon in header top right). |
| page_entities | object | Optional | See example below | If you want to show some additional entities on person page (visibile on person page itself). |
| addons              | object | No       |                               | Persons support addons, they are called *persons addons.* [Read more here](../addons/persons.md). |


## Persons example
```YAML
persons: 
  - name: Dwain
    track: person.dwain
    show_map: 'false' #If you want to show map remove this line
    more_entities:
      columns: 1 #optional
      entities:
        - entity: sensor.steps
        - entity: sensor.steps
    page_entities:
      columns: 2 #optional
      entities:
        - entity: sensor.steps
        - entity: sensor.steps
```    


### More_entities object

Example for using some additional entities on person page (opens in new view, accessible from icon in header top right):
```
    more_entities:
      columns: 2 #optional
      entities:
        - entity: sensor.name1
        - entity: sensor.name2
```

### Page_entities object

Example for showing some entities in the person page itself:
```
    page_entities:
      columns: 1 #optional
      entities:
        - entity: sensor.name1
        - entity: sensor.name2
```