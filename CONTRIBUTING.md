# How to contribute

Fun retro is an open-source tool focused on simplicity and easy of use. We want to make the best retrospective tool for distributed teams. We strive for usability, clean code, simplicity and awesome user experience. Remember to keep that in mind while contributing to the project.

## Hosting

Fun retro is hosted at Github Pages. That means is a pure client-side application. Because of that we are not using any server side code on production. Be aware of that while contributing to the code.

## Github issues

We are currently using 5 kinds of labels:

* [Beginner friendly](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3A%22beginner+friendly%22) are issues that you should look if you are just starting with open-source.
* [Priority](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3Apriority) are issues that we think are the next ones to be picked, take a look here if you don't know what to do.
* [Bug](https://github.com/funretro/distributed/issues?utf8=%E2%9C%93&q=is%3Aissue%20is%3Aopen%20label%3Abug%20) are actually bugs on the app that need to be fixed.
* [UX](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3AUX) are issues that are related with user experience.
* [Idea - not priority](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3A%22idea+-+not+priority%22) are issues that are just ideas for now, so those should be the last ones that you pick, they are still in analysing phase.

## How to start

* Choose an issue to work on. More information on the section above.
* Fork the project to your Github account.
* Create a branch on your repo and start doing commits, branch should follow this pattern:

```
122-issue-name
```

* Any commit message need to be linked with the issue they are related, for example:

```
[#122] Adding test to controller
```

* After the first commit on your branch you can already open the pull request.
  * You should create with the following format:

```
[WIP][#122] Issue name
```

  * [WIP] means your pull request is work in progress. It is important to create the pull request quickly so everyone can keep track on what is happening and help you to improve your code or point you on the right direction.
* Once you think your pull request is ready to be merged you can remove the [WIP].

## Before doing a commit

* Make sure your changes are passing on the lints.

```
npm run jshint
```

* Make sure you have added the necessary tests for your changes. Every new method should have tests for it.
* Run all the tests to ensure nothing else was accidentally broken.

```
gulp test
```

## Definition of done

* All js methods have unit tests
* Test, lints and build are passing
* Code is working on all modern browsers (Edge, Chrome and Firefox)
* Design should be responsive (work on the majority of screen sizes)
* Design should be simple, easy to use and didn't make the app more complex
