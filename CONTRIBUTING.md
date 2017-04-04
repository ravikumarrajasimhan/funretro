# How to contribute

Fun retro is an open-source tool focused on simplicity and easy of use. We want to make the best retrospective tool for distributed teams. We strive for usability, clean code, simplicity and awesome user experience. Remember to keep that in mind while contributing to the project.

## Github issues

We are currently using 5 kinds of labels:

* [Beginner friendly](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3A%22beginner+friendly%22) are issues that you should look if you are just starting with open-source.
* [Priority](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3Apriority) are issues that we think are the next ones to be picked, take a look here if you don't know what to do.
* [Bug](https://github.com/funretro/distributed/issues?utf8=%E2%9C%93&q=is%3Aissue%20is%3Aopen%20label%3Abug%20) are actually bugs on the app that need to be fixed.
* [UX](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3AUX) are issues that are related with user experience.
* [Idea - not priority](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3A%22idea+-+not+priority%22) are issues that are just ideas for now, so these should be the last ones that you pick, they are in analysing phase.

## Making Changes

* Choose an issue to work on. More information on the section above.
* Fork the project to your Github account.
* Create a branch with the following format: `122-issue-name` (122 is the issue number).
* After the first commit on your branch you can already create the pull request.
  * You should create with this name `[WIP] 122: Issue name`.
  * [WIP] means your pull request is work in progress. It is important to create the pull request quickly so everyone can keep track on what is happening and help you to improve your code or point you on the right direction.
* Once you think your pull request is ready to be merged you can remove the [WIP].

## Commiting

* Make sure your changes are passing on the lints.
  npm run jshint
  npm run stylelint
* Make sure you have added the necessary tests for your changes. Every new method should have tests for it.
* Run all the tests to assure nothing else was accidentally broken.
  gulp test
* Commits don't have any specific format, the only thing is that they need to start with uppercase.
