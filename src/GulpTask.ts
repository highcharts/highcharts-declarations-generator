/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as colors from 'colors'; require('colors');
import * as config from './Config';
import * as namespaceGenerator from './NamespaceGenerator';
import * as namespaceParser from './NamespaceParser';
import * as optionsGenerator from './OptionsGenerator';
import * as optionsParser from './OptionsParser';
import * as tsd from './TypeScriptDeclarations';
import * as utils from './Utilities';



export function task (done: Function) {

    console.log(colors.yellow.bold(
        'Started creating TypeScript declarations...'
    ));

    return generateHighchartsOptions()
        .then(generateHighchartsNamespace)
        .then(() => console.log(colors.green.bold(
            'Finished creating TypeScript declarations.'
        )));
}



function generateHighchartsOptions ():
Promise<tsd.IDeclaration> {

    return utils
        .load(config.treeOptionsJsonPath)
        .then(optionsParser.parse)
        .then(optionsGenerator.generate);
}



function generateHighchartsNamespace (
    optionsDeclarations: tsd.IDeclaration
): Promise<void> {

    return utils
        .load(config.treeNamespaceJsonPath)
        .then(namespaceParser.splitIntoFiles)
        .then(filesDictionary => namespaceGenerator
            .saveIntoFiles(filesDictionary, optionsDeclarations)
        );
}  
