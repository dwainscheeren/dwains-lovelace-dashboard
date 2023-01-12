import translations from './translations';

//From Mini Media Player, Credits to Kalkih

const DEFAULT_LANG = 'en';

const getNestedProp = (obj, path) => path.split('.').reduce((p, c) => p && p[c] || null, obj);

const translation = (hass, label, hassLabel = undefined, fallback = 'unknown') => {
  const lang = hass.selectedLanguage || hass.language;
  const l639 = lang.split('-')[0];
  return translations[lang] && getNestedProp(translations[lang], label)
    || hass.resources[lang] && hass.resources[lang][hassLabel]
    || translations[l639] && getNestedProp(translations[l639], label)
    || getNestedProp(translations[DEFAULT_LANG], label)
    || fallback;
};

export default translation;
