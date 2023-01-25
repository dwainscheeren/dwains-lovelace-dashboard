const path = require('path');

module.exports = {
  entry: [

    './src/dwains-dashboard.js',
    './src/dwains-dashboard-layout.js',
    './src/dwains-homepage-card.js',
    './src/dwains-more-pages-card.js',
    './src/dwains-more-page-card.js',
    './src/dwains-notification-card.js',
    './src/dwains-house-information-card.js',
    './src/dwains-blueprint-card.js',
    './src/dwains-devicespage-card.js',
    './src/dwains-thermostat-card.js',
    './src/dwains-light-card.js',
    './src/dwains-cover-card.js',
    './src/dwains-button-card.js',
    './src/dwains-flexbox-card.js',
    './src/dwains-heading-card.js',
  ],
  mode: 'production',
  output: {
    filename: 'dwains-dashboard.js',
    path: path.resolve(__dirname)
  },
  devtool: "source-map"
};
