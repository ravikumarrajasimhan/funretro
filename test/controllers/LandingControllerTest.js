describe('LandingController', () => {
  let $controller;
  let $q;
  let $window = {
    location: {
      href: ''
    }
  };

  let $scope, rootScope, deferred;
  beforeEach(module('fireideaz'));

  const testID = 'some.id';
  beforeEach(inject((_$controller_, $rootScope, $q) => {
    rootScope = $rootScope;
    $scope = $rootScope.$new();
    $controller = _$controller_;
    $q = $q;

    let mockService = {
      $get: () => {},
      board: {},
      create: () => {
        deferred = $q.defer();

        return deferred.promise;
      },
      connect: () => {},
      closeAll: () => {}
    };

    let landingController = $controller('Landing', {
      $scope,
      modalService: mockService,
      boardService: mockService,
      $window: $window
    });

    $scope.board = {
      name: 'test'
    };

    $scope.createNewBoard();
    deferred.resolve(testID);
    rootScope.$apply();
  }));

  it('should create a board with hash', () => {
    expect($scope.loading).to.be.true;
    expect($scope.board.hash).to.be.defined;
    expect($scope.board.hash).to.eq(testID);
  });

  it('should change the location path', () => {
    expect($window.location.href).to.be.defined;
    expect($window.location.href).to.contain(testID);
  });
});
