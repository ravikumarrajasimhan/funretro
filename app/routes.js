import LandingController from './controllers/LandingController';

const Routes = ($routeProvider) => {
  $routeProvider
  .when('/', {
    controller: LandingController,
    templateUrl: './views/landing.html'
  })
};

Routes.$inject = ['$routeProvider'];

export default Routes;
