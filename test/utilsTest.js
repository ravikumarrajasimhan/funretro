describe('Utils: ', function() {
  var $rootScope,
      $scope,
      $controller,
      $firebaseArray,
      board, 
      utils;

  beforeEach(angular.mock.module('fireideaz'));

  beforeEach(inject(function($injector){
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
    inject(function($injector) {
      utils = $injector.get('Utils');
    });
  }));

  it('should say it can show remove column - last column bigger than three columns', function() {
    var columns = [{ 'id': 1 },{ 'id': 2 },{ 'id': 3 },{ 'id': 4 }];

    expect(utils.showRemoveColumn(4, columns)).to.equal(true);
  });

  it('should say it cannot show remove column - third column', function() {
    var columns = [{ 'id': 1 },{ 'id': 2 },{ 'id': 3 },{ 'id': 4 }];

    expect(utils.showRemoveColumn(3, columns)).to.equal(false);
  });
});
