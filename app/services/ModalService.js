const ModalService = (ngDialog) => {
  return {
    openAddNewColumn: (scope) => {
      ngDialog.open({
        template: 'addNewColumn',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openAddNewBoard: (scope) => {
      ngDialog.open({
        template: 'addNewBoard',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openDeleteCard: (scope) => {
      ngDialog.open({
        template: 'deleteCard',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openDeleteColumn: (scope) => {
      ngDialog.open({
        template: 'deleteColumn',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },

    openMergeCards: (scope) => {
      ngDialog.open({
        template: 'mergeCards',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openCopyBoard: (scope) => {
      ngDialog.open({
        template: 'copyBoard',
        className: 'ngdialog-theme-plain bigDialog',
        scope: scope
      });
    },
    openDeleteCards: (scope) => {
      ngDialog.open({
        template: 'deleteCards',
        className: 'ngdialog-theme-plain danger',
        scope: scope
      });
    },
    closeAll: () => {
      ngDialog.closeAll();
    }
  };

}

ModalService.$inject = ['ngDialog'];

export default ModalService;
