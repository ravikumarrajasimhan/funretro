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

  it('should create an user ID with random characters', function(){
    var count = 0.001;
    sinon.stub(Math, 'random', function () {
      count = count + 0.054;
      return count;
    });

    expect(utils.createUserId()).to.equal('bdfhj');
  });

  it('should return the id number of the next column', function() {
    var columns = [ {'id': 1} ];
    var board = {
      boardId: 'board',
      columns: columns
    };

    expect(utils.getNextId(board)).to.equal(2);
  });

  it('should convert array of objects to an object', function() {
    var arrayOfObjects = [
      {'id':1, 'value':'Went well'},
      {'id':2, 'value':'Not good'},
    ];
    var expectedObject = {
      '0': {'id':1,'value':'Went well'},
      '1': {'id':2, 'value':'Not good'},
    }

    expect(utils.toObject(arrayOfObjects)).to.deep.equal(expectedObject);
  });
});
