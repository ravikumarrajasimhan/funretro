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

  beforeEach(function() {
    angular.mock.module('fireideaz');

    inject(function($injector) {
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
    });
  });

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

    it('should not give negative votes to a message with votes -1', function() {
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

      $scope.unvote('abc', -1);

      expect(updateSpy.calledWith({votes: 0, date: '00:00:00'})).to.be.true;
      expect(voteService.decreaseMessageVotes.calledWith('userId', 'abc')).to.be.true;
    });

    it('should not give negative votes to a message with zero votes', function() {
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

      $scope.unvote('abc', 0);

      expect(updateSpy.calledWith({votes: 0, date: '00:00:00'})).to.be.true;
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
  describe('vote limits', function() {
    it(' is able to increment the maximum number of votes allowed per user', function() {
      var updateSpy = sinon.spy();

      $scope.boardRef = {
        update: updateSpy
      }

      oldMaxVotes = $scope.maxVotes;
      $scope.incrementMaxVotes();
      expect(updateSpy.calledWith({max_votes: (oldMaxVotes + 1)})).to.be.true;
    })

    it(' is able to decrement the maximum number of votes allowed per user', function() {
      var updateSpy = sinon.spy();

      $scope.boardRef = {
        update: updateSpy
      }

      oldMaxVotes = $scope.maxVotes;
      $scope.decrementMaxVotes();
      expect(updateSpy.calledWith({max_votes: (oldMaxVotes - 1)})).to.be.true;
    })
  })
describe('Import', function() {
    var inputFile = {lastModified: 1491246451076,
      lastModifiedDate: Date.parse ('Mon Apr 03 2017 21:07:31 GMT+0200 (W. Europe Daylight Time)'),
      name: "import.csv",
      size: 515,
      type: "application/vnd.ms-excel"};

    beforeEach(function() {

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

    before (function (){
      sinon.spy(Papa, 'parse');
    });

    after (function () {
      Papa.parse.restore();
    });

    it('should call parse meethod', function() {

      $scope.submitImportFile(inputFile);
      expect(Papa.parse.called).to.be.true;
      expect(Papa.parse.calledWith(inputFile)).to.be.true;
    });

    it ('should show error for empty file', function(){
      var emptyFile = inputFile;
      emptyFile.size = 0;
      $scope.submitImportFile(inputFile);
      expect ($scope.import.error).to.be.equal('The file you are trying to import seems to be  empty');
    })

    it ('should show error for malformed file', function(){
      var emptyFile = inputFile;
      emptyFile.size = 0;
      $scope.submitImportFile('nn');
      expect ($scope.import.error).to.be.not.empty;
    })

    it('should initialize clear mapping and data', function() {
      var expectedMapping = [];
      $scope.submitImportFile(inputFile);
      expect ($scope.import.mapping).to.deep.equal(expectedMapping);
    });

    it('should parse import data', function() {
      var expectedData = [
        ["Column 1","Column 2","Column 3"],
        ["a","b","c"],
        ["1","2","3"]];
      $scope.submitImportFile('"Column 1","Column 2","Column 3"\n"a","b","c"\n"1","2","3"');
      expect ($scope.import.data).to.deep.equal(expectedData);
     });

    it('should import mapped data', function() {
      var messageDate = Date.parse ('Mon Apr 03 2017 21:07:31 GMT+0200 (W. Europe Daylight Time)');
      var expectedMessages = [
        {text:'C3R1', user_id: 'userId', type: {id: 1}, date: messageDate, votes: 0},
        {text:'C3R2', user_id: 'userId', type: {id: 1}, date: messageDate, votes: 0}];

     sinon.stub(firebaseService, 'getServerTimestamp', function() { return messageDate });
     $scope.userUid = 'userId';
      var addStub = sinon.spy();

      $scope.messages = {
        $add: addStub
      }

      $scope.submitImportFile('"Column 1","Column 2","Column 3"\n"C1R1","C2R1","C3R1"\n"C1R2","C2R2","C3R2"');
      //First init with data, then setup mapping
      $scope.import.mapping = [
        {mapFrom:2, mapTo: 1, name: 'columnName'},
        {mapFrom:'-1', mapTo: 2, name: 'otherColumnName'}];

      $scope.importMessages();
      expect (addStub.calledWith(expectedMessages[0])).to.be.true;
      expect (addStub.calledWith(expectedMessages[1])).to.be.true;
    });
  });
});
