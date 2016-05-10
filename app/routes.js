import LandingController from './controllers/landing/Landing';
import LandingView from './views/landing.html';

const Routes = ($routeProvider) => {
  $routeProvider
    .when('/', {
      controller: LandingController,
      templateUrl: LandingView
    })
    .otherwise({
      redirectTo: '/'
    });
};

Routes.$inject = ['$routeProvider'];

export default Routes;
