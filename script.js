var app = angular.module("sampleApp", ['firebase']);

app.controller("MainCtrl", ["$firebaseArray", '$scope', '$filter', function($firebaseArray, $scope, $filter) {
  var ref = new Firebase("https://blinding-torch-6662.firebaseio.com/messages");

  $scope.boardId = window.location.hash.substring(1);
  $scope.messages = $firebaseArray(ref);

  function calculateAllHeights(messages) {
    var orderedArray = $filter('orderBy')(messages, ['-votes', 'date']);
     orderedArray.forEach(function(message) {
      var filtered = orderedArray.filter(function(item) {
        return item.type.id === message.type.id;
      });

      message.currentHeight = filtered.indexOf(message) * 125 + 120 + 'px';
      $scope.messages.$save(message);
    });
  }

  $scope.messages.$loaded().then(function(messages) {
    calculateAllHeights(messages);
  });

  $scope.messageTypes = [{
  	id: 1,
  	value: "Went well"
  }, { 
  	id: 2,
  	value: "To improve"
  }, { 
  	id: 3,
  	value: "Action Items"
  }];

  $scope.addVote = function(key, votes) {
  	if(!localStorage.getItem(key)) {
  		ref.child(key).update({ votes: votes + 1, date: Firebase.ServerValue.TIMESTAMP });
  		localStorage.setItem(key, 1);
  	}

    calculateAllHeights($scope.messages);
  }

  $scope.deleteMessage = function(message) {
  	if(confirm('Are you sure you want to delete this note?')) {
  		$scope.messages.$remove(message).then(function() {
        calculateAllHeights($scope.messages);    
      });
  	}
  }

  $scope.getHeight = function(message, index) {
    if(!message.currentHeight) {
      return index * 125 + 120 + 'px';
    } else {
      return message.currentHeight;
    }
  }

  $scope.alreadyVoted = function(key) {
  	return localStorage.getItem(key);
  }

  $scope.focusElement = function(id) {
    $('#' + id).find('textarea').focus();
  };

  $scope.addNew = function(type) {
  	$scope.messages.$add({
      text: '',
      type: type,
      date: Firebase.ServerValue.TIMESTAMP,
      votes: 0
    }).then(function(ref) {
      var id = ref.key();
      angular.element($('#' + id)).scope().isEditing = true;
      $('#' + id).find('textarea').focus();

      calculateAllHeights($scope.messages);  
    });
  }
}]);

app.directive('enterClick', function () {
  return {
    restrict: 'A',
    link: function (scope, elem, attrs) {
      elem.bind('keydown', function(event) {
        if (event.keyCode === 13 && event.shiftKey) {
          event.preventDefault();
          $(elem[0]).find('button').click();
        }
      });
    }
  }
});