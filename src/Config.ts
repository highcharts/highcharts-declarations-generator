/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/


import { sep, posix } from 'path';
import * as TSD from './TypeScriptDeclarations';
import * as Utilities from './Utilities';


/* *
 *
 *  Constants
 *
 * */


const MAP_TYPE_ARRAY_FIXED: RegExp = /Array<((?:[^<>\[\]]+|[\w\.]+<[^<>\[\]]+>),(?:[^<>\[\]]+|[\w\.]+<[^<>\[\]]+>)+)>/;


const SEE_LINK_NAME_LAST = /\.(\w+)$/;


/* *
 *
 *  Construction
 *
 * */


const config = (function () {

    let config: any;

    try {
        config = require(process.cwd() + '/dtsconfig.json');
    } catch {
        config = require('../dtsconfig.json');
    }

    let sortedTypeMapping = {} as any;

    Object
        .keys(config.typeMapping)
        .sort((a, b) => (b.length - a.length))
        .forEach(key => sortedTypeMapping[key] = config.typeMapping[key]);

    config.typeMapping = sortedTypeMapping;

    return config;

}()) as IConfig;


/* *
 *
 *  Properties
 *
 * */


config.cgd = (config.cgd || Utilities.parent(__dirname.split(sep).join(posix.sep)));

config.cwd = (config.cwd || process.cwd().split(sep).join(posix.sep));

config.treeNamespaceJsonFile = (config.treeNamespaceJsonFile || '')

config.treeOptionsJsonFile = (config.treeOptionsJsonFile || '')

config.withoutDoclets = (config.withoutDoclets || false);


/* *
 *
 *  Functions
 *
 * */


config.mapOptionType = function (option: string): string {
    return config.optionTypeMapping[option];
};


config.mapType = function (type: string, withoutConfig: boolean = false): string {

    if (type.startsWith('"TypeScript: ') && type.endsWith('"')) {
        return type.substring(13, type.length - 1);
    }

    type = type
        .replace(/\(\)/gm, '')
        .replace(/\s+/gm, ' ')
        .replace(/\.</gm, '<')
        .replace(/\*/gm, 'any');

    if (MAP_TYPE_ARRAY_FIXED.test(type)) {
        type = type.replace(new RegExp(MAP_TYPE_ARRAY_FIXED, 'gm'), '[$1]');
    }

    if (!type.startsWith('"') &&
        TSD.IDeclaration.TYPE_SEPARATOR.test(type)
    ) {
        return type.replace(
            new RegExp(TSD.IDeclaration.TYPE_NAME, 'gm'),
            (match: string, type: string, suffix: string) => {
                if (type.lastIndexOf('.') === (type.length - 1)) {
                    type = type.substring(0, (type.length - 1));
                }
                return config.mapType(type, (suffix === '<')) + suffix;
            }
        );
    }

    if (!withoutConfig &&
       config.typeMapping[type]
    ) {
        type = config.typeMapping[type];
    }

    if (
        type.startsWith('global.') ||
        type.startsWith('window.')
    ) {
        type = type.substring(7);
    }

    if (type.startsWith('globalThis.')) {
        type = type.substring(11);
    }

    type = type.replace(/\bkeyof_(?=>\w)/gsu, 'keyof ');
    type = type.replace(/\btypeof_(?=>\w)/gsu, 'typeof ');

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


/* *
 *
 *  Interfaces
 *
 * */


interface IConfig {
    cgd: string;
    cwd: string;
    mainModule: string;
    optionTypeMapping: { [option: string]: string };
    products: Utilities.Dictionary<string>;
    seeBaseUrl: string;
    treeNamespaceJsonFile: string;
    treeOptionsJsonFile: string;
    typeMapping: { [type: string]: string };
    withoutFactory: boolean;
    withoutDoclets: boolean;
    withoutLinks: boolean;
    mapOptionType (option: string): string;
    mapType (type: string, withoutConfig?: boolean): string;
    mapValue (value: any): string;
    seeLink (name: string, kind: string, product?: string): string;
}


/* *
 *
 *  Exports
 *
 * */


export = config;
