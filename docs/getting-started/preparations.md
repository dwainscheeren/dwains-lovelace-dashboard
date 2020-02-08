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

## Short explanation

My theme has the slogan "An auto generating Home Assistant Lovelace UI". It's not (yet) fully auto generating (so not a 1 click install and done). You still need to define your house in so called 'Dwains Theme Config files'. Working with these files is not that hard and is fully explained in the docs here. I'm still working hard on this theme, so if you have any tips for it please discuss it in the [HA forum thread](https://community.home-assistant.io/t/dwains-theme-an-auto-generating-lovelace-ui-theme/168593?u=dwains).

## What's next?
So lets start with the installation of Dwains Theme.

[Installation](installation.md)