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

    console.info(colors.yellow.bold(
        'Start creating TypeScript declarations...'
    ));

    return utils
        .load(config.treeOptionsJsonFile)
        .then(optionsParser.parse)
        .then(optionsGenerator.generate)
        .then(optionsDeclarations => utils
            .load(config.treeNamespaceJsonFile)
            .then(namespaceParser.parseIntoFiles)
            .then(filesDictionary => namespaceGenerator
                .generate(filesDictionary, optionsDeclarations)
            )
        )
        .then(() => console.info(colors.green.bold(
            'Finished creating TypeScript declarations.'
        )));
}
