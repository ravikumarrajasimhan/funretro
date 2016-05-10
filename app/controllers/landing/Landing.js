const Landing = ($scope, modalService) => {
  $scope.modalService = modalService;
  $scope.createNewBoard = () => {
    $scope.loading = true;
    $scope.userId = utils.createUserId();

    const callback = (userData) => {
      console.log(userData);
    };

  };
};

Landing.$inject = ['$scope', 'modalService'];

export default Landing;
