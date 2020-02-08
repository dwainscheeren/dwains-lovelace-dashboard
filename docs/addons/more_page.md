
[< Go back to Home](../index.md)

### [Addons](index.md)
* [Rooms addons](rooms.md)
* [More page addons](more_page.md)
* [Dynamic page addons](dynamic_page.md)

---

# More page addons

With more page addons you can still add own pages to Dwains Theme. Let's say you want a page with some statistics or just an extra page with some cards. Then more page addons is the way to go.

## More page addons information

| Name | Type   | Default          | Example                                            | Description                       |
|------|--------|------------------|----------------------------------------------------|-----------------------------------|
| name | string | Required         | Statistics                                         | The name of the addon             |
| icon | string | fas:puzzle-piece | fas:chart-area                                     | The icon of the addon             |
| path | string | Required         | dwains-theme/addons/more_page/statistics/page.yaml | The path to the page of the addon |
| data | object | Not required     | See example below | Data you wanna parse to the addon |

## More page addons example

## More page example

This is for the `config/more_page.yaml` file.

```YAML
more_page:
  addons:
    - name: Statistics
      icon: fas:chart-area
      path: 'dwains-theme/addons/more_page/statistics/page.yaml'
```    