'use strict';

angular
  .module('fireideaz')
  .service('VoteService', [function () {
    function returnNumberOfVotes(userId, messagesIds) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {};

      var totalVotes = Object.keys(userVotes).map(function(messageKey) {
        return messagesIds.indexOf(messageKey) >= 0 ? userVotes[messageKey] : 0;
      }).reduce(function (a, b) {
        return a + b;
      }, 0);

      return localStorage.getItem(userId) ? totalVotes : 0;
    }

    function extractMessageIds(messages) {
      return messages ? messages.map(function(message) { return message.$id; }) : [];
    }

    function returnNumberOfVotesOnMessage(userId, messageKey) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {};

      return userVotes[messageKey] ? userVotes[messageKey] : 0;
    }

    function remainingVotes(userId, maxVotes, messages) {
      var messagesIds = extractMessageIds(messages);

      return (maxVotes - returnNumberOfVotes(userId, messagesIds)) > 0 ?
        maxVotes - returnNumberOfVotes(userId, messagesIds) : 0;
    }

    function increaseMessageVotes(userId, messageKey) {
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
      var dragMessageVoteCount = returnNumberOfVotesOnMessage(userId, dragMessage);
      var dropMessageVoteCount = returnNumberOfVotesOnMessage(userId, dropMessage);
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
      return remainingVotes(userId, maxVotes, messages) > 0;
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
