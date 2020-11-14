
[< Go back to Home](../index.md)

### [Addons](index.md)
* [Rooms addons](rooms.md)
* [More page addons](more_page.md)
* [Persons addons](persons.md)
* [House information addons](house_information.md)
* [Popup addons](popup.md)

---

# Popup addons

With popup addons you can add own card(s) to a popup of an entity. So for example if you click on `switch.diswasher` you also see the power usage of the diswasher.

You can use popup addons in 2 ways. 
* Option 1: Create a popup addon for a whole domain. So for example for lights. If you click any light in my dashboard you will get your own created popup addon.
* Option 2: Create a popup addon for an single entity. So for example if you click on `switch.diswasher` you also see the power usage of the diswasher.

## Global popup addons
If you want to create a own popup addon for an global entity you can do this in the config file `dwains-dashboard/config/global.yaml`

Example for in `dwains-dashboard/config/global.yaml`
```yaml
global:
  ...
  custom_popups:
    - domain: cover
      path: 'dwains-dashboard/addons/popups/cover/popup.yaml'
```

Example for `dwains-dashboard/addons/popups/cover/popup.yaml`
```yaml
# dwains_dashboard

type: vertical-stack
cards:
  - type: entities
    entities:
      - {{ entity }}
  - type: markdown
    content: Custom popup for {{ entity }}
```

## Entity popup addons
If you want to create a own popup for a single entity you can use your `customize.yaml` file.

Example for inside `/customize.yaml`
```
light.livingroom_spot_2:
  dwains_dashboard_popup: 'dwains-dashboard/addons/popups/livingroom_spot_2.yaml'
  dwains_dashboard_popup_data:
    some_data: 'This is some data parsed.'
    some_other_data: 'and some other data.'
```

Example for `dwains-dashboard/addons/popups/livingroom_spot_2.yaml`:
```yaml
# dwains_dashboard

type: vertical-stack
cards:
  - type: markdown
    content: >
      This is a custom popup. It can also parse some data.
      Don't believe it? Here it is: {{ (data | fromjson)['some_data'] }}<br>
      {{ (data | fromjson)['some_other_data'] }}
  - type: entities
    entities:
      - {{ entity }}
```