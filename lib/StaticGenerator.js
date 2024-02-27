"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.save = void 0;
const Config = require("./Config");
const Utilities = require("./Utilities");
/* *
 *
 *  Functions
 *
 * */
function save() {
    return Utilities.copyAll(Utilities.path(Config.cgd, 'static'), Utilities.path(Utilities.parent(Config.mainModule)));
}
exports.save = save;
;
//# sourceMappingURL=StaticGenerator.js.map