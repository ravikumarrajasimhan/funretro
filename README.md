# Fun Retrospectives

## To run the app locally:

1. Install dependencies
```
npm install
```

2. Run Webpack
```
npm start
```

3. Open your browser [http://localhost:8080/](http://localhost:8080/)

## Roadmap/ToDos:

- [x] Require images with webpack.
- [ ] Deploy with gh-pages.
- [ ] Separate landing page from retro board with angular routing.
- [ ] Load directive templates with ng-template-loader.
- [x] Include testing through npm with karma and mocha.
- [x] Enable code coverage using karma-coverage with webpack supported methods [webpack/karma-webpack#21](https://github.com/webpack/karma-webpack/issues/21), [Medium article](https://medium.com/@scbarrus/how-to-get-test-coverage-on-react-with-karma-babel-and-webpack-c9273d805063#.i5krbohek)
- [ ] Lint Sass.
- [ ] Lint HTML for accessibility.

## Build for deployment:

```
npm build
```

## Run tests:

```
npm test
```

### Code Coverage:

As you run tests, view coverage results by opening the `coverage/` in any browser.

## Lint:
```
npm run lint
```

