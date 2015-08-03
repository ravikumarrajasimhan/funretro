angular.module("fireideaz")
.controller("DialogCtrl", ['$scope', '$window', 'ngDialog',
  function($scope, $window, ngDialog) {
    $scope.createNewBoard = function(board) {
      window.location.href = window.location.origin + window.location.pathname + "#" + board;
      ngDialog.closeAll();
    };

    $scope.addNewColumn = function(name) {
      var board = $scope.boards.$getRecord($scope.board[0].$id);
      board.columns.push({
        value: name,
        id: $scope.getNextId()
      });

      $scope.boards.$save(board).then(function(ref) {
        ngDialog.closeAll();
      });
    };
  }]
);