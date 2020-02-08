
[< Go back to Home](../index.md)

### [Addons](index.md)
* [Rooms addons](room.md)
* [More page addons](more_page.md)
* [Dynamic page addons](dynamic_page.md)

---

# Dynamic page addons

By default the dynamic page shows the cameras. But not everyone has cameras in his HA setup. Or if you just want to show something else on the cameras page. You can use a dynamic page addon. **You can only have 1 addon at the same time because it's directly loaded inside the dynamic page view!**

## Dynamic page addons information

| Name | Type   | Default          | Example                                            | Description                       |
|------|--------|------------------|----------------------------------------------------|-----------------------------------|
| name | string | Required         | Statistics                                         | The name of the addon             |
| icon | string | fas:puzzle-piece | fas:chart-area                                     | The icon of the addon             |
| path | string | Required         | dwains-theme/addons/more_page/statistics/page.yaml | The path to the page of the addon |
| data | object | Not required     | See example below | Data you wanna parse to the addon |

## Dynamic page addons example

This is for the `config/dynamic_page.yaml` file.

```YAML
dynamic_page:
  addon:
    - name: Hello dynamic page
      icon: fas:chart-area
      path: 'dwains-theme/addons/dynamic_page/hello-dynamic-page/page.yaml'
        data:
          some_data: 'This is some data parsed.'
          some_other_data: 'and some other data.'
```    