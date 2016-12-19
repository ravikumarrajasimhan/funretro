describe('VoteService: ', function() {
  var $rootScope,
      $scope,
      $controller,
      $firebaseArray,
      voteService;

  beforeEach(angular.mock.module('fireideaz'));

  beforeEach(inject(function($injector){

    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
    inject(function($injector) {
      voteService = $injector.get('VoteService');
    });
  }));

  describe('returnNumberOfVotes', function() {
    it('should return number of votes', function() {
      sinon.stub(localStorage, 'getItem', function () { return '3'; });
      expect(voteService.returnNumberOfVotes('abc')).to.equal(3);
      localStorage.getItem.restore();
    });

    it('should return zero if there is no board', function() {
      sinon.stub(localStorage, 'getItem', function () { return null; });
      expect(voteService.returnNumberOfVotes('abc')).to.equal(0);
      localStorage.getItem.restore();
    });
  })

  describe('remainingVotes', function() {
    it('should return remaining votes 3', function() {
      sinon.stub(localStorage, 'getItem', function () { return '2'; });
      expect(voteService.remainingVotes(5, 'abc')).to.equal(3);
      localStorage.getItem.restore();
    });

    it('should return remaining votes 0', function() {
      sinon.stub(localStorage, 'getItem', function () { return '5'; });
      expect(voteService.remainingVotes(5, 'abc')).to.equal(0);
      localStorage.getItem.restore();
    });
  })

});
