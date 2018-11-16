"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const Colors = require("colors");
require('colors');
const Config = require("./Config");
const NamespaceGenerator = require("./NamespaceGenerator");
const NamespaceParser = require("./NamespaceParser");
const OptionsGenerator = require("./OptionsGenerator");
const OptionsParser = require("./OptionsParser");
const StaticGenerator = require("./StaticGenerator");
const Utils = require("./Utilities");
function task(done) {
    console.info(Colors.yellow.bold('Start creating TypeScript declarations...'));
    return Utils
        .load(Config.treeOptionsJsonFile)
        .then(OptionsParser.parse)
        .then(OptionsGenerator.generate)
        .then(optionsDeclarations => Utils
        .load(Config.treeNamespaceJsonFile)
        .then(NamespaceParser.parseIntoFiles)
        .then(filesDictionary => Promise.all([
        NamespaceGenerator.generate(filesDictionary, optionsDeclarations),
        StaticGenerator.generate()
    ])))
        .then(() => console.info(Colors.green.bold('Finished creating TypeScript declarations.')));
}
exports.task = task;
//# sourceMappingURL=GulpTask.js.map