var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var directories = {
  app: path.resolve(__dirname, 'app'),
  dist: path.resolve(__dirname, 'dist')
};

module.exports = {
  directories: directories,
  devtool: 'sourcemap',
  context: directories.app,
  entry: './index.js',
  module: {
    loaders: [
      { test: /.js$/, exclude: [/node_modules/], loader: 'ng-annotate!babel' },
      { test: /.html$/, loader: 'raw' }
    ]
  },
  devServer: {
    contentBase: directories.app
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: directories.app + '/index.html',
      inject: 'body',
      hash: true
    })
  ]
};

