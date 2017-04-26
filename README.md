# Fun Retro
Easy to use and beautiful restrospective board.

Learn more about retrospectives at [funretrospectives.com](http://funretrospectives.com)

Fun retrospective guide at [Dummies guide to retrospectives](https://github.com/gmuraleekrishna/dummies-guide-to-retrospectives)

[![Build](https://travis-ci.org/funretro/distributed.svg?branch=master)](https://travis-ci.org/funretro/distributed)
<a href="https://codeclimate.com/github/glauberramos/fireideaz"><img src="https://codeclimate.com/github/glauberramos/fireideaz/badges/gpa.svg" /></a>&nbsp;[![devDependency Status](https://david-dm.org/funretro/distributed/dev-status.svg)](https://david-dm.org/funretro/distributed#info=devDependencies)

## User interface

![Fun retro screenshot](http://i.imgur.com/iY1zc2Y.png)

## How to setup local environment

1. Clone the repository
2. Install [Node.js](https://nodejs.org/en/)
3. Run ```npm install``` (inside the project folder)
4. Install [Gulp](http://gulpjs.com/)
5. Run ```gulp```
6. Fun Retro is using [Firebase](http://www.firebase.com). First create an account at firebase. Then create a test project.
7. After creating the project you can select Database from the left pane, on the Rules tab, change the Database rules of created project:
```
{
    "rules": {
        ".read": true,
        ".write": true
    }
}
```
8. Still in the database section, you can find the database url (ex: https://funretrotest.firebaseio.com/). Replace ```databaseURL``` inside ```js/vendor/firebaseInitialization.js``` with this database url.
9. Now you can open the app on [http://localhost:4000/](http://localhost:4000/) and start creating your boards.
   You will notice that the app has this architecture on firebase:
![Fun retro architecture](https://i.imgur.com/etYgDia.png)

## Contribute to Fun Retro

Take a look on our [Contributing](https://github.com/funretro/distributed/blob/master/CONTRIBUTING.md) guide

## Running the application

1. Install [Node.js](https://nodejs.org/en/)
2. Run ```npm install``` (inside the project folder)
3. Run ```gulp```
4. Point your browser to [http://localhost:4000/](http://localhost:4000/) or open dist/index.html

## Continuous Integration

Our tests run on [TravisCI](https://travis-ci.org/funretro/distributed)

## Running the tests

1. Run ```gulp test```
2. Refactor and watch tests re-run.
3. Fix any red tests
4. Note: you can open [http://localhost:9876/debug.html](http://localhost:9876/debug.html) to run tests with a browser
