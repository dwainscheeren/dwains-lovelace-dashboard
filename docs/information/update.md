[< Go back to Home](../index.md)

# Updating Dwains Theme 

If there is a update of Dwains Theme here is how to install it.

### Step 1 - Download Dwains Theme latest release
1. Download the [latest release from the release page](https://github.com/dwainscheeren/lovelace-dwains-theme/releases).

**Each release has information on that page with how to install it as an update!**

### Step 2 - Extract & move the download

1. Unzip the file you just downloaded. 

2. Copy the content of this folder to the root of your Home Assistant installation.

**WARNING: You may need to overwrite the file `ui-lovelace.yaml` with the file from the downloaded folder.**

**Do you have any custom resources? Go to the folder `dwains-theme/resources/`, if you don't have the file `custom_resources.yaml` then rename the file `custom_resources-sample.yaml` to `custom_resources.yaml` and place your resources in the file `custom_resources.yaml`!**

### Step 3 - Reboot Home Assistant

Reboot Home Assistant! After this check if you got the new version number in More page -> Theme settings (bottom of page).

## Version info

Version numbering explained (MAJOR.MINOR.PATCH):
1. MAJOR version: when there are big and incompatible changes.
2. MINOR version: when there is added functionality in a non-backwards compatible manner.
3. PATCH version: small new functions and backwards compatible bug fixes.

---

# Changelog

## Update 1.2.1 (coming soon)
* Enabled the HA sidebar on mobile on all pages. (Future update will have a option to enable/disable it) Please let me know, if you don't want the sidebar enabled on all pages, in the HA thread.
* Fixed bug in new reload config version that it doesn't find the config files on some HA setups.
* Fixed bottom navbar on Android to be smaller in height then on iPhone. (@Rik)
* Fixed bug with using apostrophe in names. You can now use them.
* Parsing the `navigation_path` and `room_name` now to the data of an room addon button. So you can use that to link to the addon page.
* Changed the way the `more_entities` work inside `rooms.yaml`. Inside the `more_entities` object you now have the option to use: `popup` and/or `page`. The first one will be placed in the popup which can be accessed by pressing the button on the top right (in the header). The second one will be directly visible on the bottom of the room page itself.
* Changed input_select on scenes and house_information page, tapping it wil open a popup to select your input_select input and double tap will loop thought each item in your input_select.
* Added haptic feedback on single press of house information favorite entity.

## Update 1.2.0
*Note: The way resources are loaded has been changed from this version on. Overwrite your `ui-lovelace.yaml` file with the one in this version! Do you have any custom resources? Go to the folder `dwains-theme/resources/` rename the file `custom_resources-sample.yaml` to `custom_resources.yaml` and place your resources in that file! This file will never be overwritten with updates instead of the old way, so you can keep your own additional resources safe.*

* **Added function to reload theme config, without restarting HA** Use the new button on the theme settings page or do a service call `dwains_theme.reload`
* Added Spanish translation
* Added Swedish translation.
* Added function to toggle all lights of your house on the all lights page.
* Added map for tracker on persons pages, can be disabled in `persons.yaml`.
* Added functionality for adding entites on a person for the persons page, so you can add for example a battery entity (phone battery) and travel time to work.
* Rewrote the climate page, it also supports all hvac_modes now! 
* Room addons can have custom buttons now! Read room addon doc page for more info!
* Made some changes in the configs-examples files.
* Fixed a bug in dwains_theme custom_component for icons.yaml file.
* Fixed bug in scenes page with template not always loading.
* Removed the big full width temperature and humidity graph on the climate page on a room if you only have a temperature set. Oterwise it will be showed. 
* You can use a input_select now in the `scenes.yaml`.
* You can use a input_select now in the `house_information.yaml` (favorites).
* Fixed no icon showing when 95-100% battery percentage on all batteries page.
* Added support for `sensor.*`in doors, windows and motion (instead of only having `binary_sensor.*`) inside a room and it triggers on True or False now next to the existing on/off state.
* Made the icon width little bit smaller of the favorites on house information page.
* Changed typo of house_information icon on the more_page.
* Added haptic feedback on scenes button press.
* Some other small fixes.

## Update 1.1.5
* Whoopsie I forgot some code in the homepage weather button, so people who don't have an outside_temperature defined get a broken installation. Fixed this in 1.1.5.

## Update 1.1.4
* Forgot to update sensor of version so I updated it.

## Update 1.1.3

* Fixed bug with background color of cover in dark mode.
* Fixed bug that icon of dynamic page addon is not in the menu when you use it.
* Fixed bug with multiple plants in a room translation.
* Made the small headings of each room name on the all lights page clickable to open a popup or doubleclick to toggle it.
* Fixed color of toggle switch when off state in dark mode.
* Fixed background color bug on some popups in dark mode.
* Merged PR by fmartinou for French translations.
* Removed the `user-package-sample` folder. Got too much questions regarding how to work with it.
* Fixed bug with climate and temperature. Temperature is now always leading so it will override the climate temperature. If you only set a climate and no temperature it will use the temperature from the climate.

## Update 1.1.2

* Added latest version sensor so you get notification on new available update on Dwains Theme.
* Docs updates.
* Config examples updates.
* Fixed bug on climate page that not everything is in vertical stack.
* Added some padding below persons and end of the header on homepage.
* Fixed bug of climate state on room page.
* Fixed a bug with single cover state on room page.
* Added Italian language.
* German language translation updated.
* Fixed bug when put multiple addons in persons.
* Fixed motion icon (off state) FA icon free.
* Added sidebar back on mobile on the house data page. If you go on the more page to house data you can use the sidebar (swipe from left) on mobile to access HA sidebar.
* Added toggle doubleclick on favorites on house information page.
* Fixed a bug with outside temperature/humidity on climate page, it also now uses weather before outside_temperature and outside_humidity so in future these 2 can be removed.
* Added functionallity to add input_boolean on scene page, so you can activate some scripts/automations on a scene click and toggle it.
* Added `show_name: 'false'` option to room object in `rooms.yaml` to hide the name on homepage.
* Added debug information when an entity does not exists for:
  * On wrong global:alarm entity
  * On wrong global:weather entity
  * On wrong global:inside_temperature entity
  * On wrong persons:track entity
  * On wrong room:light entity
  * On wrong room:climate entity
  * On wrong room:temperature entity
  * On wrong room:door entity
  * On wrong room:window entity
  * On wrong room:motion entity
  * On wrong room:device entity
  * On wrong room:cover entity
  * On wrong room:media_player entity
  * On wrong room:vacuum entity
  * On wrong room:plant entity
  * On wrong scene entity
* Fixed typo transparant -> transparent some places.
* Fixed bug that single device not showing up on room page.


---

## Update from 1.1.0 to 1.1.1

Follow the normal update manual (top of this page)

---

## Update from 1.0.* to 1.1.*

1. Backup the folder `dwains-theme/configs`
2. Then remove the following folders from your HA setup. `custom_components/dwains_theme`, `dwains-theme`, `themes`, `www/dwains-theme`.
3. Copy the downloaded zip content to your HA setup
4. Copy back the backup folder `configs` to `dwains-theme` so you again have a `dwains-theme/configs` folder.
5. Copy the file `dwains-theme/configs-samples/icons.yaml` to `dwains-theme/configs`
6. Copy the file `dwains-theme/configs-samples/dynamic_page.yaml` to `dwains-theme/configs`
7. Rename the file `dwains-theme/configs/more_addons.yaml` to `more_page.yaml`. The content of this file is changed to:
```
more_page:
  addons:
```
8. The way Dwains Theme is loaded is changed, take a look inside `configuration-sample.yaml` and copy the new code between `Copy from here` till `Copy till here`.
9. Download from HACS the plugin: state-switch if you don't have it.