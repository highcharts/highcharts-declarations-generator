/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as Colors from 'colors'; require('colors');
import * as Config from './Config';
import * as NamespaceGenerator from './NamespaceGenerator';
import * as NamespaceParser from './NamespaceParser';
import * as OptionsGenerator from './OptionsGenerator';
import * as OptionsParser from './OptionsParser';
import * as StaticGenerator from './StaticGenerator';
import * as Utils from './Utilities';



export function task (done: Function) {

    console.info(Colors.yellow.bold(
        'Start creating TypeScript declarations...'
    ));

    return Utils
        .load(Config.treeOptionsJsonFile)
        .then(OptionsParser.parse)
        .then(OptionsGenerator.generate)
        .then(optionsDeclarations => Utils
            .load(Config.treeNamespaceJsonFile)
            .then(NamespaceParser.parseIntoFiles)
            .then(filesDictionary => Promise.all([
                NamespaceGenerator.generate(
                    filesDictionary, optionsDeclarations
                ),
                StaticGenerator.generate()
            ]))
        )
        .then(() => console.info(Colors.green.bold(
            'Finished creating TypeScript declarations.'
        )));
}
