var path = require('path');
var webpackConfig = require('../webpack.config');
var entry = path.resolve(webpackConfig.context, webpackConfig.entry);

var preprocessors = {};
preprocessors[entry] = ['webpack'];
preprocessors['**/*Test.js'] = ['babel'];

module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['mocha', 'chai'],
    files: [
      entry,
      './node_modules/angular-mocks/angular-mocks.js',
      './test/**/*Test.js'
    ],
    webpack: webpackConfig,
    exclude: [],
    preprocessors: preprocessors,
    reporters: ['mocha'],
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
      'karma-babel-preprocessor',
      'karma-nyan-reporter',
      'karma-mocha-reporter',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher'
    ],
    concurrency: Infinity
  });
};
