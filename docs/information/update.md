[< Go back to Home](../index.md)

# Updating Dwains Theme 

If there is a update of Dwains Theme here is how to install it.

### Step 1 - Download Dwains Theme latest release
Download the [latest release from the release page](https://github.com/dwainscheeren/lovelace-dwains-theme/releases).

**Each release has information on how to install it as an update!**

### Step 2 - Extract & move the download
Unzip the file you just downloaded. 

Copy the content of this folder to the root of your Home Assistant installation.

**NOTE: You may need to overwrite the file `ui-lovelace.yaml` with the file from the downloaded folder. If you made any modifications on the `ui-lovelace.yaml` file check out the difference between your current one and the downloaded one.**

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