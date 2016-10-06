import LandingController from './controllers/landing/Landing';
import BoardController from './controllers/board/Board';
import LandingView from './views/landing.html';
import BoardView from './views/board.html';

const Routes = ($routeProvider, $locationProvider) => {
  $routeProvider
  .when('/:id', {
    controller: BoardController,
    controllerAs: 'board',
    templateUrl: BoardView
  })
  .when('/', {
    controller: LandingController,
    controllerAs: 'landing',
    templateUrl: LandingView
  });

  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false
  });
};

Routes.$inject = ['$routeProvider', '$locationProvider'];

export default Routes;
