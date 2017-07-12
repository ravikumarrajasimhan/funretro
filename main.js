angular.module('fireideaz', ['firebase',
               'ngDialog',
               'lvl.directives.dragdrop',
               'ngSanitize',
               'ngAria',
               'ngFileUpload']);

'use strict';

angular
  .module('fireideaz')
  .service('Auth', ['$firebaseAuth', function ($firebaseAuth) {
    var mainAuthRef = $firebaseAuth();

    function logUser(user, callback) {
      var email = user + '@fireideaz.com';
      var password = user;

      mainAuthRef.$signOut();
      mainAuthRef.$signInWithEmailAndPassword(email, password).then(function(userData) {
        callback(userData);
      }, function(error) {
        console.log('Logged user failed: ', error);
        window.location.hash = '';
        location.reload();
      });
    }

    function createUserAndLog(newUser, callback) {
      var email = newUser + '@fireideaz.com';
      var password = newUser;

      mainAuthRef.$createUserWithEmailAndPassword(email, password).then(function() {
        logUser(newUser, callback);
      }, function(error) {
        console.log('Create user failed: ', error);
      });
    }

    return {
      createUserAndLog: createUserAndLog,
      logUser: logUser
    };
  }]);

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
  .service('FirebaseService', ['firebase', '$firebaseArray', function (firebase, $firebaseArray) {
    function newFirebaseArray(messagesRef) {
      return $firebaseArray(messagesRef);
    }

    function getServerTimestamp() {
      return firebase.database.ServerValue.TIMESTAMP;
    }

    function getMessagesRef(userId) {
      return firebase.database().ref('/messages/' + userId);
    }

    function getMessageRef(userId, messageId) {
      return firebase.database().ref('/messages/' + userId + '/' + messageId);
    }

    function getBoardRef(userId) {
      return firebase.database().ref('/boards/' + userId);
    }

    function getBoardColumns(userId) {
      return firebase.database().ref('/boards/' + userId + '/columns');
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

  .controller('MainCtrl', ['$scope', '$filter', '$window', 'Utils', 'Auth',
  '$rootScope', 'FirebaseService', 'ModalService', 'VoteService',
    function ($scope, $filter, $window, utils, auth, $rootScope, firebaseService, modalService, voteService) {
      $scope.loading = true;
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = {
        name: ''
      };
      $scope.userId = $window.location.hash.substring(1) || '';
      $scope.sortField = 'date_created';
      $scope.selectedType = 1;
      $scope.import = {
        data : [],
        mapping : []
      };

      $scope.closeAllModals = function(){
        modalService.closeAll();
      };

      $scope.getNumberOfVotesOnMessage = function(userId, messageId) {
        return new Array(voteService.returnNumberOfVotesOnMessage(userId, messageId));
      };

      $scope.droppedEvent = function(dragEl, dropEl) {
        var drag = $('#' + dragEl);
        var drop = $('#' + dropEl);
        var dragMessageRef = firebaseService.getMessageRef($scope.userId, drag.attr('messageId'));

        dragMessageRef.once('value', function() {
          dragMessageRef.update({
            type: {
              id: drop.data('column-id')
            }
          });
        });
      };

      function getBoardAndMessages(userData) {
        $scope.userId = $window.location.hash.substring(1) || '499sm';

        var messagesRef = firebaseService.getMessagesRef($scope.userId);
        var board = firebaseService.getBoardRef($scope.userId);

        board.once('value', function(board) {
          if (board.val() === null) {
            window.location.hash = '';
            location.reload();
          }

          $scope.board = board.val();
          $scope.maxVotes = board.val().max_votes ? board.val().max_votes : 6;
          $scope.boardId = $rootScope.boardId = board.val().boardId;
          $scope.boardContext = $rootScope.boardContext = board.val().boardContext;
          $scope.loading = false;
        }, function() {
          window.location.hash = '';
          location.reload();
        });

        $scope.boardRef = board;
        $scope.messagesRef = messagesRef;
        $scope.userUid = userData.uid;
        $scope.messages = firebaseService.newFirebaseArray(messagesRef);
      }

      if ($scope.userId !== '') {
        auth.logUser($scope.userId, getBoardAndMessages);
      } else {
        $scope.loading = false;
      }

      $scope.isColumnSelected = function(type) {
        return parseInt($scope.selectedType) === parseInt(type);
      };

      $scope.getSortFields = function() {
        return $scope.sortField === 'votes' ? ['-votes', 'date_created'] : 'date_created';
      };

      $scope.saveMessage = function(message) {
        message.creating = false;
        $scope.messages.$save(message);
      };

      $scope.vote = function(messageKey, votes) {
        if(voteService.isAbleToVote($scope.userId, $scope.maxVotes, $scope.messages)) {
          $scope.messagesRef.child(messageKey).update({
            votes: votes + 1,
            date: firebaseService.getServerTimestamp()
          });

          voteService.increaseMessageVotes($scope.userId, messageKey);
        }
      };

      $scope.unvote = function(messageKey, votes) {
        if(voteService.canUnvoteMessage($scope.userId, messageKey)) {
          var newVotes = (votes >= 1) ? votes - 1 : 0;

          $scope.messagesRef.child(messageKey).update({
            votes: newVotes,
            date: firebaseService.getServerTimestamp()
          });

          voteService.decreaseMessageVotes($scope.userId, messageKey);
        }
      };

      function redirectToBoard() {
        window.location.href = window.location.origin +
          window.location.pathname + '#' + $scope.userId;
      }

      $scope.isBoardNameInvalid = function() {
        return !$scope.newBoard.name;
      };

      $scope.isMaxVotesValid = function() {
        return Number.isInteger($scope.newBoard.max_votes);
      };

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
          }, function(error) {
             if (error) {
                $scope.loading = false;
             } else {
                redirectToBoard();
             }
          });

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
        if(typeof name === 'undefined' || name === '') {
          return;
        }

        $scope.board.columns.push({
          value: name,
          id: utils.getNextId($scope.board)
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        if(typeof newName === 'undefined' || newName === '') {
          return;
        }

        $scope.board.columns.map(function(column, index, array) {
          if (column.id === id) {
            array[index].value = newName;
          }
        });

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
        var id = message.key;
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
          date_created: firebaseService.getServerTimestamp(),
          votes: 0
        }).then(addMessageCallback);
      };

      $scope.deleteCards = function() {
        $($scope.messages).each(function(index, message) {
          $scope.messages.$remove(message);
        });

        modalService.closeAll();
      };

      $scope.deleteBoard = function() {
        $scope.deleteCards();
        $scope.boardRef.ref.remove();

        modalService.closeAll();
        window.location.hash = '';
        location.reload();
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
              $scope.getSortFields());

            $(filteredArray).each(function(index2, message) {
              if (message.type.id === column.id) {
                clipboard += '- ' + message.text + ' (' + message.votes + ' votes) <br />';
              }
            });
          });

          return clipboard;
        } else return '';
      };

      $scope.submitImportFile = function (file) {
        $scope.cleanImportData ();
        if (file) {
          if (file.size === 0){
            $scope.import.error = 'The file you are trying to import seems to be  empty';
            return;
          }
          /* globals Papa */
          Papa.parse(file, {
            complete: function(results) {
              if (results.data.length > 0){
                $scope.import.data = results.data;
                $scope.board.columns.forEach (function (column){
                  $scope.import.mapping.push({mapFrom:'-1', mapTo:column.id, name: column.value});
                });
                if (results.errors.length > 0)
                   $scope.import.error = results.errors[0].message;
                $scope.$apply();
              }
            }
          });
        }
      };

       $scope.importMessages = function (){
         var data = $scope.import.data;
         var mapping = $scope.import.mapping;
         for (var importIndex = 1; importIndex < data.length; importIndex++ )
         {
           for (var mappingIndex = 0; mappingIndex < mapping.length; mappingIndex++)
           {
             var mapFrom = mapping[mappingIndex].mapFrom;
             var mapTo = mapping[mappingIndex].mapTo;
             if (mapFrom === -1)
              continue;

             var cardText = data[importIndex][mapFrom];
             if (cardText)
             {
                $scope.messages.$add({
                text: cardText,
                user_id: $scope.userUid,
                type: {
                  id: mapTo
                },
                date: firebaseService.getServerTimestamp(),
                votes: 0});
             }
           }
         }
         $scope.closeAllModals();
       };

      $scope.cleanImportData = function (){
        $scope.import.data = [];
        $scope.import.mapping = [];
        $scope.import.error = '';
      };

      $scope.submitOnEnter = function(event, method, data){
        if (event.keyCode === 13) {
          switch (method){
            case 'createNewBoard':
                if (!$scope.isBoardNameInvalid()) {
                  $scope.createNewBoard();
                }
                break;
            case 'addNewColumn':
                if (data) {
                  $scope.addNewColumn(data);
                  $scope.newColumn = '';
                }
                break;
          }
        }
      };

      $scope.incrementMaxVotes = function() {
        $scope.boardRef.update({
          max_votes: $scope.maxVotes + 1
        });
      };

      $scope.decrementMaxVotes = function() {
        $scope.boardRef.update({
          max_votes: Math.min(Math.max($scope.maxVotes - 1, 1), 100)
        });
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
              text: dropMessage.val().text + '\n' + dragMessage.val().text,
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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
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
      return 'column_' + (id % 6 || 6);
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
    var voteService = {};

    voteService.returnNumberOfVotes = function(userId, messagesIds) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {};

      var totalVotes = Object.keys(userVotes).map(function(messageKey) {
        return messagesIds.indexOf(messageKey) >= 0 ? userVotes[messageKey] : 0;
      }).reduce(function (a, b) {
        return a + b;
      }, 0);

      return localStorage.getItem(userId) ? totalVotes : 0;
    };

    voteService.extractMessageIds = function(messages) {
      return messages ? messages.map(function(message) { return message.$id; }) : [];
    };

    voteService.returnNumberOfVotesOnMessage = function(userId, messageKey) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {};

      return userVotes[messageKey] ? userVotes[messageKey] : 0;
    };

    voteService.remainingVotes = function(userId, maxVotes, messages) {
      var messagesIds = voteService.extractMessageIds(messages);

      return (maxVotes - voteService.returnNumberOfVotes(userId, messagesIds)) > 0 ?
        maxVotes - voteService.returnNumberOfVotes(userId, messagesIds) : 0;
    };

    voteService.increaseMessageVotes = function(userId, messageKey) {
      if (localStorage.getItem(userId)) {
        var boardVotes = JSON.parse(localStorage.getItem(userId));

        if (boardVotes[messageKey]) {
          boardVotes[messageKey] = parseInt(boardVotes[messageKey] + 1);
          localStorage.setItem(userId, JSON.stringify(boardVotes));
        } else {
          boardVotes[messageKey] = 1;
          localStorage.setItem(userId, JSON.stringify(boardVotes));
        }
      } else {
        var newObject = {};
        newObject[messageKey] = 1;
        localStorage.setItem(userId, JSON.stringify(newObject));
      }
    };

    voteService.decreaseMessageVotes = function(userId, messageKey) {
      if (localStorage.getItem(userId)) {
        var boardVotes = JSON.parse(localStorage.getItem(userId));

        if (boardVotes[messageKey] <= 1) {
            delete boardVotes[messageKey];
        } else {
          boardVotes[messageKey] = boardVotes[messageKey] - 1;
        }

        localStorage.setItem(userId, JSON.stringify(boardVotes));
      }
    };

    voteService.mergeMessages = function(userId, dragMessage, dropMessage) {
      var dragMessageVoteCount = voteService.returnNumberOfVotesOnMessage(userId, dragMessage);
      var dropMessageVoteCount = voteService.returnNumberOfVotesOnMessage(userId, dropMessage);
      var boardVotes = JSON.parse(localStorage.getItem(userId));

      if(dragMessageVoteCount > 0) {
        boardVotes[dropMessage] = dragMessageVoteCount + dropMessageVoteCount;
        delete boardVotes[dragMessage];

        localStorage.setItem(userId, JSON.stringify(boardVotes));
      }
    };

    voteService.canUnvoteMessage = function(userId, messageKey) {
      return localStorage.getItem(userId) && JSON.parse(localStorage.getItem(userId))[messageKey] ? true : false;
    };

    voteService.isAbleToVote = function(userId, maxVotes, messages) {
      return voteService.remainingVotes(userId, maxVotes, messages) > 0;
    };

    return voteService;
  }]);

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
       openImportBoard: function(scope) {
        scope.cleanImportData();
        ngDialog.open({
          template: 'importCards',
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
      openDeleteBoard: function(scope) {
        ngDialog.open({
          template: 'deleteBoard',
          className: 'ngdialog-theme-plain danger',
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
      openVoteSettings: function(scope) {
        ngDialog.open({
          template: 'voteSettings',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      closeAll: function() {
        ngDialog.closeAll();
      }
    };
  }]);

'use strict';

angular.module('fireideaz').directive('about', [function() {
    return {
      templateUrl : 'components/about.html'
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
