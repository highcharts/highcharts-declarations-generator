/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

const config = require('../config.json') as IConfig;

export = config;

interface IConfig {
    classJsonPath: string;
    destinationPath: string;
    treeJsonPath: string;
}
