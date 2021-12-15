[< Go back to Home](../index.md)

# FAQ - frequently asked question

## How can I get Dwains Dashboard installed through HACS?
1. Go to HACS
2. Click on Integrations
3. Click on the three dots top right corner
4. Click on Custom repositories
5. There opens a new popup inside the Repository input field type: `https://github.com/dwainscheeren/dwains-lovelace-dashboard` and select as Category: Integration
6. Click on ADD button
7. Dwains Dashboard is now added to hacs and you can search for it and install it

## How can I add multiple entities (for example lights) inside 1 room?
To add multiple entities inside a room you need to create an Home Assistant group.
So for example if you have 5 lights in your living room, you will need to create a group with these 5 lights inside. Then you can use that group inside the room.

<img src="../assets/roomgroups.png">

**Don't confuse HA group with HA light groups, those 2 are different!**