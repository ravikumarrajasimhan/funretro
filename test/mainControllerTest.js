describe('MainCtrl: ', function() {
  var $rootScope,
      $scope,
      $controller,
      utils,
      board;

  beforeEach(angular.mock.module('fireideaz'));

  beforeEach(inject(function($injector){
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
    $controller = $injector.get('$controller');
    utils = $injector.get('Utils');

    $controller('MainCtrl', {
      '$scope': $scope,
      'utils': utils,
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

  it('should open dialog to merge cards when drop an card over another card', function () {
    sinon.spy(utils, 'openDialogMergeCards');

    $scope.droppedEvent("<div class='element1'></div>", "<div class='element2'></div>");

    expect(utils.openDialogMergeCards.calledWith($scope)).to.be.true;
  });

  it('should not open dialog to merge cards when drop an card over the same card', function () {
    sinon.spy(utils, 'openDialogMergeCards');

    $scope.droppedEvent("<div class='element1'></div>", "<div class='element1'></div>");

    expect(utils.openDialogMergeCards.calledWith($scope)).to.be.false;
  });

});
