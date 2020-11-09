[< Go back to Home](../index.md)

# Installation
**Dwains Dashboard is only compatible with HA 0.107 or newer!**

Did you read and followed the preparation part? No? [Check that out first](preparations.md). If you experience any problems during the installation of Dwains Theme then please join my Discord server for live support questions so I can help you. [Join my Discord Server here, it's 100% free!](https://discord.gg/7yt64uX)

## Step 1 - Download Dwains Dashboard latest release
Download the [latest release from the release page](https://github.com/dwainscheeren/lovelace-dwains-theme/releases/latest).

Initialize the download by clicking on the "Source code (zip)" link at the bottom of the page.

![Github](../images/getting-started/download-latest-release.png)

## Step 2 - Extract the content

1. Unzip the file you just downloaded.
2. Inside this folder you will see a folder called `custom_components` copy this folder.
3. Go to the main folder of your Home Assistant installation. This is the folder where you config is. (Hint: its the folder where for example the files `ui-lovelace.yaml` and `configuration.yaml` are located).
4. Paste the `custom_components` to the main folder of your Home Assistant installation.

You will end up with having `/config/custom_components/dwains_dashboard` or if you are running a venv installation it would look like `/home/homeassistant/.homeassistant/custom_components/dwains_dashboard`.

## Step 3 - Restart Home Assistant

Restart Home Assistant once before moving to the next step.

## Step 4 - Activate Dwains Dashboard

1. In your Home Assistant UI go to "Configuration", then click "Integrations".
2. Click on the "+" button in the bottom right corner.
3. Search for or scroll down to find "Dwains Dashboard" and select it.

There will be a new icon (a D icon) in your left sidebar.

## Step 5 - Configure Dwains Dashboard

To configure/build the dashboard you need to edit the files in the folder `dwains-dashboard/configs/`. When you open these file you see some examples commented-out, only uncomment the lines you want to use! If you want to know how you need to configure these files, go to the [Configure Dwains Dashboard](../configuration/index.md) page.

Also read here some handy how to's:
* [How to choose and use an icon](../how-tos/how-to-choose-icon.md)
* [How to update dashboard](../information/update.md)

**If you want to extend or add custom things like custom pages or cards to this dashboard, please refer to the [addons](../addons/index.md) documentation.**

That's it! Dwains Dashboard should now be installed.

PS: Ceckout some [Tips & Tricks](../information/tips-and-tricks.md) of Dwains Dashboard.