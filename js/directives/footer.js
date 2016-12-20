'use strict';

angular.module('fireideaz').directive('pageFooter', ['VoteService', function(voteService) {
    return {
      restrict: 'E',
      templateUrl : 'components/footer.html',
      link: function($scope) {
        $scope.voteService = voteService;
      }
    };
  }]
);
