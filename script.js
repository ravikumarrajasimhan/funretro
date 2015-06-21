var app = angular.module("sampleApp", ["firebase"]);

app.controller("SampleCtrl", function($scope, $firebaseArray) {
  var ref = new Firebase("https://blinding-torch-6662.firebaseio.com/messages");

  $scope.messages = $firebaseArray(ref);
  $scope.messageTypes = [{
  	id: 1,
  	value: "Very well"
  }, { 
  	id: 2,
  	value: "To improve"
  }, { 
  	id: 3,
  	value: "Action Items"
  }];

  $scope.addVote = function(key, votes) {
  	if(!localStorage.getItem(key)) {
  		ref.child(key).update({ votes: votes + 1});
  		localStorage.setItem(key, 1);
  	}
  }

  $scope.alreadyVoted = function(key) {
  	return localStorage.getItem(key);
  }

  $scope.addNew = function(type) {
  	$scope.messages.$add({
      text: '',
      type: type,
      votes: 0
    });
  }
});