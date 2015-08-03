var app = angular.module("fireideaz", ['firebase', 'ngDialog']);

app.controller("MainCtrl", ["$firebaseArray", '$scope', '$filter', '$window', 'ngDialog',
  function($firebaseArray, $scope, $filter, $window, ngDialog) {
    var ref = new Firebase("https://blinding-torch-6662.firebaseio.com/messages");

    var ref2 = new Firebase("https://blinding-torch-6662.firebaseio.com/boards");
    $scope.boards = $firebaseArray(ref2);

    $scope.boardId = $window.location.hash.substring(1) || 'test';
    $scope.messages = $firebaseArray(ref.orderByChild("board").equalTo($scope.boardId));

    $scope.board = $firebaseArray(ref2.orderByChild("boardId").equalTo($scope.boardId));

    $scope.board.$loaded().then(function() {
      if($scope.board.length === 0) {
        $scope.boards.$add({
          boardId: $scope.boardId,
          columns: $scope.messageTypes
        });
      }  
    });

    function calculateAllHeights(messages) {
      var orderedArray = $filter('orderBy')(messages, ['-votes', 'date']);
       orderedArray.forEach(function(message) {
        var filtered = orderedArray.filter(function(item) {
          return item.type.id === message.type.id;
        });

        message.currentHeight = filtered.indexOf(message) * 125 + 120 + 'px';
        $scope.messages.$save(message);
      });
    }

    $scope.messages.$loaded().then(function(messages) {
      calculateAllHeights(messages);
    });

    $scope.messageTypes = [{
    	id: 1,
    	value: "Went well"
    }, { 
    	id: 2,
    	value: "To improve"
    }, { 
    	id: 3,
    	value: "Action Items"
    }];

    $scope.addVote = function(key, votes) {
    	if(!localStorage.getItem(key)) {
    		ref.child(key).update({ votes: votes + 1, date: Firebase.ServerValue.TIMESTAMP });
    		localStorage.setItem(key, 1);
    	}

      calculateAllHeights($scope.messages);
    }

    $scope.openDialogColumn = function() {
      ngDialog.open({
        template: 'addNewColumn',
        className: 'ngdialog-theme-plain',
        scope: $scope
      });
    }

    $scope.openDialogBoard = function() {
      ngDialog.open({
        template: 'addNewBoard',
        className: 'ngdialog-theme-plain',
        scope: $scope
      });
    }

    $scope.closeDialog = function() {
      ngDialog.closeAll();
    }

    $scope.addNewColumn = function(name) {
      var board = $scope.boards.$getRecord($scope.board[0].$id);
      board.columns.push({
        value: name,
        id: $scope.getNextId()
      });

      $scope.boards.$save(board).then(function(ref) {
        ngDialog.closeAll();
      });
    }

    $scope.getNextId = function() {
      return $scope.board[0].columns[$scope.board[0].columns.length -1].id + 1;
    }

    $scope.changeColumnName = function(id, newName) {
      var board = $scope.boards.$getRecord($scope.board[0].$id);
      board.columns[id - 1].value = newName;

      $scope.boards.$save(board).then(function(ref) {
        ngDialog.closeAll();
      });
    };

    $scope.deleteLastColumn = function() {
      if(confirm('Are you sure you want to delete this column?')) {
        var board = $scope.boards.$getRecord($scope.board[0].$id);
        board.columns.pop();
        $scope.boards.$save(board);
      }
    };

    $scope.showRemoveColumn = function(id) {
      var board = $scope.boards.$getRecord($scope.board[0].$id);

      if(board.columns.length === id) {
        if(board.columns.length > 3) {
          return true;
        }
      }

      return false;
    };

    $scope.deleteMessage = function(message) {
    	if(confirm('Are you sure you want to delete this note?')) {
    		$scope.messages.$remove(message).then(function() {
          calculateAllHeights($scope.messages);    
        });
    	}
    }

    $scope.getHeight = function(message, index) {
      if(!message.currentHeight) {
        return index * 125 + 120 + 'px';
      } else {
        return message.currentHeight;
      }
    }

    $scope.alreadyVoted = function(key) {
    	return localStorage.getItem(key);
    }

    $scope.focusElement = function(id) {
      $('#' + id).find('textarea').focus();
    };

    $scope.createNewBoard = function(board) {
      window.location.href = window.location.origin + window.location.pathname + "#" + board;
      ngDialog.closeAll();
    };

    $scope.addNew = function(type) {
    	$scope.messages.$add({
        text: '',
        board: $scope.boardId,
        type: type,
        date: Firebase.ServerValue.TIMESTAMP,
        votes: 0
      }).then(function(ref) {
        var id = ref.key();
        angular.element($('#' + id)).scope().isEditing = true;
        $('#' + id).find('textarea').focus();

        calculateAllHeights($scope.messages);  
      });
    }

    $($window).bind('hashchange', function () {
      $scope.boardId = $window.location.hash.substring(1);
      $scope.messages = $firebaseArray(ref.orderByChild("board").equalTo($scope.boardId));
      $scope.board = $firebaseArray(ref2.orderByChild("boardId").equalTo($scope.boardId));

      $scope.board.$loaded().then(function() {
        if($scope.board.length === 0) {
          $scope.boards.$add({
            boardId: $scope.boardId,
            columns: $scope.messageTypes
          });
        }  
      });
      
    });
  }]
);