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

# Cameras `cameras.yaml`

**This file is optional**

Cameras sections, all cameras you want to be visible on the cameras page.

## Cameras information

| Name | Type | Default | Example | Description |
|------------|--------|---------------------------------|-------------------------------------------------------|------------------------------------------------|
| entity | string | Required | camera.driveway_camera | Camera entity_id |

## Cameras example
```YAML
cameras:
  - entity: camera.driveway_camera
``` 
