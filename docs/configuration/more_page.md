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

# More page `more_page.yaml`

**This file is optional**

This is a config file for the more page. You can access the more page from the hamburger icon in the main menu.

This page support addons, they are called *more page addons.* [Read more here](../addons/more_page.md).

## More page information

| Name                | Type   | Required | Example                       | Description                                                                                             |
|---------------------|--------|----------|-------------------------------|---------------------------------------------------------------------------------------------------------|
| addons              | object | No       |                               | This page support addons, they are called *more page addons.* [Read more here](../addons/more_page.md). |


## More page example
```YAML
more_page:
  addons:
    - name: Statistics
      icon: fas:chart-area
      path: 'dwains-theme/addons/more_page/statistics/page.yaml'
```    