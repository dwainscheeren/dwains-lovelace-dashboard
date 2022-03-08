[< Go back to Home](../index.md)

# Migrate from existing Dwains Dashboard v2 installation to v3

Please take some time to read all the steps. 

**If you experience any problems during the upgrade process of v2 to v3 then please join my Discord server, you get live personal support. [Join my Discord Server here, it's 100% free!](https://discord.gg/7yt64uX)**

Because Dwains Dashboard v3 is a completely new dashboard, writen from ground up and not based on v2, it is unfortunately not possible to just upgrade from v2 to v3.

The best way to upgrade from v2 to v3 is to install v3 as a fresh dashboard and then move back the custom addons back into 3.0. So please take some time when you are starting the upgrading process. *Note that addons are no longer a thing in version 3 and you need to manually convert them to a yaml card.*

## Step 1 
Rename the folder `dwains-dashboard` in your main HA folder (so nothing in `custom_components`!) to `dwains-dashboard-v2`.

## Step 2
Remove Dwains Dashboard in your HA integrations list.

## Step 3
Remove the `dwains_dashboard` folder in `custom_components`.

## Step 4
Reboot HA.

## Step 5 
Install Dwains Dashboard v3. [Check here](installation.md) how to do that. After installation continue here with step 6.

## Step 6
Re-install the more pages. The more pages are a little bit different in v3. They no longer support data input and they now load automatic if they are placed in the right folder. Also the first card must be a non-array card.
To automatic load a more page in v3 they must be in the folder `dwains-dashboard/configs/more_pages` so for example: `dwains-dashboard/configs/more_pages/_NAME-OF-MORE-PAGE-HERE_/page.yaml`.

For example: You got a more page configured as follow in v2:

`dwains-dashboard/configs/more_page.yaml`:
```yaml
more_page:
    addons:
      - name: Examplepage
        icon: fas:puzzle
        path: 'dwains-dashboard/addons/more_page/examplepage/page.yaml'
        data:
          entity_for_page: light.test
```

`dwains-dashboard/addons/more_page/examplepage/page.yaml`:
```yaml
# dwains_dashboard

- type: vertical-stack
  cards:
    - type: entity
      entity: {{ (data | fromjson)['entity_for_page'] }}
```

You need to convert it like this to get it working in v3:

- The config is no longer needed
- Create the `page.yaml` in a folder inside `dwains-dashboard/addons/more_page/` and DD v3 wil automatic load the page.
- Convert the page.yaml to this: (first card must be a non array so `- type: vertical-stack` replaced with `type: vertical-stack` and shift all code 2 spaces to left)

`dwains-dashboard/addons/more_page/examplepage/page.yaml`:
```yaml
- type: vertical-stack
  cards:
    - type: entity
      entity: light.test
```

Repeat this for all your custom more pages.


## Step 7
Re-installing the room addons. Because v3 no longer uses room but rather HA areas the room addons are no longer a thing. But in v3 you now can add a custom card to the top or bottom of an area view. Also you can now replace any HA entity card with a own lovelace card of your own choise. So unfortunally you need to manually re-create all these cards in v3. 

For example: In DD 2.0 you got a custom room addon:
`dwains-dashboard/configs/rooms.yaml`
```yaml
  - name: Garage
    addons:
      - name: Camera
        path: 'dwains-dashboard/addons/rooms/garage/camera/page.yaml'
        button_path: 'dwains-dashboard/addons/rooms/garage/camera/button.yaml'
        data:
          entity: camera.carport
```

`dwains-dashboard/addons/rooms/garage/camera/page.yaml`
```yaml
# dwains_dashboard

- type: picture-entity
  entity: {{ (data | fromjson)['entity'] }}
  camera_view: live
  show_name: false
  show_state: false
  tap_action: none
  hold_action: none
```

You need to go to your Garage area in DD 3.0:
- Enable edit mode inside the Garage area
- Click on "Add card"
- Select "Lovelace Card"
- Scroll to the bottom and select "Manual Yaml"
- Enter the code from the `page.yaml` but convert the code to this: (first card must be a non array so `- type: picture-entity` replaced with `type: picture-entity` and shift all code 2 spaces to left). 
- Replace jinja parsing things like `entity: {{ (data | fromjson)['entity'] }}` with the entity itself `entity: camera.garage`
- Click on submit

Repeat this for all custom addons inside your rooms/areas.


## Step 8
Remove the `dwains-dashboard-v2` folder in your main HA configuration.
You now have succesfully installed v3. :) Enjoy!