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
    '$window', 'Utils', 'Auth', '$rootScope', 'FirebaseService', 'ModalService',
    function($scope, $filter, $window, utils, auth, $rootScope, firebaseService, modalService) {
      $scope.loading = true;
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = {
        name: ''
      };
      $scope.userId = $window.location.hash.substring(1) || '';
      $scope.sortField = '$id';
      $scope.selectedType = 1;

      $scope.closeAllModals = function(){
        modalService.closeAll();
      };

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

      if ($scope.userId !== '') {
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

      $scope.getSortOrder = function() {
        return $scope.sortField === 'votes' ? true : false;
      };

      $scope.toggleVote = function(key, votes) {
        if (!localStorage.getItem(key)) {
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
        modalService.closeAll();
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

        modalService.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        $scope.board.columns[id - 1] = {
          value: newName,
          id: id
        };

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.deleteLastColumn = function() {
        $scope.board.columns.pop();
        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));
        modalService.closeAll();
      };

      $scope.deleteMessage = function(message) {
        $scope.messages.$remove(message);
        modalService.closeAll();
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
          type: {
            id: type.id
          },
          date: firebaseService.getServerTimestamp(),
          votes: 0
        }).then(addMessageCallback);
      };

      $scope.deleteCards = function() {
        $($scope.messages).each(function(index, message) {
          $scope.messages.$remove(message);
        });

        modalService.closeAll();
      };

      $scope.getBoardText = function() {
        if ($scope.board) {
          var clipboard = '';

          $($scope.board.columns).each(function(index, column) {
            if (index === 0) {
              clipboard += '<strong>' + column.value + '</strong><br />';
            } else {
              clipboard += '<br /><strong>' + column.value + '</strong><br />';
            }
            var filteredArray = $filter('orderBy')($scope.messages,
              $scope.sortField,
              $scope.getSortOrder());

            $(filteredArray).each(function(index2, message) {
              if (message.type.id === column.id) {
                clipboard += '- ' + message.text + ' (' + message.votes + ' votes) <br />';
              }
            });
          });

          return clipboard;
        } else return '';
      };

      angular.element($window).bind('hashchange', function() {
        $scope.loading = true;
        $scope.userId = $window.location.hash.substring(1) || '';
        auth.logUser($scope.userId, getBoardAndMessages);
      });
    }
  ]);

'use strict';

angular
  .module('fireideaz')
  .controller('MessageCtrl', ['$scope', '$filter',
              '$window', 'Auth', '$rootScope', 'FirebaseService', 'ModalService',
    function($scope, $filter, $window, auth, $rootScope, firebaseService, modalService) {
      $scope.modalService = modalService;
      $scope.userId = $window.location.hash.substring(1);

      $scope.droppedEvent = function(dragEl, dropEl) {
        if(dragEl !== dropEl) {
          $scope.dragEl = dragEl;
          $scope.dropEl = dropEl;

          modalService.openMergeCards($scope);
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
            modalService.closeAll();
          });
        });
      };
    }]
  );

'use strict';

angular
  .module('fireideaz')
  .service('Utils', [function () {
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
      toObject: toObject
    };
  }]);

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

