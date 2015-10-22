var gulp = require('gulp'),
gp_concat = require('gulp-concat'),
gp_rename = require('gulp-rename'),
gp_uglify = require('gulp-uglify'),
concatCss = require('gulp-concat-css'),
uglifycss = require('gulp-uglifycss'),
connectlivereload = require('connect-livereload'),
express = require('express'),
path = require('path'),
watch = require('gulp-watch');

gulp.task('express', function() {
  var app = express();
  app.use(connectlivereload({ port: 35729 }));
  app.use(express.static(__dirname));
  app.listen(4000, '0.0.0.0');
});

var tinylr;
gulp.task('livereload', function() {
  tinylr = require('tiny-lr')();
  tinylr.listen(35729);
});

function notifyLiveReload(event) {
  tinylr.changed({ body: { files: [path.relative(__dirname, event.path)]}});
}

gulp.task('watch', function (cb) {
  watch('*.html', notifyLiveReload);
  watch('dist/*.css', notifyLiveReload);
  watch('dist/*.js', notifyLiveReload);
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
});

gulp.task('default', ['express', 'livereload', 'watch']);
