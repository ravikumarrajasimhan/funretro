import LandingController from './controllers/landing/Landing';
import LandingView from './views/landing.html';

const Routes = ($routeProvider, $locationProvider) => {
  $routeProvider
    .when('/', {
      controller: LandingController,
      templateUrl: LandingView
    })
    .otherwise({
      redirectTo: '/'
    });

    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    });
};

Routes.$inject = ['$routeProvider', '$locationProvider'];

export default Routes;
