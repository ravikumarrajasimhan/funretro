angular.module('fireideaz', ['firebase',
               'ngDialog',
               'lvl.directives.dragdrop',
               'ngSanitize',
               'ngAria']);

'use strict';

angular
  .module('fireideaz')
  .service('Auth', function () {
    var mainRef = new Firebase('https://blinding-torch-6662.firebaseio.com');

    function logUser(user, callback) {
      mainRef.unauth();
      mainRef.authWithPassword({
        email    : user + '@fireideaz.com',
        password : user
      }, function(error, authData) {
        if (error) {
          console.log('Log user failed: ', error);
          window.location.hash = '';
          location.reload();
        } else {
          callback(authData);
        }
      });
    }

    function createUserAndLog(newUser, callback) {
      mainRef.createUser({
        email    : newUser + '@fireideaz.com',
        password : newUser
      }, function(error) {
        if (error) {
          console.log('Create user failed: ', error);
        } else {
          logUser(newUser, callback);
        }
      });
    }
    return {
      createUserAndLog: createUserAndLog,
      logUser: logUser
    };
  });

'use strict';

angular
.module('fireideaz')
.directive('enterClick', function () {
  return {
    restrict: 'A',
    link: function (scope, elem) {
      elem.bind('keydown', function(event) {
        if (event.keyCode === 13 && event.shiftKey) {
          event.preventDefault();
          $(elem[0]).find('button').focus();
          $(elem[0]).find('button').click();
        }
      });
    }
  };
});

'use strict';

angular
  .module('fireideaz')
  .service('FirebaseService', ['$firebaseArray', function ($firebaseArray) {
    var firebaseUrl = 'https://blinding-torch-6662.firebaseio.com';

    function newFirebaseArray(messagesRef) {
      return $firebaseArray(messagesRef);
    }

    function getServerTimestamp() {
      return Firebase.ServerValue.TIMESTAMP;
    }

    function getMessagesRef(userId) {
      return new Firebase(firebaseUrl + '/messages/' + userId);
    }

    function getMessageRef(userId, messageId) {
      return new Firebase(firebaseUrl + '/messages/' + userId + '/' + messageId);
    }

    function getBoardRef(userId) {
      return new Firebase(firebaseUrl + '/boards/' + userId);
    }

    function getBoardColumns(userId) {
      return new Firebase(firebaseUrl + '/boards/' + userId + '/columns');
    }

    return {
      newFirebaseArray: newFirebaseArray,
      getServerTimestamp: getServerTimestamp,
      getMessagesRef: getMessagesRef,
      getMessageRef: getMessageRef,
      getBoardRef: getBoardRef,
      getBoardColumns: getBoardColumns
    };
  }]);

'use strict';

