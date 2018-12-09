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
    return Utils
        .load(Config.treeOptionsJsonFile)
        .then(OptionsParser.parse)
        .then(OptionsGenerator.generate)
        .then(optionsDeclarations => Utils
        .load(Config.treeNamespaceJsonFile)
        .then(NamespaceParser.parseIntoFiles)
        .then(filesDictionary => Promise.all([
        NamespaceGenerator.generate(cliFeedback, filesDictionary, optionsDeclarations),
        StaticGenerator.generate(cliFeedback)
    ])))
        .then(() => console.info(Colors.green('Finished creating TypeScript declarations.')))
        .catch(err => {
        console.info(Colors.red(err.toString()));
        throw err;
    });
}
exports.task = task;
//# sourceMappingURL=GulpTask.js.map