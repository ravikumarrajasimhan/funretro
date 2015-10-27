angular
  .module('fireideaz')
  .controller('MainCtrl', ['$firebaseArray', '$scope', '$filter', '$window', 'Utils', 'Auth', '$rootScope',
    function($firebaseArray, $scope, $filter, $window, utils, auth, $rootScope) {
      $scope.loading = true;
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = { name: '' };
      $scope.userId = $window.location.hash.substring(1) || '499sm';
      $scope.sortField = '$id';

      var messagesRef = new Firebase("https://blinding-torch-6662.firebaseio.com/messages/" + $scope.userId);

      function getBoardAndMessages(userData) {
        $scope.userId = $window.location.hash.substring(1) || '499sm';

        var messagesRef = new Firebase("https://blinding-torch-6662.firebaseio.com/messages/" + $scope.userId);
        var board = new Firebase("https://blinding-torch-6662.firebaseio.com/boards/" + $scope.userId);

        board.on("value", function(board) {
          $scope.board = board.val();
          $scope.boardId = $rootScope.boardId = board.val().boardId;
        });

        $scope.userUid = userData.uid;
        $scope.messages = $firebaseArray(messagesRef);
        $scope.loading = false;
      }

      auth.logUser($scope.userId, getBoardAndMessages);

      $scope.boardNameChanged = function() {
        $scope.newBoard.name = $scope.newBoard.name.replace(/\s+/g,'');
      };

      $scope.getSortOrder = function() {
        if($scope.sortField === 'votes') {
          return true;
        } else {
          return false;
        }
      };

      $scope.createNewBoard = function() {
        $scope.loading = true;
        utils.closeAll();
        var newUser = utils.createUserId();
        $scope.userId = newUser;

        var callback = function(userData) {
          var board = new Firebase("https://blinding-torch-6662.firebaseio.com/boards/" + $scope.userId);
          board.set({
            boardId: $scope.newBoard.name,
            date_created: new Date().toString(),
            columns: $scope.messageTypes,
            user_id: userData.uid
          });

          window.location.href = window.location.origin + window.location.pathname + "#" + newUser;

          $scope.newBoard.name = '';
        };

        auth.createUserAndLog(newUser, callback);
      };

      $scope.addVote = function(key, votes) {
        if(!localStorage.getItem(key)) {
          messagesRef.child(key).update({ votes: votes + 1, date: Firebase.ServerValue.TIMESTAMP });
          localStorage.setItem(key, 1);
       }
      };

      $scope.addNewColumn = function(name) {
        $scope.board.columns[utils.getNextId($scope.board) - 1] = {
          value: name,
          id: utils.getNextId($scope.board)
        };

        var boardColumns = new Firebase("https://blinding-torch-6662.firebaseio.com/boards/" + $scope.userId + '/columns');
        boardColumns.set(utils.toObject($scope.board.columns));

        utils.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        $scope.board.columns[id - 1] = {
          value: newName,
          id: id
        };

        var boardColumns = new Firebase("https://blinding-torch-6662.firebaseio.com/boards/" + $scope.userId + '/columns');
        boardColumns.set(utils.toObject($scope.board.columns));

        utils.closeAll();
      };

      $scope.deleteLastColumn = function() {
        if(confirm('Are you sure you want to delete this column?')) {
          $scope.board.columns.pop();

          var boardColumns = new Firebase("https://blinding-torch-6662.firebaseio.com/boards/" + $scope.userId + '/columns');
          boardColumns.set(utils.toObject($scope.board.columns));
        }
      };

      $scope.deleteMessage = function(message) {
      	if(confirm('Are you sure you want to delete this note?')) {
      		$scope.messages.$remove(message);
      	}
      };

      function addMessageCallback(message) {
        var id = message.key();
        angular.element($('#' + id)).scope().isEditing = true;
        $('#' + id).find('textarea').focus();
      }

      $scope.addNewMessage = function(type) {
      	$scope.messages.$add({
          text: '',
          user_id: $scope.userUid,
          type: { id: type.id },
          date: Firebase.ServerValue.TIMESTAMP,
          votes: 0
        }).then(addMessageCallback);
      };

      $($window).bind('hashchange', function () {
        $scope.loading = true;
        $scope.userId = $window.location.hash.substring(1) || '';
        auth.logUser($scope.userId, getBoardAndMessages);
      });
    }]
  );