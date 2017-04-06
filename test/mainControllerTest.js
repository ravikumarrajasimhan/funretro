describe('MainCtrl: ', function() {
  var $rootScope,
      $scope,
      $controller,
      utils,
      board,
      firebaseService,
      auth,
      modalService,
      voteService;

  beforeEach(angular.mock.module('fireideaz'));

  beforeEach(inject(function($injector){
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
    $controller = $injector.get('$controller');
    utils = $injector.get('Utils');
    modalService = $injector.get('ModalService');
    firebaseService = $injector.get('FirebaseService');
    auth = $injector.get('Auth');
    voteService = $injector.get('VoteService');

    $scope.userId = 'userId';
    $scope.board = { max_votes: 6 };

    $controller('MainCtrl', {
      '$scope': $scope,
      'utils': utils,
      'modalService': modalService,
      'firebaseService': firebaseService,
      'auth': auth,
      'voteService': voteService
    });
  }));

  describe('Board', function () {

    it('should return true when sort board order by votes', function() {
      $scope.sortField = 'votes';

      expect($scope.getSortOrder()).to.be.true;
    });

    it('should return false when sort board order is not by votes', function() {
      $scope.sortField = 'something else';

      expect($scope.getSortOrder()).to.be.false;
    });

    it('should change the board context', function() {
      var updateSpy = sinon.spy();

      $scope.boardRef = {
        update: updateSpy
      }

      $scope.changeBoardContext();

      expect(updateSpy.called).to.be.true;
    });

    it('should change the board name', function() {
      var updateSpy = sinon.spy();

      $scope.boardRef = {
        update: updateSpy
      }

      $scope.changeBoardName();

      expect(updateSpy.called).to.be.true;
    });

    it('should create a new board', function () {
      sinon.stub(utils, 'createUserId', function () { return 'userId'; });
      var createUserSpy = sinon.spy(auth, 'createUserAndLog');
      var closeAllSpy = sinon.spy(modalService, 'closeAll');

      $scope.createNewBoard();

      expect(createUserSpy.calledWith($scope.userId)).to.be.true;
      expect(closeAllSpy.called).to.be.true;
    });

    it('should create a new board with submitOnEnter fn', function () {
      sinon.stub(utils, 'createUserId', function () { return 'userId'; });
      var createUserSpy = sinon.spy(auth, 'createUserAndLog');
      var closeAllSpy = sinon.spy(modalService, 'closeAll');

      $scope.newBoard.name = "any_name_but_not_null";
      var event = {};
      event.keyCode = 13;
      $scope.submitOnEnter(event, 'createNewBoard');

      expect(createUserSpy.calledWith($scope.userId)).to.be.true;
      expect(closeAllSpy.called).to.be.true;
    });

  });

  describe('Messages', function () {
    it('should return array containing 1 element for each vote on a message', function() {
      sinon.stub(voteService, 'returnNumberOfVotesOnMessage', function() { return 3 });

      var array = $scope.getNumberOfVotesOnMessage('userId', 'abc');

      expect(array.length).to.equal(3);
    });

    it('should return empty array', function() {
      sinon.stub(voteService, 'returnNumberOfVotesOnMessage', function() { return 0 });

      var array = $scope.getNumberOfVotesOnMessage('userId', 'abc');

      expect(array.length).to.equal(0);
    });

    it('should delete a message', function() {
      var removeSpy = sinon.spy();
      var closeAllSpy = sinon.spy(modalService, 'closeAll');

      var message = {
        text: 'text of message',
        user_id: '139021'
      }

      $scope.messages = {
        $remove: removeSpy
      }

      $scope.deleteMessage(message);

      expect(closeAllSpy.called).to.be.true;
      expect(removeSpy.calledWith(message)).to.be.true;
    });

    it('should add a new message', function() {
      sinon.stub(firebaseService, 'getServerTimestamp', function() { return '00:00:00' });

      var addMessagePromise = { then: sinon.spy() };
      var addStub = sinon.stub().returns(addMessagePromise);

      var message = {
        text: 'text of message',
        user_id: '139021'
      }

      $scope.messages = {
        $add: addStub
      }

      $scope.addNewMessage({id: 1});

      expect(addStub.called).to.be.true;
    });

    it('should vote on a message', function() {
      sinon.stub(firebaseService, 'getServerTimestamp', function() { return '00:00:00' });
      sinon.stub(voteService, 'isAbleToVote', function() { return true });
      sinon.spy(voteService, 'increaseMessageVotes');
      var updateSpy = sinon.spy();

      $scope.messagesRef = {
        child: function() {
          return { update: updateSpy}
        }
      }

      $scope.userId = 'userId';

      $scope.vote('abc', 5);

      expect(updateSpy.calledWith({votes: 6, date: '00:00:00'})).to.be.true;
      expect(voteService.increaseMessageVotes.calledWith('userId', 'abc')).to.be.true;
    });

    it('should unvote a message', function() {
      sinon.stub(firebaseService, 'getServerTimestamp', function() { return '00:00:00' });
      sinon.stub(voteService, 'canUnvoteMessage', function() { return true });
      sinon.spy(voteService, 'decreaseMessageVotes');
      var updateSpy = sinon.spy();

      $scope.messagesRef = {
        child: function() {
          return { update: updateSpy}
        }
      }

      $scope.userId = 'userId';

      $scope.unvote('abc', 5);

      expect(updateSpy.calledWith({votes: 4, date: '00:00:00'})).to.be.true;
      expect(voteService.decreaseMessageVotes.calledWith('userId', 'abc')).to.be.true;
    });
  });

  describe('Columns', function() {
    var setSpy,
        boardColumns,
        expectedColumns,
        closeAllSpy;

    beforeEach(function() {
      closeAllSpy = sinon.spy(modalService, 'closeAll');

      setSpy = sinon.spy();

      boardColumns = {
        set: setSpy
      }

      sinon.stub(utils, 'toObject', function () {
        return { column: 'column' };
      });

      $scope.board = {
        columns: [
          {
            value: 'columnName',
            id: 1
          },
          {
            value: 'otherColumnName',
            id: 2
          }
        ]
      }

      sinon.stub(firebaseService, 'getBoardColumns', function () {
        return boardColumns;
      });
    });

    it('should add a new column to the board', function() {
      var expectedColumns = [
        {
          value: 'columnName',
          id: 1
        },
        {
          value: 'otherColumnName',
          id: 2
        },
        {
          value: 'anotherColumnName',
          id: 3
        }
      ]

      sinon.stub(utils, 'getNextId', function () { return 3; });

      $scope.addNewColumn('anotherColumnName');

      expect($scope.board.columns).to.deep.equal(expectedColumns);
      expect(setSpy.called).to.be.true;
      expect(closeAllSpy.called).to.be.true;
    });

    it('should add a new column to the board with submitOnEnter fn', function() {
      var expectedColumns = [
        {
          value: 'columnName',
          id: 1
        },
        {
          value: 'otherColumnName',
          id: 2
        },
        {
          value: 'anotherColumnName',
          id: 3
        }
      ]

      sinon.stub(utils, 'getNextId', function () { return 3; });

      var event = {};
      event.keyCode = 13;
      $scope.submitOnEnter(event, 'addNewColumn', 'anotherColumnName');

      expect($scope.board.columns).to.deep.equal(expectedColumns);
      expect(setSpy.called).to.be.true;
      expect(closeAllSpy.called).to.be.true;
    });

    it('should change column name', function() {
      $scope.changeColumnName(1, 'new name!');

      expect($scope.board.columns[0].value).to.equal('new name!');
      expect(setSpy.called).to.be.true;
      expect(closeAllSpy.called).to.be.true;
    });

    it('should delete last column of the board', function() {
      var expectedBoard = {
        columns: [
          {
            value: 'columnName',
            id: 1
          },
          {
            value: 'otherColumnName',
            id: 2
          }
        ]
      };

      $scope.deleteColumn({id: 3});

      expect($scope.board.columns).to.deep.equal(expectedBoard.columns);
      expect(setSpy.called).to.be.true;
      expect(closeAllSpy.called).to.be.true;
    });

    it('should delete specific column of the board', function() {
      var expectedColumns = [
        {
          value: 'otherColumnName',
          id: 2
        }
      ];

      $scope.deleteColumn({id: 1});

      expect($scope.board.columns).to.deep.equal(expectedColumns);
      expect(setSpy.called).to.be.true;
      expect(closeAllSpy.called).to.be.true;
    });
  });
  
  describe('Import', function() {
    var setSpy,
        boardColumns,
        expectedColumns,
        Papa,
        papaSpy,
        closeAllSpy;

    beforeEach(function() {
      papaSpy = sinon.spy(Papa, 'parse');

      setSpy = sinon.spy();

      boardColumns = {
        set: setSpy
      }

      sinon.stub(utils, 'toObject', function () {
        return { column: 'column' };
      });

      $scope.board = {
        columns: [
          {
            value: 'columnName',
            id: 1
          },
          {
            value: 'otherColumnName',
            id: 2
          }
        ]
      }

      sinon.stub(firebaseService, 'getBoardColumns', function () {
        return boardColumns;
      });
    });

    it('should call parse meethod', function() {

      $scope.submitImportFile('filename.csv');
      expect(papaSpy.called).to.be.true;
      expect(papaSpy.parse.calledWith({file:'filename.csv'})).to.be.true;
    });
  });
});
