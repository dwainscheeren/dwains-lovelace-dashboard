[< Go back to Home](..//index.md)

# Preparations

Before we are getting started on anything, make you sure you make a backup of you current Home Assistant setup.

Dwains Theme highly depends on HA groups If you don't know how to work with groups, [read this first](https://www.home-assistant.io/integrations/group/). 

With groups you can combine multiple entities into one. For example you have 3 lights in your living room `light.living_room_1`, `light.living_room_2` and a switch `switch.living_room_3`. You can combine these in 1 group as follow:
```
living_room_lights:
  name: Living Room Lights
  entities: 
    - light.living_room_1
    - light.living_room_2
    - switch.living_room_3
```
You then can use `group.living_room_lights` in my theme config.

## What's next?
So lets start with the installation of Dwains Theme.

[Installation](installation.md)