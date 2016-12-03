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

      $scope.saveMessage = function(message) {
        message.saved = true;
        $scope.messages.$save(message)
      }

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
        $scope.board.columns.push({
          value: name,
          id: utils.getNextId($scope.board)
        });

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

      $scope.deleteColumn = function(column) {
        $scope.board.columns = $scope.board.columns.filter(function(_column) {
            return _column.id !== column.id;
        });

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

      for( var i=0; i < 7; i++ ) {
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

    function getNextId(board) {
      return board.columns.slice(-1).pop().id + 1;
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

    function columnClass(id) {
      return "column_" + (id % 6 || 6);
    }

    return {
      createUserId: createUserId,
      alreadyVoted: alreadyVoted,
      focusElement: focusElement,
      messageTypes: messageTypes,
      getNextId: getNextId,
      toObject: toObject,
      columnClass: columnClass
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwiZGlyZWN0aXZlcy9ib2FyZENvbnRleHQuanMiLCJkaXJlY3RpdmVzL2RpYWxvZ3MuanMiLCJkaXJlY3RpdmVzL2Zvb3Rlci5qcyIsImRpcmVjdGl2ZXMvaGVhZGVyLmpzIiwiZGlyZWN0aXZlcy9tYWluQ29udGVudC5qcyIsImRpcmVjdGl2ZXMvbWFpblBhZ2UuanMiLCJkaXJlY3RpdmVzL21lbnUuanMiLCJkaXJlY3RpdmVzL25ld0ZlYXR1cmVOb3RpZmljYXRpb24uanMiLCJkaXJlY3RpdmVzL3NwaW5uZXIuanMiLCJkaXJlY3RpdmVzL3VzZXJWb2ljZS5qcyIsInNlcnZpY2VzL21vZGFsU2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JywgWydmaXJlYmFzZScsXG4gICAgICAgICAgICAgICAnbmdEaWFsb2cnLFxuICAgICAgICAgICAgICAgJ2x2bC5kaXJlY3RpdmVzLmRyYWdkcm9wJyxcbiAgICAgICAgICAgICAgICduZ1Nhbml0aXplJyxcbiAgICAgICAgICAgICAgICduZ0FyaWEnXSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ0F1dGgnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1haW5SZWYgPSBuZXcgRmlyZWJhc2UoJ2h0dHBzOi8vYmxpbmRpbmctdG9yY2gtNjY2Mi5maXJlYmFzZWlvLmNvbScpO1xuXG4gICAgZnVuY3Rpb24gbG9nVXNlcih1c2VyLCBjYWxsYmFjaykge1xuICAgICAgbWFpblJlZi51bmF1dGgoKTtcbiAgICAgIG1haW5SZWYuYXV0aFdpdGhQYXNzd29yZCh7XG4gICAgICAgIGVtYWlsICAgIDogdXNlciArICdAZmlyZWlkZWF6LmNvbScsXG4gICAgICAgIHBhc3N3b3JkIDogdXNlclxuICAgICAgfSwgZnVuY3Rpb24oZXJyb3IsIGF1dGhEYXRhKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2cgdXNlciBmYWlsZWQ6ICcsIGVycm9yKTtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICcnO1xuICAgICAgICAgIGxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGF1dGhEYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlVXNlckFuZExvZyhuZXdVc2VyLCBjYWxsYmFjaykge1xuICAgICAgbWFpblJlZi5jcmVhdGVVc2VyKHtcbiAgICAgICAgZW1haWwgICAgOiBuZXdVc2VyICsgJ0BmaXJlaWRlYXouY29tJyxcbiAgICAgICAgcGFzc3dvcmQgOiBuZXdVc2VyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnQ3JlYXRlIHVzZXIgZmFpbGVkOiAnLCBlcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nVXNlcihuZXdVc2VyLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgY3JlYXRlVXNlckFuZExvZzogY3JlYXRlVXNlckFuZExvZyxcbiAgICAgIGxvZ1VzZXI6IGxvZ1VzZXJcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuLm1vZHVsZSgnZmlyZWlkZWF6Jylcbi5kaXJlY3RpdmUoJ2VudGVyQ2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW0pIHtcbiAgICAgIGVsZW0uYmluZCgna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMyAmJiBldmVudC5zaGlmdEtleSkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgJChlbGVtWzBdKS5maW5kKCdidXR0b24nKS5mb2N1cygpO1xuICAgICAgICAgICQoZWxlbVswXSkuZmluZCgnYnV0dG9uJykuY2xpY2soKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ0ZpcmViYXNlU2VydmljZScsIFsnJGZpcmViYXNlQXJyYXknLCBmdW5jdGlvbiAoJGZpcmViYXNlQXJyYXkpIHtcbiAgICB2YXIgZmlyZWJhc2VVcmwgPSAnaHR0cHM6Ly9ibGluZGluZy10b3JjaC02NjYyLmZpcmViYXNlaW8uY29tJztcblxuICAgIGZ1bmN0aW9uIG5ld0ZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpIHtcbiAgICAgIHJldHVybiAkZmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VydmVyVGltZXN0YW1wKCkge1xuICAgICAgcmV0dXJuIEZpcmViYXNlLlNlcnZlclZhbHVlLlRJTUVTVEFNUDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlc1JlZih1c2VySWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL21lc3NhZ2VzLycgKyB1c2VySWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2VSZWYodXNlcklkLCBtZXNzYWdlSWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL21lc3NhZ2VzLycgKyB1c2VySWQgKyAnLycgKyBtZXNzYWdlSWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJvYXJkUmVmKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvYm9hcmRzLycgKyB1c2VySWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJvYXJkQ29sdW1ucyh1c2VySWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL2JvYXJkcy8nICsgdXNlcklkICsgJy9jb2x1bW5zJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5ld0ZpcmViYXNlQXJyYXk6IG5ld0ZpcmViYXNlQXJyYXksXG4gICAgICBnZXRTZXJ2ZXJUaW1lc3RhbXA6IGdldFNlcnZlclRpbWVzdGFtcCxcbiAgICAgIGdldE1lc3NhZ2VzUmVmOiBnZXRNZXNzYWdlc1JlZixcbiAgICAgIGdldE1lc3NhZ2VSZWY6IGdldE1lc3NhZ2VSZWYsXG4gICAgICBnZXRCb2FyZFJlZjogZ2V0Qm9hcmRSZWYsXG4gICAgICBnZXRCb2FyZENvbHVtbnM6IGdldEJvYXJkQ29sdW1uc1xuICAgIH07XG4gIH1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuY29udHJvbGxlcignTWFpbkN0cmwnLCBbJyRzY29wZScsICckZmlsdGVyJyxcbiAgICAnJHdpbmRvdycsICdVdGlscycsICdBdXRoJywgJyRyb290U2NvcGUnLCAnRmlyZWJhc2VTZXJ2aWNlJywgJ01vZGFsU2VydmljZScsXG4gICAgZnVuY3Rpb24oJHNjb3BlLCAkZmlsdGVyLCAkd2luZG93LCB1dGlscywgYXV0aCwgJHJvb3RTY29wZSwgZmlyZWJhc2VTZXJ2aWNlLCBtb2RhbFNlcnZpY2UpIHtcbiAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5tZXNzYWdlVHlwZXMgPSB1dGlscy5tZXNzYWdlVHlwZXM7XG4gICAgICAkc2NvcGUudXRpbHMgPSB1dGlscztcbiAgICAgICRzY29wZS5uZXdCb2FyZCA9IHtcbiAgICAgICAgbmFtZTogJydcbiAgICAgIH07XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICRzY29wZS5zb3J0RmllbGQgPSAnJGlkJztcbiAgICAgICRzY29wZS5zZWxlY3RlZFR5cGUgPSAxO1xuXG4gICAgICAkc2NvcGUuY2xvc2VBbGxNb2RhbHMgPSBmdW5jdGlvbigpe1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGdldEJvYXJkQW5kTWVzc2FnZXModXNlckRhdGEpIHtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkgfHwgJzQ5OXNtJztcblxuICAgICAgICB2YXIgbWVzc2FnZXNSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZXNSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIHZhciBib2FyZCA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZFJlZigkc2NvcGUudXNlcklkKTtcblxuICAgICAgICBib2FyZC5vbigndmFsdWUnLCBmdW5jdGlvbihib2FyZCkge1xuICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkLnZhbCgpO1xuICAgICAgICAgICRzY29wZS5ib2FyZElkID0gJHJvb3RTY29wZS5ib2FyZElkID0gYm9hcmQudmFsKCkuYm9hcmRJZDtcbiAgICAgICAgICAkc2NvcGUuYm9hcmRDb250ZXh0ID0gJHJvb3RTY29wZS5ib2FyZENvbnRleHQgPSBib2FyZC52YWwoKS5ib2FyZENvbnRleHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5ib2FyZFJlZiA9IGJvYXJkO1xuICAgICAgICAkc2NvcGUudXNlclVpZCA9IHVzZXJEYXRhLnVpZDtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzID0gZmlyZWJhc2VTZXJ2aWNlLm5ld0ZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpO1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoJHNjb3BlLnVzZXJJZCAhPT0gJycpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2VzUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VzUmVmKCRzY29wZS51c2VySWQpO1xuICAgICAgICBhdXRoLmxvZ1VzZXIoJHNjb3BlLnVzZXJJZCwgZ2V0Qm9hcmRBbmRNZXNzYWdlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuaXNDb2x1bW5TZWxlY3RlZCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KCRzY29wZS5zZWxlY3RlZFR5cGUpID09PSBwYXJzZUludCh0eXBlKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zZWVOb3RpZmljYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Z1bnJldHJvMScsIHRydWUpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNob3dOb3RpZmljYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICFsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZnVucmV0cm8xJykgJiYgJHNjb3BlLnVzZXJJZCAhPT0gJyc7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZ2V0U29ydE9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuc29ydEZpZWxkID09PSAndm90ZXMnID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNhdmVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlLnNhdmVkID0gdHJ1ZTtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLiRzYXZlKG1lc3NhZ2UpXG4gICAgICB9XG5cbiAgICAgICRzY29wZS50b2dnbGVWb3RlID0gZnVuY3Rpb24oa2V5LCB2b3Rlcykge1xuICAgICAgICBpZiAoIWxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSkpIHtcbiAgICAgICAgICBtZXNzYWdlc1JlZi5jaGlsZChrZXkpLnVwZGF0ZSh7XG4gICAgICAgICAgICB2b3Rlczogdm90ZXMgKyAxLFxuICAgICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1lc3NhZ2VzUmVmLmNoaWxkKGtleSkudXBkYXRlKHtcbiAgICAgICAgICAgIHZvdGVzOiB2b3RlcyAtIDEsXG4gICAgICAgICAgICBkYXRlOiBmaXJlYmFzZVNlcnZpY2UuZ2V0U2VydmVyVGltZXN0YW1wKClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIHJlZGlyZWN0VG9Cb2FyZCgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luICtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyAnIycgKyAkc2NvcGUudXNlcklkO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY3JlYXRlTmV3Qm9hcmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9IHV0aWxzLmNyZWF0ZVVzZXJJZCgpO1xuXG4gICAgICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uKHVzZXJEYXRhKSB7XG4gICAgICAgICAgdmFyIGJvYXJkID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkUmVmKCRzY29wZS51c2VySWQpO1xuICAgICAgICAgIGJvYXJkLnNldCh7XG4gICAgICAgICAgICBib2FyZElkOiAkc2NvcGUubmV3Qm9hcmQubmFtZSxcbiAgICAgICAgICAgIGRhdGVfY3JlYXRlZDogbmV3IERhdGUoKS50b1N0cmluZygpLFxuICAgICAgICAgICAgY29sdW1uczogJHNjb3BlLm1lc3NhZ2VUeXBlcyxcbiAgICAgICAgICAgIHVzZXJfaWQ6IHVzZXJEYXRhLnVpZFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmVkaXJlY3RUb0JvYXJkKCk7XG5cbiAgICAgICAgICAkc2NvcGUubmV3Qm9hcmQubmFtZSA9ICcnO1xuICAgICAgICB9O1xuXG4gICAgICAgIGF1dGguY3JlYXRlVXNlckFuZExvZygkc2NvcGUudXNlcklkLCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2hhbmdlQm9hcmRDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5ib2FyZFJlZi51cGRhdGUoe1xuICAgICAgICAgIGJvYXJkQ29udGV4dDogJHNjb3BlLmJvYXJkQ29udGV4dFxuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5hZGROZXdDb2x1bW4gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgIHZhbHVlOiBuYW1lLFxuICAgICAgICAgIGlkOiB1dGlscy5nZXROZXh0SWQoJHNjb3BlLmJvYXJkKVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgYm9hcmRDb2x1bW5zID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkQ29sdW1ucygkc2NvcGUudXNlcklkKTtcbiAgICAgICAgYm9hcmRDb2x1bW5zLnNldCh1dGlscy50b09iamVjdCgkc2NvcGUuYm9hcmQuY29sdW1ucykpO1xuXG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmNoYW5nZUNvbHVtbk5hbWUgPSBmdW5jdGlvbihpZCwgbmV3TmFtZSkge1xuICAgICAgICAkc2NvcGUuYm9hcmQuY29sdW1uc1tpZCAtIDFdID0ge1xuICAgICAgICAgIHZhbHVlOiBuZXdOYW1lLFxuICAgICAgICAgIGlkOiBpZFxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG5cbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlQ29sdW1uID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zID0gJHNjb3BlLmJvYXJkLmNvbHVtbnMuZmlsdGVyKGZ1bmN0aW9uKF9jb2x1bW4pIHtcbiAgICAgICAgICAgIHJldHVybiBfY29sdW1uLmlkICE9PSBjb2x1bW4uaWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZU1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICRzY29wZS5tZXNzYWdlcy4kcmVtb3ZlKG1lc3NhZ2UpO1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGFkZE1lc3NhZ2VDYWxsYmFjayhtZXNzYWdlKSB7XG4gICAgICAgIHZhciBpZCA9IG1lc3NhZ2Uua2V5KCk7XG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkKCcjJyArIGlkKSkuc2NvcGUoKS5pc0VkaXRpbmcgPSB0cnVlO1xuICAgICAgICAkKCcjJyArIGlkKS5maW5kKCd0ZXh0YXJlYScpLmZvY3VzKCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hZGROZXdNZXNzYWdlID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMuJGFkZCh7XG4gICAgICAgICAgdGV4dDogJycsXG4gICAgICAgICAgdXNlcl9pZDogJHNjb3BlLnVzZXJVaWQsXG4gICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgaWQ6IHR5cGUuaWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKSxcbiAgICAgICAgICB2b3RlczogMFxuICAgICAgICB9KS50aGVuKGFkZE1lc3NhZ2VDYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlQ2FyZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgkc2NvcGUubWVzc2FnZXMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAkc2NvcGUubWVzc2FnZXMuJHJlbW92ZShtZXNzYWdlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZ2V0Qm9hcmRUZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICgkc2NvcGUuYm9hcmQpIHtcbiAgICAgICAgICB2YXIgY2xpcGJvYXJkID0gJyc7XG5cbiAgICAgICAgICAkKCRzY29wZS5ib2FyZC5jb2x1bW5zKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBjb2x1bW4pIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJzxzdHJvbmc+JyArIGNvbHVtbi52YWx1ZSArICc8L3N0cm9uZz48YnIgLz4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2xpcGJvYXJkICs9ICc8YnIgLz48c3Ryb25nPicgKyBjb2x1bW4udmFsdWUgKyAnPC9zdHJvbmc+PGJyIC8+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmaWx0ZXJlZEFycmF5ID0gJGZpbHRlcignb3JkZXJCeScpKCRzY29wZS5tZXNzYWdlcyxcbiAgICAgICAgICAgICAgJHNjb3BlLnNvcnRGaWVsZCxcbiAgICAgICAgICAgICAgJHNjb3BlLmdldFNvcnRPcmRlcigpKTtcblxuICAgICAgICAgICAgJChmaWx0ZXJlZEFycmF5KS5lYWNoKGZ1bmN0aW9uKGluZGV4MiwgbWVzc2FnZSkge1xuICAgICAgICAgICAgICBpZiAobWVzc2FnZS50eXBlLmlkID09PSBjb2x1bW4uaWQpIHtcbiAgICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJy0gJyArIG1lc3NhZ2UudGV4dCArICcgKCcgKyBtZXNzYWdlLnZvdGVzICsgJyB2b3RlcykgPGJyIC8+JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZXR1cm4gY2xpcGJvYXJkO1xuICAgICAgICB9IGVsc2UgcmV0dXJuICcnO1xuICAgICAgfTtcblxuICAgICAgYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLmJpbmQoJ2hhc2hjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICAgYXV0aC5sb2dVc2VyKCRzY29wZS51c2VySWQsIGdldEJvYXJkQW5kTWVzc2FnZXMpO1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuY29udHJvbGxlcignTWVzc2FnZUN0cmwnLCBbJyRzY29wZScsICckZmlsdGVyJyxcbiAgICAgICAgICAgICAgJyR3aW5kb3cnLCAnQXV0aCcsICckcm9vdFNjb3BlJywgJ0ZpcmViYXNlU2VydmljZScsICdNb2RhbFNlcnZpY2UnLFxuICAgIGZ1bmN0aW9uKCRzY29wZSwgJGZpbHRlciwgJHdpbmRvdywgYXV0aCwgJHJvb3RTY29wZSwgZmlyZWJhc2VTZXJ2aWNlLCBtb2RhbFNlcnZpY2UpIHtcbiAgICAgICRzY29wZS5tb2RhbFNlcnZpY2UgPSBtb2RhbFNlcnZpY2U7XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKTtcblxuICAgICAgJHNjb3BlLmRyb3BwZWRFdmVudCA9IGZ1bmN0aW9uKGRyYWdFbCwgZHJvcEVsKSB7XG4gICAgICAgIGlmKGRyYWdFbCAhPT0gZHJvcEVsKSB7XG4gICAgICAgICAgJHNjb3BlLmRyYWdFbCA9IGRyYWdFbDtcbiAgICAgICAgICAkc2NvcGUuZHJvcEVsID0gZHJvcEVsO1xuXG4gICAgICAgICAgbW9kYWxTZXJ2aWNlLm9wZW5NZXJnZUNhcmRzKCRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kcm9wcGVkID0gZnVuY3Rpb24oZHJhZ0VsLCBkcm9wRWwpIHtcbiAgICAgICAgdmFyIGRyYWcgPSAkKCcjJyArIGRyYWdFbCk7XG4gICAgICAgIHZhciBkcm9wID0gJCgnIycgKyBkcm9wRWwpO1xuXG4gICAgICAgIHZhciBkcm9wTWVzc2FnZVJlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlUmVmKCRzY29wZS51c2VySWQsIGRyb3AuYXR0cignbWVzc2FnZUlkJykpO1xuICAgICAgICB2YXIgZHJhZ01lc3NhZ2VSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZVJlZigkc2NvcGUudXNlcklkLCBkcmFnLmF0dHIoJ21lc3NhZ2VJZCcpKTtcblxuICAgICAgICBkcm9wTWVzc2FnZVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRyb3BNZXNzYWdlKSB7XG4gICAgICAgICAgZHJhZ01lc3NhZ2VSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkcmFnTWVzc2FnZSkge1xuICAgICAgICAgICAgZHJvcE1lc3NhZ2VSZWYudXBkYXRlKHtcbiAgICAgICAgICAgICAgdGV4dDogZHJvcE1lc3NhZ2UudmFsKCkudGV4dCArICcgfCAnICsgZHJhZ01lc3NhZ2UudmFsKCkudGV4dCxcbiAgICAgICAgICAgICAgdm90ZXM6IGRyb3BNZXNzYWdlLnZhbCgpLnZvdGVzICsgZHJhZ01lc3NhZ2UudmFsKCkudm90ZXNcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBkcmFnTWVzc2FnZVJlZi5yZW1vdmUoKTtcbiAgICAgICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfV1cbiAgKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnVXRpbHMnLCBbZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIGNyZWF0ZVVzZXJJZCgpIHtcbiAgICAgIHZhciB0ZXh0ID0gJyc7XG4gICAgICB2YXIgcG9zc2libGUgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5JztcblxuICAgICAgZm9yKCB2YXIgaT0wOyBpIDwgNzsgaSsrICkge1xuICAgICAgICB0ZXh0ICs9IHBvc3NpYmxlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwb3NzaWJsZS5sZW5ndGgpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWxyZWFkeVZvdGVkKGtleSkge1xuICAgICAgcmV0dXJuIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9jdXNFbGVtZW50KGlkKSB7XG4gICAgICAkKCcjJyArIGlkKS5maW5kKCd0ZXh0YXJlYScpLmZvY3VzKCk7XG4gICAgfVxuXG4gICAgdmFyIG1lc3NhZ2VUeXBlcyA9IFt7XG4gICAgICBpZDogMSxcbiAgICAgIHZhbHVlOiAnV2VudCB3ZWxsJ1xuICAgIH0sIHtcbiAgICAgIGlkOiAyLFxuICAgICAgdmFsdWU6ICdUbyBpbXByb3ZlJ1xuICAgIH0sIHtcbiAgICAgIGlkOiAzLFxuICAgICAgdmFsdWU6ICdBY3Rpb24gaXRlbXMnXG4gICAgfV07XG5cbiAgICBmdW5jdGlvbiBnZXROZXh0SWQoYm9hcmQpIHtcbiAgICAgIHJldHVybiBib2FyZC5jb2x1bW5zLnNsaWNlKC0xKS5wb3AoKS5pZCArIDE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9PYmplY3QoYXJyYXkpIHtcbiAgICAgIHZhciBvYmplY3QgPSB7fTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBvYmplY3RbaV0gPSB7XG4gICAgICAgICAgaWQ6IGFycmF5W2ldLmlkLFxuICAgICAgICAgIHZhbHVlOiBhcnJheVtpXS52YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbHVtbkNsYXNzKGlkKSB7XG4gICAgICByZXR1cm4gXCJjb2x1bW5fXCIgKyAoaWQgJSA2IHx8IDYpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VySWQ6IGNyZWF0ZVVzZXJJZCxcbiAgICAgIGFscmVhZHlWb3RlZDogYWxyZWFkeVZvdGVkLFxuICAgICAgZm9jdXNFbGVtZW50OiBmb2N1c0VsZW1lbnQsXG4gICAgICBtZXNzYWdlVHlwZXM6IG1lc3NhZ2VUeXBlcyxcbiAgICAgIGdldE5leHRJZDogZ2V0TmV4dElkLFxuICAgICAgdG9PYmplY3Q6IHRvT2JqZWN0LFxuICAgICAgY29sdW1uQ2xhc3M6IGNvbHVtbkNsYXNzXG4gICAgfTtcbiAgfV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdib2FyZENvbnRleHQnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2JvYXJkQ29udGV4dC5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdkaWFsb2dzJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9kaWFsb2dzLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3BhZ2VGb290ZXInLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2Zvb3Rlci5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdwYWdlSGVhZGVyJywgWydNb2RhbFNlcnZpY2UnLCBmdW5jdGlvbihtb2RhbFNlcnZpY2UpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9oZWFkZXIuaHRtbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgJHNjb3BlLm1vZGFsU2VydmljZSA9IG1vZGFsU2VydmljZTtcbiAgICAgIH1cbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnbWFpbkNvbnRlbnQnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWFpbkNvbnRlbnQuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnbWFpblBhZ2UnLCBbJ01vZGFsU2VydmljZScsIGZ1bmN0aW9uKG1vZGFsU2VydmljZSkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9tYWluUGFnZS5odG1sJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAkc2NvcGUubW9kYWxTZXJ2aWNlID0gbW9kYWxTZXJ2aWNlO1xuICAgICAgfVxuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtZW51JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21lbnUuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnbmV3RmVhdHVyZU5vdGlmaWNhdGlvbicsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbmV3RmVhdHVyZU5vdGlmaWNhdGlvbi5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdzcGlubmVyJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9zcGlubmVyLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3VzZXJWb2ljZScsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvdXNlclZvaWNlLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ01vZGFsU2VydmljZScsIFsnbmdEaWFsb2cnLCBmdW5jdGlvbihuZ0RpYWxvZykge1xuICAgIHJldHVybiB7XG4gICAgICBvcGVuQWRkTmV3Q29sdW1uOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2FkZE5ld0NvbHVtbicsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuQWRkTmV3Qm9hcmQ6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnYWRkTmV3Qm9hcmQnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgb3BlbkRlbGV0ZUNhcmQ6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuRGVsZXRlQ29sdW1uOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNvbHVtbicsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG9wZW5NZXJnZUNhcmRzOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ21lcmdlQ2FyZHMnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgb3BlbkNvcHlCb2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdjb3B5Qm9hcmQnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluIGJpZ0RpYWxvZycsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5EZWxldGVDYXJkczogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDYXJkcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4gZGFuZ2VyJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgY2xvc2VBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICBuZ0RpYWxvZy5jbG9zZUFsbCgpO1xuICAgICAgfVxuICAgIH07XG4gIH1dKTtcbiJdfQ==
