[< Go back to Home](index.md)

# Installation

Before we are getting started on anything, make you sure you make a backup of you current Home Assistant setup.

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

### Install HACS components

We also need to download some components from the HACS store. In the top tabs inside HACS click on the tab INTEGRATIONS and install the components from the table below.

| Name | HACS | Required | Description |
|-------------|-------------|----------|---------------------------------------------------------------------------------------------------------|
| Browser mod | Integration | Yes | A Home Assistant integration to turn your browser into a controllable entity - and also an audio player |

After installing both HACS plugins & HACS components you can continue to install Dwains Theme below.


## Installing Dwains theme

### Step 1 - Download Dwains Theme latest release
Download the [latest release from the release page](https://github.com/dwainscheeren/lovelace-dwains-theme/releases).

### Step 2 - Extract & move the download
Unzip the file you just downloaded. 

Copy the content of this folder to the root of your Home Assistant installation.

*NOTE: You need to overwrite the file `ui-lovelace.yaml` with the file from the downloaded folder*

### Step 3 - Set the configuration files

1. Find and rename the `dwains-theme/configs-samples` folder to `dwains-theme/configs`.
2. Open `configuration-sample.yaml` in your root HA folder and select the text between `Copy from here` till `Copy till here` and paste this at the top of your existing `configuration.yaml` file.
3. Now that you have your `configuration.yaml` file open make sure you don't have the following lines (with sublines) below the step 2 pasted code. `homeassistant:`, `lovelace:`, `frontend:` and `browser_mod:`. Please remove these lines. 

### Step 4 - OPTIONAL: Use Home Assistant packages

*NOTE: This step is not required but highly recommended*

 I personally use Home Assistant packages. With packages you have a way to include different components, or different configuration parts using any of the `!include` directives. [Read more about it here](https://www.home-assistant.io/docs/configuration/packages/).

I included a sample folder for this in my theme it's called `user-package-sample` you can rename this folder to your own name. After this open `configuration.yaml` and uncomment the line `user_package: !include user-package-sample/configuration.yaml`. And change the name of `user-package-sample/` here to your own name.

*NOTE: Read the content of the `user-package-sample/configuration.yaml` file to get a understanding how it works.*

Next copy and cut everything from your own (original) `configuration.yaml` **EXCEPT THE TEXT BETWEEN `Start of dwains-theme necessary code` AND `End of dwains-theme necessary code`** to the file `the-folder-you-just-renamed/configuration.yaml`. The existing code in this file is a example.

This is not compatible with 1 global packages folder as explained on the HA website! So if you already use: 
 ```
 homeassistant:
  packages: !include_dir_named packages
 ```
 It doesnt work! 
 
 It only works with:
 ```
 homeassistant:
  packages:
    dwains_theme: !include dwains-theme/configuration.yaml
    user_package: !include user-package-sample/configuration.yaml
 ```

### Step 5 - Configure Dwains Theme

To configure/build the theme you need to edit the files in the folder `dwains-theme/configs/`. When you open these file you see some examples commented-out. If you want to know how you need to configure these files, go to the [Configure Dwains Theme](configuration.md) page.

### Step 6 - Restart Home Assistant

*NOTE: Your Home Assistant frontend can have some error. In this case you forgot a HACS plugin or you made a mistake in any of the config files.*

That's it! Dwains Theme should now be installed.

*Let me know on the [HA forum](https://community.home-assistant.io/t/dwains-theme-an-auto-generating-lovelace-ui-theme/168593?u=dwains) if you like my theme :D*

## What's next?
Now that you have installed all the required plugins and the Dwains Theme core files you can edit the Dwains theme configuration files.

[Configure Dwains Theme](configuration.md)

*WARNING: Please don't change any of the files inside the folder `dwains-theme`, because future updates of this theme may not work. If you want to extend or add own views/pages to this theme use [addons](addons.md)*