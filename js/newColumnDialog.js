angular
.module("fireideaz")
.directive('newColumnDialog', [
	function () {
		return {
			templateUrl: '../newColumnDialog.html',
			restrict: 'E',
			controller: 'MainCtrl'
		};
	}
]);