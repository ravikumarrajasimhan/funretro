'use strict';

angular
  .module('fireideaz')
  .service('CsvService', [function () {
    var csvService = {};

    var arrayExists = function(array) {
      return array !== undefined;
    };

    var isEmptyCell = function(nextValue) {
      return nextValue === undefined;
    };

    csvService.buildCsvText = function(doubleArray) {
        var csvText ='';
        
        var longestColumn = csvService.determineLongestColumn(doubleArray);

        // Going by row because CVS are ordered by rows
        for(var rowIndex = 0; rowIndex < longestColumn; rowIndex++) {
          for(var columnIndex = 0; columnIndex < longestColumn; columnIndex++) {
            var column = doubleArray[columnIndex];
            if(!arrayExists(column)) {
              break;
            }

            var nextValue = column[rowIndex];
            if(isEmptyCell(nextValue)) {
              nextValue = '';
            }
            csvText += nextValue + ',';
          }
  
          csvText += '\r\n';
        }
  
        return csvText;
      };

      csvService.determineLongestColumn = function(doubleArray) {
        return doubleArray.reduce(function(prev, next) {
          return next.length > prev ? next.length: prev;
        }, doubleArray.length);
      };

    return csvService;
  }]);
