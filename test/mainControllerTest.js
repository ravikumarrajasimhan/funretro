describe('MainCtrl: ', function() {
  var $rootScope,
      $scope,
      $controller,
      $firebaseArray,
      board;

  beforeEach(angular.mock.module('fireideaz'));

  beforeEach(inject(function($injector){
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
    $controller = $injector.get('$controller');

    $controller('MainCtrl', {
      '$scope': $scope,
    });
  }));

  it('should strip spaces from board names', function() {
    $scope.newBoard.name = 'new name';

    $scope.boardNameChanged();

    expect($scope.newBoard.name).to.equal('newname');
  });


  it('should return true when sort order by votes', function() {
    $scope.sortField = 'votes';

    expect($scope.getSortOrder()).to.be.true;
  });

  it('should return false when sort order is not by votes', function() {
    $scope.sortField = 'something else';

    expect($scope.getSortOrder()).to.be.false;
  });

  it('should set true to board when user sees notification', function() {
    sinon.spy(localStorage, 'setItem');

    $scope.seeNotification();

    expect(localStorage.setItem.calledWith('funretro1', true)).to.be.true;
  });

  it('should retrurn true if user hasn\'t seen the notification before', function() {
    sinon.stub(localStorage, 'getItem', function () { return false; });
    $scope.userId = 'userId';

    var shouldShowNotification = $scope.showNotification();

    expect(shouldShowNotification).to.be.true;

    localStorage.getItem.restore();
  });

  it('should retrurn false if user has seen the notification before', function() {
    sinon.stub(localStorage, 'getItem', function () { return true; });
    $scope.userId = 'userId';

    var shouldShowNotification = $scope.showNotification();

    expect(shouldShowNotification).to.be.false;

    localStorage.getItem.restore();
  });

});
