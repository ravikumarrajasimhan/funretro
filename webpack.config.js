var path = require('path');

var directories = {
  app: path.resolve(__dirname, 'app')
};

module.exports = {
  devtool: 'sourcemap',
  context: directories.app,
  entry: './index.js',
  output: {
    path: directories.app,
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /.js$/, exclude: [/node_modules/], loader: 'ng-annotate!babel' }
    ]
  },
  devServer: {
    contentBase: directories.app,
  }
};
