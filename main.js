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
      if(mainRef.getAuth() !== null) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwiYW5hbHl0aWNzLmpzIiwiYm9hcmRDb250ZXh0LmpzIiwiZGlhbG9ncy5qcyIsImZvb3Rlci5qcyIsImhlYWRlci5qcyIsIm1haW5Db250ZW50LmpzIiwibWFpblBhZ2UuanMiLCJtZW51LmpzIiwibmV3RmVhdHVyZU5vdGlmaWNhdGlvbi5qcyIsInNwaW5uZXIuanMiLCJ1c2VyVm9pY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JywgWydmaXJlYmFzZScsXG4gICAgICAgICAgICAgICAnbmdEaWFsb2cnLFxuICAgICAgICAgICAgICAgJ2x2bC5kaXJlY3RpdmVzLmRyYWdkcm9wJyxcbiAgICAgICAgICAgICAgICduZ1Nhbml0aXplJyxcbiAgICAgICAgICAgICAgICduZ0FyaWEnXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ0F1dGgnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1haW5SZWYgPSBuZXcgRmlyZWJhc2UoJ2h0dHBzOi8vYmxpbmRpbmctdG9yY2gtNjY2Mi5maXJlYmFzZWlvLmNvbScpO1xuXG4gICAgZnVuY3Rpb24gbG9nVXNlcih1c2VyLCBjYWxsYmFjaykge1xuICAgICAgaWYobWFpblJlZi5nZXRBdXRoKCkgIT09IG51bGwpIHtcbiAgICAgICAgbWFpblJlZi51bmF1dGgoKTtcbiAgICAgICAgbWFpblJlZi5hdXRoV2l0aFBhc3N3b3JkKHtcbiAgICAgICAgICBlbWFpbCAgICA6IHVzZXIgKyAnQGZpcmVpZGVhei5jb20nLFxuICAgICAgICAgIHBhc3N3b3JkIDogdXNlclxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvciwgYXV0aERhdGEpIHtcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2cgdXNlciBmYWlsZWQ6ICcsIGVycm9yKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soYXV0aERhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlVXNlckFuZExvZyhuZXdVc2VyLCBjYWxsYmFjaykge1xuICAgICAgbWFpblJlZi5jcmVhdGVVc2VyKHtcbiAgICAgICAgZW1haWwgICAgOiBuZXdVc2VyICsgJ0BmaXJlaWRlYXouY29tJyxcbiAgICAgICAgcGFzc3dvcmQgOiBuZXdVc2VyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnQ3JlYXRlIHVzZXIgZmFpbGVkOiAnLCBlcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nVXNlcihuZXdVc2VyLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgY3JlYXRlVXNlckFuZExvZzogY3JlYXRlVXNlckFuZExvZyxcbiAgICAgIGxvZ1VzZXI6IGxvZ1VzZXJcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuLm1vZHVsZSgnZmlyZWlkZWF6Jylcbi5kaXJlY3RpdmUoJ2VudGVyQ2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0pIHtcbiAgICAgIGVsZW0uYmluZCgna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMyAmJiBldmVudC5zaGlmdEtleSkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgJChlbGVtWzBdKS5maW5kKCdidXR0b24nKS5mb2N1cygpO1xuICAgICAgICAgICQoZWxlbVswXSkuZmluZCgnYnV0dG9uJykuY2xpY2soKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ0ZpcmViYXNlU2VydmljZScsIFsnJGZpcmViYXNlQXJyYXknLCBmdW5jdGlvbiAoJGZpcmViYXNlQXJyYXkpIHtcbiAgICB2YXIgZmlyZWJhc2VVcmwgPSAnaHR0cHM6Ly9ibGluZGluZy10b3JjaC02NjYyLmZpcmViYXNlaW8uY29tJztcblxuICAgIGZ1bmN0aW9uIG5ld0ZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpIHtcbiAgICAgIHJldHVybiAkZmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VydmVyVGltZXN0YW1wKCkge1xuICAgICAgcmV0dXJuIEZpcmViYXNlLlNlcnZlclZhbHVlLlRJTUVTVEFNUDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlc1JlZih1c2VySWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL21lc3NhZ2VzLycgKyB1c2VySWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2VSZWYodXNlcklkLCBtZXNzYWdlSWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL21lc3NhZ2VzLycgKyB1c2VySWQgKyAnLycgKyBtZXNzYWdlSWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJvYXJkUmVmKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvYm9hcmRzLycgKyB1c2VySWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJvYXJkQ29sdW1ucyh1c2VySWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL2JvYXJkcy8nICsgdXNlcklkICsgJy9jb2x1bW5zJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5ld0ZpcmViYXNlQXJyYXk6IG5ld0ZpcmViYXNlQXJyYXksXG4gICAgICBnZXRTZXJ2ZXJUaW1lc3RhbXA6IGdldFNlcnZlclRpbWVzdGFtcCxcbiAgICAgIGdldE1lc3NhZ2VzUmVmOiBnZXRNZXNzYWdlc1JlZixcbiAgICAgIGdldE1lc3NhZ2VSZWY6IGdldE1lc3NhZ2VSZWYsXG4gICAgICBnZXRCb2FyZFJlZjogZ2V0Qm9hcmRSZWYsXG4gICAgICBnZXRCb2FyZENvbHVtbnM6IGdldEJvYXJkQ29sdW1uc1xuICAgIH07XG4gIH1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuY29udHJvbGxlcignTWFpbkN0cmwnLCBbJyRzY29wZScsICckZmlsdGVyJyxcbiAgICAgICAgICAgICAgJyR3aW5kb3cnLCAnVXRpbHMnLCAnQXV0aCcsICckcm9vdFNjb3BlJywgJ0ZpcmViYXNlU2VydmljZScsXG4gICAgZnVuY3Rpb24oJHNjb3BlLCAkZmlsdGVyLCAkd2luZG93LCB1dGlscywgYXV0aCwgJHJvb3RTY29wZSwgZmlyZWJhc2VTZXJ2aWNlKSB7XG4gICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAkc2NvcGUubWVzc2FnZVR5cGVzID0gdXRpbHMubWVzc2FnZVR5cGVzO1xuICAgICAgJHNjb3BlLnV0aWxzID0gdXRpbHM7XG4gICAgICAkc2NvcGUubmV3Qm9hcmQgPSB7IG5hbWU6ICcnIH07XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICRzY29wZS5zb3J0RmllbGQgPSAnJGlkJztcbiAgICAgICRzY29wZS5zZWxlY3RlZFR5cGUgPSAxO1xuXG4gICAgICBmdW5jdGlvbiBnZXRCb2FyZEFuZE1lc3NhZ2VzKHVzZXJEYXRhKSB7XG4gICAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpIHx8ICc0OTlzbSc7XG5cbiAgICAgICAgdmFyIG1lc3NhZ2VzUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VzUmVmKCRzY29wZS51c2VySWQpO1xuICAgICAgICB2YXIgYm9hcmQgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRSZWYoJHNjb3BlLnVzZXJJZCk7XG5cbiAgICAgICAgYm9hcmQub24oJ3ZhbHVlJywgZnVuY3Rpb24oYm9hcmQpIHtcbiAgICAgICAgICAkc2NvcGUuYm9hcmQgPSBib2FyZC52YWwoKTtcbiAgICAgICAgICAkc2NvcGUuYm9hcmRJZCA9ICRyb290U2NvcGUuYm9hcmRJZCA9IGJvYXJkLnZhbCgpLmJvYXJkSWQ7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkQ29udGV4dCA9ICRyb290U2NvcGUuYm9hcmRDb250ZXh0ID0gYm9hcmQudmFsKCkuYm9hcmRDb250ZXh0O1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuYm9hcmRSZWYgPSBib2FyZDtcbiAgICAgICAgJHNjb3BlLnVzZXJVaWQgPSB1c2VyRGF0YS51aWQ7XG4gICAgICAgICRzY29wZS5tZXNzYWdlcyA9IGZpcmViYXNlU2VydmljZS5uZXdGaXJlYmFzZUFycmF5KG1lc3NhZ2VzUmVmKTtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYoJHNjb3BlLnVzZXJJZCAhPT0gJycpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2VzUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VzUmVmKCRzY29wZS51c2VySWQpO1xuICAgICAgICBhdXRoLmxvZ1VzZXIoJHNjb3BlLnVzZXJJZCwgZ2V0Qm9hcmRBbmRNZXNzYWdlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuaXNDb2x1bW5TZWxlY3RlZCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KCRzY29wZS5zZWxlY3RlZFR5cGUpID09PSBwYXJzZUludCh0eXBlKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zZWVOb3RpZmljYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Z1bnJldHJvMScsIHRydWUpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNob3dOb3RpZmljYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICFsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZnVucmV0cm8xJykgJiYgJHNjb3BlLnVzZXJJZCAhPT0gJyc7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuYm9hcmROYW1lQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubmV3Qm9hcmQubmFtZSA9ICRzY29wZS5uZXdCb2FyZC5uYW1lLnJlcGxhY2UoL1xccysvZywnJyk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZ2V0U29ydE9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuc29ydEZpZWxkID09PSAndm90ZXMnID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnRvZ2dsZVZvdGUgPSBmdW5jdGlvbihrZXksIHZvdGVzKSB7XG4gICAgICAgIGlmKCFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpKSB7XG4gICAgICAgICAgbWVzc2FnZXNSZWYuY2hpbGQoa2V5KS51cGRhdGUoe1xuICAgICAgICAgICAgdm90ZXM6IHZvdGVzICsgMSxcbiAgICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCAxKTtcbiAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgIG1lc3NhZ2VzUmVmLmNoaWxkKGtleSkudXBkYXRlKHtcbiAgICAgICAgICAgICB2b3Rlczogdm90ZXMgLSAxLFxuICAgICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgICAgICB9KTtcblxuICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gcmVkaXJlY3RUb0JvYXJkKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gK1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArICcjJyArICRzY29wZS51c2VySWQ7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5jcmVhdGVOZXdCb2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgIHV0aWxzLmNsb3NlQWxsKCk7XG4gICAgICAgICRzY29wZS51c2VySWQgPSB1dGlscy5jcmVhdGVVc2VySWQoKTtcblxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbih1c2VyRGF0YSkge1xuICAgICAgICAgIHZhciBib2FyZCA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZFJlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgICBib2FyZC5zZXQoe1xuICAgICAgICAgICAgYm9hcmRJZDogJHNjb3BlLm5ld0JvYXJkLm5hbWUsXG4gICAgICAgICAgICBkYXRlX2NyZWF0ZWQ6IG5ldyBEYXRlKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbHVtbnM6ICRzY29wZS5tZXNzYWdlVHlwZXMsXG4gICAgICAgICAgICB1c2VyX2lkOiB1c2VyRGF0YS51aWRcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJlZGlyZWN0VG9Cb2FyZCgpO1xuXG4gICAgICAgICAgJHNjb3BlLm5ld0JvYXJkLm5hbWUgPSAnJztcbiAgICAgICAgfTtcblxuICAgICAgICBhdXRoLmNyZWF0ZVVzZXJBbmRMb2coJHNjb3BlLnVzZXJJZCwgY2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmNoYW5nZUJvYXJkQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuYm9hcmRSZWYudXBkYXRlKHtcbiAgICAgICAgICBib2FyZENvbnRleHQ6ICRzY29wZS5ib2FyZENvbnRleHRcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuYWRkTmV3Q29sdW1uID0gZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAkc2NvcGUuYm9hcmQuY29sdW1uc1t1dGlscy5nZXROZXh0SWQoJHNjb3BlLmJvYXJkKSAtIDFdID0ge1xuICAgICAgICAgIHZhbHVlOiBuYW1lLFxuICAgICAgICAgIGlkOiB1dGlscy5nZXROZXh0SWQoJHNjb3BlLmJvYXJkKVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG5cbiAgICAgICAgdXRpbHMuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5jaGFuZ2VDb2x1bW5OYW1lID0gZnVuY3Rpb24oaWQsIG5ld05hbWUpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkLmNvbHVtbnNbaWQgLSAxXSA9IHtcbiAgICAgICAgICB2YWx1ZTogbmV3TmFtZSxcbiAgICAgICAgICBpZDogaWRcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYm9hcmRDb2x1bW5zID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkQ29sdW1ucygkc2NvcGUudXNlcklkKTtcbiAgICAgICAgYm9hcmRDb2x1bW5zLnNldCh1dGlscy50b09iamVjdCgkc2NvcGUuYm9hcmQuY29sdW1ucykpO1xuXG4gICAgICAgIHV0aWxzLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlTGFzdENvbHVtbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zLnBvcCgpO1xuICAgICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcbiAgICAgICAgICB1dGlscy5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZU1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICBcdFx0JHNjb3BlLm1lc3NhZ2VzLiRyZW1vdmUobWVzc2FnZSk7XG4gICAgICAgICAgdXRpbHMuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGFkZE1lc3NhZ2VDYWxsYmFjayhtZXNzYWdlKSB7XG4gICAgICAgIHZhciBpZCA9IG1lc3NhZ2Uua2V5KCk7XG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkKCcjJyArIGlkKSkuc2NvcGUoKS5pc0VkaXRpbmcgPSB0cnVlO1xuICAgICAgICAkKCcjJyArIGlkKS5maW5kKCd0ZXh0YXJlYScpLmZvY3VzKCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hZGROZXdNZXNzYWdlID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMuJGFkZCh7XG4gICAgICAgICAgdGV4dDogJycsXG4gICAgICAgICAgdXNlcl9pZDogJHNjb3BlLnVzZXJVaWQsXG4gICAgICAgICAgdHlwZTogeyBpZDogdHlwZS5pZCB9LFxuICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKSxcbiAgICAgICAgICB2b3RlczogMFxuICAgICAgICB9KS50aGVuKGFkZE1lc3NhZ2VDYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlQ2FyZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgkc2NvcGUubWVzc2FnZXMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAkc2NvcGUubWVzc2FnZXMuJHJlbW92ZShtZXNzYWdlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdXRpbHMuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5nZXRCb2FyZFRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoJHNjb3BlLmJvYXJkKSB7XG4gICAgICAgICAgdmFyIGNsaXBib2FyZCA9ICcnO1xuXG4gICAgICAgICAgJCgkc2NvcGUuYm9hcmQuY29sdW1ucykuZWFjaChmdW5jdGlvbihpbmRleCwgY29sdW1uKSB7XG4gICAgICAgICAgICBpZihpbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJzxzdHJvbmc+JyArIGNvbHVtbi52YWx1ZSArICc8L3N0cm9uZz48YnIgLz4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2xpcGJvYXJkICs9ICc8YnIgLz48c3Ryb25nPicgKyBjb2x1bW4udmFsdWUgKyAnPC9zdHJvbmc+PGJyIC8+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmaWx0ZXJlZEFycmF5ID0gJGZpbHRlcignb3JkZXJCeScpKCRzY29wZS5tZXNzYWdlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zb3J0RmllbGQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0U29ydE9yZGVyKCkpO1xuXG4gICAgICAgICAgICAkKGZpbHRlcmVkQXJyYXkpLmVhY2goZnVuY3Rpb24oaW5kZXgyLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgIGlmKG1lc3NhZ2UudHlwZS5pZCA9PT0gY29sdW1uLmlkKSB7XG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkICs9ICctICcgKyBtZXNzYWdlLnRleHQgKyAnICgnICsgbWVzc2FnZS52b3RlcyArICcgdm90ZXMpIDxiciAvPic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuIGNsaXBib2FyZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsc2UgcmV0dXJuICcnO1xuICAgICAgfTtcblxuICAgICAgYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLmJpbmQoJ2hhc2hjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkgfHwgJyc7XG4gICAgICAgIGF1dGgubG9nVXNlcigkc2NvcGUudXNlcklkLCBnZXRCb2FyZEFuZE1lc3NhZ2VzKTtcbiAgICAgIH0pO1xuICAgIH1dXG4gICk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLmNvbnRyb2xsZXIoJ01lc3NhZ2VDdHJsJywgWyckc2NvcGUnLCAnJGZpbHRlcicsXG4gICAgICAgICAgICAgICckd2luZG93JywgJ1V0aWxzJywgJ0F1dGgnLCAnJHJvb3RTY29wZScsICdGaXJlYmFzZVNlcnZpY2UnLFxuICAgIGZ1bmN0aW9uKCRzY29wZSwgJGZpbHRlciwgJHdpbmRvdywgdXRpbHMsIGF1dGgsICRyb290U2NvcGUsIGZpcmViYXNlU2VydmljZSkge1xuICAgICAgJHNjb3BlLnV0aWxzID0gdXRpbHM7XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKTtcblxuICAgICAgJHNjb3BlLmRyb3BwZWRFdmVudCA9IGZ1bmN0aW9uKGRyYWdFbCwgZHJvcEVsKSB7XG4gICAgICAgIGlmKGRyYWdFbCAhPT0gZHJvcEVsKSB7XG4gICAgICAgICAgJHNjb3BlLmRyYWdFbCA9IGRyYWdFbDtcbiAgICAgICAgICAkc2NvcGUuZHJvcEVsID0gZHJvcEVsO1xuXG4gICAgICAgICAgdXRpbHMub3BlbkRpYWxvZ01lcmdlQ2FyZHMoJHNjb3BlKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRyb3BwZWQgPSBmdW5jdGlvbihkcmFnRWwsIGRyb3BFbCkge1xuICAgICAgICB2YXIgZHJhZyA9ICQoJyMnICsgZHJhZ0VsKTtcbiAgICAgICAgdmFyIGRyb3AgPSAkKCcjJyArIGRyb3BFbCk7XG5cbiAgICAgICAgdmFyIGRyb3BNZXNzYWdlUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VSZWYoJHNjb3BlLnVzZXJJZCwgZHJvcC5hdHRyKCdtZXNzYWdlSWQnKSk7XG4gICAgICAgIHZhciBkcmFnTWVzc2FnZVJlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlUmVmKCRzY29wZS51c2VySWQsIGRyYWcuYXR0cignbWVzc2FnZUlkJykpO1xuXG4gICAgICAgIGRyb3BNZXNzYWdlUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZHJvcE1lc3NhZ2UpIHtcbiAgICAgICAgICBkcmFnTWVzc2FnZVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRyYWdNZXNzYWdlKSB7XG4gICAgICAgICAgICBkcm9wTWVzc2FnZVJlZi51cGRhdGUoe1xuICAgICAgICAgICAgICB0ZXh0OiBkcm9wTWVzc2FnZS52YWwoKS50ZXh0ICsgJyB8ICcgKyBkcmFnTWVzc2FnZS52YWwoKS50ZXh0LFxuICAgICAgICAgICAgICB2b3RlczogZHJvcE1lc3NhZ2UudmFsKCkudm90ZXMgKyBkcmFnTWVzc2FnZS52YWwoKS52b3Rlc1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGRyYWdNZXNzYWdlUmVmLnJlbW92ZSgpO1xuICAgICAgICAgICAgdXRpbHMuY2xvc2VBbGwoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH1dXG4gICk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ1V0aWxzJywgWyduZ0RpYWxvZycsIGZ1bmN0aW9uIChuZ0RpYWxvZykge1xuICAgIGZ1bmN0aW9uIGNyZWF0ZVVzZXJJZCgpIHtcbiAgICAgIHZhciB0ZXh0ID0gJyc7XG4gICAgICB2YXIgcG9zc2libGUgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5JztcblxuICAgICAgZm9yKCB2YXIgaT0wOyBpIDwgNTsgaSsrICkge1xuICAgICAgICB0ZXh0ICs9IHBvc3NpYmxlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwb3NzaWJsZS5sZW5ndGgpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxyZWFkeVZvdGVkKGtleSkge1xuICAgICAgcmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9jdXNFbGVtZW50KGlkKSB7XG4gICAgICAkKCcjJyArIGlkKS5maW5kKCd0ZXh0YXJlYScpLmZvY3VzKCk7XG4gICAgfVxuXG4gICAgdmFyIG1lc3NhZ2VUeXBlcyA9IFt7XG4gICAgICBpZDogMSxcbiAgICAgIHZhbHVlOiAnV2VudCB3ZWxsJ1xuICAgIH0sIHtcbiAgICAgIGlkOiAyLFxuICAgICAgdmFsdWU6ICdUbyBpbXByb3ZlJ1xuICAgIH0sIHtcbiAgICAgIGlkOiAzLFxuICAgICAgdmFsdWU6ICdBY3Rpb24gaXRlbXMnXG4gICAgfV07XG5cbiAgICBmdW5jdGlvbiBzaG93UmVtb3ZlQ29sdW1uKGlkLCBjb2x1bW5zKSB7XG4gICAgICByZXR1cm4gY29sdW1ucy5sZW5ndGggPT09IGlkICYmIGNvbHVtbnMubGVuZ3RoID4gMyA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXh0SWQoYm9hcmQpIHtcbiAgICAgIHJldHVybiBib2FyZC5jb2x1bW5zW2JvYXJkLmNvbHVtbnMubGVuZ3RoIC0xXS5pZCArIDE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3BlbkRpYWxvZ0NvbHVtbihzY29wZSkge1xuICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgIHRlbXBsYXRlOiAnYWRkTmV3Q29sdW1uJyxcbiAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW5EaWFsb2dCb2FyZChzY29wZSkge1xuICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgIHRlbXBsYXRlOiAnYWRkTmV3Qm9hcmQnLFxuICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3BlbkRpYWxvZ0RlbGV0ZUNhcmQoc2NvcGUpIHtcbiAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNhcmQnLFxuICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3BlbkRpYWxvZ0RlbGV0ZUNvbHVtbihzY29wZSkge1xuICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ29sdW1uJyxcbiAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW5EaWFsb2dNZXJnZUNhcmRzKHNjb3BlKSB7XG4gICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGU6ICdtZXJnZUNhcmRzJyxcbiAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW5EaWFsb2dDb3B5Qm9hcmQoc2NvcGUpIHtcbiAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZTogJ2NvcHlCb2FyZCcsXG4gICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluIGJpZ0RpYWxvZycsXG4gICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb3BlbkRpYWxvZ0RlbGV0ZUNhcmRzKHNjb3BlKSB7XG4gICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDYXJkcycsXG4gICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluIGRhbmdlcicsXG4gICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xvc2VBbGwoKSB7XG4gICAgICBuZ0RpYWxvZy5jbG9zZUFsbCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvT2JqZWN0KGFycmF5KSB7XG4gICAgICB2YXIgb2JqZWN0ID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb2JqZWN0W2ldID0ge1xuICAgICAgICAgIGlkOiBhcnJheVtpXS5pZCxcbiAgICAgICAgICB2YWx1ZTogYXJyYXlbaV0udmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY3JlYXRlVXNlcklkOiBjcmVhdGVVc2VySWQsXG4gICAgICBhbHJlYWR5Vm90ZWQ6IGFscmVhZHlWb3RlZCxcbiAgICAgIGZvY3VzRWxlbWVudDogZm9jdXNFbGVtZW50LFxuICAgICAgbWVzc2FnZVR5cGVzOiBtZXNzYWdlVHlwZXMsXG4gICAgICBzaG93UmVtb3ZlQ29sdW1uOiBzaG93UmVtb3ZlQ29sdW1uLFxuICAgICAgZ2V0TmV4dElkOiBnZXROZXh0SWQsXG4gICAgICBvcGVuRGlhbG9nQ29sdW1uOiBvcGVuRGlhbG9nQ29sdW1uLFxuICAgICAgb3BlbkRpYWxvZ0JvYXJkOiBvcGVuRGlhbG9nQm9hcmQsXG4gICAgICBvcGVuRGlhbG9nRGVsZXRlQ2FyZDogb3BlbkRpYWxvZ0RlbGV0ZUNhcmQsXG4gICAgICBvcGVuRGlhbG9nRGVsZXRlQ29sdW1uOiBvcGVuRGlhbG9nRGVsZXRlQ29sdW1uLFxuICAgICAgb3BlbkRpYWxvZ01lcmdlQ2FyZHM6IG9wZW5EaWFsb2dNZXJnZUNhcmRzLFxuICAgICAgb3BlbkRpYWxvZ0NvcHlCb2FyZDogb3BlbkRpYWxvZ0NvcHlCb2FyZCxcbiAgICAgIG9wZW5EaWFsb2dEZWxldGVDYXJkczogb3BlbkRpYWxvZ0RlbGV0ZUNhcmRzLFxuICAgICAgY2xvc2VBbGw6IGNsb3NlQWxsLFxuICAgICAgdG9PYmplY3Q6IHRvT2JqZWN0XG4gICAgfTtcbiAgfV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdhbmFseXRpY3MnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2FuYWx5dGljcy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXIgOiAnTWFpbkN0cmwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2JvYXJkQ29udGV4dCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvYm9hcmRDb250ZXh0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnZGlhbG9ncycsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvZGlhbG9ncy5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXIgOiAnTWFpbkN0cmwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3BhZ2VGb290ZXInLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2Zvb3Rlci5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXIgOiAnTWFpbkN0cmwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3BhZ2VIZWFkZXInLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvaGVhZGVyLmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnbWFpbkNvbnRlbnQnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWFpbkNvbnRlbnQuaHRtbCcsXG4gICAgICBjb250cm9sbGVyIDogJ01haW5DdHJsJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluUGFnZScsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWFpblBhZ2UuaHRtbCcsXG4gICAgICBjb250cm9sbGVyIDogJ01haW5DdHJsJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtZW51JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21lbnUuaHRtbCcsXG4gICAgICBjb250cm9sbGVyIDogJ01haW5DdHJsJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCduZXdGZWF0dXJlTm90aWZpY2F0aW9uJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9uZXdGZWF0dXJlTm90aWZpY2F0aW9uLmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnc3Bpbm5lcicsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvc3Bpbm5lci5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXIgOiAnTWFpbkN0cmwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3VzZXJWb2ljZScsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvdXNlclZvaWNlLmh0bWwnLFxuICAgICAgY29udHJvbGxlciA6ICdNYWluQ3RybCdcbiAgICB9O1xuICB9XVxuKTtcbiJdfQ==
