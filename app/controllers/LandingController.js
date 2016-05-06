function LandingController($scope) {

  $scope.createNewBoard = () => {

    $scope.loading = true;
    $scope.userId = utils.createUserId();

    const callback = (userData) => {
      console.log(userData);
    };

  };
}

LandingController.$inject = ['$scope'];

export { LandingController };
