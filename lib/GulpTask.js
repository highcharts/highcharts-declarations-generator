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
        .all([
        Utils
            .load(Config.treeNamespaceJsonFile)
            .then(json => NamespaceParser.parse(json))
            .then(NamespaceGenerator.generate),
        Utils
            .load(Config.treeOptionsJsonFile)
            .then(json => OptionsParser.parse(json))
            .then(OptionsGenerator.generate)
    ])
        .then(declarationsModules => {
        cliFeedback('green', 'JSON processed.');
        const namespaceModules = declarationsModules[0];
        const optionsModules = declarationsModules[1];
        cliFeedback('green', 'Completing declarations...');
        return NamespaceGenerator
            .save(cliFeedback, namespaceModules, optionsModules)
            .then(() => StaticGenerator.save(cliFeedback));
    })
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