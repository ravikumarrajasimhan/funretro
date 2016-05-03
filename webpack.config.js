module.exports = {
  devtool: 'sourcemap',
  context: __dirname + '/app',
  entry: './index.js',
  output: {
    path: __dirname + '/app',
    filename: 'bundle.js'
  },
  devServer: {
    contentBase: "./app",
  }
}
