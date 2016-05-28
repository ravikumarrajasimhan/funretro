var path = require('path');
var webpackConfig = require('../webpack.config');

var entry = path.resolve(webpackConfig.context, webpackConfig.entry);
var preprocessors = {};
preprocessors[entry] = ['webpack'];

module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['mocha', 'chai'],
    files: [entry],
    webpack: webpackConfig,
    exclude: [],
    preprocessors,
    reporters: ['nyan'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome', 'PhantomJS'],
    singleRun: false,

    plugins: [
      'karma-webpack',
      'karma-mocha',
      'karma-chai',
      'karma-nyan-reporter',
      'karma-mocha-reporter',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher'
    ],
    concurrency: Infinity
  });
};
