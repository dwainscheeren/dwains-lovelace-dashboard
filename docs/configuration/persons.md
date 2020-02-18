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

# Persons `persons.yaml`

**This file is optional**

Persons sections, all persons you want to be visible on the homepage. [How to create persons](https://www.home-assistant.io/integrations/person/).

## Persons information

| Name | Type | Default | Example | Description |
|--------------|--------|-------------------------|-------------------------------------------------------|------------------------------------------------|
| name | string | Required | Dwain | Name of person |
| track | string | Required | person.dwain | Person entity |
| picture_path | string | A auto generated avatar | 'images/persons/dwain.jpg' | Path to person picture (Place this in your `www/images/persons` folder) |
| addons              | object | No       |                               | Persons support addons, they are called *persons addons.* [Read more here](../addons/persons.md). |


## Persons example
```YAML
persons: 
  - name: Dwain
    track: person.dwain
    picture_path: 'images/persons/dwain.jpg'
```    