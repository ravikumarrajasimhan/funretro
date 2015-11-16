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
          'js/vendor/*.js',
          'js/*.js',
          'test/*.js'
        ],
        preprocessors: {
            'js/*.js': ['coverage']
        }
    });
};
