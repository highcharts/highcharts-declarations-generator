/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/

import * as Config from './Config';
import * as Utilities from './Utilities';

export function save (): Promise<string[]> {

    return Utilities.copyAll(
        Utilities.path(Config.cgd, 'static'),
        Utilities.path(Utilities.parent(Config.mainModule))
    );
};
