[< Go back to Home](../index.md)

# Updating Dwains Dashboard

If you want to upgrade your installation of Dwains Dashboard to the latest version then look below. Each update has his own "How to update to **" manual.

### Versioning info

Version numbering explained (MAJOR.MINOR.PATCH):
1. MAJOR version: when there are big and incompatible changes.
2. MINOR version: when there is added functionality in a non-backwards compatible manner.
3. PATCH version: small new functions and backwards compatible bug fixes.

---

# Changelog

## Update 2.0.1

Some small bug fixed and speed improvements.

### How to update to 2.0.1:
**If you are running 2.0.0:**
1. Download version 2.0.1 and unzip the file.
2. Inside this folder you will see a folder called `custom_components` copy this folder.
3. Go to the main folder of your Home Assistant installation. This is the folder where you config is. (Hint: its the folder where for example the files `ui-lovelace.yaml` and `configuration.yaml` are located).
4. Paste the `custom_components` to the main folder of your Home Assistant installation and overwrite all existing files!
5. Reboot your Home Assistant
6. Clear your browser cache on all devices
7. You are done!

**If you are running older version then 2.0.0:**
First upgrade to 2.0.0 and then to 2.0.1. To upgrade to 2.0.0 follow this upgrade guide: https://dwainscheeren.github.io/dwains-lovelace-dashboard/information/update.html#how-to-update-to-20


## Update 2.0.0 🎉

Note: Dwains Theme has been renamed to Dwains Dashboard!

### How to update to 2.0:

You can only update to 2.0 if you have 1.4 installed.

