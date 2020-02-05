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

# Persons `persons.yaml`

**This file is optional**

Persons sections, all persons you want to be visible on the homepage. [How to create persons](https://www.home-assistant.io/integrations/person/).

## Persons information

| Name | Type | Default | Example | Description |
|--------------|--------|-------------------------|-------------------------------------------------------|------------------------------------------------|
| name | string | Required | Dwain | Name of person |
| track | string | Required | person.dwain | Person entity |
| picture_path | string | A auto generated avatar | 'images/persons/dwain.jpg' | Path to person picture (Place this in your `www/images/persons` folder) |

## Persons example
```YAML
persons: 
  - name: Dwain
    track: person.dwain
    picture_path: 'images/persons/dwain.jpg'
```    