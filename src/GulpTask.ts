/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as colors from 'colors'; require('colors');
import * as config from './Config';
import * as namespaceGenerator from './NamespaceGenerator';
import * as namespaceParser from './NamespaceParser';
import * as utils from './Utilities';



export function task (done: Function) {

    console.log(colors.yellow.bold(
        'Started creating TypeScript declarations...'
    ));

    return Promise
        .all([
            generateHighchartsNamespace()
        ])
        .then(() => console.log(colors.green.bold(
            'Finished creating TypeScript declarations.'
        )));
}



function generateHighchartsNamespace (): Promise<void> {

    return utils
        .load(config.treeNamespaceJsonPath)
        .then(namespaceParser.splitIntoFiles)
        .then(namespaceGenerator.saveIntoFiles);
}  