angular.module('fireideaz').directive('pageHeader', ['ModalService', function(modalService) {
    return {
      templateUrl : 'components/header.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
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

angular.module('fireideaz').directive('mainPage', ['ModalService', function(modalService) {
    return {
      restrict: 'E',
      templateUrl : 'components/mainPage.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
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

'use strict';

angular
  .module('fireideaz')
  .service('ModalService', ['ngDialog', function(ngDialog) {
    return {
      openAddNewColumn: function(scope) {
        ngDialog.open({
          template: 'addNewColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openAddNewBoard: function(scope) {
        ngDialog.open({
          template: 'addNewBoard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteCard: function(scope) {
        ngDialog.open({
          template: 'deleteCard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteColumn: function(scope) {
        ngDialog.open({
          template: 'deleteColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },

      openMergeCards: function(scope) {
        ngDialog.open({
          template: 'mergeCards',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openCopyBoard: function(scope) {
        ngDialog.open({
          template: 'copyBoard',
          className: 'ngdialog-theme-plain bigDialog',
          scope: scope
        });
      },
      openDeleteCards: function(scope) {
        ngDialog.open({
          template: 'deleteCards',
          className: 'ngdialog-theme-plain danger',
          scope: scope
        });
      },
      closeAll: function() {
        ngDialog.closeAll();
      }
    };
  }]);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwiZGlyZWN0aXZlcy9ib2FyZENvbnRleHQuanMiLCJkaXJlY3RpdmVzL2RpYWxvZ3MuanMiLCJkaXJlY3RpdmVzL2Zvb3Rlci5qcyIsImRpcmVjdGl2ZXMvaGVhZGVyLmpzIiwiZGlyZWN0aXZlcy9tYWluQ29udGVudC5qcyIsImRpcmVjdGl2ZXMvbWFpblBhZ2UuanMiLCJkaXJlY3RpdmVzL21lbnUuanMiLCJkaXJlY3RpdmVzL25ld0ZlYXR1cmVOb3RpZmljYXRpb24uanMiLCJkaXJlY3RpdmVzL3NwaW5uZXIuanMiLCJkaXJlY3RpdmVzL3VzZXJWb2ljZS5qcyIsInNlcnZpY2VzL21vZGFsU2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonLCBbJ2ZpcmViYXNlJyxcbiAgICAgICAgICAgICAgICduZ0RpYWxvZycsXG4gICAgICAgICAgICAgICAnbHZsLmRpcmVjdGl2ZXMuZHJhZ2Ryb3AnLFxuICAgICAgICAgICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgICAgICAgICAgJ25nQXJpYSddKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnQXV0aCcsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWFpblJlZiA9IG5ldyBGaXJlYmFzZSgnaHR0cHM6Ly9ibGluZGluZy10b3JjaC02NjYyLmZpcmViYXNlaW8uY29tJyk7XG5cbiAgICBmdW5jdGlvbiBsb2dVc2VyKHVzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLnVuYXV0aCgpO1xuICAgICAgbWFpblJlZi5hdXRoV2l0aFBhc3N3b3JkKHtcbiAgICAgICAgZW1haWwgICAgOiB1c2VyICsgJ0BmaXJlaWRlYXouY29tJyxcbiAgICAgICAgcGFzc3dvcmQgOiB1c2VyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvciwgYXV0aERhdGEpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0xvZyB1c2VyIGZhaWxlZDogJywgZXJyb3IpO1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgICAgbG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soYXV0aERhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyQW5kTG9nKG5ld1VzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLmNyZWF0ZVVzZXIoe1xuICAgICAgICBlbWFpbCAgICA6IG5ld1VzZXIgKyAnQGZpcmVpZGVhei5jb20nLFxuICAgICAgICBwYXNzd29yZCA6IG5ld1VzZXJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGUgdXNlciBmYWlsZWQ6ICcsIGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dVc2VyKG5ld1VzZXIsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VyQW5kTG9nOiBjcmVhdGVVc2VyQW5kTG9nLFxuICAgICAgbG9nVXNlcjogbG9nVXNlclxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4ubW9kdWxlKCdmaXJlaWRlYXonKVxuLmRpcmVjdGl2ZSgnZW50ZXJDbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSkge1xuICAgICAgZWxlbS5iaW5kKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAkKGVsZW1bMF0pLmZpbmQoJ2J1dHRvbicpLmZvY3VzKCk7XG4gICAgICAgICAgJChlbGVtWzBdKS5maW5kKCdidXR0b24nKS5jbGljaygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnRmlyZWJhc2VTZXJ2aWNlJywgWyckZmlyZWJhc2VBcnJheScsIGZ1bmN0aW9uICgkZmlyZWJhc2VBcnJheSkge1xuICAgIHZhciBmaXJlYmFzZVVybCA9ICdodHRwczovL2JsaW5kaW5nLXRvcmNoLTY2NjIuZmlyZWJhc2Vpby5jb20nO1xuXG4gICAgZnVuY3Rpb24gbmV3RmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZikge1xuICAgICAgcmV0dXJuICRmaXJlYmFzZUFycmF5KG1lc3NhZ2VzUmVmKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZXJ2ZXJUaW1lc3RhbXAoKSB7XG4gICAgICByZXR1cm4gRmlyZWJhc2UuU2VydmVyVmFsdWUuVElNRVNUQU1QO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2VzUmVmKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZVJlZih1c2VySWQsIG1lc3NhZ2VJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCArICcvJyArIG1lc3NhZ2VJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRSZWYodXNlcklkKSB7XG4gICAgICByZXR1cm4gbmV3IEZpcmViYXNlKGZpcmViYXNlVXJsICsgJy9ib2FyZHMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRDb2x1bW5zKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvYm9hcmRzLycgKyB1c2VySWQgKyAnL2NvbHVtbnMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmV3RmlyZWJhc2VBcnJheTogbmV3RmlyZWJhc2VBcnJheSxcbiAgICAgIGdldFNlcnZlclRpbWVzdGFtcDogZ2V0U2VydmVyVGltZXN0YW1wLFxuICAgICAgZ2V0TWVzc2FnZXNSZWY6IGdldE1lc3NhZ2VzUmVmLFxuICAgICAgZ2V0TWVzc2FnZVJlZjogZ2V0TWVzc2FnZVJlZixcbiAgICAgIGdldEJvYXJkUmVmOiBnZXRCb2FyZFJlZixcbiAgICAgIGdldEJvYXJkQ29sdW1uczogZ2V0Qm9hcmRDb2x1bW5zXG4gICAgfTtcbiAgfV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5jb250cm9sbGVyKCdNYWluQ3RybCcsIFsnJHNjb3BlJywgJyRmaWx0ZXInLFxuICAgICckd2luZG93JywgJ1V0aWxzJywgJ0F1dGgnLCAnJHJvb3RTY29wZScsICdGaXJlYmFzZVNlcnZpY2UnLCAnTW9kYWxTZXJ2aWNlJyxcbiAgICBmdW5jdGlvbigkc2NvcGUsICRmaWx0ZXIsICR3aW5kb3csIHV0aWxzLCBhdXRoLCAkcm9vdFNjb3BlLCBmaXJlYmFzZVNlcnZpY2UsIG1vZGFsU2VydmljZSkge1xuICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgJHNjb3BlLm1lc3NhZ2VUeXBlcyA9IHV0aWxzLm1lc3NhZ2VUeXBlcztcbiAgICAgICRzY29wZS51dGlscyA9IHV0aWxzO1xuICAgICAgJHNjb3BlLm5ld0JvYXJkID0ge1xuICAgICAgICBuYW1lOiAnJ1xuICAgICAgfTtcbiAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpIHx8ICcnO1xuICAgICAgJHNjb3BlLnNvcnRGaWVsZCA9ICckaWQnO1xuICAgICAgJHNjb3BlLnNlbGVjdGVkVHlwZSA9IDE7XG5cbiAgICAgICRzY29wZS5jbG9zZUFsbE1vZGFscyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gZ2V0Qm9hcmRBbmRNZXNzYWdlcyh1c2VyRGF0YSkge1xuICAgICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnNDk5c20nO1xuXG4gICAgICAgIHZhciBtZXNzYWdlc1JlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlc1JlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgdmFyIGJvYXJkID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkUmVmKCRzY29wZS51c2VySWQpO1xuXG4gICAgICAgIGJvYXJkLm9uKCd2YWx1ZScsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQudmFsKCk7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkSWQgPSAkcm9vdFNjb3BlLmJvYXJkSWQgPSBib2FyZC52YWwoKS5ib2FyZElkO1xuICAgICAgICAgICRzY29wZS5ib2FyZENvbnRleHQgPSAkcm9vdFNjb3BlLmJvYXJkQ29udGV4dCA9IGJvYXJkLnZhbCgpLmJvYXJkQ29udGV4dDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmJvYXJkUmVmID0gYm9hcmQ7XG4gICAgICAgICRzY29wZS51c2VyVWlkID0gdXNlckRhdGEudWlkO1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMgPSBmaXJlYmFzZVNlcnZpY2UubmV3RmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZik7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICgkc2NvcGUudXNlcklkICE9PSAnJykge1xuICAgICAgICB2YXIgbWVzc2FnZXNSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZXNSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGF1dGgubG9nVXNlcigkc2NvcGUudXNlcklkLCBnZXRCb2FyZEFuZE1lc3NhZ2VzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5pc0NvbHVtblNlbGVjdGVkID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQoJHNjb3BlLnNlbGVjdGVkVHlwZSkgPT09IHBhcnNlSW50KHR5cGUpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNlZU5vdGlmaWNhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZnVucmV0cm8xJywgdHJ1ZSk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuc2hvd05vdGlmaWNhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIWxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmdW5yZXRybzEnKSAmJiAkc2NvcGUudXNlcklkICE9PSAnJztcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5nZXRTb3J0T3JkZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICRzY29wZS5zb3J0RmllbGQgPT09ICd2b3RlcycgPyB0cnVlIDogZmFsc2U7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUudG9nZ2xlVm90ZSA9IGZ1bmN0aW9uKGtleSwgdm90ZXMpIHtcbiAgICAgICAgaWYgKCFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpKSB7XG4gICAgICAgICAgbWVzc2FnZXNSZWYuY2hpbGQoa2V5KS51cGRhdGUoe1xuICAgICAgICAgICAgdm90ZXM6IHZvdGVzICsgMSxcbiAgICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZXNzYWdlc1JlZi5jaGlsZChrZXkpLnVwZGF0ZSh7XG4gICAgICAgICAgICB2b3Rlczogdm90ZXMgLSAxLFxuICAgICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiByZWRpcmVjdFRvQm9hcmQoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbiArXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgJyMnICsgJHNjb3BlLnVzZXJJZDtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNyZWF0ZU5ld0JvYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICAgICRzY29wZS51c2VySWQgPSB1dGlscy5jcmVhdGVVc2VySWQoKTtcblxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbih1c2VyRGF0YSkge1xuICAgICAgICAgIHZhciBib2FyZCA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZFJlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgICBib2FyZC5zZXQoe1xuICAgICAgICAgICAgYm9hcmRJZDogJHNjb3BlLm5ld0JvYXJkLm5hbWUsXG4gICAgICAgICAgICBkYXRlX2NyZWF0ZWQ6IG5ldyBEYXRlKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbHVtbnM6ICRzY29wZS5tZXNzYWdlVHlwZXMsXG4gICAgICAgICAgICB1c2VyX2lkOiB1c2VyRGF0YS51aWRcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJlZGlyZWN0VG9Cb2FyZCgpO1xuXG4gICAgICAgICAgJHNjb3BlLm5ld0JvYXJkLm5hbWUgPSAnJztcbiAgICAgICAgfTtcblxuICAgICAgICBhdXRoLmNyZWF0ZVVzZXJBbmRMb2coJHNjb3BlLnVzZXJJZCwgY2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmNoYW5nZUJvYXJkQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUuYm9hcmRSZWYudXBkYXRlKHtcbiAgICAgICAgICBib2FyZENvbnRleHQ6ICRzY29wZS5ib2FyZENvbnRleHRcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuYWRkTmV3Q29sdW1uID0gZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAkc2NvcGUuYm9hcmQuY29sdW1uc1t1dGlscy5nZXROZXh0SWQoJHNjb3BlLmJvYXJkKSAtIDFdID0ge1xuICAgICAgICAgIHZhbHVlOiBuYW1lLFxuICAgICAgICAgIGlkOiB1dGlscy5nZXROZXh0SWQoJHNjb3BlLmJvYXJkKVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG5cbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2hhbmdlQ29sdW1uTmFtZSA9IGZ1bmN0aW9uKGlkLCBuZXdOYW1lKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zW2lkIC0gMV0gPSB7XG4gICAgICAgICAgdmFsdWU6IG5ld05hbWUsXG4gICAgICAgICAgaWQ6IGlkXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcblxuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVMYXN0Q29sdW1uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zLnBvcCgpO1xuICAgICAgICB2YXIgYm9hcmRDb2x1bW5zID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkQ29sdW1ucygkc2NvcGUudXNlcklkKTtcbiAgICAgICAgYm9hcmRDb2x1bW5zLnNldCh1dGlscy50b09iamVjdCgkc2NvcGUuYm9hcmQuY29sdW1ucykpO1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMuJHJlbW92ZShtZXNzYWdlKTtcbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBhZGRNZXNzYWdlQ2FsbGJhY2sobWVzc2FnZSkge1xuICAgICAgICB2YXIgaWQgPSBtZXNzYWdlLmtleSgpO1xuICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJCgnIycgKyBpZCkpLnNjb3BlKCkuaXNFZGl0aW5nID0gdHJ1ZTtcbiAgICAgICAgJCgnIycgKyBpZCkuZmluZCgndGV4dGFyZWEnKS5mb2N1cygpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuYWRkTmV3TWVzc2FnZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLiRhZGQoe1xuICAgICAgICAgIHRleHQ6ICcnLFxuICAgICAgICAgIHVzZXJfaWQ6ICRzY29wZS51c2VyVWlkLFxuICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgIGlkOiB0eXBlLmlkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkYXRlOiBmaXJlYmFzZVNlcnZpY2UuZ2V0U2VydmVyVGltZXN0YW1wKCksXG4gICAgICAgICAgdm90ZXM6IDBcbiAgICAgICAgfSkudGhlbihhZGRNZXNzYWdlQ2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZUNhcmRzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJHNjb3BlLm1lc3NhZ2VzKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBtZXNzYWdlKSB7XG4gICAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLiRyZW1vdmUobWVzc2FnZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmdldEJvYXJkVGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoJHNjb3BlLmJvYXJkKSB7XG4gICAgICAgICAgdmFyIGNsaXBib2FyZCA9ICcnO1xuXG4gICAgICAgICAgJCgkc2NvcGUuYm9hcmQuY29sdW1ucykuZWFjaChmdW5jdGlvbihpbmRleCwgY29sdW1uKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgICAgY2xpcGJvYXJkICs9ICc8c3Ryb25nPicgKyBjb2x1bW4udmFsdWUgKyAnPC9zdHJvbmc+PGJyIC8+JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnPGJyIC8+PHN0cm9uZz4nICsgY29sdW1uLnZhbHVlICsgJzwvc3Ryb25nPjxiciAvPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZmlsdGVyZWRBcnJheSA9ICRmaWx0ZXIoJ29yZGVyQnknKSgkc2NvcGUubWVzc2FnZXMsXG4gICAgICAgICAgICAgICRzY29wZS5zb3J0RmllbGQsXG4gICAgICAgICAgICAgICRzY29wZS5nZXRTb3J0T3JkZXIoKSk7XG5cbiAgICAgICAgICAgICQoZmlsdGVyZWRBcnJheSkuZWFjaChmdW5jdGlvbihpbmRleDIsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UudHlwZS5pZCA9PT0gY29sdW1uLmlkKSB7XG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkICs9ICctICcgKyBtZXNzYWdlLnRleHQgKyAnICgnICsgbWVzc2FnZS52b3RlcyArICcgdm90ZXMpIDxiciAvPic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuIGNsaXBib2FyZDtcbiAgICAgICAgfSBlbHNlIHJldHVybiAnJztcbiAgICAgIH07XG5cbiAgICAgIGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KS5iaW5kKCdoYXNoY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkgfHwgJyc7XG4gICAgICAgIGF1dGgubG9nVXNlcigkc2NvcGUudXNlcklkLCBnZXRCb2FyZEFuZE1lc3NhZ2VzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLmNvbnRyb2xsZXIoJ01lc3NhZ2VDdHJsJywgWyckc2NvcGUnLCAnJGZpbHRlcicsXG4gICAgICAgICAgICAgICckd2luZG93JywgJ0F1dGgnLCAnJHJvb3RTY29wZScsICdGaXJlYmFzZVNlcnZpY2UnLCAnTW9kYWxTZXJ2aWNlJyxcbiAgICBmdW5jdGlvbigkc2NvcGUsICRmaWx0ZXIsICR3aW5kb3csIGF1dGgsICRyb290U2NvcGUsIGZpcmViYXNlU2VydmljZSwgbW9kYWxTZXJ2aWNlKSB7XG4gICAgICAkc2NvcGUubW9kYWxTZXJ2aWNlID0gbW9kYWxTZXJ2aWNlO1xuICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSk7XG5cbiAgICAgICRzY29wZS5kcm9wcGVkRXZlbnQgPSBmdW5jdGlvbihkcmFnRWwsIGRyb3BFbCkge1xuICAgICAgICBpZihkcmFnRWwgIT09IGRyb3BFbCkge1xuICAgICAgICAgICRzY29wZS5kcmFnRWwgPSBkcmFnRWw7XG4gICAgICAgICAgJHNjb3BlLmRyb3BFbCA9IGRyb3BFbDtcblxuICAgICAgICAgIG1vZGFsU2VydmljZS5vcGVuTWVyZ2VDYXJkcygkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZHJvcHBlZCA9IGZ1bmN0aW9uKGRyYWdFbCwgZHJvcEVsKSB7XG4gICAgICAgIHZhciBkcmFnID0gJCgnIycgKyBkcmFnRWwpO1xuICAgICAgICB2YXIgZHJvcCA9ICQoJyMnICsgZHJvcEVsKTtcblxuICAgICAgICB2YXIgZHJvcE1lc3NhZ2VSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZVJlZigkc2NvcGUudXNlcklkLCBkcm9wLmF0dHIoJ21lc3NhZ2VJZCcpKTtcbiAgICAgICAgdmFyIGRyYWdNZXNzYWdlUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VSZWYoJHNjb3BlLnVzZXJJZCwgZHJhZy5hdHRyKCdtZXNzYWdlSWQnKSk7XG5cbiAgICAgICAgZHJvcE1lc3NhZ2VSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkcm9wTWVzc2FnZSkge1xuICAgICAgICAgIGRyYWdNZXNzYWdlUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZHJhZ01lc3NhZ2UpIHtcbiAgICAgICAgICAgIGRyb3BNZXNzYWdlUmVmLnVwZGF0ZSh7XG4gICAgICAgICAgICAgIHRleHQ6IGRyb3BNZXNzYWdlLnZhbCgpLnRleHQgKyAnIHwgJyArIGRyYWdNZXNzYWdlLnZhbCgpLnRleHQsXG4gICAgICAgICAgICAgIHZvdGVzOiBkcm9wTWVzc2FnZS52YWwoKS52b3RlcyArIGRyYWdNZXNzYWdlLnZhbCgpLnZvdGVzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZHJhZ01lc3NhZ2VSZWYucmVtb3ZlKCk7XG4gICAgICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH1dXG4gICk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ1V0aWxzJywgW2Z1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VySWQoKSB7XG4gICAgICB2YXIgdGV4dCA9ICcnO1xuICAgICAgdmFyIHBvc3NpYmxlID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSc7XG5cbiAgICAgIGZvciggdmFyIGk9MDsgaSA8IDU7IGkrKyApIHtcbiAgICAgICAgdGV4dCArPSBwb3NzaWJsZS5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcG9zc2libGUubGVuZ3RoKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0ZXh0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFscmVhZHlWb3RlZChrZXkpIHtcbiAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvY3VzRWxlbWVudChpZCkge1xuICAgICAgJCgnIycgKyBpZCkuZmluZCgndGV4dGFyZWEnKS5mb2N1cygpO1xuICAgIH1cblxuICAgIHZhciBtZXNzYWdlVHlwZXMgPSBbe1xuICAgICAgaWQ6IDEsXG4gICAgICB2YWx1ZTogJ1dlbnQgd2VsbCdcbiAgICB9LCB7XG4gICAgICBpZDogMixcbiAgICAgIHZhbHVlOiAnVG8gaW1wcm92ZSdcbiAgICB9LCB7XG4gICAgICBpZDogMyxcbiAgICAgIHZhbHVlOiAnQWN0aW9uIGl0ZW1zJ1xuICAgIH1dO1xuXG4gICAgZnVuY3Rpb24gc2hvd1JlbW92ZUNvbHVtbihpZCwgY29sdW1ucykge1xuICAgICAgcmV0dXJuIGNvbHVtbnMubGVuZ3RoID09PSBpZCAmJiBjb2x1bW5zLmxlbmd0aCA+IDMgPyB0cnVlIDogZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TmV4dElkKGJvYXJkKSB7XG4gICAgICByZXR1cm4gYm9hcmQuY29sdW1uc1tib2FyZC5jb2x1bW5zLmxlbmd0aCAtMV0uaWQgKyAxO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvT2JqZWN0KGFycmF5KSB7XG4gICAgICB2YXIgb2JqZWN0ID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb2JqZWN0W2ldID0ge1xuICAgICAgICAgIGlkOiBhcnJheVtpXS5pZCxcbiAgICAgICAgICB2YWx1ZTogYXJyYXlbaV0udmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY3JlYXRlVXNlcklkOiBjcmVhdGVVc2VySWQsXG4gICAgICBhbHJlYWR5Vm90ZWQ6IGFscmVhZHlWb3RlZCxcbiAgICAgIGZvY3VzRWxlbWVudDogZm9jdXNFbGVtZW50LFxuICAgICAgbWVzc2FnZVR5cGVzOiBtZXNzYWdlVHlwZXMsXG4gICAgICBzaG93UmVtb3ZlQ29sdW1uOiBzaG93UmVtb3ZlQ29sdW1uLFxuICAgICAgZ2V0TmV4dElkOiBnZXROZXh0SWQsXG4gICAgICB0b09iamVjdDogdG9PYmplY3RcbiAgICB9O1xuICB9XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2JvYXJkQ29udGV4dCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvYm9hcmRDb250ZXh0Lmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2RpYWxvZ3MnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2RpYWxvZ3MuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgncGFnZUZvb3RlcicsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvZm9vdGVyLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3BhZ2VIZWFkZXInLCBbJ01vZGFsU2VydmljZScsIGZ1bmN0aW9uKG1vZGFsU2VydmljZSkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2hlYWRlci5odG1sJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAkc2NvcGUubW9kYWxTZXJ2aWNlID0gbW9kYWxTZXJ2aWNlO1xuICAgICAgfVxuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluQ29udGVudCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9tYWluQ29udGVudC5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluUGFnZScsIFsnTW9kYWxTZXJ2aWNlJywgZnVuY3Rpb24obW9kYWxTZXJ2aWNlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21haW5QYWdlLmh0bWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICRzY29wZS5tb2RhbFNlcnZpY2UgPSBtb2RhbFNlcnZpY2U7XG4gICAgICB9XG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21lbnUnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWVudS5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCduZXdGZWF0dXJlTm90aWZpY2F0aW9uJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9uZXdGZWF0dXJlTm90aWZpY2F0aW9uLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3NwaW5uZXInLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL3NwaW5uZXIuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgndXNlclZvaWNlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy91c2VyVm9pY2UuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnTW9kYWxTZXJ2aWNlJywgWyduZ0RpYWxvZycsIGZ1bmN0aW9uKG5nRGlhbG9nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wZW5BZGROZXdDb2x1bW46IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnYWRkTmV3Q29sdW1uJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5BZGROZXdCb2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdhZGROZXdCb2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuRGVsZXRlQ2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDYXJkJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5EZWxldGVDb2x1bW46IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ29sdW1uJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgb3Blbk1lcmdlQ2FyZHM6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnbWVyZ2VDYXJkcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuQ29weUJvYXJkOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2NvcHlCb2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4gYmlnRGlhbG9nJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgb3BlbkRlbGV0ZUNhcmRzOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNhcmRzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbiBkYW5nZXInLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBjbG9zZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgIG5nRGlhbG9nLmNsb3NlQWxsKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuIl19
