[< Go back to Home](../index.md)

# Installation

Follow all the steps on this page! Start with the HACS part.

## Installing required HACS Plugins & Components
This theme depends on some plugins and components from other developers. These plugins can be installed thought HACS.

Make sure you have installed HACS in your Home Assistant setup. If you don't have HACS installed or you don't know what HACS is, then you read the [HACS Installation instructions here](https://hacs.xyz/docs/installation/manual).

After you made sure you got HACS up and running you can continue to install Dwains Theme.

### Install HACS plugins

In the left side menu click on Community and then on the Tab PLUGINS. Search for each plugin in the table below and install it.

*NOTE: You don't have to add each plugin JS url to your lovelace configuration/resources list. You just need to click Install for now on each plugin.

| Name | Type | Required | Description |
|----------------------------------|--------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Weather card | Module | Yes | Weather Card with animated icons for Home Assistant Lovelace |
| Card-mod | Module | Yes | Add CSS styles to (almost) any lovelace card |
| Button Card | Module | Yes | Lovelace button-card for home assistant |
| Light Entity Card | js | Yes | Control any light or switch entity |
| Mini Graph Card | Module | Yes | Minimalistic graph card for Home Assistant Lovelace UI |
| auto-entities | Module | Yes | Automatically populate the entities-list of lovelace cards |
| layout-card | Module | Yes | Get more control over the placement of lovelace cards. |
| Custom Header | Module | Yes | Lovelace Custom Header |
| more-info-card | Module | Yes | Display the more-info dialog of any entity as a lovelace card |
| Lovelace Xiaomi  Vacuum Map Card | Module | Yes | This card enables you to specify a target or start a zoned cleanup using  live or static map, just like in Mi Home app. Additionally you can define a  list of zones and choose the ones to be cleaned. |
| Atomic Calendar | Module | Yes | Custom calendar card for Home Assistant with Lovelace |
| state-switch | Module | Yes | Dynamically replace lovelace cards depending on occasion |


### Install HACS components

We also need to download 1 component from the HACS store. In the top tabs inside HACS click on the tab INTEGRATIONS and install the component from the table below.

| Name | HACS | Required | Description |
|-------------|-------------|----------|---------------------------------------------------------------------------------------------------------|
| Browser mod | Integration | Yes | A Home Assistant integration to turn your browser into a controllable entity - and also an audio player |

After installing both HACS plugins and the 1 HACS component and you make sure you don't forgot any, you can continue to install Dwains Theme below.


## Installing Dwains theme

### Step 1 - Download Dwains Theme latest release
Download the [latest release from the release page](https://github.com/dwainscheeren/lovelace-dwains-theme/releases).

### Step 2 - Extract & move the download

1. Unzip the file you just downloaded and copy the content of it. 
2. Go to the main folder of your Home Assistant installation. This is the folder where you config is. (Hint: its the folder where the file `ui-lovelace.yaml` and `configuration.yaml` is located).
3. Rename your existing file `ui-lovelace.yaml` to `ui-lovelace.back.yaml` (so you have a backup of this file).
2. Copy the content of the downloaded folder to the main folder of your Home Assistant installation.

*NOTE: You need to overwrite the file `ui-lovelace.yaml` with the file from the downloaded folder*

### Step 3 - Set the configuration files

1. Find and rename the `dwains-theme/configs-samples` folder to `dwains-theme/configs`.
2. Open your `configuration.yaml` file and make sure you don't have the following lines (with sublines). `homeassistant:`, `lovelace:`, `frontend:` and `lovelace_gen:`. Please remove these lines. From your existing `configuration.yaml`. This is very important.
3. Open `configuration-sample.yaml` in your root HA folder and select the text between `Copy from here` till `Copy till here` and paste this at the top of your existing `configuration.yaml` file.

### Step 4 - Your existing configuration

>**I have my full existing config in the `configuration.yaml` file**
>
>Okay then you are already set. If you had some code under the `homeassistant:` line and want this back, then place it back under the following line `# If you had any important strings before in homeassistant: place them back here below`.

>**I'm using HA packages folder**
>
> If you already are using HA packages, then you know how to work with it. Please make sure your `configuration.yaml` is correct and has then `packages: !include_dir_named packages/` under the `homeassistant:` line.

### Step 5 - Configure Dwains Theme

To configure/build the theme you need to edit the files in the folder `dwains-theme/configs/`. When you open these file you see some examples commented-out, only uncomment the lines you want to use! If you want to know how you need to configure these files, go to the [Configure Dwains Theme](../configuration/index.md) page.

### Step 6 - Restart Home Assistant

*NOTE: Your Home Assistant frontend can have some error. In this case you forgot a HACS plugin or you made a mistake in any of the config files. Always clear your browser cache when you receive errors.*

That's it! Dwains Theme should now be installed.

*Let me know on the [HA forum](https://community.home-assistant.io/t/dwains-theme-an-auto-generating-lovelace-ui-theme/168593?u=dwains) if you like my theme :D*

## What's next?
Now that you have installed all the required plugins and the Dwains Theme core files you can edit the Dwains theme configuration files.

[Configure Dwains Theme](../configuration/index.md)

**WARNING: Please don't change any of the files inside the folder `dwains-theme`, because future updates of this theme may not work. If you want to extend or add own views/pages to this theme use [addons](../addons/index.md)**