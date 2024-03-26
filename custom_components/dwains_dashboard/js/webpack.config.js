const path = require('path');

module.exports = {
  entry: [
    './src/dwains-navigation-card.js',
    './src/dwains-dashboard.js',
    './src/dwains-dashboard-layout.js',
    './src/dwains-homepage-card.js',
    './src/dwains-more-pages-card.js',
    './src/dwains-more-page-card.js',
    './src/dwains-edit-more-page-card.js',
    './src/dwains-notification-card.js',
    './src/dwains-house-information-card.js',
    './src/dwains-house-information-more-info-card.js',
    './src/dwains-blueprint-card.js',
    './src/dwains-devicespage-card.js',
    //'./src/dwains-thermostat-card.js',
    //'./src/dwains-light-card.js',
    //'./src/dwains-cover-card.js',
    //'./src/dwains-button-card.js',
    './src/dwains-flexbox-card.js',
    './src/dwains-heading-card.js',
    './src/dwains-create-custom-card-card.js',
    './src/dwains-edit-area-button-card.js',
    './src/dwains-edit-entity-card-card.js',
    './src/dwains-edit-entity-card.js',
    './src/dwains-edit-entity-popup-card.js',
    './src/dwains-edit-homepage-header-card.js',
    './src/dwains-edit-device-card-card.js',
    './src/dwains-edit-device-popup-card.js',
    './src/dwains-edit-device-button-card.js',
  ],
  mode: 'production',
  output: {
    filename: 'dwains-dashboard.js',
    path: path.resolve(__dirname)
  },
  devtool: "source-map"
};
