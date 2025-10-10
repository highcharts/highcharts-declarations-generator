/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/

import * as Config from './Config';
import * as NamespaceGenerator from './NamespaceGenerator';
import * as NamespaceParser from './NamespaceParser';
import * as OptionsGenerator from './OptionsGenerator';
import * as OptionsParser from './OptionsParser';
import * as StaticGenerator from './StaticGenerator';
import * as Utilities from './Utilities';



function cliFeedback (message: string): void;
function cliFeedback (color: string, message: string): void;
function cliFeedback (colorOrMessage: string, message?: string): void {
    switch (message ? colorOrMessage : '') {
        default:
            console.info(colorOrMessage);
            return;
        case 'blue':
            console.info('\x1b[34m' + message + '\x1b[0m');
            return;
        case 'green':
            console.info('\x1b[32m' + message + '\x1b[0m');
            return;
        case 'red':
            console.info('\x1b[31m' + message + '\x1b[0m');
            return;
        case 'yellow':
            console.info('\x1b[33m' + message + '\x1b[0m');
            return;
    }
}

export const config = Config;

export async function task (done: Function) {

    try {

        cliFeedback('green', 'Start creating TypeScript declarations...');

        let declarationsModules = await OptionsGenerator.generate(
            await OptionsParser.parse(
                await Utilities.load(Config.treeOptionsJsonFile)
            )
        );

        cliFeedback('green', 'Creating declarations...');

        declarationsModules = await NamespaceGenerator.generate(
            await NamespaceParser.parse(
                await Utilities.load(Config.treeNamespaceJsonFile)
            ),
            declarationsModules
        );


        cliFeedback('green', 'Saving declarations...');

        await NamespaceGenerator.save(declarationsModules);
        await StaticGenerator.save();

        cliFeedback('green', 'Finished creating TypeScript declarations.');

    }
    catch (error) {

        if (error) {
            cliFeedback('red', error.toString());
            throw error;
        }
        else {
            throw new Error('Unknown error');
        }

    }

}
