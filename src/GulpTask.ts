/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/

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
        .all([])
        .then(() => Utils
            .load(Config.treeOptionsJsonFile)
            .then(OptionsParser.parse)
            .then(OptionsGenerator.generate)
        )
        .then(optionsNamespace => Utils
            .load(Config.treeNamespaceJsonFile)
            .then(NamespaceParser.parse)
            .then(moduleNodes => {

                cliFeedback('green', 'Creating declarations...');

                return NamespaceGenerator.generate(
                    moduleNodes, optionsNamespace
                );
            })
        )
        .then(declarationsModules => {

            cliFeedback('green', 'Saving declarations...');

            return declarationsModules;
        })
        .then(NamespaceGenerator.save)
        .then(StaticGenerator.save)
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
