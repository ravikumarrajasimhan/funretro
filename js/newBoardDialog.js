angular
.module("fireideaz")
.directive('newBoardDialog', [
	function () {
		return {
			templateUrl: '../newBoardDialog.html',
			restrict: 'E',
			controller: 'DialogCtrl'
		};
	}
]);