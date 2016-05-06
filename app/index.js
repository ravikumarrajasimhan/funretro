import angular from 'angular';
import 'angular-aria';
import 'angular-sanitize';
import 'angular-route';

import controllers from './controllers';
import routes from './routes';
import { exception, compileProvider } from 'angular-es6';

import './scss/base.scss';

export const name = 'fireideaz';

export default angular
  .module(name, ['ngSanitize', 'ngAria', 'ngRoute', controllers])
  .config(routes)
  .config(exception)
  .config(compileProvider);
