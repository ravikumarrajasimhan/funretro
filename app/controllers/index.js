import { load } from 'angular-es6';

const MODULE_NAME = 'fireideaz.controllers';

load.controllers(require.context('./', true, /.*\.js$/),
                 MODULE_NAME);

export default MODULE_NAME;
