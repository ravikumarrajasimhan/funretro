import angular from 'angular';
import 'angular-aria';
import 'angular-sanitize';
import 'angular-route';
import 'ng-dialog';

import controllers from './controllers';
import services from './services';
import routes from './routes';
import { exception, compileProvider } from 'angular-es6';

import './scss/base.scss';

export const name = 'fireideaz';

export default angular
  .module(name, ['ngRoute', 'ngSanitize', 'ngAria', 'ngDialog', controllers, services])
  .config(routes)
  .config(exception)
  .config(compileProvider);
