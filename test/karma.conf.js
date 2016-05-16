module.exports = (config) => {
  config.set({
    basePath: '../',
    frameworks: ['mocha', 'chai'],

    files: [
      'node_modules/angular/angular.min.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/firebase/lib/firebase-node.js',
      'node_modules/ng-dialog/js/ngDialog.min.js',
      'node_modules/angular-aria/angular-aria.min.js',
      'node_modules/angular-sanitize/angular-sanitize.min.js',
      'app/**/*.js',
      'test/**/*Test.js'
    ],
    exclude: [
    ],
    preprocessors: {
    },
    reporters: ['nyan', 'coverage', 'coveralls'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    plugins: [
      'karma-chai',
      'karma-mocha',
      'karma-phantomjs-launcher',
      'karma-nyan-reporter',
      'karma-mocha-reporter'
    ],
    concurrency: Infinity
  });
};
