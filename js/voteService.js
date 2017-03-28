'use strict';

angular
  .module('fireideaz')
  .service('VoteService', [function () {
    function returnNumberOfVotes(userId) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {}

      var totalVotes = Object.keys(userVotes).map(function(messageKey) {
        return userVotes[messageKey]
      }).reduce(function (a, b) {
        return a + b;
      }, 0)

      return localStorage.getItem(userId) ? totalVotes : 0;
    }

    function remainingVotes(userId, maxVotes) {
      return (maxVotes - this.returnNumberOfVotes(userId)) > 0
        ? maxVotes - this.returnNumberOfVotes(userId)
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

    function canUnvoteMessage(userId, messageKey) {
      return localStorage.getItem(userId) && JSON.stringify(localStorage.getItem(userId))[messageKey] ? true : false;
    }

    function isAbleToVote(userId, maxVotes) {
      return this.remainingVotes(userId, maxVotes) > 0;
    }

    return {
      returnNumberOfVotes: returnNumberOfVotes,
      increaseMessageVotes: increaseMessageVotes,
      decreaseMessageVotes: decreaseMessageVotes,
      remainingVotes: remainingVotes,
      canUnvoteMessage: canUnvoteMessage,
      isAbleToVote: isAbleToVote
    };
  }]);
