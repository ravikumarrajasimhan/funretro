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
    '$window', 'Utils', 'Auth', '$rootScope', 'FirebaseService', 'ModalService', 'VoteService',
    function($scope, $filter, $window, utils, auth, $rootScope, firebaseService, modalService, voteService) {
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

      $scope.getNumberOfVotesOnMessage = function(userId, messageId) {
        return new Array(voteService.returnNumberOfVotesOnMessage(userId, messageId));
      }

      $scope.droppedEvent = function(dragEl, dropEl) {
        var drag = $('#' + dragEl);
        var drop = $('#' + dropEl);
        var dragMessageRef = firebaseService.getMessageRef($scope.userId, drag.attr('messageId'));

        dragMessageRef.once('value', function(dragMessage) {
          dragMessageRef.update({
            type: {
              id: drop.data('column-id')
            }
          });
        });
      }

      function getBoardAndMessages(userData) {
        $scope.userId = $window.location.hash.substring(1) || '499sm';

        var messagesRef = firebaseService.getMessagesRef($scope.userId);
        var board = firebaseService.getBoardRef($scope.userId);

        board.on('value', function(board) {
          $scope.board = board.val();
          $scope.maxVotes = board.val().max_votes ? board.val().max_votes : 6;
          $scope.boardId = $rootScope.boardId = board.val().boardId;
          $scope.boardContext = $rootScope.boardContext = board.val().boardContext;
        });

        $scope.boardRef = board;
        $scope.messagesRef = messagesRef;
        $scope.userUid = userData.uid;
        $scope.messages = firebaseService.newFirebaseArray(messagesRef);
        $scope.loading = false;
      }

      if ($scope.userId !== '') {
        //var messagesRef = firebaseService.getMessagesRef($scope.userId);
        auth.logUser($scope.userId, getBoardAndMessages);
      } else {
        $scope.loading = false;
      }

      $scope.isColumnSelected = function(type) {
        return parseInt($scope.selectedType) === parseInt(type);
      };

      $scope.getSortOrder = function() {
        return $scope.sortField === 'votes' ? true : false;
      };

      $scope.saveMessage = function(message) {
        message.creating = false;
        $scope.messages.$save(message);
      }

      $scope.vote = function(messageKey, votes) {
        if(voteService.isAbleToVote($scope.userId, $scope.maxVotes, $scope.messages)) {
          $scope.messagesRef.child(messageKey).update({
            votes: votes + 1,
            date: firebaseService.getServerTimestamp()
          });

          voteService.increaseMessageVotes($scope.userId, messageKey);
        }
      }

      $scope.unvote = function(messageKey, votes) {
        if(voteService.canUnvoteMessage($scope.userId, messageKey)) {
          $scope.messagesRef.child(messageKey).update({
            votes: votes - 1,
            date: firebaseService.getServerTimestamp()
          });

          voteService.decreaseMessageVotes($scope.userId, messageKey);
        }
      }

      function redirectToBoard() {
        window.location.href = window.location.origin +
          window.location.pathname + '#' + $scope.userId;
      }

      $scope.isBoardNameInvalid = function() {
        return !$scope.newBoard.name;
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
            user_id: userData.uid,
            max_votes: $scope.newBoard.max_votes || 6
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

      $scope.changeBoardName = function(newBoardName) {
        $scope.boardRef.update({
          boardId: newBoardName
        });
        modalService.closeAll();
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
          creating: true,
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
              '$window', 'Auth', '$rootScope', 'FirebaseService', 'ModalService', 'VoteService',
    function($scope, $filter, $window, auth, $rootScope, firebaseService, modalService, voteService) {
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

            voteService.mergeMessages($scope.userId, drag.attr('messageId'), drop.attr('messageId'));

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
      focusElement: focusElement,
      messageTypes: messageTypes,
      getNextId: getNextId,
      toObject: toObject,
      columnClass: columnClass
    };
  }]);

'use strict';

