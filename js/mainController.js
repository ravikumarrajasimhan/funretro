angular.module("fireideaz", ['firebase', 'ngDialog'])

.controller("MainCtrl", ["$firebaseArray", '$scope', '$filter', '$window', 'ngDialog',
  function($firebaseArray, $scope, $filter, $window, ngDialog) {
    var mainRef = new Firebase("https://firedeaztest.firebaseio.com");
    var ref = new Firebase("https://firedeaztest.firebaseio.com/messages");
    var ref2 = new Firebase("https://firedeaztest.firebaseio.com/boards");
    
    $scope.userId = $window.location.hash.substring(1) || '';

    mainRef.authWithPassword({
      email    : $scope.userId + '@fireideaz.com',
      password : $scope.userId
    }, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully:", authData);

        $scope.boards = $firebaseArray(ref2);
        $scope.messages = $firebaseArray(ref.orderByChild("user_id").equalTo($scope.userId));
        $scope.board = $firebaseArray(ref2.orderByChild("user_id").equalTo($scope.userId));

        $scope.newBoard = {
          name: ''
        };  

        $scope.board.$loaded().then(function() {
          $scope.boardId = $scope.board[0].boardId;
        });

        $scope.messages.$loaded().then(function(messages) {
          calculateAllHeights(messages);
        });
      }
    });

    $scope.boardNameChanged = function() {
      $scope.newBoard.name = $scope.newBoard.name.replace(/\s+/g,'');
    }

    function createUserId() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 5; i++ ) {
          text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }

    $scope.createNewBoard = function() {
      var newUser = createUserId();

      mainRef.createUser({
        email    : newUser + '@fireideaz.com',
        password : newUser
      }, function(error, userData) {
        if (error) {
          console.log("Error creating user:", error);
        } else {
          console.log("Successfully created user account with uid:", userData.uid);
        }
      });

      $scope.boardId = $scope.newBoard.name;
      $scope.userId = newUser;

      $scope.boards.$add({
        boardId: $scope.boardId,
        columns: $scope.messageTypes,
        user_id: $scope.userId
      });

      window.location.href = window.location.origin + window.location.pathname + "#" + newUser;
      ngDialog.closeAll();
    };

    $scope.addNewColumn = function(name) {
      var board = $scope.boards.$getRecord($scope.board[0].$id);
      board.columns.push({
        value: name,
        id: $scope.getNextId()
      });

      $scope.boards.$save(board).then(function(ref) {
        ngDialog.closeAll();
      });
    };

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

    $scope.addNew = function(type) {
    	$scope.messages.$add({
        text: '',
        board: $scope.boardId,
        user_id: $scope.userId,
        type: {
          id: type.id
        },
        date: Firebase.ServerValue.TIMESTAMP,
        votes: 0
      }).then(function(ref) {
        var id = ref.key();
        angular.element($('#' + id)).scope().isEditing = true;
        $('#' + id).find('textarea').focus();

        calculateAllHeights($scope.messages);  
      });
    };

    $($window).bind('hashchange', function () {
      $scope.userId = $window.location.hash.substring(1);
      $scope.messages = $firebaseArray(ref.orderByChild("user_id").equalTo($scope.userId));
      $scope.board = $firebaseArray(ref2.orderByChild("user_id").equalTo($scope.userId));

      $scope.board.$loaded().then(function() {
        $scope.boardId = $scope.board[0].boardId;
      });
    });
  }]
);