angular
  .module('fireideaz')
  .controller('MainCtrl', ['$scope', '$filter',
              '$window', 'Utils', 'Auth', '$rootScope', 'FirebaseService',
    function($scope, $filter, $window, utils, auth, $rootScope, firebaseService) {
      $scope.loading = true;
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = { name: '' };
      $scope.userId = $window.location.hash.substring(1) || '';
      $scope.sortField = '$id';
      $scope.selectedType = 1;

      function getBoardAndMessages(userData) {
        $scope.userId = $window.location.hash.substring(1) || '499sm';

        var messagesRef = firebaseService.getMessagesRef($scope.userId);
        var board = firebaseService.getBoardRef($scope.userId);

        board.on('value', function(board) {
          $scope.board = board.val();
          $scope.boardId = $rootScope.boardId = board.val().boardId;
          $scope.boardContext = $rootScope.boardContext = board.val().boardContext;
        });

        $scope.boardRef = board;
        $scope.userUid = userData.uid;
        $scope.messages = firebaseService.newFirebaseArray(messagesRef);
        $scope.loading = false;
      }

      if($scope.userId !== '') {
        var messagesRef = firebaseService.getMessagesRef($scope.userId);
        auth.logUser($scope.userId, getBoardAndMessages);
      } else {
        $scope.loading = false;
      }

      $scope.isColumnSelected = function(type) {
        return parseInt($scope.selectedType) === parseInt(type);
      };

      $scope.seeNotification = function() {
        localStorage.setItem('funretro1', true);
      };

      $scope.showNotification = function() {
        return !localStorage.getItem('funretro1') && $scope.userId !== '';
      };

      $scope.boardNameChanged = function() {
        $scope.newBoard.name = $scope.newBoard.name.replace(/\s+/g,'');
      };

      $scope.getSortOrder = function() {
        return $scope.sortField === 'votes' ? true : false;
      };

      $scope.toggleVote = function(key, votes) {
        if(!localStorage.getItem(key)) {
          messagesRef.child(key).update({
            votes: votes + 1,
            date: firebaseService.getServerTimestamp()
          });

          localStorage.setItem(key, 1);
         } else {
           messagesRef.child(key).update({
             votes: votes - 1,
             date: firebaseService.getServerTimestamp()
           });

           localStorage.removeItem(key);
         }
      };

      function redirectToBoard() {
        window.location.href = window.location.origin +
          window.location.pathname + '#' + $scope.userId;
      }

      $scope.createNewBoard = function() {
        $scope.loading = true;
        utils.closeAll();
        $scope.userId = utils.createUserId();

        var callback = function(userData) {
          var board = firebaseService.getBoardRef($scope.userId);
          board.set({
            boardId: $scope.newBoard.name,
            date_created: new Date().toString(),
            columns: $scope.messageTypes,
            user_id: userData.uid
          });

          redirectToBoard();

          $scope.newBoard.name = '';
        };

        auth.createUserAndLog($scope.userId, callback);
      };

      $scope.changeBoardContext = function() {
        $scope.boardRef.update({
          boardContext: $scope.boardContext
        });
      };

      $scope.addNewColumn = function(name) {
        $scope.board.columns[utils.getNextId($scope.board) - 1] = {
          value: name,
          id: utils.getNextId($scope.board)
        };

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        utils.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        $scope.board.columns[id - 1] = {
          value: newName,
          id: id
        };

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        utils.closeAll();
      };

      $scope.deleteLastColumn = function() {
          $scope.board.columns.pop();
          var boardColumns = firebaseService.getBoardColumns($scope.userId);
          boardColumns.set(utils.toObject($scope.board.columns));
          utils.closeAll();
      };

      $scope.deleteMessage = function(message) {
      		$scope.messages.$remove(message);
          utils.closeAll();
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
          date: firebaseService.getServerTimestamp(),
          votes: 0
        }).then(addMessageCallback);
      };

      $scope.deleteCards = function() {
        $($scope.messages).each(function(index, message) {
          $scope.messages.$remove(message);
        });

        utils.closeAll();
      };

      $scope.getBoardText = function() {
        if($scope.board) {
          var clipboard = '';

          $($scope.board.columns).each(function(index, column) {
            if(index === 0) {
              clipboard += '<strong>' + column.value + '</strong><br />';
            } else {
              clipboard += '<br /><strong>' + column.value + '</strong><br />';
            }
            var filteredArray = $filter('orderBy')($scope.messages,
                                                   $scope.sortField,
                                                   $scope.getSortOrder());

            $(filteredArray).each(function(index2, message) {
              if(message.type.id === column.id) {
                clipboard += '- ' + message.text + ' (' + message.votes + ' votes) <br />';
              }
            });
          });

          return clipboard;
        }

        else return '';
      };

      angular.element($window).bind('hashchange', function () {
        $scope.loading = true;
        $scope.userId = $window.location.hash.substring(1) || '';
        auth.logUser($scope.userId, getBoardAndMessages);
      });
    }]
  );

'use strict';

angular
  .module('fireideaz')
  .controller('MessageCtrl', ['$scope', '$filter',
              '$window', 'Utils', 'Auth', '$rootScope', 'FirebaseService',
    function($scope, $filter, $window, utils, auth, $rootScope, firebaseService) {
      $scope.utils = utils;
      $scope.userId = $window.location.hash.substring(1);

      $scope.droppedEvent = function(dragEl, dropEl) {
        if(dragEl !== dropEl) {
          $scope.dragEl = dragEl;
          $scope.dropEl = dropEl;

          utils.openDialogMergeCards($scope);
        }
      };

      $scope.dropped = function(dragEl, dropEl) {
        var drag = $('#' + dragEl);
        var drop = $('#' + dropEl);

        var dropMessageRef = firebaseService.getMessageRef($scope.userId, drop.attr('messageId'));
        var dragMessageRef = firebaseService.getMessageRef($scope.userId, drag.attr('messageId'));

        dropMessageRef.once('value', function(dropMessage) {
          dragMessageRef.once('value', function(dragMessage) {
            dropMessageRef.update({
              text: dropMessage.val().text + ' | ' + dragMessage.val().text,
              votes: dropMessage.val().votes + dragMessage.val().votes
            });

            dragMessageRef.remove();
            utils.closeAll();
          });
        });
      };
    }]
  );

'use strict';