angular
  .module('fireideaz')
  .service('VoteService', [function () {
    function returnNumberOfVotes(userId, messagesIds) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {}

      var totalVotes = Object.keys(userVotes).map(function(messageKey) {
        return messagesIds.indexOf(messageKey) >= 0 ? userVotes[messageKey] : 0;
      }).reduce(function (a, b) {
        return a + b;
      }, 0)

      return localStorage.getItem(userId) ? totalVotes : 0;
    }

    function extractMessageIds(messages) {
      return messages ? messages.map(function(message) { return message.$id }) : [];
    }

    function returnNumberOfVotesOnMessage(userId, messageKey) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {}

      return userVotes[messageKey] ? userVotes[messageKey] : 0;
    }

    function remainingVotes(userId, maxVotes, messages) {
      var messagesIds = this.extractMessageIds(messages);

      return (maxVotes - this.returnNumberOfVotes(userId, messagesIds)) > 0
        ? maxVotes - this.returnNumberOfVotes(userId, messagesIds)
        : 0;
    }

    function increaseMessageVotes(userId, messageKey) {
      if (localStorage.getItem(userId)) {
        var boardVotes = JSON.parse(localStorage.getItem(userId));

        if (boardVotes[messageKey]) {
          boardVotes[messageKey] = parseInt(boardVotes[messageKey] + 1);
          localStorage.setItem(userId, JSON.stringify(boardVotes));
        } else {
          boardVotes[messageKey] = 1
          localStorage.setItem(userId, JSON.stringify(boardVotes));
        }
      } else {
        var newObject = {};
        newObject[messageKey] = 1;
        localStorage.setItem(userId, JSON.stringify(newObject));
      }
    }

    function decreaseMessageVotes(userId, messageKey) {
      if (localStorage.getItem(userId)) {
        var boardVotes = JSON.parse(localStorage.getItem(userId));

        if (boardVotes[messageKey] === 1) {
            delete boardVotes[messageKey];
        } else {
          boardVotes[messageKey] = boardVotes[messageKey] - 1;
        }

        localStorage.setItem(userId, JSON.stringify(boardVotes));
      }
    }

    function mergeMessages(userId, dragMessage, dropMessage) {
      var dragMessageVoteCount = this.returnNumberOfVotesOnMessage(userId, dragMessage)
      var dropMessageVoteCount = this.returnNumberOfVotesOnMessage(userId, dropMessage)
      var boardVotes = JSON.parse(localStorage.getItem(userId));

      if(dragMessageVoteCount > 0) {
        boardVotes[dropMessage] = dragMessageVoteCount + dropMessageVoteCount;
        delete boardVotes[dragMessage];

        localStorage.setItem(userId, JSON.stringify(boardVotes));
      }
    }

    function canUnvoteMessage(userId, messageKey) {
      return localStorage.getItem(userId) && JSON.parse(localStorage.getItem(userId))[messageKey] ? true : false;
    }

    function isAbleToVote(userId, maxVotes, messages) {
      return this.remainingVotes(userId, maxVotes, messages) > 0;
    }

    return {
      returnNumberOfVotes: returnNumberOfVotes,
      returnNumberOfVotesOnMessage: returnNumberOfVotesOnMessage,
      increaseMessageVotes: increaseMessageVotes,
      decreaseMessageVotes: decreaseMessageVotes,
      extractMessageIds: extractMessageIds,
      mergeMessages: mergeMessages,
      remainingVotes: remainingVotes,
      canUnvoteMessage: canUnvoteMessage,
      isAbleToVote: isAbleToVote
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

angular.module('fireideaz').directive('menu', ['VoteService', function(voteService) {
    return {
      templateUrl : 'components/menu.html',
      link: function($scope) {
        $scope.voteService = voteService;
      }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwidm90ZVNlcnZpY2UuanMiLCJkaXJlY3RpdmVzL2JvYXJkQ29udGV4dC5qcyIsImRpcmVjdGl2ZXMvZGlhbG9ncy5qcyIsImRpcmVjdGl2ZXMvaGVhZGVyLmpzIiwiZGlyZWN0aXZlcy9tYWluQ29udGVudC5qcyIsImRpcmVjdGl2ZXMvbWFpblBhZ2UuanMiLCJkaXJlY3RpdmVzL21lbnUuanMiLCJkaXJlY3RpdmVzL3NwaW5uZXIuanMiLCJkaXJlY3RpdmVzL3VzZXJWb2ljZS5qcyIsInNlcnZpY2VzL21vZGFsU2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonLCBbJ2ZpcmViYXNlJyxcbiAgICAgICAgICAgICAgICduZ0RpYWxvZycsXG4gICAgICAgICAgICAgICAnbHZsLmRpcmVjdGl2ZXMuZHJhZ2Ryb3AnLFxuICAgICAgICAgICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgICAgICAgICAgJ25nQXJpYSddKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnQXV0aCcsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWFpblJlZiA9IG5ldyBGaXJlYmFzZSgnaHR0cHM6Ly9ibGluZGluZy10b3JjaC02NjYyLmZpcmViYXNlaW8uY29tJyk7XG5cbiAgICBmdW5jdGlvbiBsb2dVc2VyKHVzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLnVuYXV0aCgpO1xuICAgICAgbWFpblJlZi5hdXRoV2l0aFBhc3N3b3JkKHtcbiAgICAgICAgZW1haWwgICAgOiB1c2VyICsgJ0BmaXJlaWRlYXouY29tJyxcbiAgICAgICAgcGFzc3dvcmQgOiB1c2VyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvciwgYXV0aERhdGEpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0xvZyB1c2VyIGZhaWxlZDogJywgZXJyb3IpO1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgICAgbG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soYXV0aERhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyQW5kTG9nKG5ld1VzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLmNyZWF0ZVVzZXIoe1xuICAgICAgICBlbWFpbCAgICA6IG5ld1VzZXIgKyAnQGZpcmVpZGVhei5jb20nLFxuICAgICAgICBwYXNzd29yZCA6IG5ld1VzZXJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGUgdXNlciBmYWlsZWQ6ICcsIGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dVc2VyKG5ld1VzZXIsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VyQW5kTG9nOiBjcmVhdGVVc2VyQW5kTG9nLFxuICAgICAgbG9nVXNlcjogbG9nVXNlclxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4ubW9kdWxlKCdmaXJlaWRlYXonKVxuLmRpcmVjdGl2ZSgnZW50ZXJDbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSkge1xuICAgICAgZWxlbS5iaW5kKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAkKGVsZW1bMF0pLmZpbmQoJ2J1dHRvbicpLmZvY3VzKCk7XG4gICAgICAgICAgJChlbGVtWzBdKS5maW5kKCdidXR0b24nKS5jbGljaygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnRmlyZWJhc2VTZXJ2aWNlJywgWyckZmlyZWJhc2VBcnJheScsIGZ1bmN0aW9uICgkZmlyZWJhc2VBcnJheSkge1xuICAgIHZhciBmaXJlYmFzZVVybCA9ICdodHRwczovL2JsaW5kaW5nLXRvcmNoLTY2NjIuZmlyZWJhc2Vpby5jb20nO1xuXG4gICAgZnVuY3Rpb24gbmV3RmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZikge1xuICAgICAgcmV0dXJuICRmaXJlYmFzZUFycmF5KG1lc3NhZ2VzUmVmKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZXJ2ZXJUaW1lc3RhbXAoKSB7XG4gICAgICByZXR1cm4gRmlyZWJhc2UuU2VydmVyVmFsdWUuVElNRVNUQU1QO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2VzUmVmKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZVJlZih1c2VySWQsIG1lc3NhZ2VJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCArICcvJyArIG1lc3NhZ2VJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRSZWYodXNlcklkKSB7XG4gICAgICByZXR1cm4gbmV3IEZpcmViYXNlKGZpcmViYXNlVXJsICsgJy9ib2FyZHMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRDb2x1bW5zKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvYm9hcmRzLycgKyB1c2VySWQgKyAnL2NvbHVtbnMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmV3RmlyZWJhc2VBcnJheTogbmV3RmlyZWJhc2VBcnJheSxcbiAgICAgIGdldFNlcnZlclRpbWVzdGFtcDogZ2V0U2VydmVyVGltZXN0YW1wLFxuICAgICAgZ2V0TWVzc2FnZXNSZWY6IGdldE1lc3NhZ2VzUmVmLFxuICAgICAgZ2V0TWVzc2FnZVJlZjogZ2V0TWVzc2FnZVJlZixcbiAgICAgIGdldEJvYXJkUmVmOiBnZXRCb2FyZFJlZixcbiAgICAgIGdldEJvYXJkQ29sdW1uczogZ2V0Qm9hcmRDb2x1bW5zXG4gICAgfTtcbiAgfV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5jb250cm9sbGVyKCdNYWluQ3RybCcsIFsnJHNjb3BlJywgJyRmaWx0ZXInLFxuICAgICckd2luZG93JywgJ1V0aWxzJywgJ0F1dGgnLCAnJHJvb3RTY29wZScsICdGaXJlYmFzZVNlcnZpY2UnLCAnTW9kYWxTZXJ2aWNlJywgJ1ZvdGVTZXJ2aWNlJyxcbiAgICBmdW5jdGlvbigkc2NvcGUsICRmaWx0ZXIsICR3aW5kb3csIHV0aWxzLCBhdXRoLCAkcm9vdFNjb3BlLCBmaXJlYmFzZVNlcnZpY2UsIG1vZGFsU2VydmljZSwgdm90ZVNlcnZpY2UpIHtcbiAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5tZXNzYWdlVHlwZXMgPSB1dGlscy5tZXNzYWdlVHlwZXM7XG4gICAgICAkc2NvcGUudXRpbHMgPSB1dGlscztcbiAgICAgICRzY29wZS5uZXdCb2FyZCA9IHtcbiAgICAgICAgbmFtZTogJydcbiAgICAgIH07XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICRzY29wZS5zb3J0RmllbGQgPSAnJGlkJztcbiAgICAgICRzY29wZS5zZWxlY3RlZFR5cGUgPSAxO1xuXG4gICAgICAkc2NvcGUuY2xvc2VBbGxNb2RhbHMgPSBmdW5jdGlvbigpe1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5nZXROdW1iZXJPZlZvdGVzT25NZXNzYWdlID0gZnVuY3Rpb24odXNlcklkLCBtZXNzYWdlSWQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheSh2b3RlU2VydmljZS5yZXR1cm5OdW1iZXJPZlZvdGVzT25NZXNzYWdlKHVzZXJJZCwgbWVzc2FnZUlkKSk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5kcm9wcGVkRXZlbnQgPSBmdW5jdGlvbihkcmFnRWwsIGRyb3BFbCkge1xuICAgICAgICB2YXIgZHJhZyA9ICQoJyMnICsgZHJhZ0VsKTtcbiAgICAgICAgdmFyIGRyb3AgPSAkKCcjJyArIGRyb3BFbCk7XG4gICAgICAgIHZhciBkcmFnTWVzc2FnZVJlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlUmVmKCRzY29wZS51c2VySWQsIGRyYWcuYXR0cignbWVzc2FnZUlkJykpO1xuXG4gICAgICAgIGRyYWdNZXNzYWdlUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZHJhZ01lc3NhZ2UpIHtcbiAgICAgICAgICBkcmFnTWVzc2FnZVJlZi51cGRhdGUoe1xuICAgICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgICBpZDogZHJvcC5kYXRhKCdjb2x1bW4taWQnKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0Qm9hcmRBbmRNZXNzYWdlcyh1c2VyRGF0YSkge1xuICAgICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnNDk5c20nO1xuXG4gICAgICAgIHZhciBtZXNzYWdlc1JlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlc1JlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgdmFyIGJvYXJkID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkUmVmKCRzY29wZS51c2VySWQpO1xuXG4gICAgICAgIGJvYXJkLm9uKCd2YWx1ZScsIGZ1bmN0aW9uKGJvYXJkKSB7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkID0gYm9hcmQudmFsKCk7XG4gICAgICAgICAgJHNjb3BlLm1heFZvdGVzID0gYm9hcmQudmFsKCkubWF4X3ZvdGVzID8gYm9hcmQudmFsKCkubWF4X3ZvdGVzIDogNjtcbiAgICAgICAgICAkc2NvcGUuYm9hcmRJZCA9ICRyb290U2NvcGUuYm9hcmRJZCA9IGJvYXJkLnZhbCgpLmJvYXJkSWQ7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkQ29udGV4dCA9ICRyb290U2NvcGUuYm9hcmRDb250ZXh0ID0gYm9hcmQudmFsKCkuYm9hcmRDb250ZXh0O1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuYm9hcmRSZWYgPSBib2FyZDtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzUmVmID0gbWVzc2FnZXNSZWY7XG4gICAgICAgICRzY29wZS51c2VyVWlkID0gdXNlckRhdGEudWlkO1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMgPSBmaXJlYmFzZVNlcnZpY2UubmV3RmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZik7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICgkc2NvcGUudXNlcklkICE9PSAnJykge1xuICAgICAgICAvL3ZhciBtZXNzYWdlc1JlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlc1JlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgYXV0aC5sb2dVc2VyKCRzY29wZS51c2VySWQsIGdldEJvYXJkQW5kTWVzc2FnZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmlzQ29sdW1uU2VsZWN0ZWQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludCgkc2NvcGUuc2VsZWN0ZWRUeXBlKSA9PT0gcGFyc2VJbnQodHlwZSk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZ2V0U29ydE9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuc29ydEZpZWxkID09PSAndm90ZXMnID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNhdmVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlLmNyZWF0aW5nID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5tZXNzYWdlcy4kc2F2ZShtZXNzYWdlKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLnZvdGUgPSBmdW5jdGlvbihtZXNzYWdlS2V5LCB2b3Rlcykge1xuICAgICAgICBpZih2b3RlU2VydmljZS5pc0FibGVUb1ZvdGUoJHNjb3BlLnVzZXJJZCwgJHNjb3BlLm1heFZvdGVzLCAkc2NvcGUubWVzc2FnZXMpKSB7XG4gICAgICAgICAgJHNjb3BlLm1lc3NhZ2VzUmVmLmNoaWxkKG1lc3NhZ2VLZXkpLnVwZGF0ZSh7XG4gICAgICAgICAgICB2b3Rlczogdm90ZXMgKyAxLFxuICAgICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2b3RlU2VydmljZS5pbmNyZWFzZU1lc3NhZ2VWb3Rlcygkc2NvcGUudXNlcklkLCBtZXNzYWdlS2V5KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAkc2NvcGUudW52b3RlID0gZnVuY3Rpb24obWVzc2FnZUtleSwgdm90ZXMpIHtcbiAgICAgICAgaWYodm90ZVNlcnZpY2UuY2FuVW52b3RlTWVzc2FnZSgkc2NvcGUudXNlcklkLCBtZXNzYWdlS2V5KSkge1xuICAgICAgICAgICRzY29wZS5tZXNzYWdlc1JlZi5jaGlsZChtZXNzYWdlS2V5KS51cGRhdGUoe1xuICAgICAgICAgICAgdm90ZXM6IHZvdGVzIC0gMSxcbiAgICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdm90ZVNlcnZpY2UuZGVjcmVhc2VNZXNzYWdlVm90ZXMoJHNjb3BlLnVzZXJJZCwgbWVzc2FnZUtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVkaXJlY3RUb0JvYXJkKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gK1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArICcjJyArICRzY29wZS51c2VySWQ7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5pc0JvYXJkTmFtZUludmFsaWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICEkc2NvcGUubmV3Qm9hcmQubmFtZTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmNyZWF0ZU5ld0JvYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICAgICRzY29wZS51c2VySWQgPSB1dGlscy5jcmVhdGVVc2VySWQoKTtcblxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbih1c2VyRGF0YSkge1xuICAgICAgICAgIHZhciBib2FyZCA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZFJlZigkc2NvcGUudXNlcklkKTtcbiAgICAgICAgICBib2FyZC5zZXQoe1xuICAgICAgICAgICAgYm9hcmRJZDogJHNjb3BlLm5ld0JvYXJkLm5hbWUsXG4gICAgICAgICAgICBkYXRlX2NyZWF0ZWQ6IG5ldyBEYXRlKCkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbHVtbnM6ICRzY29wZS5tZXNzYWdlVHlwZXMsXG4gICAgICAgICAgICB1c2VyX2lkOiB1c2VyRGF0YS51aWQsXG4gICAgICAgICAgICBtYXhfdm90ZXM6ICRzY29wZS5uZXdCb2FyZC5tYXhfdm90ZXMgfHwgNlxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmVkaXJlY3RUb0JvYXJkKCk7XG5cbiAgICAgICAgICAkc2NvcGUubmV3Qm9hcmQubmFtZSA9ICcnO1xuICAgICAgICB9O1xuXG4gICAgICAgIGF1dGguY3JlYXRlVXNlckFuZExvZygkc2NvcGUudXNlcklkLCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2hhbmdlQm9hcmRDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5ib2FyZFJlZi51cGRhdGUoe1xuICAgICAgICAgIGJvYXJkQ29udGV4dDogJHNjb3BlLmJvYXJkQ29udGV4dFxuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5jaGFuZ2VCb2FyZE5hbWUgPSBmdW5jdGlvbihuZXdCb2FyZE5hbWUpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkUmVmLnVwZGF0ZSh7XG4gICAgICAgICAgYm9hcmRJZDogbmV3Qm9hcmROYW1lXG4gICAgICAgIH0pO1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5hZGROZXdDb2x1bW4gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgIHZhbHVlOiBuYW1lLFxuICAgICAgICAgIGlkOiB1dGlscy5nZXROZXh0SWQoJHNjb3BlLmJvYXJkKVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgYm9hcmRDb2x1bW5zID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkQ29sdW1ucygkc2NvcGUudXNlcklkKTtcbiAgICAgICAgYm9hcmRDb2x1bW5zLnNldCh1dGlscy50b09iamVjdCgkc2NvcGUuYm9hcmQuY29sdW1ucykpO1xuXG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmNoYW5nZUNvbHVtbk5hbWUgPSBmdW5jdGlvbihpZCwgbmV3TmFtZSkge1xuICAgICAgICAkc2NvcGUuYm9hcmQuY29sdW1uc1tpZCAtIDFdID0ge1xuICAgICAgICAgIHZhbHVlOiBuZXdOYW1lLFxuICAgICAgICAgIGlkOiBpZFxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG5cbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlQ29sdW1uID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zID0gJHNjb3BlLmJvYXJkLmNvbHVtbnMuZmlsdGVyKGZ1bmN0aW9uKF9jb2x1bW4pIHtcbiAgICAgICAgICAgIHJldHVybiBfY29sdW1uLmlkICE9PSBjb2x1bW4uaWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRlbGV0ZU1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICRzY29wZS5tZXNzYWdlcy4kcmVtb3ZlKG1lc3NhZ2UpO1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGFkZE1lc3NhZ2VDYWxsYmFjayhtZXNzYWdlKSB7XG4gICAgICAgIHZhciBpZCA9IG1lc3NhZ2Uua2V5KCk7XG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkKCcjJyArIGlkKSkuc2NvcGUoKS5pc0VkaXRpbmcgPSB0cnVlO1xuICAgICAgICAkKCcjJyArIGlkKS5maW5kKCd0ZXh0YXJlYScpLmZvY3VzKCk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5hZGROZXdNZXNzYWdlID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMuJGFkZCh7XG4gICAgICAgICAgdGV4dDogJycsXG4gICAgICAgICAgY3JlYXRpbmc6IHRydWUsXG4gICAgICAgICAgdXNlcl9pZDogJHNjb3BlLnVzZXJVaWQsXG4gICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgaWQ6IHR5cGUuaWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKSxcbiAgICAgICAgICB2b3RlczogMFxuICAgICAgICB9KS50aGVuKGFkZE1lc3NhZ2VDYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlQ2FyZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgkc2NvcGUubWVzc2FnZXMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAkc2NvcGUubWVzc2FnZXMuJHJlbW92ZShtZXNzYWdlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZ2V0Qm9hcmRUZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICgkc2NvcGUuYm9hcmQpIHtcbiAgICAgICAgICB2YXIgY2xpcGJvYXJkID0gJyc7XG5cbiAgICAgICAgICAkKCRzY29wZS5ib2FyZC5jb2x1bW5zKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBjb2x1bW4pIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJzxzdHJvbmc+JyArIGNvbHVtbi52YWx1ZSArICc8L3N0cm9uZz48YnIgLz4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2xpcGJvYXJkICs9ICc8YnIgLz48c3Ryb25nPicgKyBjb2x1bW4udmFsdWUgKyAnPC9zdHJvbmc+PGJyIC8+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmaWx0ZXJlZEFycmF5ID0gJGZpbHRlcignb3JkZXJCeScpKCRzY29wZS5tZXNzYWdlcyxcbiAgICAgICAgICAgICAgJHNjb3BlLnNvcnRGaWVsZCxcbiAgICAgICAgICAgICAgJHNjb3BlLmdldFNvcnRPcmRlcigpKTtcblxuICAgICAgICAgICAgJChmaWx0ZXJlZEFycmF5KS5lYWNoKGZ1bmN0aW9uKGluZGV4MiwgbWVzc2FnZSkge1xuICAgICAgICAgICAgICBpZiAobWVzc2FnZS50eXBlLmlkID09PSBjb2x1bW4uaWQpIHtcbiAgICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJy0gJyArIG1lc3NhZ2UudGV4dCArICcgKCcgKyBtZXNzYWdlLnZvdGVzICsgJyB2b3RlcykgPGJyIC8+JztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZXR1cm4gY2xpcGJvYXJkO1xuICAgICAgICB9IGVsc2UgcmV0dXJuICcnO1xuICAgICAgfTtcblxuICAgICAgYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpLmJpbmQoJ2hhc2hjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICAgYXV0aC5sb2dVc2VyKCRzY29wZS51c2VySWQsIGdldEJvYXJkQW5kTWVzc2FnZXMpO1xuICAgICAgfSk7XG4gICAgfVxuICBdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuY29udHJvbGxlcignTWVzc2FnZUN0cmwnLCBbJyRzY29wZScsICckZmlsdGVyJyxcbiAgICAgICAgICAgICAgJyR3aW5kb3cnLCAnQXV0aCcsICckcm9vdFNjb3BlJywgJ0ZpcmViYXNlU2VydmljZScsICdNb2RhbFNlcnZpY2UnLCAnVm90ZVNlcnZpY2UnLFxuICAgIGZ1bmN0aW9uKCRzY29wZSwgJGZpbHRlciwgJHdpbmRvdywgYXV0aCwgJHJvb3RTY29wZSwgZmlyZWJhc2VTZXJ2aWNlLCBtb2RhbFNlcnZpY2UsIHZvdGVTZXJ2aWNlKSB7XG4gICAgICAkc2NvcGUubW9kYWxTZXJ2aWNlID0gbW9kYWxTZXJ2aWNlO1xuICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSk7XG5cbiAgICAgICRzY29wZS5kcm9wcGVkRXZlbnQgPSBmdW5jdGlvbihkcmFnRWwsIGRyb3BFbCkge1xuICAgICAgICBpZihkcmFnRWwgIT09IGRyb3BFbCkge1xuICAgICAgICAgICRzY29wZS5kcmFnRWwgPSBkcmFnRWw7XG4gICAgICAgICAgJHNjb3BlLmRyb3BFbCA9IGRyb3BFbDtcblxuICAgICAgICAgIG1vZGFsU2VydmljZS5vcGVuTWVyZ2VDYXJkcygkc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZHJvcHBlZCA9IGZ1bmN0aW9uKGRyYWdFbCwgZHJvcEVsKSB7XG4gICAgICAgIHZhciBkcmFnID0gJCgnIycgKyBkcmFnRWwpO1xuICAgICAgICB2YXIgZHJvcCA9ICQoJyMnICsgZHJvcEVsKTtcblxuICAgICAgICB2YXIgZHJvcE1lc3NhZ2VSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZVJlZigkc2NvcGUudXNlcklkLCBkcm9wLmF0dHIoJ21lc3NhZ2VJZCcpKTtcbiAgICAgICAgdmFyIGRyYWdNZXNzYWdlUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VSZWYoJHNjb3BlLnVzZXJJZCwgZHJhZy5hdHRyKCdtZXNzYWdlSWQnKSk7XG5cbiAgICAgICAgZHJvcE1lc3NhZ2VSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkcm9wTWVzc2FnZSkge1xuICAgICAgICAgIGRyYWdNZXNzYWdlUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZHJhZ01lc3NhZ2UpIHtcbiAgICAgICAgICAgIGRyb3BNZXNzYWdlUmVmLnVwZGF0ZSh7XG4gICAgICAgICAgICAgIHRleHQ6IGRyb3BNZXNzYWdlLnZhbCgpLnRleHQgKyAnIHwgJyArIGRyYWdNZXNzYWdlLnZhbCgpLnRleHQsXG4gICAgICAgICAgICAgIHZvdGVzOiBkcm9wTWVzc2FnZS52YWwoKS52b3RlcyArIGRyYWdNZXNzYWdlLnZhbCgpLnZvdGVzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdm90ZVNlcnZpY2UubWVyZ2VNZXNzYWdlcygkc2NvcGUudXNlcklkLCBkcmFnLmF0dHIoJ21lc3NhZ2VJZCcpLCBkcm9wLmF0dHIoJ21lc3NhZ2VJZCcpKTtcblxuICAgICAgICAgICAgZHJhZ01lc3NhZ2VSZWYucmVtb3ZlKCk7XG4gICAgICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH1dXG4gICk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ1V0aWxzJywgW2Z1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VySWQoKSB7XG4gICAgICB2YXIgdGV4dCA9ICcnO1xuICAgICAgdmFyIHBvc3NpYmxlID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSc7XG5cbiAgICAgIGZvciggdmFyIGk9MDsgaSA8IDc7IGkrKyApIHtcbiAgICAgICAgdGV4dCArPSBwb3NzaWJsZS5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcG9zc2libGUubGVuZ3RoKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0ZXh0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvY3VzRWxlbWVudChpZCkge1xuICAgICAgJCgnIycgKyBpZCkuZmluZCgndGV4dGFyZWEnKS5mb2N1cygpO1xuICAgIH1cblxuICAgIHZhciBtZXNzYWdlVHlwZXMgPSBbe1xuICAgICAgaWQ6IDEsXG4gICAgICB2YWx1ZTogJ1dlbnQgd2VsbCdcbiAgICB9LCB7XG4gICAgICBpZDogMixcbiAgICAgIHZhbHVlOiAnVG8gaW1wcm92ZSdcbiAgICB9LCB7XG4gICAgICBpZDogMyxcbiAgICAgIHZhbHVlOiAnQWN0aW9uIGl0ZW1zJ1xuICAgIH1dO1xuXG4gICAgZnVuY3Rpb24gZ2V0TmV4dElkKGJvYXJkKSB7XG4gICAgICByZXR1cm4gYm9hcmQuY29sdW1ucy5zbGljZSgtMSkucG9wKCkuaWQgKyAxO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvT2JqZWN0KGFycmF5KSB7XG4gICAgICB2YXIgb2JqZWN0ID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb2JqZWN0W2ldID0ge1xuICAgICAgICAgIGlkOiBhcnJheVtpXS5pZCxcbiAgICAgICAgICB2YWx1ZTogYXJyYXlbaV0udmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2x1bW5DbGFzcyhpZCkge1xuICAgICAgcmV0dXJuIFwiY29sdW1uX1wiICsgKGlkICUgNiB8fCA2KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY3JlYXRlVXNlcklkOiBjcmVhdGVVc2VySWQsXG4gICAgICBmb2N1c0VsZW1lbnQ6IGZvY3VzRWxlbWVudCxcbiAgICAgIG1lc3NhZ2VUeXBlczogbWVzc2FnZVR5cGVzLFxuICAgICAgZ2V0TmV4dElkOiBnZXROZXh0SWQsXG4gICAgICB0b09iamVjdDogdG9PYmplY3QsXG4gICAgICBjb2x1bW5DbGFzczogY29sdW1uQ2xhc3NcbiAgICB9O1xuICB9XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ1ZvdGVTZXJ2aWNlJywgW2Z1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiByZXR1cm5OdW1iZXJPZlZvdGVzKHVzZXJJZCwgbWVzc2FnZXNJZHMpIHtcbiAgICAgIHZhciB1c2VyVm90ZXMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpID8gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpKSA6IHt9XG5cbiAgICAgIHZhciB0b3RhbFZvdGVzID0gT2JqZWN0LmtleXModXNlclZvdGVzKS5tYXAoZnVuY3Rpb24obWVzc2FnZUtleSkge1xuICAgICAgICByZXR1cm4gbWVzc2FnZXNJZHMuaW5kZXhPZihtZXNzYWdlS2V5KSA+PSAwID8gdXNlclZvdGVzW21lc3NhZ2VLZXldIDogMDtcbiAgICAgIH0pLnJlZHVjZShmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYSArIGI7XG4gICAgICB9LCAwKVxuXG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0odXNlcklkKSA/IHRvdGFsVm90ZXMgOiAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4dHJhY3RNZXNzYWdlSWRzKG1lc3NhZ2VzKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXMgPyBtZXNzYWdlcy5tYXAoZnVuY3Rpb24obWVzc2FnZSkgeyByZXR1cm4gbWVzc2FnZS4kaWQgfSkgOiBbXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXR1cm5OdW1iZXJPZlZvdGVzT25NZXNzYWdlKHVzZXJJZCwgbWVzc2FnZUtleSkge1xuICAgICAgdmFyIHVzZXJWb3RlcyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkgPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkpIDoge31cblxuICAgICAgcmV0dXJuIHVzZXJWb3Rlc1ttZXNzYWdlS2V5XSA/IHVzZXJWb3Rlc1ttZXNzYWdlS2V5XSA6IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtYWluaW5nVm90ZXModXNlcklkLCBtYXhWb3RlcywgbWVzc2FnZXMpIHtcbiAgICAgIHZhciBtZXNzYWdlc0lkcyA9IHRoaXMuZXh0cmFjdE1lc3NhZ2VJZHMobWVzc2FnZXMpO1xuXG4gICAgICByZXR1cm4gKG1heFZvdGVzIC0gdGhpcy5yZXR1cm5OdW1iZXJPZlZvdGVzKHVzZXJJZCwgbWVzc2FnZXNJZHMpKSA+IDBcbiAgICAgICAgPyBtYXhWb3RlcyAtIHRoaXMucmV0dXJuTnVtYmVyT2ZWb3Rlcyh1c2VySWQsIG1lc3NhZ2VzSWRzKVxuICAgICAgICA6IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5jcmVhc2VNZXNzYWdlVm90ZXModXNlcklkLCBtZXNzYWdlS2V5KSB7XG4gICAgICBpZiAobG9jYWxTdG9yYWdlLmdldEl0ZW0odXNlcklkKSkge1xuICAgICAgICB2YXIgYm9hcmRWb3RlcyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0odXNlcklkKSk7XG5cbiAgICAgICAgaWYgKGJvYXJkVm90ZXNbbWVzc2FnZUtleV0pIHtcbiAgICAgICAgICBib2FyZFZvdGVzW21lc3NhZ2VLZXldID0gcGFyc2VJbnQoYm9hcmRWb3Rlc1ttZXNzYWdlS2V5XSArIDEpO1xuICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHVzZXJJZCwgSlNPTi5zdHJpbmdpZnkoYm9hcmRWb3RlcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJvYXJkVm90ZXNbbWVzc2FnZUtleV0gPSAxXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odXNlcklkLCBKU09OLnN0cmluZ2lmeShib2FyZFZvdGVzKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBuZXdPYmplY3QgPSB7fTtcbiAgICAgICAgbmV3T2JqZWN0W21lc3NhZ2VLZXldID0gMTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odXNlcklkLCBKU09OLnN0cmluZ2lmeShuZXdPYmplY3QpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWNyZWFzZU1lc3NhZ2VWb3Rlcyh1c2VySWQsIG1lc3NhZ2VLZXkpIHtcbiAgICAgIGlmIChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpKSB7XG4gICAgICAgIHZhciBib2FyZFZvdGVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpKTtcblxuICAgICAgICBpZiAoYm9hcmRWb3Rlc1ttZXNzYWdlS2V5XSA9PT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIGJvYXJkVm90ZXNbbWVzc2FnZUtleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYm9hcmRWb3Rlc1ttZXNzYWdlS2V5XSA9IGJvYXJkVm90ZXNbbWVzc2FnZUtleV0gLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odXNlcklkLCBKU09OLnN0cmluZ2lmeShib2FyZFZvdGVzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWVyZ2VNZXNzYWdlcyh1c2VySWQsIGRyYWdNZXNzYWdlLCBkcm9wTWVzc2FnZSkge1xuICAgICAgdmFyIGRyYWdNZXNzYWdlVm90ZUNvdW50ID0gdGhpcy5yZXR1cm5OdW1iZXJPZlZvdGVzT25NZXNzYWdlKHVzZXJJZCwgZHJhZ01lc3NhZ2UpXG4gICAgICB2YXIgZHJvcE1lc3NhZ2VWb3RlQ291bnQgPSB0aGlzLnJldHVybk51bWJlck9mVm90ZXNPbk1lc3NhZ2UodXNlcklkLCBkcm9wTWVzc2FnZSlcbiAgICAgIHZhciBib2FyZFZvdGVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpKTtcblxuICAgICAgaWYoZHJhZ01lc3NhZ2VWb3RlQ291bnQgPiAwKSB7XG4gICAgICAgIGJvYXJkVm90ZXNbZHJvcE1lc3NhZ2VdID0gZHJhZ01lc3NhZ2VWb3RlQ291bnQgKyBkcm9wTWVzc2FnZVZvdGVDb3VudDtcbiAgICAgICAgZGVsZXRlIGJvYXJkVm90ZXNbZHJhZ01lc3NhZ2VdO1xuXG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHVzZXJJZCwgSlNPTi5zdHJpbmdpZnkoYm9hcmRWb3RlcykpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhblVudm90ZU1lc3NhZ2UodXNlcklkLCBtZXNzYWdlS2V5KSB7XG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0odXNlcklkKSAmJiBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkpW21lc3NhZ2VLZXldID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQWJsZVRvVm90ZSh1c2VySWQsIG1heFZvdGVzLCBtZXNzYWdlcykge1xuICAgICAgcmV0dXJuIHRoaXMucmVtYWluaW5nVm90ZXModXNlcklkLCBtYXhWb3RlcywgbWVzc2FnZXMpID4gMDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcmV0dXJuTnVtYmVyT2ZWb3RlczogcmV0dXJuTnVtYmVyT2ZWb3RlcyxcbiAgICAgIHJldHVybk51bWJlck9mVm90ZXNPbk1lc3NhZ2U6IHJldHVybk51bWJlck9mVm90ZXNPbk1lc3NhZ2UsXG4gICAgICBpbmNyZWFzZU1lc3NhZ2VWb3RlczogaW5jcmVhc2VNZXNzYWdlVm90ZXMsXG4gICAgICBkZWNyZWFzZU1lc3NhZ2VWb3RlczogZGVjcmVhc2VNZXNzYWdlVm90ZXMsXG4gICAgICBleHRyYWN0TWVzc2FnZUlkczogZXh0cmFjdE1lc3NhZ2VJZHMsXG4gICAgICBtZXJnZU1lc3NhZ2VzOiBtZXJnZU1lc3NhZ2VzLFxuICAgICAgcmVtYWluaW5nVm90ZXM6IHJlbWFpbmluZ1ZvdGVzLFxuICAgICAgY2FuVW52b3RlTWVzc2FnZTogY2FuVW52b3RlTWVzc2FnZSxcbiAgICAgIGlzQWJsZVRvVm90ZTogaXNBYmxlVG9Wb3RlXG4gICAgfTtcbiAgfV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdib2FyZENvbnRleHQnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2JvYXJkQ29udGV4dC5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdkaWFsb2dzJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9kaWFsb2dzLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3BhZ2VIZWFkZXInLCBbJ01vZGFsU2VydmljZScsIGZ1bmN0aW9uKG1vZGFsU2VydmljZSkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2hlYWRlci5odG1sJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAkc2NvcGUubW9kYWxTZXJ2aWNlID0gbW9kYWxTZXJ2aWNlO1xuICAgICAgfVxuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluQ29udGVudCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9tYWluQ29udGVudC5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluUGFnZScsIFsnTW9kYWxTZXJ2aWNlJywgZnVuY3Rpb24obW9kYWxTZXJ2aWNlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21haW5QYWdlLmh0bWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICRzY29wZS5tb2RhbFNlcnZpY2UgPSBtb2RhbFNlcnZpY2U7XG4gICAgICB9XG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21lbnUnLCBbJ1ZvdGVTZXJ2aWNlJywgZnVuY3Rpb24odm90ZVNlcnZpY2UpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9tZW51Lmh0bWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICRzY29wZS52b3RlU2VydmljZSA9IHZvdGVTZXJ2aWNlO1xuICAgICAgfVxuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdzcGlubmVyJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9zcGlubmVyLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3VzZXJWb2ljZScsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvdXNlclZvaWNlLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXJcbiAgLm1vZHVsZSgnZmlyZWlkZWF6JylcbiAgLnNlcnZpY2UoJ01vZGFsU2VydmljZScsIFsnbmdEaWFsb2cnLCBmdW5jdGlvbihuZ0RpYWxvZykge1xuICAgIHJldHVybiB7XG4gICAgICBvcGVuQWRkTmV3Q29sdW1uOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2FkZE5ld0NvbHVtbicsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuQWRkTmV3Qm9hcmQ6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnYWRkTmV3Qm9hcmQnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgb3BlbkRlbGV0ZUNhcmQ6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuRGVsZXRlQ29sdW1uOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNvbHVtbicsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIG9wZW5NZXJnZUNhcmRzOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ21lcmdlQ2FyZHMnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgb3BlbkNvcHlCb2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdjb3B5Qm9hcmQnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ25nZGlhbG9nLXRoZW1lLXBsYWluIGJpZ0RpYWxvZycsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5EZWxldGVDYXJkczogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDYXJkcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4gZGFuZ2VyJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgY2xvc2VBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICBuZ0RpYWxvZy5jbG9zZUFsbCgpO1xuICAgICAgfVxuICAgIH07XG4gIH1dKTtcbiJdfQ==
