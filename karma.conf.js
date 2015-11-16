module.exports = function(config) {
    'use strict';

    config.set({
        frameworks: ['jasmine'],
        reporters: ['spec', 'coverage'],
        browsers: ['PhantomJS'],
        coverageReporter: {
          //repoToken: 'khhm0L9sekEGN2r12dWspLyYT7D7cK2KA',
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
