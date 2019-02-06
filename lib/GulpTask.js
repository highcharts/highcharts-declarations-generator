"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const Colors = require("colors");
const Config = require("./Config");
const NamespaceGenerator = require("./NamespaceGenerator");
const NamespaceParser = require("./NamespaceParser");
const OptionsGenerator = require("./OptionsGenerator");
const OptionsParser = require("./OptionsParser");
const StaticGenerator = require("./StaticGenerator");
const Utils = require("./Utilities");
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
function task(done) {
    cliFeedback('green', 'Start creating TypeScript declarations...');
    return Promise
        .all([])
        .then(() => Utils
        .load(Config.treeOptionsJsonFile)
        .then(OptionsParser.parse)
        .then(OptionsGenerator.generate))
        .then(optionsNamespace => Utils
        .load(Config.treeNamespaceJsonFile)
        .then(NamespaceParser.parse)
        .then(moduleNodes => {
        cliFeedback('green', 'Creating declarations...');
        return NamespaceGenerator.generate(moduleNodes, optionsNamespace);
    }))
        .then(declarationsModules => {
        cliFeedback('green', 'Saving declarations...');
        return declarationsModules;
    })
        .then(NamespaceGenerator.save)
        .then(StaticGenerator.save)
        .then(() => cliFeedback('green', 'Finished creating TypeScript declarations.'))
        .catch(error => {
        if (error) {
            cliFeedback('red', error.toString());
            throw error;
        }
        else {
            throw new Error('Unknown error');
        }
    });
}
exports.task = task;
//# sourceMappingURL=GulpTask.js.map