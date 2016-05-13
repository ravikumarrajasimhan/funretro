const Landing = ($scope, modalService, boardService, $window) => {

  $scope.modalService = modalService;
  $scope.board = {
    name: ''
  };

  const openBoard = () => {
    $window.location.href = `/#${$scope.board.id}`;
  };

  $scope.createNewBoard = () => {
    modalService.closeAll();
    $scope.loading = true;
    boardService.connect();
    boardService.create($scope.board.name).then((boardID) => {
      $scope.board.id = boardID;
      openBoard();
    });
  };

};

Landing.$inject = ['$scope', 'modalService', 'boardService', '$window'];

export default Landing;
