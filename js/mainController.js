angular
  .module('fireideaz')
  .controller('MainCtrl', ['$firebaseArray', '$scope', '$filter', '$window', 'Utils', 'Auth',
    function($firebaseArray, $scope, $filter, $window, utils, auth) {
      var messagesRef = new Firebase("https://firedeaztest.firebaseio.com/messages");
      var boardRef = new Firebase("https://firedeaztest.firebaseio.com/boards");
      
      $scope.userId = $window.location.hash.substring(1) || '';
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;

      function logCallback() {
        $scope.boards = $firebaseArray(boardRef);
        $scope.messages = $firebaseArray(messagesRef.orderByChild("user_id").equalTo($scope.userId));
        $scope.board = $firebaseArray(boardRef.orderByChild("user_id").equalTo($scope.userId));

        $scope.newBoard = {
          name: ''
        };  

        $scope.board.$loaded().then(function() {
          $scope.boardId = $scope.board[0].boardId;
        });

        $scope.messages.$loaded().then(function(messages) {
          calculateAllHeights(messages);
        });
      };

      auth.logUser($scope.userId, logCallback);

      $scope.boardNameChanged = function() {
        $scope.newBoard.name = $scope.newBoard.name.replace(/\s+/g,'');
      }

      $scope.createNewBoard = function() {
        var newUser = utils.createUserId();

        var callback = function() {
          $scope.userId = newUser;

          $scope.boards.$add({
            boardId: $scope.newBoard.name,
            columns: $scope.messageTypes,
            user_id: $scope.userId
          });

          window.location.href = window.location.origin + window.location.pathname + "#" + newUser;
          utils.closeAll();

          $scope.newBoard.name = '';
        }

        auth.createUserAndLog(newUser, callback);
      };

      $scope.addNewColumn = function(name) {
        var board = $scope.boards.$getRecord($scope.board[0].$id);
        board.columns.push({
          value: name,
          id: utils.getNextId($scope.board[0])
        });

        $scope.boards.$save(board).then(function() {
          utils.closeAll();
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

      $scope.addVote = function(key, votes) {
      	if(!localStorage.getItem(key)) {
      		messagesRef.child(key).update({ votes: votes + 1, date: Firebase.ServerValue.TIMESTAMP });
      		localStorage.setItem(key, 1);
      	}

        calculateAllHeights($scope.messages);
      }

      $scope.changeColumnName = function(id, newName) {
        var board = $scope.boards.$getRecord($scope.board[0].$id);
        board.columns[id - 1].value = newName;

        $scope.boards.$save(board).then(function() {
          utils.closeAll();
        });
      };

      $scope.deleteLastColumn = function() {
        if(confirm('Are you sure you want to delete this column?')) {
          var board = $scope.boards.$getRecord($scope.board[0].$id);
          board.columns.pop();
          $scope.boards.$save(board);
        }
      };

      $scope.deleteMessage = function(message) {
      	if(confirm('Are you sure you want to delete this note?')) {
      		$scope.messages.$remove(message).then(function() {
            calculateAllHeights($scope.messages);    
          });
      	}
      }

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
        }).then(function(message) {
          var id = message.key();
          angular.element($('#' + id)).scope().isEditing = true;
          $('#' + id).find('textarea').focus();

          calculateAllHeights($scope.messages);  
        });
      };

      $($window).bind('hashchange', function () {
        $scope.userId = $window.location.hash.substring(1);
        $scope.messages = $firebaseArray(messagesRef.orderByChild("user_id").equalTo($scope.userId));
        $scope.board = $firebaseArray(boardRef.orderByChild("user_id").equalTo($scope.userId));

        $scope.board.$loaded().then(function() {
          $scope.boardId = $scope.board[0].boardId;
        });
      });
    }]
  );