The update process is a little bit complicated but I tried to make it as easy as possible. I made splitted the upgrade guide into 5 sections. If you experience any issues during the installation of 2.0 you can get live personal assistant from me, [Dwains Dashboard Discord Server](https://discord.gg/7yt64uX)

*Hint: With /config/ I mean the folder where your whole HA config is.*

**Section 1 - Remove existing Dwains Theme 1.***

*To update to Dwains Dashboard 2.0.0 you first need to remove your 1.* version of Dwains Theme follow **all** steps below (Don't worry we will keep your existing Dwains Theme config and addons, these will automatic work in 2.0.0), after that we need to modify your config files and your addons.*
1. Make a backup of your current HA setup.
2. Go to your /config/ folder and rename the folder **dwains-theme** to **dwains-dashboard**.
3. Go to your /config/ folder and remove the file **dwains-theme-lovelace-yaml**.
4. If you use any custom resources then backup the file /config/dwains-dashboard/resources/custom_resources.yaml somewhere safe. You need to add these back after installing 2.0.
5. Go inside the folder /config/dwains-dashboard and remove the following folders: **plugins**, **resources**, **translations**, **views**. Make sure you **keep the folders 'configs' and the folder 'addons'!**.
6. Go to the folder /config/themes and remove the files **dwains-theme-black.yaml**, **dwains-theme-dark.yaml**, **dwains-theme-light.yaml** and **dwains-theme-white.yaml**.
7. Go to the folder /config/www and remove the folder **dwains-theme**.
8. Go to the folder /config/packages and remove the folder **dwains-theme**.
9. Go to the folder /config/custom_components and remove the folder **dwains-theme**.

**Section 2- Some small changes to your existing Dwains Theme config files**

The files `scenes.yaml` and `cameras.yaml` in your dwains dashboard configs needs to be changed. If you use them go to /config/dwains-dashboard/configs and open them.
1. The file `cameras.yaml` needs to be changed like explained in [this screenshot](../images/camerasyaml2-0.jpg).
2. The file `scenes.yaml` needs to be changed like explained in [this screenshot](../images/scenesyaml2-0.jpg).

**Section 3 - Adjust your addons**

If you have any addons installed follow this step, otherwise skip this step!

Open up the folder /config/dwains-dashboard/configs and check, we need to make some adjustments to these files.
1. If you use addons the name of the folder dwains-theme has changed to dwains-dashboard so for check all your config files. For example rename `path: 'dwains-theme/addons/rooms/hello-room/page.yaml'` to `path: 'dwains-dashboard/addons/rooms/hello-room/page.yaml'`
2. Some addons use an include to heading.yaml, this file is deprecated.
Change the code as explained in [this screenshot](../images/heading2-0.jpg).
3. The following variables have been renamed, so if you use them, please rename them.
`_d_t_config` to `_dd_config`, `_d_t_trans` to `_dd_trans`, `_d_t_icons` to `_dd_icons` and `_d_t_global` to `_dd_global`

*In 2.0 there isn't a `custom_resources.yaml` file anymore for any custom/third party cards. You will need to add them back by hand after installing 2.0. Go to HA Configuration -> Lovelace Dashboards and click in the top on Resources. Here you can click on the "+" sign bottom right and add all your custom cards you first had in `dwains-theme/resources/custom_resources.yaml`.*

**Section 4 - Dynamic_page.yaml is deprecated**

If you use the `dynamic_page.yaml` in your current installation I have some good and bad news. The bad news is that it is deprecated, the good news is I created a new function for this to put as many custom pages in the main navigation bar as you want!!
You must copy the `addon:` part you had in `dwains-theme/configs/dynamic_page.yaml` into the `addon:` part in `dwains-dashboard/configs/more_page.yaml`. Then add the key `main_menu: 'true'` to the addon. Then this addon will show up in your main navigation bar!
([Read more here](https://dwainscheeren.github.io/dwains-lovelace-dashboard/addons/more_page.html#more-page-addons))

**Section 5 - Reboot HA**

Reboot your Home Assistant. Dwains Theme 1.* should now be fully removed. Now we can install 2.0 with your existing config.

**Section 6 - Install Dwains Dashboard 2.0**

Install Dwains Dashboard 2.0 as explained [here](../getting-started/installation).

#### Breaking changes:
* Dynamic_page.yaml is deprecated! You need to copy your addon to an more_page addon. Now you can add `main_menu: true` to an more_page addon to show it in the main navigation bar! [Read more here](https://dwainscheeren.github.io/dwains-lovelace-dashboard/addons/more_page.html#more-page-addons)
* Partial heading.yaml is deprecated! Replace it with a new card called `dwains-heading-card` see [this screenshot](../images/heading2-0.jpg).
* `cameras.yaml` and `scenes.yaml` have new structure! Please change these files to the new standard. The file `cameras.yaml` needs to be changed like explained in [this screenshot](../images/camerasyaml2-0.jpg).The file `scenes.yaml` needs to be changed like explained in [this screenshot](../images/scenesyaml2-0.jpg).
* The following variables have been renamed, so if you use them, please rename them.
`_d_t_config` to `_dd_config`, `_d_t_trans` to `_dd_trans`, `_d_t_icons` to `_dd_icons` and `_d_t_global` to `_dd_global`
* If you use addons the name of the folder dwains-theme has changed to dwains-dashboard so for check all your config files. For example rename `path: 'dwains-theme/addons/rooms/hello-room/page.yaml'` to `path: 'dwains-dashboard/addons/rooms/hello-room/page.yaml'`

#### New Features:
* **Dwains Themes are now only applied to the Dwains Dashboard itself, this means that the colors are only used in the dashboard and not outside of it.** You now can also use the default HA theme if you want to create a complete own theme. And you can also now set a own primary color (to replace the blue color) for icons etc. These settings can be found under Options in the integration Dwains Dashboard on your integrations page.
* You can set a own name for the dashboard in the integration options.
* You can set a own sidebar icon for the dashboard in the integration options.
* You can hide the cameras and scenes page from the main navigation bar
* You can add own pages to the main navigation bar, see more_page addons and the `main_menu: 'true'` part.
* Vibration Sensor support for rooms @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/188)
* Add weather page and link to it from weather widget. @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/187)
* New Safety Devices @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/155)
You now can add specific devices to a room like for example a smoke sensor. When this sensor gets triggered you get a warning inside your main header and in the room card. See `safety:` in the [room docs](https://dwainscheeren.github.io/dwains-lovelace-dashboard/configuration/rooms.html#rooms-information).
* Add Tracking to Map @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/185)
* Correct batteries with string values. Add color gradient to batteries. @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/186)
* You can set if you want to see open, closer or partly_closed covers in the header (as state). Use `show_covers: closed` in `global.yaml` (defaults to open).

#### Changes:
* **Changed the name Dwains Theme to Dwains Dashboard.**
* **Completly refactored all the code of Dwains Dashboard.**
* **Use webpack now to compile my own Dwains Lovelace cards, no external load of Litelement through unkpg.com. This means you can use Dwains Dashboard now fully offline from the internet without problems. It's also a lot faster as the custom cards for my dashboard are now compiled and optimized.**
* **You don't have to change/touch any of your existing HA files/config to setup and use Dwain Dashboard. Setting up Dwains Dashboard is now all done automatic during installation.**
* **The `picture_path` key in persons.yaml for the photo of the person is now DEPRECATED! I  now load the default picture automatic which you can set yourself in HA if you go to persons.**
* **You now can use Dwains Dashboard together with HKI (Homekit Infused)**
* Removed the use of HA themes for my Dashboard. My theme is now only used inside my dashboard and not outside of it.
* Created 2 full new cards for headings and headers to replace the yaml partials.
* My dashboard is no longer dependent on the following third party addons: card-mod, auto-entities, custom header, state-switch and browser_mod. You can remove these from your HA setup if you don't use them in an other dashboard or Dwains Dashboard addon. I replaced them all with new made Dwains Lovelace Cards.
* Show the Media Player icon if the state is "on" or "playing" instead of just "on". @Benjy04 [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/196)
* Page Entities: Add toggle for switch and light, and more info on hold. @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/194)
* If you have no temperature sensor but only a climate sensor set for a room, the page remains blank. @Klumpke [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/191)
* Fix weather link when small screen. @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/190)
* Homepage icons. Adds icon config for device and cover.
Modifies homepage device for Lock, Safety, Light, Cover, and Device icons based on state. Modifies rooms for Cover and Device icons based on state. Fixes room cover text for devices without position.Uses different icon in rooms to show group of lights. @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/189)
* Safety docs @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/165)
* only show cover position slider if position flag is set @Xetoxyc [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/171)
* Add temperature to climate view. @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/173)
* Really all batteries @patman15 [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/174)
* Hold press doesn't open the more info @jakezp [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/177)
* Remove hard navigation link @roblandry [link](https://github.com/dwainscheeren/dwains-lovelace-dashboard/pull/184)
* ... A LOT OF OTHER SMALL THINGS .. Which I forgot to add here haha. 2.0 is just huge!

---

## Update 1.4.1

v1.4.1 is compatible with HA 0.110, 0.111, 0.112, 0.113

**If you are running Dwains Theme 1.3.*:** 
Follow the normal update manual (top of this page). Please follow all steps.

*The file `dwains-theme/plugins/button-cards-templates/homepage/header/greeting.yaml` is no longer used, so make sure you remove/don't have that file.*

**If you are running older version of Dwains Theme then 1.3.0**: Then follow the update manual of 1.3.0 first [see here](https://dwainscheeren.github.io/lovelace-dwains-theme/information/update.html#how-to-update-to-130).

#### Changes:

* Made all 3 info cards on a climate page equal width when you don't have a climate entity.
* Added a space in the header in a room for doors and windows.
* Add light unavailable state @Klumpe [link](https://github.com/dwainscheeren/lovelace-dwains-theme/pull/143)
* 01.homepage.yaml - show active tab in other langs @Benjy04 [link](https://github.com/dwainscheeren/lovelace-dwains-theme/pull/144)
* Remove Duplicate key - app-header-background-color @bacco007 [link](https://github.com/dwainscheeren/lovelace-dwains-theme/pull/145)
* Fix for light colors when off and unavailable @roblandry [link](https://github.com/dwainscheeren/lovelace-dwains-theme/pull/153)
* Fix media_player background color. Fixes #151 @roblandry [link](https://github.com/dwainscheeren/lovelace-dwains-theme/pull/154)

---

## Update 1.4.0

v1.4.0 is compatible with HA 0.110 and HA 0.111

#### How to update to 1.4.0? 

**If you are running Dwains Theme 1.3.*:** 
Follow the normal update manual (top of this page). Please follow all steps.

*The file `dwains-theme/plugins/button-cards-templates/homepage/header/greeting.yaml` is no longer used, so make sure you remove/don't have that file.*

**If you are running older version of Dwains Theme then 1.3.0**: Then follow the update manual of 1.3.0 first [see here](https://dwainscheeren.github.io/lovelace-dwains-theme/information/update.html#how-to-update-to-130).

#### New Features:
* You can add your house information favorites on the homepage now. Add the line `favorites_homepage: 'true'` to your `global.yaml` file.
* Add option to remove the header in more_page addons. Use `show_header: 'false'`, this variable is not required and true by default.
* It is now possible to create and add addons to the house information page. Just use the `addons:` tag in the `house_information.yaml` file.

#### Changes:

* **BREAKING: Replaced all Font Awesome icons with Material Design Icons, so FA is no longer included in my theme. If you use rooms with Font Awesome (FAS/FAR) icons you need to replace them with Material Design (MDI) icons!! (If you want to use FA icons, please look [here](../how-tos/how-to-choose-icon.md)).**
* **BREAKING: Calendar on the house information is removed/deprecated. Now you can use addons between the favorites and the activity. The calendar is now an addon, please take a look [here for an calendar addon][link](https://github.com/dwainscheeren/dwains-theme-addons/tree/master/house_information/calendar).**
* **BREAKING: Vacuum page has changed. I removed the HACS lovelace-xiaomi-vacuum-map-card from the theme and replaced it with denysdovhan/vacuum-card. But this is card is not required. You can enable it in your vacuum settings, [take a look here](https://dwainscheeren.github.io/lovelace-dwains-theme/configuration/rooms.html#vacuum-object) on how to configure this.**
* Created Dwains Collapse Card. I removed the swipe card from the header, now too many (state) items will collapse and can be toggled with an chevron up/down button. The swipe card plugin is no longer used and loaded by default!
* Changed some translation loadings, because from HA 0.109 its changed.
* Replaced 99% of the translations in my theme with native HA translations. The language files are still required for some titles but are a lot smaller now.
* Added option to have house information favorites on the homepage.
* Removed Mini Graph Cards so the plugin is no longer needed. I  now use the default HA sensor card.
* Fixed all translations for HA 0.110.
* Some small speed improvements.
* Some small bug fixes for HA 0.110.
* Lock buttons are now single click for toggle and hold/double tap for more info.
* Removed layout-card so the plugin is no longer needed. All is now done with my own Dwains Flexbox Card.
* Added fixed width and height for icons in homepage room and device cards.
* Added fixed width and height for icons on the more page.
* Added Dwains Tab Card, a new card for the tabs on the homepage, it will replace state switch card so that card can be removed.
* Added HA (new) Media Control Card for media_players, so you now have a fancy card.
* Fixed an bug on the vacuum page with the battery state.
* If room entity is just 1 item place the name of the entity in the card instead of the translation of the domain. So for example, instead of Media Player it now says the entity name.
* Added option to remove the header in more_page addons.
* On All batteries page added the unknown icon and if battery is under 10% then a empty icon.
* Added filter 'sensor' on all batteries page, it only shows sensor entities with the word 'battery' inside it.
* Fixed bug that custom font "Open Sans" was not loaded anymore in my theme, now it is loaded again.
* Re-programmed Dwains Flexbox Card from scratch.
* Merged PR lock popup [#126][link](https://github.com/dwainscheeren/lovelace-dwains-theme/pull/126).
* Some very small design changes.
* Added page for Windows overview.
* Added page for Doors overview.
* Re-programmed the Activity section on the House Information page, it now is responsive and orders by name default.
* Re-programmed the headers on all pages. The back button is now bigger (for people with big fingers haha).
* Fixed bug that outside_temperature is not showing in the weather card on dekstop/tablet.
* Added HA translations to dwains cover card for open/closed covers.
* On devices -> climate page. If you click on an climate you go to that room climate page.
* Fixed all haptic feedbacks in the theme.
* Made a own page for the alarm, because there was a bug with using it inside browser_mod popup.
* Changed lock to 1 tap is toggle and double tap or hold is more info.
* On devices -> vacuum page. If you click on an vacuum you go to that room vacuum page.
* Added HA (new) Media Control Card for media_players on the devices -> media players page too, so you now have a fancy card.
* Fixed the primary color in the black and dark theme. Now text on states pages (for example) is readable again. This color was used for the navbar on iOS but this is now done by `--app-header-background-color`.
* Removed the lovelace-xiaomi-vacuum-map-card from main resources file.

---

## Update 1.3.1

#### How to update to 1.3.1? 

**If you are running Dwains Theme 1.3.0**: 
Follow the normal update manual (top of this page)
**If you are running older version of Dwains Theme then 1.3.0**: Follow the update manual of 1.3.0 [see here](https://dwainscheeren.github.io/lovelace-dwains-theme/information/update.html#how-to-update-to-130)

#### Changes:

* Fixed a bug in `dwains-flexbox-card` that it sometimes loads slow, now it's a lot faster.
* Added translations for Rooms & Devices on homepage.
* The margin above the header is now only applied on laptop & dekstop view.
* Fixed bug for width of tabs on mobile, now you can't scroll horizontal anymore.


## Update 1.3.0

#### How to update to 1.3.0? 

Follow all the steps below:

* Step 1: **The way HACS plugins are loaded  is changed its now `/hacsfiles/` path, so update HACS & All Plugins you have installed! And make sure you are at least running HACS 0.22!** _Also if you use any custom plugins make sure you change the path of them too in `dwains-theme/resources/custom_resources.yaml`_

* Step 2: This version needs Swipe Card so download that in HACS. Go to HACS -> Plugins -> Search for "Swipe Card" and install it!

* Step 3: Copy all the files from the 1.3.0 zip file over your existing files.

* Step 4: `ui-lovelace.yaml` in the root of your HA setup is no longer required so remove this file.

* Step 5: **Update your HA to 0.107! This version is only compatible with Home Assistant version 0.107 or newer.**

* Step 6: Reboot your HA!! And clear your browser cache.

* Step 7: From HA 0.107 there is a new function to make multiple dashboards. Dwains Theme will be installed as a individual dashboard so you need to access it left in the menu from now on. You also need to configure Dwains Theme as default dashboard on each device in your household. You can do this by going to Configuration -> Lovelace Dashboards -> Click on Dwains Theme and click on Set as Default on this device.

#### Changes:

* **Reworked the design to be responsive, works now fully on desktop, tablet and mobile!!**
* **Added Dwains Theme Notifications, you can now push notifications into my theme with service call `dwains_theme.notification_create` they will show on the homepage header.**
* **Added devices view on the homepage, now you can switch between rooms and devices direct from the homepage!**
* **Added new Black and White themes, check them out! :D**
* **Changed the way HACS plugins are loaded with the new `/hacsfiles/` path, make sure you are at least running HACS 0.22!!**
* **Made theme compatible with HA 0.107^**
* On a single light card, now single tap is toggle on/off and double tap is the more info popup.
* Added support for locks inside a room, use them with `lock:` can be single lock entity or group of locks!
* Added support for pressure inside a room, use them with `pressure:`.
* Theme automatic detects your Unit System settings from HA automatic and then switchs between Celsius and Fahrenheit.
* Added new `dwains-weather-card` for weather information in the header on the homepage on desktop/tablet.
* Changed `custom:cover-slider-card` to `custom:dwains-cover-card`.
* Made theme compatible with HA 107.
* Added more info dialog on click of item on All sensors & All batteries page.
* Fixed bug with Android app not showing sidebar on swipe from left.
* Fixed bug Show brightness value only when it is supported on room page (@joyka).
* Added icon for cooling on homepage next to temperature if climate is on cooling.
* Added on room page if a window or door has other state then on/True or off/False then show that state as plain text.
* If cover with supported_features has also 7 then show the slider instead of the up/down buttons.
* Hide voice button on Android app.
* Changed the version number scrape sensor to check 1 times an hour for new theme version.
* Added double click on device card to toggle the device

## Update 1.2.1
* Enabled the HA sidebar on mobile on all pages. (Future update will have a option to enable/disable it) Please let me know, if you don't want the sidebar enabled on all pages, in the HA thread.
* Fixed bug in new reload config version that it doesn't find the config files on some HA setups.
* Fixed bottom navbar on Android to be smaller in height then on iPhone. (@Rik)
* Fixed bug with using apostrophe in names. You can now use them.
* Parsing the `navigation_path` and `room_name` now to the data of an room addon button. So you can use that to link to the addon page.
* Changed the way the `more_entities` work inside `rooms.yaml` and `persons.yaml`. Next to the existing `more_entities` object which is now always in the popup (header top right icon), you now have the option to use: `page_entities` this one will be directly visible on the bottom of the page itself.
* Also added an option `columns:` inside `more_entities` and `page_entities` so you can set them to 1 (then you have full width stacked cards).
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
