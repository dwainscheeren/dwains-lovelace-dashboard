[< Go back to Home](../index.md)

# Configuration

Dwains Dashboard configuration is loaded from the files inside the folder `dwains-dashboard/configs/`.

**If you edit something inside a file of the `dwains-dashboard/configs/` folder, you always need to reload the dashboard configuration for any changes to be visible. Go to the more page and click on settings, there you can click Reload dashboard configuration. Or do a service call in the developer tools `dwains_dashboard.reload`**

This folder can have the following files: `global.yaml`, `house_information.yaml`, `scenes.yaml`, `cameras.yaml`, `persons.yaml`, `rooms.yaml`, `icons.yaml` and `more_page.yaml`.

Only the files `global.yaml`, `rooms.yaml` and `icons.yaml` are required!

*HINT: Some entries can have a single entity or a group [read here how to make a group](https://www.home-assistant.io/integrations/group/).*

## Configuration
* [global.yaml](global.md)
* [rooms.yaml](rooms.md)
* [house_information.yaml](house_information.md)
* [scenes.yaml](scenes.md)
* [cameras.yaml](cameras.md)
* [persons.yaml](persons.md)
* [icons.yaml](icons.md)
* [more_page.yaml](more_page.md)