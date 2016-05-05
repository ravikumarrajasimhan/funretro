import { Inject } from 'angular-es6';

function MainController($scope) {
  let auth;

  $scope.createNewBoard = () => {

    $scope.loading = true;
    $scope.userId = utils.createUserId();

    const callback = (userData) => {
      console.log(userData);
    };

  };
}

MainController.$inject = ['$scope'];

export { MainController };
