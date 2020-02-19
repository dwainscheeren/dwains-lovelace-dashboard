
[< Go back to Home](../index.md)

### [Addons](index.md)
* [Rooms addons](rooms.md)
* [More page addons](more_page.md)
* [Dynamic page addons](dynamic_page.md)
* [Persons addons](persons.md)

---

# Persons addons

With persons addons you can add own cards to a person page. Like for example a map, traveling time to work or home. It can also parse some data to that view. **NOTE: Each addon is directly loaded/rendered on the person page.**

## Persons addons information

I advise you to create a folder inside `dwains-theme/addons/persons/` with the name of the addon (for example statistics) inside that folder create a file called `page.yaml` and inside that file your lovelace card(s) and use that path as the path for the addon.

A good example is to checkout the `hello-person` addon in `dwains-theme/addons/persons/hello-person/page.yaml` to re-use or inspire you. 

| Name | Type   | Default          | Example                                                                                                               | Description                       |
|------|--------|------------------|-----------------------------------------------------------------------------------------------------------------------|-----------------------------------|
| name | string | Required         | Hello room                                                                                                            | The name of the addon             |
| icon | string | fas:puzzle-piece | fas:chart-area                                                                                                        | The icon of the addon             |
| path | string | Required         | `dwains-theme/addons/persons/hello-person/page.yaml`                                                    | The path to the page of the addon |
| data | object | Not required     | See example below | Data you wanna parse to the addon |

## Persons addon example 

This is for the `config/persons.yaml` file.

```YAML
persons:
  - name: Dwain
    ...your existing strings...
    addons:
      - name: Hello person
        icon: fas:puzzle-piece
        path: 'dwains-theme/addons/persons/hello-person/page.yaml'
        data:
          some_data: 'This is some data parsed.'
          some_other_data: 'and some other data.'
```    
