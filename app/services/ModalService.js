const ModalService = (ngDialog) => ({
  openAddNewColumn: (scope) => {
    ngDialog.open({
      templateUrl: './views/modals/add-column.html',
      className: 'ngdialog-theme-plain',
      scope
    });
  },
  openAddNewBoard: (scope) => {
    ngDialog.open({
      templateUrl: './views/modals/create-board.html',
      className: 'ngdialog-theme-plain',
      scope
    });
  },
  openDeleteCard: (scope) => {
    ngDialog.open({
      templateUrl: './views/modals/delete-card.html',
      className: 'ngdialog-theme-plain',
      scope
    });
  },
  openDeleteColumn: (scope) => {
    ngDialog.open({
      templateUrl: './views/modals/delete-column.html',
      className: 'ngdialog-theme-plain',
      scope
    });
  },
  openMergeCards: (scope) => {
    ngDialog.open({
      templateUrl: './views/modals/merge-cards.html',
      plain: true,
      scope
    });
  },
  openExportBoard: (scope) => {
    ngDialog.open({
      templateUrl: './views/modals/export-board.html',
      className: 'ngdialog-theme-plain bigDialog',
      scope
    });
  },
  openDeleteCards: (scope) => {
    ngDialog.open({
      templateUrl: './views/modals/delete-cards.html',
      className: 'ngdialog-theme-plain danger',
      scope
    });
  },
  closeAll: () => {
    ngDialog.closeAll();
  }
});

ModalService.$inject = ['ngDialog'];

export default ModalService;
