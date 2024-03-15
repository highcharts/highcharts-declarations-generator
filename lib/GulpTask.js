"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.task = exports.config = void 0;
const Colors = require("colors");
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
        case 'blue':
        case 'green':
        case 'red':
        case 'yellow':
            console.info(Colors[colorOrMessage](message));
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
exports.task = task;
//# sourceMappingURL=GulpTask.js.map