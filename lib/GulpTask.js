"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.task = task;
const Config = require("./Config");
const NamespaceGenerator = require("./NamespaceGenerator");
const NamespaceParser = require("./NamespaceParser");
const OptionsGenerator = require("./OptionsGenerator");
const OptionsParser = require("./OptionsParser");
const StaticGenerator = require("./StaticGenerator");
const Utilities = require("./Utilities");
function cliFeedback(colorOrMessage, message) {
    switch (message ? colorOrMessage : '') {
        default:
            console.info(colorOrMessage);
            return;
        case 'blue':
            console.info('\x1b[34m' + colorOrMessage + '\x1b[0m');
            return;
        case 'green':
            console.info('\x1b[32m' + colorOrMessage + '\x1b[0m');
            return;
        case 'red':
            console.info('\x1b[31m' + colorOrMessage + '\x1b[0m');
            return;
        case 'yellow':
            console.info('\x1b[33m' + colorOrMessage + '\x1b[0m');
            return;
    }
}
exports.config = Config;
async function task(done) {
    try {
        cliFeedback('green', 'Start creating TypeScript declarations...');
        let declarationsModules = await OptionsGenerator.generate(await OptionsParser.parse(await Utilities.load(Config.treeOptionsJsonFile)));
        cliFeedback('green', 'Creating declarations...');
        declarationsModules = await NamespaceGenerator.generate(await NamespaceParser.parse(await Utilities.load(Config.treeNamespaceJsonFile)), declarationsModules);
        cliFeedback('green', 'Saving declarations...');
        await NamespaceGenerator.save(declarationsModules);
        await StaticGenerator.save();
        cliFeedback('green', 'Finished creating TypeScript declarations.');
    }
    catch (error) {
        if (error) {
            cliFeedback('red', error.toString());
            throw error;
        }
        else {
            throw new Error('Unknown error');
        }
    }
}
//# sourceMappingURL=GulpTask.js.map