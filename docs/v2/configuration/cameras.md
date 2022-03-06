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

# Cameras `cameras.yaml`

**This file is optional**

Cameras sections, all cameras you want to be visible on the cameras page.

## Cameras information

| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| main_menu | boolean | Optional | `'false'` (default: true) | If you want to hide the cameras in the main navigation bar then enable this line. The cameras page will be moved to more page as an link. |
| live_view | boolean | Optional | `'false'` (default: true) | If you want to disable live view then enable this line |
| entities | string | Required | camera.driveway_camera | Camera entity_id |

## Cameras example
```YAML
cameras:
  main_menu: 'false' #If you want to hide the cameras in the main nav then enable this line. The cameras page will be moved to more page as an link.
  live_view: 'false' #If you want to disable live view then enable this line
  entities:
    - camera.driveway_camera
``` 
