
[< Go back to Home](../index.md)

### [Addons](index.md)
* [Rooms addons](rooms.md)
* [More page addons](more_page.md)
* [Persons addons](persons.md)
* [House information addons](house_information.md)
* [Popup addons](popup.md)

---

# More page addons

With more page addons you can still add own pages to Dwains Dashboard, you even can put them in the main navbar! Let's say you want a page with some statistics or just an extra page with some cards. Then more page addons is the way to go.

## More page addons information

I advise you to create a folder inside `dwains-dashboard/addons/more_page/` with the name of the addon (for example statistics) inside that folder create a file called `page.yaml` and inside that file your lovelace card(s) and use that path as the path for the addon.

A good example is to checkout the `hello-more-page` addon in `dwains-dashboard/addons/more_page/hello-more-page/page.yaml` to re-use or inspire you. 

| Name | Type   | Default          | Example                                            | Description                       |
|------|--------|------------------|----------------------------------------------------|-----------------------------------|
| name | string | Required         | Statistics                                         | The name of the addon             |
| main_menu | boolean | Optional | `'true'` (default: false)
| icon | string | fas:puzzle-piece | fas:chart-area                                     | The icon of the addon             |
| path | string | Required         | `dwains-dashboard/addons/more_page/statistics/page.yaml` | The path to the page of the addon |
| data | object | Not required     | See example below | Data you wanna parse to the addon |

## More page addons example

## More page example

This is for the `config/more_page.yaml` file.

```YAML
more_page:
  addons:
    - name: Statistics
      icon: fas:chart-area
      #main_menu: 'true' #Show this addon in the main navigation bar!
      path: 'dwains-dashboard/addons/more_page/statistics/page.yaml'
      data:
          some_data: 'This is some data parsed.'
          some_other_data: 'and some other data.'
```    