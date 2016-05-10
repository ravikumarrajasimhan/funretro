const ModalService = (ngDialog) => {
  return {
    openAddNewColumn: (scope) => {
      ngDialog.open({
        templateUrl: './views/modals/add-column.html',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openAddNewBoard: (scope) => {
      ngDialog.open({
        templateUrl: './views/modals/create-board.html',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openDeleteCard: (scope) => {
      ngDialog.open({
        templateUrl: './views/modals/delete-card.html',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openDeleteColumn: (scope) => {
      ngDialog.open({
        templateUrl: './views/modals/delete-column.html',
        className: 'ngdialog-theme-plain',
        scope: scope
      });
    },
    openMergeCards: (scope) => {
      ngDialog.open({
        templateUrl: './views/modals/merge-cards.html',
        plain: true,
        scope: scope
      });
    },
    openExportBoard: (scope) => {
      ngDialog.open({
        templateUrl: './views/modals/export-board.html',
        className: 'ngdialog-theme-plain bigDialog',
        scope: scope
      });
    },
    openDeleteCards: (scope) => {
      ngDialog.open({
        templateUrl: './views/modals/delete-cards.html',
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
