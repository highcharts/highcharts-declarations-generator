"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const Config = require("./Config");
const Utils = require("./Utilities");
function save() {
    return Utils.copyAll(Utils.path(Config.cgd, 'static'), Utils.path(Utils.parent(Config.mainModule)));
}
exports.save = save;
;
//# sourceMappingURL=StaticGenerator.js.map