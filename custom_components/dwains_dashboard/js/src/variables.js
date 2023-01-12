export const WEATHER_ICONS = {
    "clear-night": "mdi:weather-night",
    cloudy: "mdi:weather-cloudy",
    overcast: "mdi:weather-cloudy-arrow-right",
    fog: "mdi:weather-fog",
    hail: "mdi:weather-hail",
    lightning: "mdi:weather-lightning",
    "lightning-rainy": "mdi:weather-lightning-rainy",
    partlycloudy: "mdi:weather-partly-cloudy",
    pouring: "mdi:weather-pouring",
    rainy: "mdi:weather-rainy",
    snowy: "mdi:weather-snowy",
    "snowy-rainy": "mdi:weather-snowy-rainy",
    sunny: "mdi:weather-sunny",
    windy: "mdi:weather-windy",
    "windy-variant": "mdi:weather-windy-variant",
  };

export const ALARM_ICONS = {
    "armed_away": "mdi:shield-lock",
    "armed_vacation": "mdi:shield-airplane",
    "armed_home": "mdi:shield-home",
    "armed_night": "mdi:shield-moon",
    "armed_custom_bypass": "mdi:security",
    "pending": "mdi:shield-outline",
    "triggered": "mdi:bell-ring",
    disarmed: "mdi:shield-off",
  };

export const UNAVAILABLE = "unavailable";
export const UNKNOWN = "unknown";

export const STATES_OFF = ["closed", "locked", "off", "docked","idle","standby","paused","auto"];

export const UNAVAILABLE_STATES = ["unavailable","unknown"];

export const SENSOR_DOMAINS = ["sensor"];

export const ALERT_DOMAINS = ["binary_sensor"];

export const TOGGLE_DOMAINS = ["light", "switch", "fan"];

export const CLIMATE_DOMAINS = ["climate"];

export const OTHER_DOMAINS = ["vacuum", "media_player", "lock"];

export const DEVICE_CLASSES = {
    sensor: ["temperature", "humidity"],
    binary_sensor: ["motion", "door", "window", "vibration", "moisture", "smoke"],
  };

export const DEVICE_ICONS = {

  };

export const DOMAIN_STATE_ICONS = {
    light: { on: "mdi:lightbulb", off: "mdi:lightbulb-outline" },
    switch: { on: "mdi:power-plug", off: "mdi:power-plug" },
    fan: { on: "mdi:fan", off: "mdi:fan-off" },
    sensor: { humidity: "mdi:water-percent", temperature: "mdi:thermometer" },
    binary_sensor: {
      motion: "mdi:motion-sensor",
      door: "mdi:door-open",
      window: "mdi:window-open-variant",
      vibration: "mdi:vibrate",
      moisture: "mdi:water-alert",
      smoke: "mdi:smoke-detector-variant-alert",
    },
    vacuum: { on: "mdi:robot-vacuum" },
    media_player: { on: "mdi:cast-connected" },
    lock: { on: "mdi:lock-open" },
    climate: { on: "mdi:thermostat"},
  };

  export const DOMAIN_ICONS = {
    light: "mdi:lightbulb",
    climate: "mdi:thermostat",
    switch: "mdi:power-plug",
    fan: "mdi:fan",
    sensor: "mdi:eye",
    humidity: "mdi:water-percent",
    temperature: "mdi:thermometer",
    binary_sensor: "mdi:radiobox-blank",
    motion: "mdi:motion-sensor",
    door: "mdi:door-open",
    window: "mdi:window-open-variant",
    vibration: "mdi:vibrate",
    moisture: "mdi:water-alert",
    vacuum: "mdi:robot-vacuum",
    media_player: "mdi:cast-connected",
    camera: "mdi:video",
    cover: "mdi:window-shutter",
    remote: "mdi:remote",
    scene: "mdi:palette",
    number: "mdi:ray-vertex",
    button: "mdi:gesture-tap-button",
    water_heater: "mdi:thermometer",
    select: "mdi:format-list-bulleted",
    lock: "mdi:lock",
    device_tracker: "mdi:radar",
    person: "mdi:account-multiple",
    weather: "mdi:weather-cloudy",
    automation: "mdi:robot-outline",
    alarm_control_panel: "mdi:shield-home",
  };

  export const SUPPORTED_CARDS_WITH_ENTITY = [
    "button",
    "calendar",
    "entity",
    "gauge",
    "history-graph",
    "light",
    "media-control",
    "picture-entity",
    "sensor",
    "thermostat",
    "weather-forecast",
    "custom:button-card",
    "custom:mushroom-fan-card",
    "custom:mushroom-cover-card",
    "custom:mushroom-entity-card",
    "custom:mushroom-light-card",
  ];