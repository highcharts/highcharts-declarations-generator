/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as Config from './Config';
import * as Utils from './Utilities';

export function generate(): Promise<void> {

    return Utils
        .copyAll(
            Utils.path(Config.cgd, 'static'),
            Utils.path(Config.cwd, Utils.parent(Config.mainModule))
        )
        .then(files => files.forEach(
            file => console.info('Saved', file.substr(Config.cwd.length + 1))
        ));
};
