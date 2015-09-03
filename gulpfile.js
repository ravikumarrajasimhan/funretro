var gulp = require('gulp'),
    gp_concat = require('gulp-concat'),
    gp_rename = require('gulp-rename'),
    gp_uglify = require('gulp-uglify'),
    concatCss = require('gulp-concat-css'),
    uglifycss = require('gulp-uglifycss');

gulp.task('js', function(){
    return gulp.src(['js/vendor/*.js', 'js/*.js'])
        .pipe(gp_concat('main.js'))
        .pipe(gulp.dest('dist'))
        .pipe(gp_rename('main.js'))
        .pipe(gp_uglify())
        .pipe(gulp.dest('dist'));
});

gulp.task('css', function(){
    return gulp.src(['css/vendor/*.css', 'css/*.css'])
        .pipe(concatCss('main.css'))
        .pipe(gulp.dest('dist'))
        .pipe(gp_rename('main.css'))
        .pipe(uglifycss())
        .pipe(gulp.dest('dist'));
});

gulp.task('default', ['js', 'css'], function(){});