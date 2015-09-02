angular
  .module('fireideaz')
  .service('Auth', function () {
    var mainRef = new Firebase("https://firedeaztest.firebaseio.com");
    
    function createUserAndLog(newUser, callback) {
       mainRef.createUser({
        email    : newUser + '@fireideaz.com',
        password : newUser
      }, function(error, userData) {
        if (error) {
          console.log('Create user failed: ', error);
        } else {
          mainRef.authWithPassword({
            email    : newUser + '@fireideaz.com',
            password : newUser
          }, function(error, authData) {
            if (error) {
              console.log('Log user failed: ', error);
            } else {
              callback();
            }
          });
        }
      });
    };

    function logUser(user, callback) {
        mainRef.authWithPassword({
          email    : user + '@fireideaz.com',
          password : user
        }, function(error, authData) {
          if (error) {
              console.log('Log user failed: ', error);
          } else {
            callback();
          }
        });
    };

    return {
      createUserAndLog: createUserAndLog,
      logUser: logUser
    };
  });