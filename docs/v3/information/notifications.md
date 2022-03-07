[< Go back to Home](../index.md)

# How to use Dwains Dashboard Notifications

## dwains_dashboard.notification_*

Inside Dwains Dashboard, you can display notifications at the top of your home screen. You can create or dismiss notifications with automations.

Check out the following service calls: `dwains_dashboard.notification_create` and `dwains_dashboard.notification_dismiss`.

There is also `dwains_dashboard.notification_mark_read` but this currently doesn't have a active function.

# Examples

The example below creates a notification when the garbage gets collected tomorrow, edits the notification to today on the next day, and dismisses the notification at the end of the second day.

## Create a notification

```markdown
- id: notify_create_garbage_tomorrow_dwains_dashboard
  alias: Notify create garbage tomorrow Dwains dashboard
  description: 'This automation creates a notification in Dwains dashboard'
  trigger:
  - at: '00:01'
    platform: time
  condition:
  - condition: state
    entity_id: sensor.garbage_tomorrow
    state: On
  action:
  - data:
      message: You have to put the bins out tomorrow.
      notification_id: garbage
    service: dwains_dashboard.notification_create
    
```
## Edit a notification 

```markdown
- id: notify_create_garbage_today_dwains_dashboard
  alias: Notify create garbage today Dwains dashboard
  description: 'This automation edits the previous notification in Dwains dashboard'
  trigger:
  - at: '00:01'
    platform: time
  condition:
  - condition: state
    entity_id: sensor.garbage_today
    state: On
  action:
  - data:
      message: You have to put the bins out today.
      notification_id: garbage
    service: dwains_dashboard.notification_create
    
```

## Dismiss the notification

```markdown
- id: notify_dismiss_garbage_dwains_dashboard
  alias: Notify dismiss garbage Dwains dashboard
  description: 'This automation dismisses the garbage notification in Dwains dashboard'
  trigger:
  - at: '23:59'
    platform: time
  condition:
  - condition: state
    entity_id: sensor.garbage_today
    state: On
  action:
  - data:
      notification_id: garbage
    service: dwains_dashboard.notification_dismiss
    
```
Notification_id is needed to let it work. Only 1 notification for each notification_id can be displayed at the same time. To get multiple notifications, some would need multiple notification_id's.