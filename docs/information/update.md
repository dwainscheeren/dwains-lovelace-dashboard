[< Go back to Home](../index.md)

# Updating Dwains Theme 

If there is a update of Dwains Theme here is how to install it.

### Step 1 - Download Dwains Theme latest release
1. Download the [latest release from the release page](https://github.com/dwainscheeren/lovelace-dwains-theme/releases).

**Each release has information on that page with how to install it as an update!**

### Step 2 - Extract & move the download

1. Unzip the file you just downloaded. 

2. Copy the content of this folder to the root of your Home Assistant installation.

**WARNING: You may need to overwrite the file `ui-lovelace.yaml` with the file from the downloaded folder. If you made any modifications on the `ui-lovelace.yaml` file, like added own resources, check out the difference between your current one and the downloaded one!!**

---

# Changelog

## Update 1.1.2 

* Docs updates.
* Config examples updates.
* Added Italian language.
* Fixed bug when put multiple addons in persons.
* Fixed motion icon (off state) FA icon free.
* Added sidebar back on mobile on the house data page. If you go on the more page to house data you can use the sidebar (swipe from left) on mobile to access HA sidebar.
* Added toggle doubleclick on favorites on house information page.
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

---

## Update from 1.0.* to 1.1.0

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