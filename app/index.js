import angular from 'angular';
import 'angular-aria';
import 'angular-sanitize';

import controllers from './controllers';
import { exception, compileProvider } from 'angular-es6';

export const name = 'fireideaz';

export default angular
  .module(name, ['ngSanitize', 'ngAria', controllers])
  .config(exception)
  .config(compileProvider);
