const Landing = ($scope, modalService, boardService) => {

  $scope.modalService = modalService;
  $scope.board = {
    name: ''
  };

  $scope.createNewBoard = () => {
    modalService.closeAll();
    $scope.loading = true;
    boardService.connect();
    boardService.create($scope.board.name).then((boardID) => {
      $scope.board.id = boardID;
    });
  };

};

Landing.$inject = ['$scope', 'modalService', 'boardService'];

export default Landing;
