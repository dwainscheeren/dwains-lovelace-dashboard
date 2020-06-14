[< Go back to Home](../index.md)

# How to choose and use an icon

Dwains Theme has by default **only support for Material Design icons**. If you want to use Font Awesome icons (like in the demo screenshots and videos) then I will explain on this page how to get them to work.

### Material design icons
[Here you can search for MD icons](https://materialdesignicons.com/). When you mouseover on a icon you see the name of the icon. You can then use the icon like: `mdi:icon-name`

---

### Font awesome


#### Install Font Awesome

If you want to use Font Awesome icons in Dwains Theme you have to install the fontawesome integration by Thomas Loven in HACS. 

To install this go to HACS -> Integrations -> Search for fontawesome and install this.

After installation of this integration restart your Home Assistant installation.

Then go to HA Configuration -> Integrations and click on the + sign (Add new integration) and search for fontawesome and install it.

After install open the settings for the new FontAwesome integration.
Click the Options gear (top right) and select which icon sets to load.

#### Use Font Awesome
[Here you can search your FA icons](https://fontawesome.com/icons?d=gallery&m=free). If you click on a icon you see the name of the icon in the top and below that you see Solid Style, Regular Style or Light style. You then need to use the icon like this:

* A Solid style icon: `fas:icon-name`
* A Regular style icon: `far:icon-name`
* A Light style icon: `fal:icon-name` (Only works if you got Pro icons)


