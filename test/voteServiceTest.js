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
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":1,"abd":3,"sef":2}'; });
      expect(voteService.returnNumberOfVotes('userId', ["abc", "abd", "sef"])).to.equal(6);
      localStorage.getItem.restore();
    });

    it('should return number of votes of 3', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":3}'; });
      expect(voteService.returnNumberOfVotes('userId', ["abc"])).to.equal(3);
      localStorage.getItem.restore();
    });

    it('should return number of votes of 5 when message was deleted', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":3, "avc": 2, "afe": 2}'; });
      expect(voteService.returnNumberOfVotes('userId', ["abc","avc"])).to.equal(5);
      localStorage.getItem.restore();
    });

    it('should return zero if there is no board', function() {
      sinon.stub(localStorage, 'getItem', function () { return null; });
      expect(voteService.returnNumberOfVotes('userId')).to.equal(0);
      localStorage.getItem.restore();
    });
  })

  describe('returnNumberOfVotesOnMessage', function() {
    it('should return number of votes', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":1,"abd":3,"sef":2}'; });
      expect(voteService.returnNumberOfVotesOnMessage('userId', 'abc')).to.equal(1);
      localStorage.getItem.restore();
    });

    it('should return number of votes of 3', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":3}'; });
      expect(voteService.returnNumberOfVotesOnMessage('userId', 'abc')).to.equal(3);
      localStorage.getItem.restore();
    });

    it('should return zero if there is no board', function() {
      sinon.stub(localStorage, 'getItem', function () { return null; });
      expect(voteService.returnNumberOfVotesOnMessage('userId', 'abc')).to.equal(0);
      localStorage.getItem.restore();
    });
  })

  describe('remainingVotes', function() {
    it('should return remaining votes 3', function() {
      sinon.stub(voteService, 'returnNumberOfVotes', function () { return 2; });
      expect(voteService.remainingVotes('userId', 5, [])).to.equal(3);
      voteService.returnNumberOfVotes.restore();
    });

    it('should return remaining votes 0', function() {
      sinon.stub(voteService, 'returnNumberOfVotes', function () { return 5; });
      expect(voteService.remainingVotes('userId', 5)).to.equal(0);
      voteService.returnNumberOfVotes.restore();
    });
  })

  describe('increase messages', function() {
    it('should set user message votes to 1', function() {
      sinon.stub(localStorage, 'getItem', function () { return null; });
      sinon.spy(localStorage, 'setItem');

      voteService.increaseMessageVotes('userId', 'abc')

      expect(localStorage.setItem.calledWith('userId', '{"abc":1}')).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });

    it('should increase user message votes to 2', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":1}'; });
      sinon.spy(localStorage, 'setItem');

      voteService.increaseMessageVotes('userId', 'abc')

      expect(localStorage.setItem.calledWith('userId', '{"abc":2}')).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });

    it('should increase user message votes to 5', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":4,"abd":3}'; });
      sinon.spy(localStorage, 'setItem');

      voteService.increaseMessageVotes('userId', 'abc')

      expect(localStorage.setItem.calledWith('userId', '{"abc":5,"abd":3}')).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });
  })

  describe('decrease messages', function() {
    it('should remove from localStorage if votes equal to 1', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":1}'; });
      sinon.spy(localStorage, 'setItem');

      voteService.decreaseMessageVotes('userId', 'abc')

      expect(localStorage.setItem.calledWith('userId', "{}")).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });

    it('should remove from localStorage if votes equal to -1', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":-1}'; });
      sinon.spy(localStorage, 'setItem');

      voteService.decreaseMessageVotes('userId', 'abc')

      expect(localStorage.setItem.calledWith('userId', "{}")).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });

    it('should decrease votes', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":3}'; });
      sinon.spy(localStorage, 'setItem');

      voteService.decreaseMessageVotes('userId', 'abc')

      expect(localStorage.setItem.calledWith('userId', '{"abc":2}')).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });

    it('should decrease user message votes to 4', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":5,"abd":3}'; });
      sinon.spy(localStorage, 'setItem');

      voteService.decreaseMessageVotes('userId', 'abc')

      expect(localStorage.setItem.calledWith('userId', '{"abc":4,"abd":3}')).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });
  })

  describe('merge messages', function() {
    it('should merge messages votes', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":5,"abf":3,"abd":2}'});
      sinon.spy(localStorage, 'setItem');

      voteService.mergeMessages('userId', 'abc', 'abf')

      expect(localStorage.setItem.calledWith('userId', '{"abf":8,"abd":2}')).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });

    it('should not merge messages votes if drag is zero', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abf":3,"abd":2}'});
      sinon.spy(localStorage, 'setItem');

      voteService.mergeMessages('userId', 'abc', 'abf')

      expect(localStorage.setItem.called).to.be.false;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });

    it('should merge messages votes if drop is zero', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":3,"abd":2}'});
      sinon.spy(localStorage, 'setItem');

      voteService.mergeMessages('userId', 'abc', 'abf')

      expect(localStorage.setItem.calledWith('userId', '{"abd":2,"abf":3}')).to.be.true;

      localStorage.getItem.restore();
      localStorage.setItem.restore();
    });
  })

  describe('control votes', function() {
    it('should be able to unvote if votes equal to 3', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":2,"afe":1}'; });
      expect(voteService.canUnvoteMessage('userId', 'abc')).to.be.true;
      localStorage.getItem.restore();
    });

    it('should not be able to unvote if votes equal to 0', function() {
      sinon.stub(localStorage, 'getItem', function () { return null; });
      expect(voteService.canUnvoteMessage('userId', 'abc')).to.be.false;
      localStorage.getItem.restore();
    });

    it('should return true if still has votes', function() {
      sinon.stub(localStorage, 'getItem', function () { return '{"abc":2,"abd":2}'; });
      expect(voteService.isAbleToVote('abc', 5)).to.be.true;
      localStorage.getItem.restore();
    });

    it('should return false if does not have votes', function() {
      sinon.stub(voteService, 'remainingVotes', function () { return 0; });
      expect(voteService.isAbleToVote('abc', 5)).to.be.false;
      voteService.remainingVotes.restore();
    });
  })

  describe('extract message ids', function() {
    it('should extract messages ids', function() {
      var original = [
        { '$id': '123' },
        { '$id': '124' },
        { '$id': '125' }
      ]

      expect(voteService.extractMessageIds(original).length).to.equal(3)
      expect(voteService.extractMessageIds(original)[0]).to.equal('123')
      expect(voteService.extractMessageIds(original)[1]).to.equal('124')
      expect(voteService.extractMessageIds(original)[2]).to.equal('125')
    });
  })
});
