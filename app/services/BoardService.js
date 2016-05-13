import Chance from 'chance';
import Firebase from 'firebase';

const chance = new Chance();
const FIREBASE_PROD_URL = 'https://blinding-torch-6662.firebaseio.com';
const BoardService = ($q) => {
  let boardsRef;
  const generateBoardID = () => chance.hash({
    length: 5
  });

  return {
    connect: () => {
      boardsRef = new Firebase(`${FIREBASE_PROD_URL}/boards`);
    },
    create: (name) => {
      const boardID = generateBoardID();
      const deferred = $q.defer();

      const board = boardsRef.child(boardID).set({
        hash: boardID,
        name: name
      }, (error) => {
        if (error) deferred.reject();
        deferred.resolve(boardID);
      });

      return deferred.promise;
    },
    findById: (boardId) => {
      const deferred = $q.defer();

      const board = boardsRef.child(boardID);

      if (board) deferred.resolve(board);

      deferred.reject();

      return deferred.promise;
    }
  };
}

BoardService.$inject = ['$q'];

export default BoardService;
