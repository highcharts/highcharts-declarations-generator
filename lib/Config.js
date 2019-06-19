"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
const path_1 = require("path");
const TSD = require("./TypeScriptDeclarations");
const Utils = require("./Utilities");
/* *
 *
 *  Constants
 *
 * */
const MAP_TYPE_ARRAY_FIXED = /Array<((?:[^<>\[\]]+|[\w\.]+<[^<>\[\]]+>),(?:[^<>\[\]]+|[\w\.]+<[^<>\[\]]+>)+)>/;
const SEE_LINK_NAME_LAST = /\.(\w+)$/;
/* *
 *
 *  Construction
 *
 * */
const config = (function () {
    let config;
    try {
        config = require(process.cwd() + '/dtsconfig.json');
    }
    catch (_a) {
        config = require('../dtsconfig.json');
    }
    let sortedTypeMapping = {};
    Object
        .keys(config.typeMapping)
        .sort((a, b) => (b.length - a.length))
        .forEach(key => sortedTypeMapping[key] = config.typeMapping[key]);
    config.typeMapping = sortedTypeMapping;
    return config;
}());
/* *
 *
 *  Properties
 *
 * */
config.cgd = (config.cgd || Utils.parent(__dirname.split(path_1.sep).join(path_1.posix.sep)));
config.cwd = (config.cwd || process.cwd().split(path_1.sep).join(path_1.posix.sep));
config.treeNamespaceJsonFile = (config.treeNamespaceJsonFile || '');
config.treeOptionsJsonFile = (config.treeOptionsJsonFile || '');
config.withoutDoclets = (config.withoutDoclets || false);
/* *
 *
 *  Functions
 *
 * */
config.mapOptionType = function (option) {
    return config.optionTypeMapping[option];
};
config.mapType = function (type, withoutConfig = false) {
    type = type
        .replace(/\(\)/gm, '')
        .replace(/\s+/gm, ' ')
        .replace(/\.</gm, '<')
        .replace(/\*/gm, 'any');
    if (MAP_TYPE_ARRAY_FIXED.test(type)) {
        type = type.replace(new RegExp(MAP_TYPE_ARRAY_FIXED, 'gm'), '[$1]');
    }
    if (!type.startsWith('"') &&
        TSD.IDeclaration.TYPE_SEPARATOR.test(type)) {
        return type.replace(new RegExp(TSD.IDeclaration.TYPE_NAME, 'gm'), (match, type, suffix) => {
            if (type.lastIndexOf('.') === (type.length - 1)) {
                type = type.substr(0, (type.length - 1));
            }
            return config.mapType(type, (suffix === '<')) + suffix;
        });
    }
    if (!withoutConfig &&
        config.typeMapping[type]) {
        type = config.typeMapping[type];
    }
    if (type.startsWith('global.') ||
        type.startsWith('window.')) {
        type = type.substr(7);
    }
    if (type.startsWith('typeof_')) {
        type = 'typeof ' + type.substr(7);
    }
    return type;
};
config.mapValue = function (value) {
    switch (typeof value) {
        default:
            return value.toString();
        case 'string':
            return '"' + value + '"';
        case 'undefined':
        case 'object':
            if (value) {
                return 'Object';
            }
            else {
                return 'undefined';
            }
    }
};
config.seeLink = function (name, kind, product) {
    name = name.replace(':.', '-');
    product = (product || 'highcharts');
    switch (kind) {
        default:
            return '';
        case 'global':
            return config.seeBaseUrl + 'class-reference/';
        case 'class':
        case 'namespace':
            return config.seeBaseUrl + 'class-reference/' + name;
        case 'constructor':
        case 'function':
            return (config.seeBaseUrl + 'class-reference/' +
                name.replace(new RegExp(SEE_LINK_NAME_LAST, 'gm'), '#$1'));
        case 'member':
            return (config.seeBaseUrl + 'class-reference/' +
                name.replace(new RegExp(SEE_LINK_NAME_LAST, 'gm'), '#.$1'));
        case 'interface':
        case 'option':
        case 'typedef':
            return config.seeBaseUrl + product + '/' + name;
    }
};
module.exports = config;
//# sourceMappingURL=Config.js.map