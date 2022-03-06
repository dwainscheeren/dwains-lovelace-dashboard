
[< Go back to Home](../index.md)

### [Addons](index.md)
* [Rooms addons](rooms.md)
* [More page addons](more_page.md)
* [Persons addons](persons.md)
* [House information addons](house_information.md)
* [Popup addons](popup.md)

---

# House information addons

With house information addons you can add own cards to the global house information page. Like for example an calendar, traveling time to work or home. It can also parse some data to that view. **NOTE: Each addon is directly loaded/rendered on the house information page.**

## House information addons information

I advise you to create a folder inside `dwains-dashboard/addons/house_information/` with the name of the addon (for example statistics) inside that folder create a file called `page.yaml` and inside that file your lovelace card(s) and use that path as the path for the addon.

A good example is to checkout the `hello-house-information-page` addon in `dwains-dashboard/addons/house_information/hello-house-information-page/page.yaml` to re-use or inspire you. 

| Name | Type   | Default          | Example                                            | Description                       |
|------|--------|------------------|----------------------------------------------------|-----------------------------------|
| name | string | Required         | Statistics                                         | The name of the addon             |
| icon | string | fas:puzzle-piece | fas:chart-area                                     | The icon of the addon             |
| path | string | Required         | `dwains-dashboard/addons/house_information/hello-house-information-page/page.yaml` | The path to the page of the addon |
| data | object | Not required     | See example below | Data you wanna parse to the addon |

## House information page addons example

This is for the `config/house_information.yaml` file.

```YAML
house_information:
  addons:
    - name: Hello house information page
      icon: mdi:chart
      path: 'dwains-dashboard/addons/house_information/hello-house-information-page/page.yaml'
      data:
        some_data: 'This is some data parsed.'
        some_other_data: 'and some other data.'
```    