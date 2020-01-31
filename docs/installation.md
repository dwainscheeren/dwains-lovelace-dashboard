# Installation

Before we are getting started on anything, make you sure you make a backup of you current Home Assistant setup.

## Installing HACS Plugins & Components
This theme depends on some plugins and components from other developers. These plugins can be installed thought HACS.

Make sure you have installed HACS in your Home Assistant setup. If you don't have HACS installed or you don't know what HACS is, then you read the [HACS Installation instructions here](https://hacs.xyz/docs/installation/manual).

After you made sure you got HACS up and running you can continue to install Dwains Theme.

### Install HACS plugins

In the left side menu click on Community and then on the Tab PLUGINS. Search for each plugin in the table below and install it.

*NOTE: You don't have to add each plugin JS url to your lovelace configuration/resources list. You just need to click Install for now on each plugin.

| Name                             | HACS   | Type   | Required | Latest tested  version | Description                                                                                                                                                                                             |
|----------------------------------|--------|--------|----------|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Weather card                     | Plugin | Module | Yes      | v1.4.1                 | Weather Card with animated icons for Home Assistant Lovelace                                                                                                                                            |
| Card-mod                         | Plugin | Module | Yes      | 12                     | Add CSS styles to (almost) any lovelace card                                                                                                                                                            |
| Button Card                      | Plugin | Module | Yes      | 3.1.1                  | Lovelace button-card for home assistant                                                                                                                                                                 |
| Light Entity Card                | Plugin | js     | Yes      | 3.1.0                  | Control any light or switch entity                                                                                                                                                                      |
| Mini Graph Card                  | Plugin | Module | Yes      | v0.8.2                 | Minimalistic graph card for Home Assistant Lovelace UI                                                                                                                                                  |
| auto-entities                    | Plugin | Module | Yes      | 14                     | Automatically populate the entities-list of lovelace cards                                                                                                                                              |
| layout-card                      | Plugin | Module | Yes      | 9                      | Get more control over the placement of lovelace cards.                                                                                                                                                  |
| Custom Header                    | Plugin | Module | Yes      | 1.2.1                  | Lovelace Custom Header                                                                                                                                                                                  |
| more-info-card                   | Plugin | Module | Yes      | 15                     | Display the more-info dialog of any entity as a lovelace card                                                                                                                                           |
| Lovelace Xiaomi  Vacuum Map Card | Plugin | Module | Yes      | v1.1.9                 | This card enables you to specify a target or start a zoned cleanup using  live or static map, just like in Mi Home app. Additionally you can define a  list of zones and choose the ones to be cleaned. |

### Install HACS components

We also need to download some components from the HACS store. In the top tabs inside HACS click on the tab INTEGRATIONS and install the components from the table below.

| Name                             | HACS   | Required | Latest tested  version | Description                                                                                                                                                                                             |
|----------------------------------|--------|--------|----------|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Browser mod                     | Integration | Yes      | 16                 | A Home Assistant integration to turn your browser into a controllable entity - and also an audio player |


## Installing Dwains theme

### Step 1 - Download Dwains Theme latest release
Download the [latest relesae from the release page](https://github.com/dwainscheeren/lovelace-dwains-theme/releases).

### Step 2 - Extract & move the download
Unzip the file you just downloaded. 

Copy the content of this folder to the root of your Home Assistant installation.

*NOTE: You need to overwrite the file `ui-lovelace.yaml` with the file from the downloaded folder*

### Step 3 - Modify some files

1. Find and rename `dwains-theme-sample.yaml` in your root folder and rename it to `dwains-theme.yaml`
2. Open `configuration-sample.yaml` and select the text between `Copy from here` till `Copy till here` and paste this at the top of your own `configuration.yaml` file.
3. Now that you have your `configuration.yaml` file open make sure you don't have the following lines inside. `lovelace:`, `frontend:` and `browser_mod:`. Please remove these  lines.

### Step 4 - OPTIONAL: Use Home Assistant packages

*NOTE: This step is not required but highly recomended*

 I personally use Home Assistant packages. With packages you have a way to include different components, or different configuration parts using any of the `!include` directives. [Read more about it here](https://www.home-assistant.io/docs/configuration/packages/).

I included a sample folder for this in my theme it's called `user-package-sample` you can rename this folder to your own name. After this open `configuration.yaml` and uncomment the line `user_package_sample: !include user-package-sample/configuration.yaml`. And change the name of `user_package_sample` here to your own name.

*NOTE: Read the content of the `user-package-sample/configuration.yaml` file to get a understanding how it works.*

Next copy everything from your `configuration.yaml` **EXCEPT THE TEXT BETWEEN `Start of dwains-theme necesary code` AND `End of dwains-theme necesary code`** to the file `the-folder-you-just-renamed/configuration.yaml`. Remove the existing code in this file!

### Step 5 - Configure Dwains Theme

To configure/build the theme you need to edit the file `dwains-theme.yaml`. When you open this file you see some examples commented-out. If you want to know how you need to configure this file, go to the [Configure Dwains Theme](configuration.md) page.

### Step 4 - Restart Home Assistant

*NOTE: Your Home Assistant installation can have some errors now. This will be fixed after configuring Dwains Theme.*

That's it! Dwains Theme should now be installed. To start using it continue reading.

## What's next?
Now that you have installed all the required plugins and the Dwains Theme core files you can edit the Dwains theme configuration file.

[Configure Dwains Theme](configuration.md)