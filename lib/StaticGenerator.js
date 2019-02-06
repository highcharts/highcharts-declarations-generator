"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const Config = require("./Config");
const Utils = require("./Utilities");
function save(cliFeedback) {
    return Utils
        .copyAll(Utils.path(Config.cgd, 'static'), Utils.path(Utils.parent(Config.mainModule)))
        .then(files => files.forEach(file => cliFeedback('green', 'Copied ' + file)));
}
exports.save = save;
;
//# sourceMappingURL=StaticGenerator.js.map