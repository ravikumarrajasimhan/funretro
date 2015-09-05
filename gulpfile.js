var gulp = require('gulp'),
gp_concat = require('gulp-concat'),
gp_rename = require('gulp-rename'),
gp_uglify = require('gulp-uglify'),
concatCss = require('gulp-concat-css'),
uglifycss = require('gulp-uglifycss'),
watch = require('gulp-watch');

gulp.task('watch', function (cb) {
  watch('css/**/*.css', function () {
    gulp.src(['css/vendor/*.css', 'css/*.css'])
    .pipe(concatCss('main.css'))
    .pipe(gulp.dest('dist'))
    .pipe(gp_rename('main.css'))
    .pipe(uglifycss())
    .pipe(gulp.dest('dist'));
  });

  watch('js/**/*.js', function () {
    gulp.src(['js/vendor/*.js', 'js/*.js'])
    .pipe(gp_concat('main.js'))
    .pipe(gulp.dest('dist'))
    .pipe(gp_rename('main.js'))
    .pipe(gp_uglify())
    .pipe(gulp.dest('dist'));
  });
  gulp.watch('*.html', notifyLiveReload);
  gulp.watch('dist/*.css', notifyLiveReload);
  gulp.watch('dist/*.js', notifyLiveReload);
});

gulp.task('express', function() {
  var express = require('express');
  var app = express();
  app.use(require('connect-livereload')({ port: 35729 }));
  app.use(express.static(__dirname));
  app.listen(4000, '0.0.0.0');
});

var tinylr;
gulp.task('livereload', function() {
  tinylr = require('tiny-lr')();
  tinylr.listen(35729);
});

function notifyLiveReload(event) {
  var fileName = require('path').relative(__dirname, event.path);

  tinylr.changed({
    body: { files: [fileName] }
  });
}

gulp.task('default', ['express', 'livereload', 'watch'], function() {});