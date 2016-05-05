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
      templateUrl : 'components/analytics.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('boardContext', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/boardContext.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('dialogs', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/dialogs.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('pageFooter', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/footer.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('pageHeader', [function() {
    return {
      templateUrl : 'components/header.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainContent', [function() {
    return {
      templateUrl : 'components/mainContent.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainPage', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/mainPage.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('menu', [function() {
    return {
      templateUrl : 'components/menu.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('newFeatureNotification', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/newFeatureNotification.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('spinner', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/spinner.html',
      controller : 'MainCtrl'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('userVoice', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/userVoice.html',
      controller : 'MainCtrl'
    };
  }]
);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwiYW5hbHl0aWNzLmpzIiwiYm9hcmRDb250ZXh0LmpzIiwiZGlhbG9ncy5qcyIsImZvb3Rlci5qcyIsImhlYWRlci5qcyIsIm1haW5Db250ZW50LmpzIiwibWFpblBhZ2UuanMiLCJtZW51LmpzIiwibmV3RmVhdHVyZU5vdGlmaWNhdGlvbi5qcyIsInNwaW5uZXIuanMiLCJ1c2VyVm9pY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonLCBbJ2ZpcmViYXNlJyxcbiAgICAgICAgICAgICAgICduZ0RpYWxvZycsXG4gICAgICAgICAgICAgICAnbHZsLmRpcmVjdGl2ZXMuZHJhZ2Ryb3AnLFxuICAgICAgICAgICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgICAgICAgICAgJ25nQXJpYSddKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnQXV0aCcsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWFpblJlZiA9IG5ldyBGaXJlYmFzZSgnaHR0cHM6Ly9ibGluZGluZy10b3JjaC02NjYyLmZpcmViYXNlaW8uY29tJyk7XG5cbiAgICBmdW5jdGlvbiBsb2dVc2VyKHVzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLnVuYXV0aCgpO1xuICAgICAgbWFpblJlZi5hdXRoV2l0aFBhc3N3b3JkKHtcbiAgICAgICAgZW1haWwgICAgOiB1c2VyICsgJ0BmaXJlaWRlYXouY29tJyxcbiAgICAgICAgcGFzc3dvcmQgOiB1c2VyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvciwgYXV0aERhdGEpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0xvZyB1c2VyIGZhaWxlZDogJywgZXJyb3IpO1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgICAgbG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soYXV0aERhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyQW5kTG9nKG5ld1VzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLmNyZWF0ZVVzZXIoe1xuICAgICAgICBlbWFpbCAgICA6IG5ld1VzZXIgKyAnQGZpcmVpZGVhei5jb20nLFxuICAgICAgICBwYXNzd29yZCA6IG5ld1VzZXJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGUgdXNlciBmYWlsZWQ6ICcsIGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dVc2VyKG5ld1VzZXIsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VyQW5kTG9nOiBjcmVhdGVVc2VyQW5kTG9nLFxuICAgICAgbG9nVXNlcjogbG9nVXNlclxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4ubW9kdWxlKCdmaXJlaWRlYXonKVxuLmRpcmVjdGl2ZSgnZW50ZXJDbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSkge1xuICAgICAgZWxlbS5iaW5kKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAkKGVsZW1bMF0pLmZpbmQoJ2J1dHRvbicpLmZvY3VzKCk7XG4gICAgICAgICAgJChlbGVtWzBdKS5maW5kKCdidXR0b24nKS5jbGljaygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnRmlyZWJhc2VTZXJ2aWNlJywgWyckZmlyZWJhc2VBcnJheScsIGZ1bmN0aW9uICgkZmlyZWJhc2VBcnJheSkge1xuICAgIHZhciBmaXJlYmFzZVVybCA9ICdodHRwczovL2JsaW5kaW5nLXRvcmNoLTY2NjIuZmlyZWJhc2Vpby5jb20nO1xuXG4gICAgZnVuY3Rpb24gbmV3RmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZikge1xuICAgICAgcmV0dXJuICRmaXJlYmFzZUFycmF5KG1lc3NhZ2VzUmVmKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZXJ2ZXJUaW1lc3RhbXAoKSB7XG4gICAgICByZXR1cm4gRmlyZWJhc2UuU2VydmVyVmFsdWUuVElNRVNUQU1QO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2VzUmVmKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZVJlZih1c2VySWQsIG1lc3NhZ2VJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCArICcvJyArIG1lc3NhZ2VJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRSZWYodXNlcklkKSB7XG4gICAgICByZXR1cm4gbmV3IEZpcmViYXNlKGZpcmViYXNlVXJsICsgJy9ib2FyZHMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRDb2x1bW5zKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvYm9hcmRzLycgKyB1c2VySWQgKyAnL2NvbHVtbnMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmV3RmlyZWJhc2VBcnJheTogbmV3RmlyZWJhc2VBcnJheSxcbiAgICAgIGdldFNlcnZlclRpbWVzdGFtcDogZ2V0U2VydmVyVGltZXN0YW1wLFxuICAgICAgZ2V0TWVzc2FnZXNSZWY6IGdldE1lc3NhZ2VzUmVmLFxuICAgICAgZ2V0TWVzc2FnZVJlZjogZ2V0TWVzc2FnZVJlZixcbiAgICAgIGdldEJvYXJkUmVmOiBnZXRCb2FyZFJlZixcbiAgICAgIGdldEJvYXJkQ29sdW1uczogZ2V0Qm9hcmRDb2x1bW5zXG4gICAgfTtcbiAgfV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5jb250cm9sbGVyKCdNYWluQ3RybCcsIFsnJHNjb3BlJywgJyRmaWx0ZXInLFxuICAgICAgICAgICAgICAnJHdpbmRvdycsICdVdGlscycsICdBdXRoJywgJyRyb290U2NvcGUnLCAnRmlyZWJhc2VTZXJ2aWNlJyxcbiAgICBmdW5jdGlvbigkc2NvcGUsICRmaWx0ZXIsICR3aW5kb3csIHV0aWxzLCBhdXRoLCAkcm9vdFNjb3BlLCBmaXJlYmFzZVNlcnZpY2UpIHtcbiAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5tZXNzYWdlVHlwZXMgPSB1dGlscy5tZXNzYWdlVHlwZXM7XG4gICAgICAkc2NvcGUudXRpbHMgPSB1dGlscztcbiAgICAgICRzY29wZS5uZXdCb2FyZCA9IHsgbmFtZTogJycgfTtcbiAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpIHx8ICcnO1xuICAgICAgJHNjb3BlLnNvcnRGaWVsZCA9ICckaWQnO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkVHlwZSA9IDE7XG5cbiAgICAgIGZ1bmN0aW9uIGdldEJvYXJkQW5kTWVzc2FnZXModXNlckRhdGEpIHtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkgfHwgJzQ5OXNtJztcblxuICAgICAgICB2YXIgbWVzc2FnZXNSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZXNSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIHZhciBib2FyZCA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZFJlZigkc2NvcGUudXNlcklkKTtcblxuICAgICAgICBib2FyZC5vbigndmFsdWUnLCBmdW5jdGlvbihib2FyZCkge1xuICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkLnZhbCgpO1xuICAgICAgICAgICRzY29wZS5ib2FyZElkID0gJHJvb3RTY29wZS5ib2FyZElkID0gYm9hcmQudmFsKCkuYm9hcmRJZDtcbiAgICAgICAgICAkc2NvcGUuYm9hcmRDb250ZXh0ID0gJHJvb3RTY29wZS5ib2FyZENvbnRleHQgPSBib2FyZC52YWwoKS5ib2FyZENvbnRleHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5ib2FyZFJlZiA9IGJvYXJkO1xuICAgICAgICAkc2NvcGUudXNlclVpZCA9IHVzZXJEYXRhLnVpZDtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzID0gZmlyZWJhc2VTZXJ2aWNlLm5ld0ZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpO1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZigkc2NvcGUudXNlcklkICE9PSAnJykge1xuICAgICAgICB2YXIgbWVzc2FnZXNSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZXNSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGF1dGgubG9nVXNlcigkc2NvcGUudXNlcklkLCBnZXRCb2FyZEFuZE1lc3NhZ2VzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5pc0NvbHVtblNlbGVjdGVkID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQoJHNjb3BlLnNlbGVjdGVkVHlwZSkgPT09IHBhcnNlSW50KHR5cGUpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNlZU5vdGlmaWNhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZnVucmV0cm8xJywgdHJ1ZSk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuc2hvd05vdGlmaWNhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIWxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmdW5yZXRybzEnKSAmJiAkc2NvcGUudXNlcklkICE9PSAnJztcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5ib2FyZE5hbWVDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5uZXdCb2FyZC5uYW1lID0gJHNjb3BlLm5ld0JvYXJkLm5hbWUucmVwbGFjZSgvXFxzKy9nLCcnKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5nZXRTb3J0T3JkZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5zb3J0RmllbGQgPT09ICd2b3RlcycgPyB0cnVlIDogZmFsc2U7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUudG9nZ2xlVm90ZSA9IGZ1bmN0aW9uKGtleSwgdm90ZXMpIHtcbiAgICAgICAgaWYoIWxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSkpIHtcbiAgICAgICAgICBtZXNzYWdlc1JlZi5jaGlsZChrZXkpLnVwZGF0ZSh7XG4gICAgICAgICAgICB2b3Rlczogdm90ZXMgKyAxLFxuICAgICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIDEpO1xuICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgbWVzc2FnZXNSZWYuY2hpbGQoa2V5KS51cGRhdGUoe1xuICAgICAgICAgICAgIHZvdGVzOiB2b3RlcyAtIDEsXG4gICAgICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpXG4gICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG4gICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiByZWRpcmVjdFRvQm9hcmQoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbiArXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgJyMnICsgJHNjb3BlLnVzZXJJZDtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNyZWF0ZU5ld0JvYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgdXRpbHMuY2xvc2VBbGwoKTtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9IHV0aWxzLmNyZWF0ZVVzZXJJZCgpO1xuXG4gICAgICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uKHVzZXJEYXRhKSB7XG4gICAgICAgICAgdmFyIGJvYXJkID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkUmVmKCRzY29wZS51c2VySWQpO1xuICAgICAgICAgIGJvYXJkLnNldCh7XG4gICAgICAgICAgICBib2FyZElkOiAkc2NvcGUubmV3Qm9hcmQubmFtZSxcbiAgICAgICAgICAgIGRhdGVfY3JlYXRlZDogbmV3IERhdGUoKS50b1N0cmluZygpLFxuICAgICAgICAgICAgY29sdW1uczogJHNjb3BlLm1lc3NhZ2VUeXBlcyxcbiAgICAgICAgICAgIHVzZXJfaWQ6IHVzZXJEYXRhLnVpZFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmVkaXJlY3RUb0JvYXJkKCk7XG5cbiAgICAgICAgICAkc2NvcGUubmV3Qm9hcmQubmFtZSA9ICcnO1xuICAgICAgICB9O1xuXG4gICAgICAgIGF1dGguY3JlYXRlVXNlckFuZExvZygkc2NvcGUudXNlcklkLCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2hhbmdlQm9hcmRDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5ib2FyZFJlZi51cGRhdGUoe1xuICAgICAgICAgIGJvYXJkQ29udGV4dDogJHNjb3BlLmJvYXJkQ29udGV4dFxuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5hZGROZXdDb2x1bW4gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zW3V0aWxzLmdldE5leHRJZCgkc2NvcGUuYm9hcmQpIC0gMV0gPSB7XG4gICAgICAgICAgdmFsdWU6IG5hbWUsXG4gICAgICAgICAgaWQ6IHV0aWxzLmdldE5leHRJZCgkc2NvcGUuYm9hcmQpXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcblxuICAgICAgICB1dGlscy5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmNoYW5nZUNvbHVtbk5hbWUgPSBmdW5jdGlvbihpZCwgbmV3TmFtZSkge1xuICAgICAgICAkc2NvcGUuYm9hcmQuY29sdW1uc1tpZCAtIDFdID0ge1xuICAgICAgICAgIHZhbHVlOiBuZXdOYW1lLFxuICAgICAgICAgIGlkOiBpZFxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG5cbiAgICAgICAgdXRpbHMuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVMYXN0Q29sdW1uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkLmNvbHVtbnMucG9wKCk7XG4gICAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgICAgYm9hcmRDb2x1bW5zLnNldCh1dGlscy50b09iamVjdCgkc2NvcGUuYm9hcmQuY29sdW1ucykpO1xuICAgICAgICAgIHV0aWxzLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgIFx0XHQkc2NvcGUubWVzc2FnZXMuJHJlbW92ZShtZXNzYWdlKTtcbiAgICAgICAgICB1dGlscy5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gYWRkTWVzc2FnZUNhbGxiYWNrKG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGlkID0gbWVzc2FnZS5rZXkoKTtcbiAgICAgICAgYW5ndWxhci5lbGVtZW50KCQoJyMnICsgaWQpKS5zY29wZSgpLmlzRWRpdGluZyA9IHRydWU7XG4gICAgICAgICQoJyMnICsgaWQpLmZpbmQoJ3RleHRhcmVhJykuZm9jdXMoKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmFkZE5ld01lc3NhZ2UgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICRzY29wZS5tZXNzYWdlcy4kYWRkKHtcbiAgICAgICAgICB0ZXh0OiAnJyxcbiAgICAgICAgICB1c2VyX2lkOiAkc2NvcGUudXNlclVpZCxcbiAgICAgICAgICB0eXBlOiB7IGlkOiB0eXBlLmlkIH0sXG4gICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpLFxuICAgICAgICAgIHZvdGVzOiAwXG4gICAgICAgIH0pLnRoZW4oYWRkTWVzc2FnZUNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVDYXJkcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCRzY29wZS5tZXNzYWdlcykuZWFjaChmdW5jdGlvbihpbmRleCwgbWVzc2FnZSkge1xuICAgICAgICAgICRzY29wZS5tZXNzYWdlcy4kcmVtb3ZlKG1lc3NhZ2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICB1dGlscy5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmdldEJvYXJkVGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZigkc2NvcGUuYm9hcmQpIHtcbiAgICAgICAgICB2YXIgY2xpcGJvYXJkID0gJyc7XG5cbiAgICAgICAgICAkKCRzY29wZS5ib2FyZC5jb2x1bW5zKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBjb2x1bW4pIHtcbiAgICAgICAgICAgIGlmKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnPHN0cm9uZz4nICsgY29sdW1uLnZhbHVlICsgJzwvc3Ryb25nPjxiciAvPic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJzxiciAvPjxzdHJvbmc+JyArIGNvbHVtbi52YWx1ZSArICc8L3N0cm9uZz48YnIgLz4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZpbHRlcmVkQXJyYXkgPSAkZmlsdGVyKCdvcmRlckJ5JykoJHNjb3BlLm1lc3NhZ2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRGaWVsZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRTb3J0T3JkZXIoKSk7XG5cbiAgICAgICAgICAgICQoZmlsdGVyZWRBcnJheSkuZWFjaChmdW5jdGlvbihpbmRleDIsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgaWYobWVzc2FnZS50eXBlLmlkID09PSBjb2x1bW4uaWQpIHtcbiAgICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJy0gJyArIG1lc3NhZ2UudGV4dCArICcgKCcgKyBtZXNzYWdlLnZvdGVzICsgJyB2b3RlcykgPGJyIC8+JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZXR1cm4gY2xpcGJvYXJkO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxzZSByZXR1cm4gJyc7XG4gICAgICB9O1xuXG4gICAgICBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdykuYmluZCgnaGFzaGNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICAgYXV0aC5sb2dVc2VyKCRzY29wZS51c2VySWQsIGdldEJvYXJkQW5kTWVzc2FnZXMpO1xuICAgICAgfSk7XG4gICAgfV1cbiAgKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuY29udHJvbGxlcignTWVzc2FnZUN0cmwnLCBbJyRzY29wZScsICckZmlsdGVyJyxcbiAgICAgICAgICAgICAgJyR3aW5kb3cnLCAnVXRpbHMnLCAnQXV0aCcsICckcm9vdFNjb3BlJywgJ0ZpcmViYXNlU2VydmljZScsXG4gICAgZnVuY3Rpb24oJHNjb3BlLCAkZmlsdGVyLCAkd2luZG93LCB1dGlscywgYXV0aCwgJHJvb3RTY29wZSwgZmlyZWJhc2VTZXJ2aWNlKSB7XG4gICAgICAkc2NvcGUudXRpbHMgPSB1dGlscztcbiAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpO1xuXG4gICAgICAkc2NvcGUuZHJvcHBlZEV2ZW50ID0gZnVuY3Rpb24oZHJhZ0VsLCBkcm9wRWwpIHtcbiAgICAgICAgaWYoZHJhZ0VsICE9PSBkcm9wRWwpIHtcbiAgICAgICAgICAkc2NvcGUuZHJhZ0VsID0gZHJhZ0VsO1xuICAgICAgICAgICRzY29wZS5kcm9wRWwgPSBkcm9wRWw7XG5cbiAgICAgICAgICB1dGlscy5vcGVuRGlhbG9nTWVyZ2VDYXJkcygkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZHJvcHBlZCA9IGZ1bmN0aW9uKGRyYWdFbCwgZHJvcEVsKSB7XG4gICAgICAgIHZhciBkcmFnID0gJCgnIycgKyBkcmFnRWwpO1xuICAgICAgICB2YXIgZHJvcCA9ICQoJyMnICsgZHJvcEVsKTtcblxuICAgICAgICB2YXIgZHJvcE1lc3NhZ2VSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZVJlZigkc2NvcGUudXNlcklkLCBkcm9wLmF0dHIoJ21lc3NhZ2VJZCcpKTtcbiAgICAgICAgdmFyIGRyYWdNZXNzYWdlUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VSZWYoJHNjb3BlLnVzZXJJZCwgZHJhZy5hdHRyKCdtZXNzYWdlSWQnKSk7XG5cbiAgICAgICAgZHJvcE1lc3NhZ2VSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkcm9wTWVzc2FnZSkge1xuICAgICAgICAgIGRyYWdNZXNzYWdlUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZHJhZ01lc3NhZ2UpIHtcbiAgICAgICAgICAgIGRyb3BNZXNzYWdlUmVmLnVwZGF0ZSh7XG4gICAgICAgICAgICAgIHRleHQ6IGRyb3BNZXNzYWdlLnZhbCgpLnRleHQgKyAnIHwgJyArIGRyYWdNZXNzYWdlLnZhbCgpLnRleHQsXG4gICAgICAgICAgICAgIHZvdGVzOiBkcm9wTWVzc2FnZS52YWwoKS52b3RlcyArIGRyYWdNZXNzYWdlLnZhbCgpLnZvdGVzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZHJhZ01lc3NhZ2VSZWYucmVtb3ZlKCk7XG4gICAgICAgICAgICB1dGlscy5jbG9zZUFsbCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfV1cbiAgKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnVXRpbHMnLCBbJ25nRGlhbG9nJywgZnVuY3Rpb24gKG5nRGlhbG9nKSB7XG4gICAgZnVuY3Rpb24gY3JlYXRlVXNlcklkKCkge1xuICAgICAgdmFyIHRleHQgPSAnJztcbiAgICAgIHZhciBwb3NzaWJsZSA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuXG4gICAgICBmb3IoIHZhciBpPTA7IGkgPCA1OyBpKysgKSB7XG4gICAgICAgIHRleHQgKz0gcG9zc2libGUuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBvc3NpYmxlLmxlbmd0aCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGV4dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbHJlYWR5Vm90ZWQoa2V5KSB7XG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb2N1c0VsZW1lbnQoaWQpIHtcbiAgICAgICQoJyMnICsgaWQpLmZpbmQoJ3RleHRhcmVhJykuZm9jdXMoKTtcbiAgICB9XG5cbiAgICB2YXIgbWVzc2FnZVR5cGVzID0gW3tcbiAgICAgIGlkOiAxLFxuICAgICAgdmFsdWU6ICdXZW50IHdlbGwnXG4gICAgfSwge1xuICAgICAgaWQ6IDIsXG4gICAgICB2YWx1ZTogJ1RvIGltcHJvdmUnXG4gICAgfSwge1xuICAgICAgaWQ6IDMsXG4gICAgICB2YWx1ZTogJ0FjdGlvbiBpdGVtcydcbiAgICB9XTtcblxuICAgIGZ1bmN0aW9uIHNob3dSZW1vdmVDb2x1bW4oaWQsIGNvbHVtbnMpIHtcbiAgICAgIHJldHVybiBjb2x1bW5zLmxlbmd0aCA9PT0gaWQgJiYgY29sdW1ucy5sZW5ndGggPiAzID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5leHRJZChib2FyZCkge1xuICAgICAgcmV0dXJuIGJvYXJkLmNvbHVtbnNbYm9hcmQuY29sdW1ucy5sZW5ndGggLTFdLmlkICsgMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nQ29sdW1uKHNjb3BlKSB7XG4gICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGU6ICdhZGROZXdDb2x1bW4nLFxuICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3BlbkRpYWxvZ0JvYXJkKHNjb3BlKSB7XG4gICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGU6ICdhZGROZXdCb2FyZCcsXG4gICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nRGVsZXRlQ2FyZChzY29wZSkge1xuICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ2FyZCcsXG4gICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nRGVsZXRlQ29sdW1uKHNjb3BlKSB7XG4gICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDb2x1bW4nLFxuICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3BlbkRpYWxvZ01lcmdlQ2FyZHMoc2NvcGUpIHtcbiAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZTogJ21lcmdlQ2FyZHMnLFxuICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3BlbkRpYWxvZ0NvcHlCb2FyZChzY29wZSkge1xuICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgIHRlbXBsYXRlOiAnY29weUJvYXJkJyxcbiAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4gYmlnRGlhbG9nJyxcbiAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nRGVsZXRlQ2FyZHMoc2NvcGUpIHtcbiAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNhcmRzJyxcbiAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4gZGFuZ2VyJyxcbiAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbG9zZUFsbCgpIHtcbiAgICAgIG5nRGlhbG9nLmNsb3NlQWxsKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9PYmplY3QoYXJyYXkpIHtcbiAgICAgIHZhciBvYmplY3QgPSB7fTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBvYmplY3RbaV0gPSB7XG4gICAgICAgICAgaWQ6IGFycmF5W2ldLmlkLFxuICAgICAgICAgIHZhbHVlOiBhcnJheVtpXS52YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VySWQ6IGNyZWF0ZVVzZXJJZCxcbiAgICAgIGFscmVhZHlWb3RlZDogYWxyZWFkeVZvdGVkLFxuICAgICAgZm9jdXNFbGVtZW50OiBmb2N1c0VsZW1lbnQsXG4gICAgICBtZXNzYWdlVHlwZXM6IG1lc3NhZ2VUeXBlcyxcbiAgICAgIHNob3dSZW1vdmVDb2x1bW46IHNob3dSZW1vdmVDb2x1bW4sXG4gICAgICBnZXROZXh0SWQ6IGdldE5leHRJZCxcbiAgICAgIG9wZW5EaWFsb2dDb2x1bW46IG9wZW5EaWFsb2dDb2x1bW4sXG4gICAgICBvcGVuRGlhbG9nQm9hcmQ6IG9wZW5EaWFsb2dCb2FyZCxcbiAgICAgIG9wZW5EaWFsb2dEZWxldGVDYXJkOiBvcGVuRGlhbG9nRGVsZXRlQ2FyZCxcbiAgICAgIG9wZW5EaWFsb2dEZWxldGVDb2x1bW46IG9wZW5EaWFsb2dEZWxldGVDb2x1bW4sXG4gICAgICBvcGVuRGlhbG9nTWVyZ2VDYXJkczogb3BlbkRpYWxvZ01lcmdlQ2FyZHMsXG4gICAgICBvcGVuRGlhbG9nQ29weUJvYXJkOiBvcGVuRGlhbG9nQ29weUJvYXJkLFxuICAgICAgb3BlbkRpYWxvZ0RlbGV0ZUNhcmRzOiBvcGVuRGlhbG9nRGVsZXRlQ2FyZHMsXG4gICAgICBjbG9zZUFsbDogY2xvc2VBbGwsXG4gICAgICB0b09iamVjdDogdG9PYmplY3RcbiAgICB9O1xuICB9XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2FuYWx5dGljcycsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvYW5hbHl0aWNzLmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnYm9hcmRDb250ZXh0JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9ib2FyZENvbnRleHQuaHRtbCcsXG4gICAgICBjb250cm9sbGVyIDogJ01haW5DdHJsJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdkaWFsb2dzJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9kaWFsb2dzLmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgncGFnZUZvb3RlcicsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvZm9vdGVyLmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgncGFnZUhlYWRlcicsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9oZWFkZXIuaHRtbCcsXG4gICAgICBjb250cm9sbGVyIDogJ01haW5DdHJsJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluQ29udGVudCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9tYWluQ29udGVudC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXIgOiAnTWFpbkN0cmwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21haW5QYWdlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9tYWluUGFnZS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXIgOiAnTWFpbkN0cmwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21lbnUnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWVudS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXIgOiAnTWFpbkN0cmwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ25ld0ZlYXR1cmVOb3RpZmljYXRpb24nLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL25ld0ZlYXR1cmVOb3RpZmljYXRpb24uaHRtbCcsXG4gICAgICBjb250cm9sbGVyIDogJ01haW5DdHJsJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdzcGlubmVyJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9zcGlubmVyLmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgndXNlclZvaWNlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy91c2VyVm9pY2UuaHRtbCcsXG4gICAgICBjb250cm9sbGVyIDogJ01haW5DdHJsJ1xuICAgIH07XG4gIH1dXG4pO1xuIl19
