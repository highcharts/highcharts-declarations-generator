/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as config from './Config';
import * as parser from './NamespaceParser';
import * as utils from './Utilities';

export function generate(): Promise<void> {
    return utils
        .copyAll(config.cgd, config.mainModule)
        .then(files => files.forEach(file => console.info('Saved', file)));
};
