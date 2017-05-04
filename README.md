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
2. Fun Retro is using [Firebase](http://www.firebase.com). First create an account at firebase. Then create a test project.
3. After creating the project you can select Database from the left pane, on the Rules tab, change the Database rules of created project:
```
{
    "rules": {
        ".read": true,
        ".write": true
    }
}
```
4. Change the file on js/vendor/firebaseinitialization.js and replace the values with your project values
```
var config = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGE_ID"
};

firebase.initializeApp(config);
```
5. If you don't want to file to be tracked by git just run this command on the project home folder:
```
git update-index --assume-unchanged js/vendor/firebaseInitialization.js
```
6. Install [Node.js](https://nodejs.org/en/)
7. Run ```npm install``` (inside the project folder)
8. Install [Gulp](http://gulpjs.com/)
9. Run ```gulp```
10. Now you can open the app on [http://localhost:4000/](http://localhost:4000/) and start creating your boards.

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
