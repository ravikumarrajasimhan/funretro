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
      $scope.sortField = 'date';
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

        board.on('value', function(board) {
          if (board.val() === null) {
            window.location.hash = '';
            location.reload();
          }

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
        $scope.board.columns.push({
          value: name,
          id: utils.getNextId($scope.board)
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
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
