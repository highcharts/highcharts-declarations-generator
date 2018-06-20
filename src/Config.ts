/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

const config = require('../config.json') as IConfig;

export = config;

interface IConfig {
    destinationPath: string;
    treeNamespaceJsonPath: string;
    treeOptionsJsonPath: string;
}
