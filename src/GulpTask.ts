/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as Colors from 'colors';
import * as Config from './Config';
import * as NamespaceGenerator from './NamespaceGenerator';
import * as NamespaceParser from './NamespaceParser';
import * as OptionsGenerator from './OptionsGenerator';
import * as OptionsParser from './OptionsParser';
import * as StaticGenerator from './StaticGenerator';
import * as Utils from './Utilities';



function cliFeedback (colorOrMessage: string, message?: string) {
    switch (message ? colorOrMessage : '') {
        default:
            console.info(colorOrMessage);
        case 'blue':
        case 'green':
        case 'red':
        case 'yellow':
            console.info((Colors as any)[colorOrMessage](message));
            return;
    }
}


export function task (done: Function) {

    console.info(Colors.green(
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
                    cliFeedback, filesDictionary, optionsDeclarations
                ),
                StaticGenerator.generate(
                    cliFeedback
                )
            ]))
        )
        .then(() => console.info(Colors.green(
            'Finished creating TypeScript declarations.'
        )))
        .catch(err => {
            console.info(Colors.red(err.toString()));
            throw err;
        });
}
