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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwidm90ZVNlcnZpY2UuanMiLCJkaXJlY3RpdmVzL2JvYXJkQ29udGV4dC5qcyIsImRpcmVjdGl2ZXMvZGlhbG9ncy5qcyIsImRpcmVjdGl2ZXMvaGVhZGVyLmpzIiwiZGlyZWN0aXZlcy9tYWluQ29udGVudC5qcyIsImRpcmVjdGl2ZXMvbWFpblBhZ2UuanMiLCJkaXJlY3RpdmVzL21lbnUuanMiLCJkaXJlY3RpdmVzL3NwaW5uZXIuanMiLCJkaXJlY3RpdmVzL3VzZXJWb2ljZS5qcyIsInNlcnZpY2VzL21vZGFsU2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonLCBbJ2ZpcmViYXNlJyxcbiAgICAgICAgICAgICAgICduZ0RpYWxvZycsXG4gICAgICAgICAgICAgICAnbHZsLmRpcmVjdGl2ZXMuZHJhZ2Ryb3AnLFxuICAgICAgICAgICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgICAgICAgICAgJ25nQXJpYSddKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnQXV0aCcsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWFpblJlZiA9IG5ldyBGaXJlYmFzZSgnaHR0cHM6Ly9ibGluZGluZy10b3JjaC02NjYyLmZpcmViYXNlaW8uY29tJyk7XG5cbiAgICBmdW5jdGlvbiBsb2dVc2VyKHVzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLnVuYXV0aCgpO1xuICAgICAgbWFpblJlZi5hdXRoV2l0aFBhc3N3b3JkKHtcbiAgICAgICAgZW1haWwgICAgOiB1c2VyICsgJ0BmaXJlaWRlYXouY29tJyxcbiAgICAgICAgcGFzc3dvcmQgOiB1c2VyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvciwgYXV0aERhdGEpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0xvZyB1c2VyIGZhaWxlZDogJywgZXJyb3IpO1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgICAgbG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soYXV0aERhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyQW5kTG9nKG5ld1VzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLmNyZWF0ZVVzZXIoe1xuICAgICAgICBlbWFpbCAgICA6IG5ld1VzZXIgKyAnQGZpcmVpZGVhei5jb20nLFxuICAgICAgICBwYXNzd29yZCA6IG5ld1VzZXJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGUgdXNlciBmYWlsZWQ6ICcsIGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dVc2VyKG5ld1VzZXIsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VyQW5kTG9nOiBjcmVhdGVVc2VyQW5kTG9nLFxuICAgICAgbG9nVXNlcjogbG9nVXNlclxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4ubW9kdWxlKCdmaXJlaWRlYXonKVxuLmRpcmVjdGl2ZSgnZW50ZXJDbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSkge1xuICAgICAgZWxlbS5iaW5kKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAkKGVsZW1bMF0pLmZpbmQoJ2J1dHRvbicpLmZvY3VzKCk7XG4gICAgICAgICAgJChlbGVtWzBdKS5maW5kKCdidXR0b24nKS5jbGljaygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnRmlyZWJhc2VTZXJ2aWNlJywgWyckZmlyZWJhc2VBcnJheScsIGZ1bmN0aW9uICgkZmlyZWJhc2VBcnJheSkge1xuICAgIHZhciBmaXJlYmFzZVVybCA9ICdodHRwczovL2JsaW5kaW5nLXRvcmNoLTY2NjIuZmlyZWJhc2Vpby5jb20nO1xuXG4gICAgZnVuY3Rpb24gbmV3RmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZikge1xuICAgICAgcmV0dXJuICRmaXJlYmFzZUFycmF5KG1lc3NhZ2VzUmVmKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZXJ2ZXJUaW1lc3RhbXAoKSB7XG4gICAgICByZXR1cm4gRmlyZWJhc2UuU2VydmVyVmFsdWUuVElNRVNUQU1QO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2VzUmVmKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZVJlZih1c2VySWQsIG1lc3NhZ2VJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvbWVzc2FnZXMvJyArIHVzZXJJZCArICcvJyArIG1lc3NhZ2VJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRSZWYodXNlcklkKSB7XG4gICAgICByZXR1cm4gbmV3IEZpcmViYXNlKGZpcmViYXNlVXJsICsgJy9ib2FyZHMvJyArIHVzZXJJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Qm9hcmRDb2x1bW5zKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvYm9hcmRzLycgKyB1c2VySWQgKyAnL2NvbHVtbnMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmV3RmlyZWJhc2VBcnJheTogbmV3RmlyZWJhc2VBcnJheSxcbiAgICAgIGdldFNlcnZlclRpbWVzdGFtcDogZ2V0U2VydmVyVGltZXN0YW1wLFxuICAgICAgZ2V0TWVzc2FnZXNSZWY6IGdldE1lc3NhZ2VzUmVmLFxuICAgICAgZ2V0TWVzc2FnZVJlZjogZ2V0TWVzc2FnZVJlZixcbiAgICAgIGdldEJvYXJkUmVmOiBnZXRCb2FyZFJlZixcbiAgICAgIGdldEJvYXJkQ29sdW1uczogZ2V0Qm9hcmRDb2x1bW5zXG4gICAgfTtcbiAgfV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5jb250cm9sbGVyKCdNYWluQ3RybCcsIFsnJHNjb3BlJywgJyRmaWx0ZXInLFxuICAgICckd2luZG93JywgJ1V0aWxzJywgJ0F1dGgnLCAnJHJvb3RTY29wZScsICdGaXJlYmFzZVNlcnZpY2UnLCAnTW9kYWxTZXJ2aWNlJywgJ1ZvdGVTZXJ2aWNlJyxcbiAgICBmdW5jdGlvbigkc2NvcGUsICRmaWx0ZXIsICR3aW5kb3csIHV0aWxzLCBhdXRoLCAkcm9vdFNjb3BlLCBmaXJlYmFzZVNlcnZpY2UsIG1vZGFsU2VydmljZSwgdm90ZVNlcnZpY2UpIHtcbiAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5tZXNzYWdlVHlwZXMgPSB1dGlscy5tZXNzYWdlVHlwZXM7XG4gICAgICAkc2NvcGUudXRpbHMgPSB1dGlscztcbiAgICAgICRzY29wZS5uZXdCb2FyZCA9IHtcbiAgICAgICAgbmFtZTogJydcbiAgICAgIH07XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICRzY29wZS5zb3J0RmllbGQgPSAnJGlkJztcbiAgICAgICRzY29wZS5zZWxlY3RlZFR5cGUgPSAxO1xuXG4gICAgICAkc2NvcGUuY2xvc2VBbGxNb2RhbHMgPSBmdW5jdGlvbigpe1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5nZXROdW1iZXJPZlZvdGVzT25NZXNzYWdlID0gZnVuY3Rpb24odXNlcklkLCBtZXNzYWdlSWQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheSh2b3RlU2VydmljZS5yZXR1cm5OdW1iZXJPZlZvdGVzT25NZXNzYWdlKHVzZXJJZCwgbWVzc2FnZUlkKSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldEJvYXJkQW5kTWVzc2FnZXModXNlckRhdGEpIHtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkgfHwgJzQ5OXNtJztcblxuICAgICAgICB2YXIgbWVzc2FnZXNSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZXNSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIHZhciBib2FyZCA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZFJlZigkc2NvcGUudXNlcklkKTtcblxuICAgICAgICBib2FyZC5vbigndmFsdWUnLCBmdW5jdGlvbihib2FyZCkge1xuICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkLnZhbCgpO1xuICAgICAgICAgICRzY29wZS5tYXhWb3RlcyA9IGJvYXJkLnZhbCgpLm1heF92b3RlcyA/IGJvYXJkLnZhbCgpLm1heF92b3RlcyA6IDY7XG4gICAgICAgICAgJHNjb3BlLmJvYXJkSWQgPSAkcm9vdFNjb3BlLmJvYXJkSWQgPSBib2FyZC52YWwoKS5ib2FyZElkO1xuICAgICAgICAgICRzY29wZS5ib2FyZENvbnRleHQgPSAkcm9vdFNjb3BlLmJvYXJkQ29udGV4dCA9IGJvYXJkLnZhbCgpLmJvYXJkQ29udGV4dDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmJvYXJkUmVmID0gYm9hcmQ7XG4gICAgICAgICRzY29wZS5tZXNzYWdlc1JlZiA9IG1lc3NhZ2VzUmVmO1xuICAgICAgICAkc2NvcGUudXNlclVpZCA9IHVzZXJEYXRhLnVpZDtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzID0gZmlyZWJhc2VTZXJ2aWNlLm5ld0ZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpO1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoJHNjb3BlLnVzZXJJZCAhPT0gJycpIHtcbiAgICAgICAgLy92YXIgbWVzc2FnZXNSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZXNSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGF1dGgubG9nVXNlcigkc2NvcGUudXNlcklkLCBnZXRCb2FyZEFuZE1lc3NhZ2VzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5pc0NvbHVtblNlbGVjdGVkID0gZnVuY3Rpb24odHlwZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQoJHNjb3BlLnNlbGVjdGVkVHlwZSkgPT09IHBhcnNlSW50KHR5cGUpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmdldFNvcnRPcmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJHNjb3BlLnNvcnRGaWVsZCA9PT0gJ3ZvdGVzJyA/IHRydWUgOiBmYWxzZTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zYXZlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgbWVzc2FnZS5jcmVhdGluZyA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUubWVzc2FnZXMuJHNhdmUobWVzc2FnZSk7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS52b3RlID0gZnVuY3Rpb24obWVzc2FnZUtleSwgdm90ZXMpIHtcbiAgICAgICAgaWYodm90ZVNlcnZpY2UuaXNBYmxlVG9Wb3RlKCRzY29wZS51c2VySWQsICRzY29wZS5tYXhWb3RlcywgJHNjb3BlLm1lc3NhZ2VzKSkge1xuICAgICAgICAgICRzY29wZS5tZXNzYWdlc1JlZi5jaGlsZChtZXNzYWdlS2V5KS51cGRhdGUoe1xuICAgICAgICAgICAgdm90ZXM6IHZvdGVzICsgMSxcbiAgICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdm90ZVNlcnZpY2UuaW5jcmVhc2VNZXNzYWdlVm90ZXMoJHNjb3BlLnVzZXJJZCwgbWVzc2FnZUtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgJHNjb3BlLnVudm90ZSA9IGZ1bmN0aW9uKG1lc3NhZ2VLZXksIHZvdGVzKSB7XG4gICAgICAgIGlmKHZvdGVTZXJ2aWNlLmNhblVudm90ZU1lc3NhZ2UoJHNjb3BlLnVzZXJJZCwgbWVzc2FnZUtleSkpIHtcbiAgICAgICAgICAkc2NvcGUubWVzc2FnZXNSZWYuY2hpbGQobWVzc2FnZUtleSkudXBkYXRlKHtcbiAgICAgICAgICAgIHZvdGVzOiB2b3RlcyAtIDEsXG4gICAgICAgICAgICBkYXRlOiBmaXJlYmFzZVNlcnZpY2UuZ2V0U2VydmVyVGltZXN0YW1wKClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZvdGVTZXJ2aWNlLmRlY3JlYXNlTWVzc2FnZVZvdGVzKCRzY29wZS51c2VySWQsIG1lc3NhZ2VLZXkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHJlZGlyZWN0VG9Cb2FyZCgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luICtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyAnIycgKyAkc2NvcGUudXNlcklkO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuY3JlYXRlTmV3Qm9hcmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9IHV0aWxzLmNyZWF0ZVVzZXJJZCgpO1xuXG4gICAgICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uKHVzZXJEYXRhKSB7XG4gICAgICAgICAgdmFyIGJvYXJkID0gZmlyZWJhc2VTZXJ2aWNlLmdldEJvYXJkUmVmKCRzY29wZS51c2VySWQpO1xuICAgICAgICAgIGJvYXJkLnNldCh7XG4gICAgICAgICAgICBib2FyZElkOiAkc2NvcGUubmV3Qm9hcmQubmFtZSxcbiAgICAgICAgICAgIGRhdGVfY3JlYXRlZDogbmV3IERhdGUoKS50b1N0cmluZygpLFxuICAgICAgICAgICAgY29sdW1uczogJHNjb3BlLm1lc3NhZ2VUeXBlcyxcbiAgICAgICAgICAgIHVzZXJfaWQ6IHVzZXJEYXRhLnVpZCxcbiAgICAgICAgICAgIG1heF92b3RlczogJHNjb3BlLm5ld0JvYXJkLm1heF92b3RlcyB8fCA2XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZWRpcmVjdFRvQm9hcmQoKTtcblxuICAgICAgICAgICRzY29wZS5uZXdCb2FyZC5uYW1lID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgYXV0aC5jcmVhdGVVc2VyQW5kTG9nKCRzY29wZS51c2VySWQsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5jaGFuZ2VCb2FyZENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkUmVmLnVwZGF0ZSh7XG4gICAgICAgICAgYm9hcmRDb250ZXh0OiAkc2NvcGUuYm9hcmRDb250ZXh0XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmNoYW5nZUJvYXJkTmFtZSA9IGZ1bmN0aW9uKG5ld0JvYXJkTmFtZSkge1xuICAgICAgICAkc2NvcGUuYm9hcmRSZWYudXBkYXRlKHtcbiAgICAgICAgICBib2FyZElkOiBuZXdCb2FyZE5hbWVcbiAgICAgICAgfSk7XG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmFkZE5ld0NvbHVtbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkLmNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgdmFsdWU6IG5hbWUsXG4gICAgICAgICAgaWQ6IHV0aWxzLmdldE5leHRJZCgkc2NvcGUuYm9hcmQpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG5cbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2hhbmdlQ29sdW1uTmFtZSA9IGZ1bmN0aW9uKGlkLCBuZXdOYW1lKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zW2lkIC0gMV0gPSB7XG4gICAgICAgICAgdmFsdWU6IG5ld05hbWUsXG4gICAgICAgICAgaWQ6IGlkXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcblxuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVDb2x1bW4gPSBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkLmNvbHVtbnMgPSAkc2NvcGUuYm9hcmQuY29sdW1ucy5maWx0ZXIoZnVuY3Rpb24oX2NvbHVtbikge1xuICAgICAgICAgICAgcmV0dXJuIF9jb2x1bW4uaWQgIT09IGNvbHVtbi5pZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLiRyZW1vdmUobWVzc2FnZSk7XG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gYWRkTWVzc2FnZUNhbGxiYWNrKG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGlkID0gbWVzc2FnZS5rZXkoKTtcbiAgICAgICAgYW5ndWxhci5lbGVtZW50KCQoJyMnICsgaWQpKS5zY29wZSgpLmlzRWRpdGluZyA9IHRydWU7XG4gICAgICAgICQoJyMnICsgaWQpLmZpbmQoJ3RleHRhcmVhJykuZm9jdXMoKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmFkZE5ld01lc3NhZ2UgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICRzY29wZS5tZXNzYWdlcy4kYWRkKHtcbiAgICAgICAgICB0ZXh0OiAnJyxcbiAgICAgICAgICBjcmVhdGluZzogdHJ1ZSxcbiAgICAgICAgICB1c2VyX2lkOiAkc2NvcGUudXNlclVpZCxcbiAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICBpZDogdHlwZS5pZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpLFxuICAgICAgICAgIHZvdGVzOiAwXG4gICAgICAgIH0pLnRoZW4oYWRkTWVzc2FnZUNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVDYXJkcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCRzY29wZS5tZXNzYWdlcykuZWFjaChmdW5jdGlvbihpbmRleCwgbWVzc2FnZSkge1xuICAgICAgICAgICRzY29wZS5tZXNzYWdlcy4kcmVtb3ZlKG1lc3NhZ2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5nZXRCb2FyZFRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCRzY29wZS5ib2FyZCkge1xuICAgICAgICAgIHZhciBjbGlwYm9hcmQgPSAnJztcblxuICAgICAgICAgICQoJHNjb3BlLmJvYXJkLmNvbHVtbnMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGNvbHVtbikge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnPHN0cm9uZz4nICsgY29sdW1uLnZhbHVlICsgJzwvc3Ryb25nPjxiciAvPic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJzxiciAvPjxzdHJvbmc+JyArIGNvbHVtbi52YWx1ZSArICc8L3N0cm9uZz48YnIgLz4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZpbHRlcmVkQXJyYXkgPSAkZmlsdGVyKCdvcmRlckJ5JykoJHNjb3BlLm1lc3NhZ2VzLFxuICAgICAgICAgICAgICAkc2NvcGUuc29ydEZpZWxkLFxuICAgICAgICAgICAgICAkc2NvcGUuZ2V0U29ydE9yZGVyKCkpO1xuXG4gICAgICAgICAgICAkKGZpbHRlcmVkQXJyYXkpLmVhY2goZnVuY3Rpb24oaW5kZXgyLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUuaWQgPT09IGNvbHVtbi5pZCkge1xuICAgICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnLSAnICsgbWVzc2FnZS50ZXh0ICsgJyAoJyArIG1lc3NhZ2Uudm90ZXMgKyAnIHZvdGVzKSA8YnIgLz4nO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybiBjbGlwYm9hcmQ7XG4gICAgICAgIH0gZWxzZSByZXR1cm4gJyc7XG4gICAgICB9O1xuXG4gICAgICBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdykuYmluZCgnaGFzaGNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpIHx8ICcnO1xuICAgICAgICBhdXRoLmxvZ1VzZXIoJHNjb3BlLnVzZXJJZCwgZ2V0Qm9hcmRBbmRNZXNzYWdlcyk7XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5jb250cm9sbGVyKCdNZXNzYWdlQ3RybCcsIFsnJHNjb3BlJywgJyRmaWx0ZXInLFxuICAgICAgICAgICAgICAnJHdpbmRvdycsICdBdXRoJywgJyRyb290U2NvcGUnLCAnRmlyZWJhc2VTZXJ2aWNlJywgJ01vZGFsU2VydmljZScsICdWb3RlU2VydmljZScsXG4gICAgZnVuY3Rpb24oJHNjb3BlLCAkZmlsdGVyLCAkd2luZG93LCBhdXRoLCAkcm9vdFNjb3BlLCBmaXJlYmFzZVNlcnZpY2UsIG1vZGFsU2VydmljZSwgdm90ZVNlcnZpY2UpIHtcbiAgICAgICRzY29wZS5tb2RhbFNlcnZpY2UgPSBtb2RhbFNlcnZpY2U7XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKTtcblxuICAgICAgJHNjb3BlLmRyb3BwZWRFdmVudCA9IGZ1bmN0aW9uKGRyYWdFbCwgZHJvcEVsKSB7XG4gICAgICAgIGlmKGRyYWdFbCAhPT0gZHJvcEVsKSB7XG4gICAgICAgICAgJHNjb3BlLmRyYWdFbCA9IGRyYWdFbDtcbiAgICAgICAgICAkc2NvcGUuZHJvcEVsID0gZHJvcEVsO1xuXG4gICAgICAgICAgbW9kYWxTZXJ2aWNlLm9wZW5NZXJnZUNhcmRzKCRzY29wZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kcm9wcGVkID0gZnVuY3Rpb24oZHJhZ0VsLCBkcm9wRWwpIHtcbiAgICAgICAgdmFyIGRyYWcgPSAkKCcjJyArIGRyYWdFbCk7XG4gICAgICAgIHZhciBkcm9wID0gJCgnIycgKyBkcm9wRWwpO1xuXG4gICAgICAgIHZhciBkcm9wTWVzc2FnZVJlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlUmVmKCRzY29wZS51c2VySWQsIGRyb3AuYXR0cignbWVzc2FnZUlkJykpO1xuICAgICAgICB2YXIgZHJhZ01lc3NhZ2VSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZVJlZigkc2NvcGUudXNlcklkLCBkcmFnLmF0dHIoJ21lc3NhZ2VJZCcpKTtcblxuICAgICAgICBkcm9wTWVzc2FnZVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRyb3BNZXNzYWdlKSB7XG4gICAgICAgICAgZHJhZ01lc3NhZ2VSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkcmFnTWVzc2FnZSkge1xuICAgICAgICAgICAgZHJvcE1lc3NhZ2VSZWYudXBkYXRlKHtcbiAgICAgICAgICAgICAgdGV4dDogZHJvcE1lc3NhZ2UudmFsKCkudGV4dCArICcgfCAnICsgZHJhZ01lc3NhZ2UudmFsKCkudGV4dCxcbiAgICAgICAgICAgICAgdm90ZXM6IGRyb3BNZXNzYWdlLnZhbCgpLnZvdGVzICsgZHJhZ01lc3NhZ2UudmFsKCkudm90ZXNcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2b3RlU2VydmljZS5tZXJnZU1lc3NhZ2VzKCRzY29wZS51c2VySWQsIGRyYWcuYXR0cignbWVzc2FnZUlkJyksIGRyb3AuYXR0cignbWVzc2FnZUlkJykpO1xuXG4gICAgICAgICAgICBkcmFnTWVzc2FnZVJlZi5yZW1vdmUoKTtcbiAgICAgICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfV1cbiAgKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnVXRpbHMnLCBbZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIGNyZWF0ZVVzZXJJZCgpIHtcbiAgICAgIHZhciB0ZXh0ID0gJyc7XG4gICAgICB2YXIgcG9zc2libGUgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5JztcblxuICAgICAgZm9yKCB2YXIgaT0wOyBpIDwgNzsgaSsrICkge1xuICAgICAgICB0ZXh0ICs9IHBvc3NpYmxlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwb3NzaWJsZS5sZW5ndGgpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9jdXNFbGVtZW50KGlkKSB7XG4gICAgICAkKCcjJyArIGlkKS5maW5kKCd0ZXh0YXJlYScpLmZvY3VzKCk7XG4gICAgfVxuXG4gICAgdmFyIG1lc3NhZ2VUeXBlcyA9IFt7XG4gICAgICBpZDogMSxcbiAgICAgIHZhbHVlOiAnV2VudCB3ZWxsJ1xuICAgIH0sIHtcbiAgICAgIGlkOiAyLFxuICAgICAgdmFsdWU6ICdUbyBpbXByb3ZlJ1xuICAgIH0sIHtcbiAgICAgIGlkOiAzLFxuICAgICAgdmFsdWU6ICdBY3Rpb24gaXRlbXMnXG4gICAgfV07XG5cbiAgICBmdW5jdGlvbiBnZXROZXh0SWQoYm9hcmQpIHtcbiAgICAgIHJldHVybiBib2FyZC5jb2x1bW5zLnNsaWNlKC0xKS5wb3AoKS5pZCArIDE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9PYmplY3QoYXJyYXkpIHtcbiAgICAgIHZhciBvYmplY3QgPSB7fTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBvYmplY3RbaV0gPSB7XG4gICAgICAgICAgaWQ6IGFycmF5W2ldLmlkLFxuICAgICAgICAgIHZhbHVlOiBhcnJheVtpXS52YWx1ZVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbHVtbkNsYXNzKGlkKSB7XG4gICAgICByZXR1cm4gXCJjb2x1bW5fXCIgKyAoaWQgJSA2IHx8IDYpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VySWQ6IGNyZWF0ZVVzZXJJZCxcbiAgICAgIGZvY3VzRWxlbWVudDogZm9jdXNFbGVtZW50LFxuICAgICAgbWVzc2FnZVR5cGVzOiBtZXNzYWdlVHlwZXMsXG4gICAgICBnZXROZXh0SWQ6IGdldE5leHRJZCxcbiAgICAgIHRvT2JqZWN0OiB0b09iamVjdCxcbiAgICAgIGNvbHVtbkNsYXNzOiBjb2x1bW5DbGFzc1xuICAgIH07XG4gIH1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnVm90ZVNlcnZpY2UnLCBbZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIHJldHVybk51bWJlck9mVm90ZXModXNlcklkLCBtZXNzYWdlc0lkcykge1xuICAgICAgdmFyIHVzZXJWb3RlcyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkgPyBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkpIDoge31cblxuICAgICAgdmFyIHRvdGFsVm90ZXMgPSBPYmplY3Qua2V5cyh1c2VyVm90ZXMpLm1hcChmdW5jdGlvbihtZXNzYWdlS2V5KSB7XG4gICAgICAgIHJldHVybiBtZXNzYWdlc0lkcy5pbmRleE9mKG1lc3NhZ2VLZXkpID49IDAgPyB1c2VyVm90ZXNbbWVzc2FnZUtleV0gOiAwO1xuICAgICAgfSkucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhICsgYjtcbiAgICAgIH0sIDApXG5cbiAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpID8gdG90YWxWb3RlcyA6IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXh0cmFjdE1lc3NhZ2VJZHMobWVzc2FnZXMpIHtcbiAgICAgIHJldHVybiBtZXNzYWdlcyA/IG1lc3NhZ2VzLm1hcChmdW5jdGlvbihtZXNzYWdlKSB7IHJldHVybiBtZXNzYWdlLiRpZCB9KSA6IFtdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJldHVybk51bWJlck9mVm90ZXNPbk1lc3NhZ2UodXNlcklkLCBtZXNzYWdlS2V5KSB7XG4gICAgICB2YXIgdXNlclZvdGVzID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0odXNlcklkKSA/IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0odXNlcklkKSkgOiB7fVxuXG4gICAgICByZXR1cm4gdXNlclZvdGVzW21lc3NhZ2VLZXldID8gdXNlclZvdGVzW21lc3NhZ2VLZXldIDogMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1haW5pbmdWb3Rlcyh1c2VySWQsIG1heFZvdGVzLCBtZXNzYWdlcykge1xuICAgICAgdmFyIG1lc3NhZ2VzSWRzID0gdGhpcy5leHRyYWN0TWVzc2FnZUlkcyhtZXNzYWdlcyk7XG5cbiAgICAgIHJldHVybiAobWF4Vm90ZXMgLSB0aGlzLnJldHVybk51bWJlck9mVm90ZXModXNlcklkLCBtZXNzYWdlc0lkcykpID4gMFxuICAgICAgICA/IG1heFZvdGVzIC0gdGhpcy5yZXR1cm5OdW1iZXJPZlZvdGVzKHVzZXJJZCwgbWVzc2FnZXNJZHMpXG4gICAgICAgIDogMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbmNyZWFzZU1lc3NhZ2VWb3Rlcyh1c2VySWQsIG1lc3NhZ2VLZXkpIHtcbiAgICAgIGlmIChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpKSB7XG4gICAgICAgIHZhciBib2FyZFZvdGVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpKTtcblxuICAgICAgICBpZiAoYm9hcmRWb3Rlc1ttZXNzYWdlS2V5XSkge1xuICAgICAgICAgIGJvYXJkVm90ZXNbbWVzc2FnZUtleV0gPSBwYXJzZUludChib2FyZFZvdGVzW21lc3NhZ2VLZXldICsgMSk7XG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odXNlcklkLCBKU09OLnN0cmluZ2lmeShib2FyZFZvdGVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYm9hcmRWb3Rlc1ttZXNzYWdlS2V5XSA9IDFcbiAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh1c2VySWQsIEpTT04uc3RyaW5naWZ5KGJvYXJkVm90ZXMpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5ld09iamVjdCA9IHt9O1xuICAgICAgICBuZXdPYmplY3RbbWVzc2FnZUtleV0gPSAxO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh1c2VySWQsIEpTT04uc3RyaW5naWZ5KG5ld09iamVjdCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlY3JlYXNlTWVzc2FnZVZvdGVzKHVzZXJJZCwgbWVzc2FnZUtleSkge1xuICAgICAgaWYgKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkpIHtcbiAgICAgICAgdmFyIGJvYXJkVm90ZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkpO1xuXG4gICAgICAgIGlmIChib2FyZFZvdGVzW21lc3NhZ2VLZXldID09PSAxKSB7XG4gICAgICAgICAgICBkZWxldGUgYm9hcmRWb3Rlc1ttZXNzYWdlS2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBib2FyZFZvdGVzW21lc3NhZ2VLZXldID0gYm9hcmRWb3Rlc1ttZXNzYWdlS2V5XSAtIDE7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSh1c2VySWQsIEpTT04uc3RyaW5naWZ5KGJvYXJkVm90ZXMpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtZXJnZU1lc3NhZ2VzKHVzZXJJZCwgZHJhZ01lc3NhZ2UsIGRyb3BNZXNzYWdlKSB7XG4gICAgICB2YXIgZHJhZ01lc3NhZ2VWb3RlQ291bnQgPSB0aGlzLnJldHVybk51bWJlck9mVm90ZXNPbk1lc3NhZ2UodXNlcklkLCBkcmFnTWVzc2FnZSlcbiAgICAgIHZhciBkcm9wTWVzc2FnZVZvdGVDb3VudCA9IHRoaXMucmV0dXJuTnVtYmVyT2ZWb3Rlc09uTWVzc2FnZSh1c2VySWQsIGRyb3BNZXNzYWdlKVxuICAgICAgdmFyIGJvYXJkVm90ZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVzZXJJZCkpO1xuXG4gICAgICBpZihkcmFnTWVzc2FnZVZvdGVDb3VudCA+IDApIHtcbiAgICAgICAgYm9hcmRWb3Rlc1tkcm9wTWVzc2FnZV0gPSBkcmFnTWVzc2FnZVZvdGVDb3VudCArIGRyb3BNZXNzYWdlVm90ZUNvdW50O1xuICAgICAgICBkZWxldGUgYm9hcmRWb3Rlc1tkcmFnTWVzc2FnZV07XG5cbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odXNlcklkLCBKU09OLnN0cmluZ2lmeShib2FyZFZvdGVzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuVW52b3RlTWVzc2FnZSh1c2VySWQsIG1lc3NhZ2VLZXkpIHtcbiAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSh1c2VySWQpICYmIEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0odXNlcklkKSlbbWVzc2FnZUtleV0gPyB0cnVlIDogZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBYmxlVG9Wb3RlKHVzZXJJZCwgbWF4Vm90ZXMsIG1lc3NhZ2VzKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW1haW5pbmdWb3Rlcyh1c2VySWQsIG1heFZvdGVzLCBtZXNzYWdlcykgPiAwO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICByZXR1cm5OdW1iZXJPZlZvdGVzOiByZXR1cm5OdW1iZXJPZlZvdGVzLFxuICAgICAgcmV0dXJuTnVtYmVyT2ZWb3Rlc09uTWVzc2FnZTogcmV0dXJuTnVtYmVyT2ZWb3Rlc09uTWVzc2FnZSxcbiAgICAgIGluY3JlYXNlTWVzc2FnZVZvdGVzOiBpbmNyZWFzZU1lc3NhZ2VWb3RlcyxcbiAgICAgIGRlY3JlYXNlTWVzc2FnZVZvdGVzOiBkZWNyZWFzZU1lc3NhZ2VWb3RlcyxcbiAgICAgIGV4dHJhY3RNZXNzYWdlSWRzOiBleHRyYWN0TWVzc2FnZUlkcyxcbiAgICAgIG1lcmdlTWVzc2FnZXM6IG1lcmdlTWVzc2FnZXMsXG4gICAgICByZW1haW5pbmdWb3RlczogcmVtYWluaW5nVm90ZXMsXG4gICAgICBjYW5VbnZvdGVNZXNzYWdlOiBjYW5VbnZvdGVNZXNzYWdlLFxuICAgICAgaXNBYmxlVG9Wb3RlOiBpc0FibGVUb1ZvdGVcbiAgICB9O1xuICB9XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2JvYXJkQ29udGV4dCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvYm9hcmRDb250ZXh0Lmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2RpYWxvZ3MnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2RpYWxvZ3MuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgncGFnZUhlYWRlcicsIFsnTW9kYWxTZXJ2aWNlJywgZnVuY3Rpb24obW9kYWxTZXJ2aWNlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvaGVhZGVyLmh0bWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICRzY29wZS5tb2RhbFNlcnZpY2UgPSBtb2RhbFNlcnZpY2U7XG4gICAgICB9XG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21haW5Db250ZW50JywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21haW5Db250ZW50Lmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21haW5QYWdlJywgWydNb2RhbFNlcnZpY2UnLCBmdW5jdGlvbihtb2RhbFNlcnZpY2UpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWFpblBhZ2UuaHRtbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgJHNjb3BlLm1vZGFsU2VydmljZSA9IG1vZGFsU2VydmljZTtcbiAgICAgIH1cbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgnbWVudScsIFsnVm90ZVNlcnZpY2UnLCBmdW5jdGlvbih2b3RlU2VydmljZSkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21lbnUuaHRtbCcsXG4gICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgJHNjb3BlLnZvdGVTZXJ2aWNlID0gdm90ZVNlcnZpY2U7XG4gICAgICB9XG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3NwaW5uZXInLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL3NwaW5uZXIuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgndXNlclZvaWNlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy91c2VyVm9pY2UuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnTW9kYWxTZXJ2aWNlJywgWyduZ0RpYWxvZycsIGZ1bmN0aW9uKG5nRGlhbG9nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wZW5BZGROZXdDb2x1bW46IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnYWRkTmV3Q29sdW1uJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5BZGROZXdCb2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdhZGROZXdCb2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuRGVsZXRlQ2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDYXJkJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5EZWxldGVDb2x1bW46IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ29sdW1uJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgb3Blbk1lcmdlQ2FyZHM6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnbWVyZ2VDYXJkcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuQ29weUJvYXJkOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2NvcHlCb2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4gYmlnRGlhbG9nJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgb3BlbkRlbGV0ZUNhcmRzOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNhcmRzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbiBkYW5nZXInLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBjbG9zZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgIG5nRGlhbG9nLmNsb3NlQWxsKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuIl19
