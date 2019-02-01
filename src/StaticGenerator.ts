/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as Config from './Config';
import * as Utils from './Utilities';

export function generate(cliFeedback: Function): Promise<void> {

    return Utils
        .copyAll(
            Utils.path(Config.cgd, 'static'),
            Utils.path(Utils.parent(Config.mainModule))
        )
        .then(files => files.forEach(file => cliFeedback(
            'green', 'Copied ' + file
        )));
};
