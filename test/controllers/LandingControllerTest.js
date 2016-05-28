describe('Landing Controller', () => {
  let $window;
  let $scope;
  let $controller;
  let boardService;
  let modalService;

  beforeEach(angular.mock.module('fireideaz'));

  beforeEach(inject(($injector) => {
    $window = $injector.get('$window');
    $controller = $injector.get('$controller');
    boardService = $injector.get('BoardService');
    modalService = $injector.get('ModalService');
    $scope.board = {};

    $controller('LandingController', {
      $scope,
      modalService,
      boardService,
      $window
    });
  }));
});
