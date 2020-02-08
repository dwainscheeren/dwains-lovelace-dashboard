
[< Go back to Home](../index.md)

### [Addons](index.md)
* [Rooms addons](rooms.md)
* [More page addons](more_page.md)
* [Dynamic page addons](dynamic_page.md)

---

# Rooms addons

With rooms addons you can add own functionality to rooms. You can add a own button on a room page which links to a custom page. It can also parse some data to that view. 

## Rooms page addons information

| Name | Type   | Default          | Example                                                                                                               | Description                       |
|------|--------|------------------|-----------------------------------------------------------------------------------------------------------------------|-----------------------------------|
| name | string | Required         | Hello room                                                                                                            | The name of the addon             |
| icon | string | fas:puzzle-piece | fas:chart-area                                                                                                        | The icon of the addon             |
| path | string | Required         | dwains-theme/addons/rooms/hello-room/page.yaml                                                                        | The path to the page of the addon |
| data | object | Not required     | See example below | Data you wanna parse to the addon |

## Rooms addon example 

This is for the `config/rooms.yaml` file.

```YAML
rooms:
  - name: Hallway
    ...your existing strings...
    addons:
      - name: Hello room
        icon: fas:puzzle-piece
        path: 'dwains-theme/addons/rooms/hello-room/page.yaml'
        data:
          some_data: 'This is some data parsed.'
          some_other_data: 'and some other data.'
```    
