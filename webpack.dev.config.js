var webpack = require('webpack');
var config  = require('./webpack.config');

config.output = {
  filename: '[name].bundle.js',
  devtool: 'inline-source-map',
  publicPath: '/',
  path: config.directories.app
};

config.plugins = config.plugins.concat([
  new webpack.HotModuleReplacementPlugin()
]);

module.exports = config;
