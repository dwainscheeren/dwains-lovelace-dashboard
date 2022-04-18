[< Go back to Home](../index.md)

# How to create Dwains Dashboard blueprints?


Dwains Dashboard blueprints are pre-made pages or cards that you can easily add to your Home Assistant instance. Each blueprint can be added as many times as you want.

Quick links:

[Dwains Dashboard Blueprints](https://github.com/dwainscheeren/dwains-dashboard-blueprints)

## Creating Blueprints

You always gonna start with the header of a blueprint which looks like this.

````yaml
blueprint:
  custom_cards:
  - button-card
  description: description of blueprint
  input:
    entity_name:
      description: description shown
      name: entity name
      type: text-field
  name: name of blueprint
  type: page
  version: '1.0.1'
card:  
````

Then you can follow with your YAML Code. 

Tip: Create a new card in default Dashboards and copy the code after the blueprint header. You need to add two spaces before your code. 
<br> So it looks like this:

````yaml
card:
  type: custom:button-card
  entity: $replace_with_input_entity$
  name: $entity_name$
````


## Configuration variables


| Name                | Type    | Default         | Options                                   | Description                                                                |
| :------------------ | :------ | :---------------| :---------------------------              | :------------------------------------------------------------------------  |
| `custom_cards`      | string  | Optional        | any custom card                           |  Used custom cards which were used. Will show in blueprint overview.       |
| `description`       | string  | Optional        | any description                           |  adds a description to blueprint overview                                  |
| `input`             | string  | Optional        | `entity-picker` \| `text-field` \| `icon-picker`  |  define input fields                                                       |
| `name`              | string  | Optional        | any name                                  |  Choose name of blueprint                                                  |
| `type`              | string  | Optional        | card, page or replace-card                                 |  defines type of blueprint                                                 |
| `version`           | string  | Optional        | any version number                        |  defines version of blueprints in blueprint overview                       |

## Special Features
### Using Variables

You can use variables in your blueprint. With these everybody can use the blueprint and fill in their own names/icons/entities.
<br>To use them in your blueprint you have so specify some inputs. Here is an example.
<br>Define the variables in your input and call them in your blueprints with $xxx$.

````yaml
blueprint:
  input:
    entity:
      description: choose entity
      name: entity
      type: entity-picker
    icon:
      description: description icon
      name: icon
      type: icon-picker  
    entity_name:
      description: name of entity
      name: entity name
      type: text-field      
card:  
  entity: $entity$
  icon: $icon$
  name: $entity_name$
````

### Replace Cards

There is a replace card which replaces an existing card of an entity. This is helpful for cards which are auto created by DD3.
You can easily change the entity card by using a replace card blueprint.

The only thing you need to add/change in your blueprint is the entity. The entity has to be $replace_with_input_entity$
You don't have to specifiy the entity while using the blueprint.

Also don't forget to set the type to replace-card `type: replace-card` for this.

````yaml
card:
  entity: $replace_with_input_entity$
````

## Credits

This page is written by [xBourner](https://github.com/xbourner)
