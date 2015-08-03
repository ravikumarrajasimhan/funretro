angular
.module("fireideaz")
.directive('enterClick', function () {
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