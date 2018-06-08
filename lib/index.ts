/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as colors from 'colors'; require('colors');
import * as config from './config';
import * as generators from './generators';
import * as utils from './utils';

function generateHighchartsOptions (): Promise<void> {
    return utils
        .load(config.treeJsonPath)
        .then(json => {
            let generator = new generators.OptionsGenerator('highcharts');
            return generator.generate(json, 'dist/highcharts-options.d.ts');
        });
}

function generateHighcharts (): Promise<void> {
    return Promise
        .all([
            generateHighchartsOptions()
        ])
        .then(() => undefined);
}

function generate (): Promise<void> {
    return Promise
        .all([
            generateHighcharts()
        ])
        .then(() => undefined);
}

console.log();
console.log(colors.blue.bold('Highcharts Suite TypeScript Declaration Generator'));
console.log();
console.log('Fetches API dumps from api.highcharts.com, and builds TypeScript .d files.');
console.log('Note that API dumps are cached - delete the cache folder to force a refetch.');
console.log();
console.log('Declaration files ends up in ' + config.destinationPath);
console.log();

generate()
    .then(() => console.log(colors.green.bold('Succeeded.')))
    .catch(error => console.error(colors.red.bold(error)));
