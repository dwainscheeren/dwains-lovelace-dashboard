[< Go back to Home](../index.md)

# How to add/load custom cards in Dwains Dashboard

If you want to add an custom card to your HA setup you need to add the path to this card in the resources.

You need to add this in the file `dwains-theme/resources/custom_resources.yaml`, by default you don't have this file.

To create this file rename `dwains-theme/resources/custom_resources-sample.yaml` to `dwains-theme/resources/custom_resources.yaml`.

Inside `custom_resources.yaml` you then can add any card you want and this file will never be overwriten during an update of Dwains dashboard.

An example on how the `custom_resources.yaml` file may look:
```yaml
# Own resources?
# Add here your own resources

- type: module
  url: /hacsfiles/atomic-calendar-revive/atomic-calendar-revive.js
- type: module
  url: /hacsfiles/vacuum-card/vacuum-card.js
```