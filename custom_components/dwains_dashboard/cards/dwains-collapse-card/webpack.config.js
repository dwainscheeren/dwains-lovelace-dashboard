const path = require('path');

module.exports = {
  entry: './src/main.js',
  mode: 'production',
  output: {
    filename: 'dwains-collapse-card.js',
    path: path.resolve(__dirname)
  }
};
