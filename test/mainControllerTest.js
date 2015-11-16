describe('Main controller', function() {
    beforeEach(angular.mock.module('fireideaz'));

    beforeEach(angular.mock.inject(function($rootScope, $controller){
        scope = $rootScope.$new();
        $controller('MainCtrl', {$scope: scope});
    }));

  it('change new board name to remove spaces', function() {
      scope.newBoard.name = 'new name';
      expect(scope.newBoard.name).toBe('new name');
      scope.boardNameChanged();
      expect(scope.newBoard.name).toBe('newname');
  });
});