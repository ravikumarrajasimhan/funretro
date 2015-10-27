angular
  .module('fireideaz')
  .service('Utils', ['ngDialog', function (ngDialog) {
    function createUserId() {
      var text = "";
      var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

      for( var i=0; i < 5; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return text;
    }

    function alreadyVoted(key) {
      return localStorage.getItem(key);
    }

    function getHeight(message, index) {
      if(!message.currentHeight) {
        return index * 125 + 120 + 'px';
      } else {
        return message.currentHeight;
      }
    }

    function focusElement(id) {
      $('#' + id).find('textarea').focus();
    }

    var messageTypes = [{
      id: 1,
      value: "Went well"
    }, { 
      id: 2,
      value: "To improve"
    }, { 
      id: 3,
      value: "Action items"
    }];

    function showRemoveColumn(id, columns) {
      return columns.length === id && columns.length > 3 ? true : false;
    }

    function getNextId(board) {
      return board.columns[board.columns.length -1].id + 1;
    }

    function openDialogColumn(element) {
      ngDialog.open({
        template: 'addNewColumn',
        className: 'ngdialog-theme-plain',
        scope: element
      });
    }

    function openDialogBoard(element) {
      ngDialog.open({
        template: 'addNewBoard',
        className: 'ngdialog-theme-plain',
        scope: element
      });
    }

    function closeAll() {
      ngDialog.closeAll();
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
      getHeight: getHeight,
      focusElement: focusElement,
      messageTypes: messageTypes,
      showRemoveColumn: showRemoveColumn,
      getNextId: getNextId,
      openDialogColumn: openDialogColumn,
      openDialogBoard: openDialogBoard,
      closeAll: closeAll,
      toObject: toObject
    };
  }]);