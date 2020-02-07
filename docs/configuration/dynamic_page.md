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

# Dynamic page `dynamic_page.yaml`

**This file is optional**

This is a config file for the dynamic page. The dynamic page is the fourth icon in the main menu. By default it displays cameras which can be set up in `cameras.yaml`. Some people don't had any cameras in their HA setup so I changed this page to a dynmic page. You can use this page with dynamic page addons. [Read more here](../addons/dynamic_page.md).

## Dynamic page information

| Name                | Type   | Required | Example                       | Description                                                                                             |
|---------------------|--------|----------|-------------------------------|---------------------------------------------------------------------------------------------------------|
| addon              | object | No       |                               | This page support addons, they are called *dynamic page addons.* [Read more here](../addons/dynamic_page.md). **You can only have 1 addon at the same time because it's directly loaded inside the dynamic page view!** |
