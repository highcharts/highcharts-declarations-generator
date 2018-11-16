"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const Config = require("./Config");
const Utils = require("./Utilities");
function generate() {
    return Utils
        .copyAll(Utils.path(Config.cgd, 'static'), Utils.path(Config.cwd, Utils.parent(Config.mainModule)))
        .then(files => files.forEach(file => console.info('Saved', file.substr(Config.cwd.length + 1))));
}
exports.generate = generate;
;
//# sourceMappingURL=StaticGenerator.js.map