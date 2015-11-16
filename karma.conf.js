module.exports = function(config) {
    'use strict';

    config.set({
        frameworks: ['jasmine'],
        reporters: ['spec', 'coverage', 'coveralls'],
        browsers: ['PhantomJS'],
        coverageReporter: {
          repoToken: 'QVdqIxSZvbUFLmSiYZ3uINtguZxhuBgy7',
          type: 'lcov',
          dir: 'coverage/'
        },
        files: [
          'js/vendor/angular.min.js',
          'js/vendor/angular-mocks.js',
          'js/vendor/angularfire.min.js',
          'js/vendor/firebase.js',
          'js/vendor/ngDialog.min.js',
          'js/vendor/zepto.min.js',
          'js/*.js',
          'test/*.js'
        ],
        preprocessors: {
            'js/*.js': ['coverage']
        }
    });
};
