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

# House information `house_information.yaml`

**This file is optional**

House information a page which shows your favorite entities, a house calendar and what is going on in your house regarding motion, doors and windows.

## House information section

| Name | Type | Default | Example | Description |
|------------|--------|--------------|-------------------------------------------------------|------------------------------------------------|
| favorites | object | Not required | See house information favorites | A object with favorite entities |
| calendar | object | Not required | See house information calendar | Icon to display |

## House information example
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

### House information -> Favorites

| Name | Type | Default | Example | Description |
|----------|--------|---------------------|---------------------------------|--------------------------|
| entity | string | Required | binary_sensor.frontdoor_contact | entity_id |
| icon_on | string | Default entity icon | fas:bell-school | Icon when entity is on |
| icon_off | string | Default entity icon | far:bell-school | Icon when entitiy is off |

### House information -> Calendar

Just a list of calendar entities

```YAML
  calendar:
    - calendar.trash
    - calendar.birthdays
```  