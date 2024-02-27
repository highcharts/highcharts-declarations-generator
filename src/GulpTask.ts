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
import * as Utilities from './Utilities';



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
