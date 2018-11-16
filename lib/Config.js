"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
const TSD = require("./TypeScriptDeclarations");
const Utils = require("./Utilities");
const MAP_TYPE_MINIARRAY = /Array<(["\w\.]+(?:<[^,]+>)?,\s*(?:["\w\.\,]+|\([^,]+\)|\[[^,]+\]|<[^,]+>)+)>/;
const SEE_LINK_NAME_LAST = /\.(\w+)$/;
const config = (function () {
    let config;
    try {
        config = require(process.cwd() + '/tsgconfig.json');
    }
    catch (_a) {
        config = require('../tsgconfig.json');
    }
    let sortedTypeMapping = {};
    Object
        .keys(config.typeMapping)
        .sort((a, b) => (b.length - a.length))
        .forEach(key => sortedTypeMapping[key] = config.typeMapping[key]);
    config.typeMapping = sortedTypeMapping;
    return config;
}());
config.cgd = (config.cgd || Utils.parent(__dirname));
config.cwd = (config.cwd || process.cwd());
config.mapOptionType = function (option) {
    return config.optionTypeMapping[option];
};
config.mapType = function (type, withoutConfig = false) {
    type = type
        .replace(/\(\)/gm, '')
        .replace(/\s+/gm, ' ')
        .replace(/\.</gm, '<')
        .replace(/\*/gm, 'any');
    if (MAP_TYPE_MINIARRAY.test(type)) {
        type = type.replace(new RegExp(MAP_TYPE_MINIARRAY, 'gm'), '[$1]');
    }
    if (TSD.IDeclaration.TYPE_SEPARATOR.test(type)) {
        return type.replace(new RegExp(TSD.IDeclaration.TYPE_NAME, 'gm'), (match, type, suffix) => {
            if (type.lastIndexOf('.') === (type.length - 1)) {
                type = type.substr(0, (type.length - 1));
            }
            return config.mapType(type, (suffix === '<')) + suffix;
        });
    }
    if (!withoutConfig
        && config.typeMapping[type]) {
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