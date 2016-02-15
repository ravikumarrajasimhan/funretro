describe('MainCtrl: ', function() {
  beforeEach(angular.mock.module('fireideaz'));

  beforeEach(angular.mock.inject(function($rootScope, $controller){
    scope = $rootScope.$new();
    $controller('MainCtrl', { $scope: scope });
  }));

  it('should strip spaces from board names', function() {
    scope.newBoard.name = 'new name';
    expect(scope.newBoard.name).to.equal('new name');
    scope.boardNameChanged();
    expect(scope.newBoard.name).to.equal('newname');
  });
});
