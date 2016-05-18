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
