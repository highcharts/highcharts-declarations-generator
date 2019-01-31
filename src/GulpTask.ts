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

    cliFeedback('green', 'Start creating TypeScript declarations...');

    return Promise
        .all([
            Utils
                .load(Config.treeNamespaceJsonFile)
                .then(json => NamespaceParser.parse(json as any))
                .then(NamespaceGenerator.declare),
            Utils
                .load(Config.treeOptionsJsonFile)
                .then(json => OptionsParser.parse(json as any))
                .then(OptionsGenerator.declare)
        ])
        .then(declarationFiles => {

            cliFeedback('green', 'JSON processed.');

            const namespaceDeclarationFiles = declarationFiles[0];
            const optionsDeclarationFiles = declarationFiles[1];

            return Promise.all([
                NamespaceGenerator.generate(
                    cliFeedback,
                    namespaceDeclarationFiles,
                    optionsDeclarationFiles
                ),
                StaticGenerator.generate(cliFeedback)
            ]);
        })
        .then(() => cliFeedback(
            'green',
            'Finished creating TypeScript declarations.'
        ))
        .catch(error => {
            if (error) {
                cliFeedback('red', error.toString());
                throw error;
            }
            else {
                throw new Error('Unknown error');
            }
        });
}
