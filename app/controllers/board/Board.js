const Board = ($scope, boardService, modalService, $window) => {
  $scope.modalService = modalService;
};

Board.$inject = ['$scope', 'boardService', 'modalService', '$window'];

export default Board;
