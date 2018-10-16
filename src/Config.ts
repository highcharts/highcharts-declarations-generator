/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as tsd from './TypeScriptDeclarations';

const MAP_TYPE_MINIARRAY: RegExp = /Array<(["\w\.]+(?:<[^,]+>)?,\s*(?:["\w\.\,]+|\([^,]+\)|\[[^,]+\]|<[^,]+>)+)>/;

const SEE_LINK_NAME_LAST = /\.(\w+)$/;

const config = (function () {

    let config: any;

    try {
        config = require(process.cwd() + '/tsdconfig.json');
    } catch {
        config = require('../tsdconfig.json');
    }

    let sortedTypeMapping = {} as any;

    Object
        .keys(config.typeMapping)
        .sort((a, b) => (b.length - a.length))
        .forEach(key => sortedTypeMapping[key] = config.typeMapping[key]);

    config.typeMapping = sortedTypeMapping;

    return config;

}()) as IConfig;

config.cwd = (config.cwd || process.cwd());

config.mapOptionType = function (option: string): string {
    return config.optionTypeMapping[option];
};

config.mapType = function (type: string, withoutConfig: boolean = false): string {

    type = type
        .replace(/\(\)/gm, '')
        .replace(/\s+/gm, ' ')
        .replace(/\.</gm, '<')
        .replace(/\*/gm, 'any');

    if (MAP_TYPE_MINIARRAY.test(type)) {
        type = type.replace(new RegExp(MAP_TYPE_MINIARRAY, 'gm'), '[$1]');
    }

    if (tsd.IDeclaration.TYPE_SUFFIX.test(type)) {
        return type.replace(
            new RegExp(tsd.IDeclaration.TYPE_NAME, 'gm'),
            (match: string, type: string, suffix: string) => {
                if (type.lastIndexOf('.') === (type.length - 1)) {
                    type = type.substr(0, (type.length - 1));
                }
                return config.mapType(type, (suffix === '<')) + suffix;
            }
        );
    }

    if (!withoutConfig
        && config.typeMapping[type]
    ) {
        type = config.typeMapping[type];
    }

    if (type.startsWith('global.') ||
        type.startsWith('window.')
    ) {
        type = type.substr(7);
    }

    if (type.startsWith('typeof_')) {
        type = 'typeof ' + type.substr(7);
    }

    return type;
};

config.mapValue = function (value: any): string {

    switch(typeof value) {
        default:
            return value.toString();
        case 'string':
            return '"' + value + '"';
        case 'undefined':
        case 'object':
            if (value) {
                return 'Object';
            } else {
                return 'undefined';
            }
    }

};

config.seeLink = function (name: string, kind: string, product?: string) {

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
            return (
                config.seeBaseUrl + 'class-reference/' +
                name.replace(new RegExp(SEE_LINK_NAME_LAST, 'gm'), '#$1')
            );
        case 'member':
            return (
                config.seeBaseUrl + 'class-reference/' +
                name.replace(new RegExp(SEE_LINK_NAME_LAST, 'gm'), '#.$1')
            );
        case 'interface':
        case 'option':
        case 'typedef':
            return config.seeBaseUrl + product + '/' + name;
    }
};

export = config;

interface IConfig {
    cwd: string;
    mainModules: { [product: string]: string };
    optionTypeMapping: { [option: string]: string };
    seeBaseUrl: string;
    treeNamespaceJsonFile: string;
    treeOptionsJsonFile: string;
    typeMapping: { [type: string]: string };
    mapOptionType (option: string): string;
    mapType (type: string, withoutConfig?: boolean): string;
    mapValue (value: any): string;
    seeLink (name: string, kind: string, product?: string): string;
}
