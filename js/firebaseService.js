angular
  .module('fireideaz')
  .service('FirebaseServer', ['$firebaseArray', function ($firebaseArray) {
    var firebaseUrl = "https://blinding-torch-6662.firebaseio.com";

    function getMessagesRef(userId) {
      return new Firebase(firebaseUrl + "/messages/" + userId);
    }

    function getMessageRef(userId, messageId) {
      return new Firebase(firebaseUrl + "/messages/" + userId + '/' + messageId);
    }

    function getBoardRef(userId) {
      return new Firebase(firebaseUrl + "/boards/" + userId);
    }

    function getBoardColumns(userId) {
      return new Firebase(firebaseUrl + "/boards/" + userId + '/columns');
    }

    return {
      getMessagesRef: getMessagesRef,
      getMessageRef: getMessageRef,
      getBoardRef: getBoardRef,
      getBoardColumns: getBoardColumns
    };
  }]);