angular
  .module('fireideaz')
  .service('Utils', ['ngDialog', function (ngDialog) {
    function createUserId() {
      var text = '';
      var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

      for( var i=0; i < 5; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return text;
    }

    function alreadyVoted(key) {
      return localStorage.getItem(key);
    }

    function focusElement(id) {
      $('#' + id).find('textarea').focus();
    }

    var messageTypes = [{
      id: 1,
      value: 'Went well'
    }, {
      id: 2,
      value: 'To improve'
    }, {
      id: 3,
      value: 'Action items'
    }];

    function showRemoveColumn(id, columns) {
      return columns.length === id && columns.length > 3 ? true : false;
    }

    function getNextId(board) {
      return board.columns[board.columns.length -1].id + 1;
    }

    function openDialogColumn(scope) {
      ngDialog.open({
        template: 'addNewColumn',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    }

    function openDialogBoard(scope) {
      ngDialog.open({
        template: 'addNewBoard',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    }

    function openDialogDeleteCard(scope) {
      ngDialog.open({
        template: 'deleteCard',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    }

    function openDialogDeleteColumn(scope) {
      ngDialog.open({
        template: 'deleteColumn',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    }

    function openDialogMergeCards(scope) {
      ngDialog.open({
        template: 'mergeCards',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    }

    function openDialogCopyBoard(scope) {
      ngDialog.open({
        template: 'copyBoard',
        className: 'ngdialog-theme-plain bigDialog',
        scope: scope
      });
    }

    function openDialogDeleteCards(scope) {
      ngDialog.open({
        template: 'deleteCards',
        className: 'ngdialog-theme-plain danger',
        scope: scope
      });
    }

    function closeAll() {
      ngDialog.closeAll();
    }

    function toObject(array) {
      var object = {};

      for (var i = 0; i < array.length; i++) {
        object[i] = {
          id: array[i].id,
          value: array[i].value
        };
      }

      return object;
    }

    return {
      createUserId: createUserId,
      alreadyVoted: alreadyVoted,
      focusElement: focusElement,
      messageTypes: messageTypes,
      showRemoveColumn: showRemoveColumn,
      getNextId: getNextId,
      openDialogColumn: openDialogColumn,
      openDialogBoard: openDialogBoard,
      openDialogDeleteCard: openDialogDeleteCard,
      openDialogDeleteColumn: openDialogDeleteColumn,
      openDialogMergeCards: openDialogMergeCards,
      openDialogCopyBoard: openDialogCopyBoard,
      openDialogDeleteCards: openDialogDeleteCards,
      closeAll: closeAll,
      toObject: toObject
    };
  }]);

'use strict';

angular.module('fireideaz').directive('analytics', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/analytics.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('boardContext', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/boardContext.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('dialogs', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/dialogs.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('pageFooter', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/footer.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('pageHeader', [function() {
    return {
      templateUrl : 'components/header.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainContent', [function() {
    return {
      templateUrl : 'components/mainContent.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainPage', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/mainPage.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('menu', [function() {
    return {
      templateUrl : 'components/menu.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('newFeatureNotification', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/newFeatureNotification.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('spinner', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/spinner.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('userVoice', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/userVoice.html'
    };
  }]
);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwiYW5hbHl0aWNzLmpzIiwiYm9hcmRDb250ZXh0LmpzIiwiZGlhbG9ncy5qcyIsImZvb3Rlci5qcyIsImhlYWRlci5qcyIsIm1haW5Db250ZW50LmpzIiwibWFpblBhZ2UuanMiLCJtZW51LmpzIiwibmV3RmVhdHVyZU5vdGlmaWNhdGlvbi5qcyIsInNwaW5uZXIuanMiLCJ1c2VyVm9pY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicsIFsnZmlyZWJhc2UnLFxuICAgICAgICAgICAgICAgJ25nRGlhbG9nJyxcbiAgICAgICAgICAgICAgICdsdmwuZGlyZWN0aXZlcy5kcmFnZHJvcCcsXG4gICAgICAgICAgICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAgICAgICAgICAnbmdBcmlhJ10pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5zZXJ2aWNlKCdBdXRoJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBtYWluUmVmID0gbmV3IEZpcmViYXNlKCdodHRwczovL2JsaW5kaW5nLXRvcmNoLTY2NjIuZmlyZWJhc2Vpby5jb20nKTtcblxuICAgIGZ1bmN0aW9uIGxvZ1VzZXIodXNlciwgY2FsbGJhY2spIHtcbiAgICAgIG1haW5SZWYudW5hdXRoKCk7XG4gICAgICBtYWluUmVmLmF1dGhXaXRoUGFzc3dvcmQoe1xuICAgICAgICBlbWFpbCAgICA6IHVzZXIgKyAnQGZpcmVpZGVhei5jb20nLFxuICAgICAgICBwYXNzd29yZCA6IHVzZXJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yLCBhdXRoRGF0YSkge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnTG9nIHVzZXIgZmFpbGVkOiAnLCBlcnJvcik7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnJztcbiAgICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhhdXRoRGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVVzZXJBbmRMb2cobmV3VXNlciwgY2FsbGJhY2spIHtcbiAgICAgIG1haW5SZWYuY3JlYXRlVXNlcih7XG4gICAgICAgIGVtYWlsICAgIDogbmV3VXNlciArICdAZmlyZWlkZWF6LmNvbScsXG4gICAgICAgIHBhc3N3b3JkIDogbmV3VXNlclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0NyZWF0ZSB1c2VyIGZhaWxlZDogJywgZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ1VzZXIobmV3VXNlciwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGNyZWF0ZVVzZXJBbmRMb2c6IGNyZWF0ZVVzZXJBbmRMb2csXG4gICAgICBsb2dVc2VyOiBsb2dVc2VyXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbi5tb2R1bGUoJ2ZpcmVpZGVheicpXG4uZGlyZWN0aXZlKCdlbnRlckNsaWNrJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtKSB7XG4gICAgICBlbGVtLmJpbmQoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMgJiYgZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICQoZWxlbVswXSkuZmluZCgnYnV0dG9uJykuZm9jdXMoKTtcbiAgICAgICAgICAkKGVsZW1bMF0pLmZpbmQoJ2J1dHRvbicpLmNsaWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5zZXJ2aWNlKCdGaXJlYmFzZVNlcnZpY2UnLCBbJyRmaXJlYmFzZUFycmF5JywgZnVuY3Rpb24gKCRmaXJlYmFzZUFycmF5KSB7XG4gICAgdmFyIGZpcmViYXNlVXJsID0gJ2h0dHBzOi8vYmxpbmRpbmctdG9yY2gtNjY2Mi5maXJlYmFzZWlvLmNvbSc7XG5cbiAgICBmdW5jdGlvbiBuZXdGaXJlYmFzZUFycmF5KG1lc3NhZ2VzUmVmKSB7XG4gICAgICByZXR1cm4gJGZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlcnZlclRpbWVzdGFtcCgpIHtcbiAgICAgIHJldHVybiBGaXJlYmFzZS5TZXJ2ZXJWYWx1ZS5USU1FU1RBTVA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZXNSZWYodXNlcklkKSB7XG4gICAgICByZXR1cm4gbmV3IEZpcmViYXNlKGZpcmViYXNlVXJsICsgJy9tZXNzYWdlcy8nICsgdXNlcklkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlUmVmKHVzZXJJZCwgbWVzc2FnZUlkKSB7XG4gICAgICByZXR1cm4gbmV3IEZpcmViYXNlKGZpcmViYXNlVXJsICsgJy9tZXNzYWdlcy8nICsgdXNlcklkICsgJy8nICsgbWVzc2FnZUlkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRCb2FyZFJlZih1c2VySWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL2JvYXJkcy8nICsgdXNlcklkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRCb2FyZENvbHVtbnModXNlcklkKSB7XG4gICAgICByZXR1cm4gbmV3IEZpcmViYXNlKGZpcmViYXNlVXJsICsgJy9ib2FyZHMvJyArIHVzZXJJZCArICcvY29sdW1ucycpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuZXdGaXJlYmFzZUFycmF5OiBuZXdGaXJlYmFzZUFycmF5LFxuICAgICAgZ2V0U2VydmVyVGltZXN0YW1wOiBnZXRTZXJ2ZXJUaW1lc3RhbXAsXG4gICAgICBnZXRNZXNzYWdlc1JlZjogZ2V0TWVzc2FnZXNSZWYsXG4gICAgICBnZXRNZXNzYWdlUmVmOiBnZXRNZXNzYWdlUmVmLFxuICAgICAgZ2V0Qm9hcmRSZWY6IGdldEJvYXJkUmVmLFxuICAgICAgZ2V0Qm9hcmRDb2x1bW5zOiBnZXRCb2FyZENvbHVtbnNcbiAgICB9O1xuICB9XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLmNvbnRyb2xsZXIoJ01haW5DdHJsJywgWyckc2NvcGUnLCAnJGZpbHRlcicsXG4gICAgICAgICAgICAgICckd2luZG93JywgJ1V0aWxzJywgJ0F1dGgnLCAnJHJvb3RTY29wZScsICdGaXJlYmFzZVNlcnZpY2UnLFxuICAgIGZ1bmN0aW9uKCRzY29wZSwgJGZpbHRlciwgJHdpbmRvdywgdXRpbHMsIGF1dGgsICRyb290U2NvcGUsIGZpcmViYXNlU2VydmljZSkge1xuICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgJHNjb3BlLm1lc3NhZ2VUeXBlcyA9IHV0aWxzLm1lc3NhZ2VUeXBlcztcbiAgICAgICRzY29wZS51dGlscyA9IHV0aWxzO1xuICAgICAgJHNjb3BlLm5ld0JvYXJkID0geyBuYW1lOiAnJyB9O1xuICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkgfHwgJyc7XG4gICAgICAkc2NvcGUuc29ydEZpZWxkID0gJyRpZCc7XG4gICAgICAkc2NvcGUuc2VsZWN0ZWRUeXBlID0gMTtcblxuICAgICAgZnVuY3Rpb24gZ2V0Qm9hcmRBbmRNZXNzYWdlcyh1c2VyRGF0YSkge1xuICAgICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnNDk5c20nO1xuXG4gICAgICAgIHZhciBtZXNzYWdlc1JlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlc1JlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgdmFyIGJvYXJkID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkUmVmKCRzY29wZS51c2VySWQpO1xuXG4gICAgICAgIGJvYXJkLm9uKCd2YWx1ZScsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQudmFsKCk7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkSWQgPSAkcm9vdFNjb3BlLmJvYXJkSWQgPSBib2FyZC52YWwoKS5ib2FyZElkO1xuICAgICAgICAgICRzY29wZS5ib2FyZENvbnRleHQgPSAkcm9vdFNjb3BlLmJvYXJkQ29udGV4dCA9IGJvYXJkLnZhbCgpLmJvYXJkQ29udGV4dDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmJvYXJkUmVmID0gYm9hcmQ7XG4gICAgICAgICRzY29wZS51c2VyVWlkID0gdXNlckRhdGEudWlkO1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMgPSBmaXJlYmFzZVNlcnZpY2UubmV3RmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZik7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmKCRzY29wZS51c2VySWQgIT09ICcnKSB7XG4gICAgICAgIHZhciBtZXNzYWdlc1JlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlc1JlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgYXV0aC5sb2dVc2VyKCRzY29wZS51c2VySWQsIGdldEJvYXJkQW5kTWVzc2FnZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmlzQ29sdW1uU2VsZWN0ZWQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludCgkc2NvcGUuc2VsZWN0ZWRUeXBlKSA9PT0gcGFyc2VJbnQodHlwZSk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuc2VlTm90aWZpY2F0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdmdW5yZXRybzEnLCB0cnVlKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zaG93Tm90aWZpY2F0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Z1bnJldHJvMScpICYmICRzY29wZS51c2VySWQgIT09ICcnO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmJvYXJkTmFtZUNoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLm5ld0JvYXJkLm5hbWUgPSAkc2NvcGUubmV3Qm9hcmQubmFtZS5yZXBsYWNlKC9cXHMrL2csJycpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmdldFNvcnRPcmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnNvcnRGaWVsZCA9PT0gJ3ZvdGVzJyA/IHRydWUgOiBmYWxzZTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS50b2dnbGVWb3RlID0gZnVuY3Rpb24oa2V5LCB2b3Rlcykge1xuICAgICAgICBpZighbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KSkge1xuICAgICAgICAgIG1lc3NhZ2VzUmVmLmNoaWxkKGtleSkudXBkYXRlKHtcbiAgICAgICAgICAgIHZvdGVzOiB2b3RlcyArIDEsXG4gICAgICAgICAgICBkYXRlOiBmaXJlYmFzZVNlcnZpY2UuZ2V0U2VydmVyVGltZXN0YW1wKClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgMSk7XG4gICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICBtZXNzYWdlc1JlZi5jaGlsZChrZXkpLnVwZGF0ZSh7XG4gICAgICAgICAgICAgdm90ZXM6IHZvdGVzIC0gMSxcbiAgICAgICAgICAgICBkYXRlOiBmaXJlYmFzZVNlcnZpY2UuZ2V0U2VydmVyVGltZXN0YW1wKClcbiAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTtcbiAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIHJlZGlyZWN0VG9Cb2FyZCgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luICtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyAnIycgKyAkc2NvcGUudXNlcklkO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY3JlYXRlTmV3Qm9hcmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICB1dGlscy5jbG9zZUFsbCgpO1xuICAgICAgICAkc2NvcGUudXNlcklkID0gdXRpbHMuY3JlYXRlVXNlcklkKCk7XG5cbiAgICAgICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24odXNlckRhdGEpIHtcbiAgICAgICAgICB2YXIgYm9hcmQgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgICAgYm9hcmQuc2V0KHtcbiAgICAgICAgICAgIGJvYXJkSWQ6ICRzY29wZS5uZXdCb2FyZC5uYW1lLFxuICAgICAgICAgICAgZGF0ZV9jcmVhdGVkOiBuZXcgRGF0ZSgpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBjb2x1bW5zOiAkc2NvcGUubWVzc2FnZVR5cGVzLFxuICAgICAgICAgICAgdXNlcl9pZDogdXNlckRhdGEudWlkXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZWRpcmVjdFRvQm9hcmQoKTtcblxuICAgICAgICAgICRzY29wZS5uZXdCb2FyZC5uYW1lID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgYXV0aC5jcmVhdGVVc2VyQW5kTG9nKCRzY29wZS51c2VySWQsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5jaGFuZ2VCb2FyZENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkUmVmLnVwZGF0ZSh7XG4gICAgICAgICAgYm9hcmRDb250ZXh0OiAkc2NvcGUuYm9hcmRDb250ZXh0XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmFkZE5ld0NvbHVtbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkLmNvbHVtbnNbdXRpbHMuZ2V0TmV4dElkKCRzY29wZS5ib2FyZCkgLSAxXSA9IHtcbiAgICAgICAgICB2YWx1ZTogbmFtZSxcbiAgICAgICAgICBpZDogdXRpbHMuZ2V0TmV4dElkKCRzY29wZS5ib2FyZClcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYm9hcmRDb2x1bW5zID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkQ29sdW1ucygkc2NvcGUudXNlcklkKTtcbiAgICAgICAgYm9hcmRDb2x1bW5zLnNldCh1dGlscy50b09iamVjdCgkc2NvcGUuYm9hcmQuY29sdW1ucykpO1xuXG4gICAgICAgIHV0aWxzLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2hhbmdlQ29sdW1uTmFtZSA9IGZ1bmN0aW9uKGlkLCBuZXdOYW1lKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zW2lkIC0gMV0gPSB7XG4gICAgICAgICAgdmFsdWU6IG5ld05hbWUsXG4gICAgICAgICAgaWQ6IGlkXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcblxuICAgICAgICB1dGlscy5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZUxhc3RDb2x1bW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuYm9hcmQuY29sdW1ucy5wb3AoKTtcbiAgICAgICAgICB2YXIgYm9hcmRDb2x1bW5zID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkQ29sdW1ucygkc2NvcGUudXNlcklkKTtcbiAgICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG4gICAgICAgICAgdXRpbHMuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgXHRcdCRzY29wZS5tZXNzYWdlcy4kcmVtb3ZlKG1lc3NhZ2UpO1xuICAgICAgICAgIHV0aWxzLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBhZGRNZXNzYWdlQ2FsbGJhY2sobWVzc2FnZSkge1xuICAgICAgICB2YXIgaWQgPSBtZXNzYWdlLmtleSgpO1xuICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJCgnIycgKyBpZCkpLnNjb3BlKCkuaXNFZGl0aW5nID0gdHJ1ZTtcbiAgICAgICAgJCgnIycgKyBpZCkuZmluZCgndGV4dGFyZWEnKS5mb2N1cygpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuYWRkTmV3TWVzc2FnZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLiRhZGQoe1xuICAgICAgICAgIHRleHQ6ICcnLFxuICAgICAgICAgIHVzZXJfaWQ6ICRzY29wZS51c2VyVWlkLFxuICAgICAgICAgIHR5cGU6IHsgaWQ6IHR5cGUuaWQgfSxcbiAgICAgICAgICBkYXRlOiBmaXJlYmFzZVNlcnZpY2UuZ2V0U2VydmVyVGltZXN0YW1wKCksXG4gICAgICAgICAgdm90ZXM6IDBcbiAgICAgICAgfSkudGhlbihhZGRNZXNzYWdlQ2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZUNhcmRzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJHNjb3BlLm1lc3NhZ2VzKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBtZXNzYWdlKSB7XG4gICAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLiRyZW1vdmUobWVzc2FnZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHV0aWxzLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZ2V0Qm9hcmRUZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCRzY29wZS5ib2FyZCkge1xuICAgICAgICAgIHZhciBjbGlwYm9hcmQgPSAnJztcblxuICAgICAgICAgICQoJHNjb3BlLmJvYXJkLmNvbHVtbnMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGNvbHVtbikge1xuICAgICAgICAgICAgaWYoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgICAgY2xpcGJvYXJkICs9ICc8c3Ryb25nPicgKyBjb2x1bW4udmFsdWUgKyAnPC9zdHJvbmc+PGJyIC8+JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnPGJyIC8+PHN0cm9uZz4nICsgY29sdW1uLnZhbHVlICsgJzwvc3Ryb25nPjxiciAvPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZmlsdGVyZWRBcnJheSA9ICRmaWx0ZXIoJ29yZGVyQnknKSgkc2NvcGUubWVzc2FnZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEZpZWxkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmdldFNvcnRPcmRlcigpKTtcblxuICAgICAgICAgICAgJChmaWx0ZXJlZEFycmF5KS5lYWNoKGZ1bmN0aW9uKGluZGV4MiwgbWVzc2FnZSkge1xuICAgICAgICAgICAgICBpZihtZXNzYWdlLnR5cGUuaWQgPT09IGNvbHVtbi5pZCkge1xuICAgICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnLSAnICsgbWVzc2FnZS50ZXh0ICsgJyAoJyArIG1lc3NhZ2Uudm90ZXMgKyAnIHZvdGVzKSA8YnIgLz4nO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybiBjbGlwYm9hcmQ7XG4gICAgICAgIH1cblxuICAgICAgICBlbHNlIHJldHVybiAnJztcbiAgICAgIH07XG5cbiAgICAgIGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KS5iaW5kKCdoYXNoY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpIHx8ICcnO1xuICAgICAgICBhdXRoLmxvZ1VzZXIoJHNjb3BlLnVzZXJJZCwgZ2V0Qm9hcmRBbmRNZXNzYWdlcyk7XG4gICAgICB9KTtcbiAgICB9XVxuICApO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5jb250cm9sbGVyKCdNZXNzYWdlQ3RybCcsIFsnJHNjb3BlJywgJyRmaWx0ZXInLFxuICAgICAgICAgICAgICAnJHdpbmRvdycsICdVdGlscycsICdBdXRoJywgJyRyb290U2NvcGUnLCAnRmlyZWJhc2VTZXJ2aWNlJyxcbiAgICBmdW5jdGlvbigkc2NvcGUsICRmaWx0ZXIsICR3aW5kb3csIHV0aWxzLCBhdXRoLCAkcm9vdFNjb3BlLCBmaXJlYmFzZVNlcnZpY2UpIHtcbiAgICAgICRzY29wZS51dGlscyA9IHV0aWxzO1xuICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSk7XG5cbiAgICAgICRzY29wZS5kcm9wcGVkRXZlbnQgPSBmdW5jdGlvbihkcmFnRWwsIGRyb3BFbCkge1xuICAgICAgICBpZihkcmFnRWwgIT09IGRyb3BFbCkge1xuICAgICAgICAgICRzY29wZS5kcmFnRWwgPSBkcmFnRWw7XG4gICAgICAgICAgJHNjb3BlLmRyb3BFbCA9IGRyb3BFbDtcblxuICAgICAgICAgIHV0aWxzLm9wZW5EaWFsb2dNZXJnZUNhcmRzKCRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kcm9wcGVkID0gZnVuY3Rpb24oZHJhZ0VsLCBkcm9wRWwpIHtcbiAgICAgICAgdmFyIGRyYWcgPSAkKCcjJyArIGRyYWdFbCk7XG4gICAgICAgIHZhciBkcm9wID0gJCgnIycgKyBkcm9wRWwpO1xuXG4gICAgICAgIHZhciBkcm9wTWVzc2FnZVJlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlUmVmKCRzY29wZS51c2VySWQsIGRyb3AuYXR0cignbWVzc2FnZUlkJykpO1xuICAgICAgICB2YXIgZHJhZ01lc3NhZ2VSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZVJlZigkc2NvcGUudXNlcklkLCBkcmFnLmF0dHIoJ21lc3NhZ2VJZCcpKTtcblxuICAgICAgICBkcm9wTWVzc2FnZVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRyb3BNZXNzYWdlKSB7XG4gICAgICAgICAgZHJhZ01lc3NhZ2VSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkcmFnTWVzc2FnZSkge1xuICAgICAgICAgICAgZHJvcE1lc3NhZ2VSZWYudXBkYXRlKHtcbiAgICAgICAgICAgICAgdGV4dDogZHJvcE1lc3NhZ2UudmFsKCkudGV4dCArICcgfCAnICsgZHJhZ01lc3NhZ2UudmFsKCkudGV4dCxcbiAgICAgICAgICAgICAgdm90ZXM6IGRyb3BNZXNzYWdlLnZhbCgpLnZvdGVzICsgZHJhZ01lc3NhZ2UudmFsKCkudm90ZXNcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBkcmFnTWVzc2FnZVJlZi5yZW1vdmUoKTtcbiAgICAgICAgICAgIHV0aWxzLmNsb3NlQWxsKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XVxuICApO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5zZXJ2aWNlKCdVdGlscycsIFsnbmdEaWFsb2cnLCBmdW5jdGlvbiAobmdEaWFsb2cpIHtcbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VySWQoKSB7XG4gICAgICB2YXIgdGV4dCA9ICcnO1xuICAgICAgdmFyIHBvc3NpYmxlID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSc7XG5cbiAgICAgIGZvciggdmFyIGk9MDsgaSA8IDU7IGkrKyApIHtcbiAgICAgICAgdGV4dCArPSBwb3NzaWJsZS5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcG9zc2libGUubGVuZ3RoKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0ZXh0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFscmVhZHlWb3RlZChrZXkpIHtcbiAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvY3VzRWxlbWVudChpZCkge1xuICAgICAgJCgnIycgKyBpZCkuZmluZCgndGV4dGFyZWEnKS5mb2N1cygpO1xuICAgIH1cblxuICAgIHZhciBtZXNzYWdlVHlwZXMgPSBbe1xuICAgICAgaWQ6IDEsXG4gICAgICB2YWx1ZTogJ1dlbnQgd2VsbCdcbiAgICB9LCB7XG4gICAgICBpZDogMixcbiAgICAgIHZhbHVlOiAnVG8gaW1wcm92ZSdcbiAgICB9LCB7XG4gICAgICBpZDogMyxcbiAgICAgIHZhbHVlOiAnQWN0aW9uIGl0ZW1zJ1xuICAgIH1dO1xuXG4gICAgZnVuY3Rpb24gc2hvd1JlbW92ZUNvbHVtbihpZCwgY29sdW1ucykge1xuICAgICAgcmV0dXJuIGNvbHVtbnMubGVuZ3RoID09PSBpZCAmJiBjb2x1bW5zLmxlbmd0aCA+IDMgPyB0cnVlIDogZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TmV4dElkKGJvYXJkKSB7XG4gICAgICByZXR1cm4gYm9hcmQuY29sdW1uc1tib2FyZC5jb2x1bW5zLmxlbmd0aCAtMV0uaWQgKyAxO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW5EaWFsb2dDb2x1bW4oc2NvcGUpIHtcbiAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZTogJ2FkZE5ld0NvbHVtbicsXG4gICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nQm9hcmQoc2NvcGUpIHtcbiAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZTogJ2FkZE5ld0JvYXJkJyxcbiAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW5EaWFsb2dEZWxldGVDYXJkKHNjb3BlKSB7XG4gICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDYXJkJyxcbiAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW5EaWFsb2dEZWxldGVDb2x1bW4oc2NvcGUpIHtcbiAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNvbHVtbicsXG4gICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nTWVyZ2VDYXJkcyhzY29wZSkge1xuICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgIHRlbXBsYXRlOiAnbWVyZ2VDYXJkcycsXG4gICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nQ29weUJvYXJkKHNjb3BlKSB7XG4gICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGU6ICdjb3B5Qm9hcmQnLFxuICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbiBiaWdEaWFsb2cnLFxuICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW5EaWFsb2dEZWxldGVDYXJkcyhzY29wZSkge1xuICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ2FyZHMnLFxuICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbiBkYW5nZXInLFxuICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsb3NlQWxsKCkge1xuICAgICAgbmdEaWFsb2cuY2xvc2VBbGwoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b09iamVjdChhcnJheSkge1xuICAgICAgdmFyIG9iamVjdCA9IHt9O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG9iamVjdFtpXSA9IHtcbiAgICAgICAgICBpZDogYXJyYXlbaV0uaWQsXG4gICAgICAgICAgdmFsdWU6IGFycmF5W2ldLnZhbHVlXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNyZWF0ZVVzZXJJZDogY3JlYXRlVXNlcklkLFxuICAgICAgYWxyZWFkeVZvdGVkOiBhbHJlYWR5Vm90ZWQsXG4gICAgICBmb2N1c0VsZW1lbnQ6IGZvY3VzRWxlbWVudCxcbiAgICAgIG1lc3NhZ2VUeXBlczogbWVzc2FnZVR5cGVzLFxuICAgICAgc2hvd1JlbW92ZUNvbHVtbjogc2hvd1JlbW92ZUNvbHVtbixcbiAgICAgIGdldE5leHRJZDogZ2V0TmV4dElkLFxuICAgICAgb3BlbkRpYWxvZ0NvbHVtbjogb3BlbkRpYWxvZ0NvbHVtbixcbiAgICAgIG9wZW5EaWFsb2dCb2FyZDogb3BlbkRpYWxvZ0JvYXJkLFxuICAgICAgb3BlbkRpYWxvZ0RlbGV0ZUNhcmQ6IG9wZW5EaWFsb2dEZWxldGVDYXJkLFxuICAgICAgb3BlbkRpYWxvZ0RlbGV0ZUNvbHVtbjogb3BlbkRpYWxvZ0RlbGV0ZUNvbHVtbixcbiAgICAgIG9wZW5EaWFsb2dNZXJnZUNhcmRzOiBvcGVuRGlhbG9nTWVyZ2VDYXJkcyxcbiAgICAgIG9wZW5EaWFsb2dDb3B5Qm9hcmQ6IG9wZW5EaWFsb2dDb3B5Qm9hcmQsXG4gICAgICBvcGVuRGlhbG9nRGVsZXRlQ2FyZHM6IG9wZW5EaWFsb2dEZWxldGVDYXJkcyxcbiAgICAgIGNsb3NlQWxsOiBjbG9zZUFsbCxcbiAgICAgIHRvT2JqZWN0OiB0b09iamVjdFxuICAgIH07XG4gIH1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnYW5hbHl0aWNzJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9hbmFseXRpY3MuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnYm9hcmRDb250ZXh0JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9ib2FyZENvbnRleHQuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnZGlhbG9ncycsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvZGlhbG9ncy5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdwYWdlRm9vdGVyJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9mb290ZXIuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgncGFnZUhlYWRlcicsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9oZWFkZXIuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnbWFpbkNvbnRlbnQnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWFpbkNvbnRlbnQuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnbWFpblBhZ2UnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21haW5QYWdlLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21lbnUnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWVudS5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCduZXdGZWF0dXJlTm90aWZpY2F0aW9uJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9uZXdGZWF0dXJlTm90aWZpY2F0aW9uLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3NwaW5uZXInLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL3NwaW5uZXIuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgndXNlclZvaWNlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy91c2VyVm9pY2UuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiJdfQ==
