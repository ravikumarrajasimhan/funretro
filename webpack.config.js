var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var directories = {
  app: path.resolve(__dirname, 'app'),
  style: path.resolve(__dirname, 'app/scss'),
  images: path.resolve(__dirname, 'app/images'),
  dist: path.resolve(__dirname, 'dist')
};

module.exports = {
  directories: directories,
  devtool: 'sourcemap',
  context: directories.app,
  entry: './index.js',
  module: {
    loaders: [{
      test: /\.scss$/,
      loaders: ['style', 'css', 'sass'],
      include: directories.style
    }, {
      test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: 'url-loader?limit=10000&mimetype=application/font-woff'
    }, {
      test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
      loader: 'file-loader'
    }, {
      test: /\.(jpe?g|png|gif|svg)$/i,
      loader: 'file?name=[path][name].[hash].[ext]',
      include: directories.images
    }, {
      test: /\.html$/,
      include: /app\/views/,
      loader: 'ngtemplate!html'
    }, {
      test: /.js$/,
      exclude: /node_modules/,
      loaders: ['ng-annotate', 'babel?presets[]=es2015']
    }]
  },
  devServer: {
    contentBase: directories.app,
    hot: true,
    inline: true,
    stats: {
      colors: true
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Fun Retrospectives',
      template: 'underscore-template!' + directories.app + '/index.html',
      favicon: directories.app + '/favicon.ico',
      inject: false,
      appMountId: 'fireideaz',
      googleAnalytics: {
        trackingId: 'UA-66141519-1',
        pageViewOnLoad: true
      },
      hash: true
    })
  ]
};
