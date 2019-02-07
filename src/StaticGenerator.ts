/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/

import * as Config from './Config';
import * as Utils from './Utilities';

export function save (): Promise<string[]> {

    return Utils.copyAll(
        Utils.path(Config.cgd, 'static'),
        Utils.path(Utils.parent(Config.mainModule))
    );
};
