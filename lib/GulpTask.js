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
    console.info(Colors.green('Start creating TypeScript declarations...'));
    return Promise
        .all([
        Utils
            .load(Config.treeNamespaceJsonFile)
            .then(json => NamespaceParser.parse(json))
            .then(NamespaceGenerator.declare),
        Utils
            .load(Config.treeOptionsJsonFile)
            .then(json => OptionsParser.parse(json))
            .then(OptionsGenerator.declare),
    ])
        .then(declarationFiles => {
        const namespaceDeclarationFiles = declarationFiles[0];
        const optionsDeclarationFiles = declarationFiles[1];
        return Promise.all([
            NamespaceGenerator.generate(cliFeedback, namespaceDeclarationFiles, optionsDeclarationFiles),
            StaticGenerator.generate(cliFeedback)
        ]);
    })
        .then(() => cliFeedback('green', 'Finished creating TypeScript declarations.'))
        .catch(err => {
        cliFeedback('red', err.toString());
        throw err;
    });
}
exports.task = task;
//# sourceMappingURL=GulpTask.js.map