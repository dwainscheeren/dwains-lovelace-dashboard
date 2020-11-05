const path = require('path');

module.exports = {
  entry: './src/main.js',
  mode: 'production',
  output: {
    filename: 'dwains-cover-card.js',
    path: path.resolve(__dirname)
  }
};
