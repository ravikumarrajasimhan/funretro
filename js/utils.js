angular
  .module('fireideaz')
  .service('Utils', ['ngDialog', function (ngDialog) {
    function createUserId() {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for( var i=0; i < 5; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return text;
    };

    function getHeight(message, index) {
      if(!message.currentHeight) {
        return index * 125 + 120 + 'px';
      } else {
        return message.currentHeight;
      }
    }

    function alreadyVoted(key) {
      return localStorage.getItem(key);
    }

    function focusElement(id) {
      $('#' + id).find('textarea').focus();
    };

    var messageTypes = [{
      id: 1,
      value: "Went well"
    }, { 
      id: 2,
      value: "To improve"
    }, { 
      id: 3,
      value: "Action Items"
    }];

    function showRemoveColumn(id, columns) {
      if(columns.length === id) {
        if(columns.length > 3) {
          return true;
        }
      }

      return false;
    };

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

    return {
      createUserId: createUserId,
      getHeight: getHeight,
      alreadyVoted: alreadyVoted,
      focusElement: focusElement,
      messageTypes: messageTypes,
      showRemoveColumn: showRemoveColumn,
      getNextId: getNextId,
      openDialogColumn: openDialogColumn,
      openDialogBoard: openDialogBoard,
      closeAll: closeAll
    };
  }]);