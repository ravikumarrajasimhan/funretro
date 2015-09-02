angular
  .module('fireideaz')
  .controller('MainCtrl', ['$firebaseArray', '$scope', '$filter', '$window', 'Utils', 'Auth',
    function($firebaseArray, $scope, $filter, $window, utils, auth) {
      var messagesRef = new Firebase("https://firedeaztest.firebaseio.com/messages");
      
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = { name: '' };
      $scope.userId = $window.location.hash.substring(1) || '';

      function getBoardAndMessages() {
        $scope.userId = $window.location.hash.substring(1) || '';
        $scope.messages = $firebaseArray(messagesRef.orderByChild("user_id").equalTo($scope.userId));
        
        var board = new Firebase("https://firedeaztest.firebaseio.com/boards/" + $scope.userId);

        board.on("value", function(board) {
          $scope.board = board.val();
          $scope.boardId = board.val().boardId;
        }, function (error) {
          console.log("The read failed: " + error);
        });
        
        $scope.messages.$loaded().then(function(messages) {
          calculateAllHeights(messages);
        });
      }

      auth.logUser($scope.userId, getBoardAndMessages);

      $scope.boardNameChanged = function() {
        $scope.newBoard.name = $scope.newBoard.name.replace(/\s+/g,'');
      }

      $scope.createNewBoard = function() {
        var newUser = utils.createUserId();
        $scope.userId = newUser;

        var callback = function() {
          var board = new Firebase("https://firedeaztest.firebaseio.com/boards/" + newUser);
          board.set({
            boardId: $scope.newBoard.name,
            columns: $scope.messageTypes
          });

          window.location.href = window.location.origin + window.location.pathname + "#" + newUser;
          utils.closeAll();

          $scope.newBoard.name = '';
        }

        auth.createUserAndLog(newUser, callback);
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
    		messagesRef.child(key).update({ votes: votes + 1, date: Firebase.ServerValue.TIMESTAMP });
        calculateAllHeights($scope.messages);
      }

      $scope.addNewColumn = function(name) {
        $scope.board.columns[utils.getNextId($scope.board) - 1] = {
          value: name,
          id: utils.getNextId($scope.board)
        };

        var boardColumns = new Firebase("https://firedeaztest.firebaseio.com/boards/" + $scope.userId + '/columns');
        boardColumns.set(utils.toObject($scope.board.columns));

        utils.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        $scope.board.columns[id - 1] = {
          value: newName,
          id: id
        };

        var boardColumns = new Firebase("https://firedeaztest.firebaseio.com/boards/" + $scope.userId + '/columns');
        boardColumns.set(utils.toObject($scope.board.columns));

        utils.closeAll();
      };

      $scope.deleteLastColumn = function() {
        if(confirm('Are you sure you want to delete this column?')) {
          $scope.board.columns.pop();

          var boardColumns = new Firebase("https://firedeaztest.firebaseio.com/boards/" + $scope.userId + '/columns');
          boardColumns.set(utils.toObject($scope.board.columns));
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
         getBoardAndMessages();
      });
    }]
  );