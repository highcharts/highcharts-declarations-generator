/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

const MAP_TYPE_GENERIC: RegExp = /^(\w+)\.?<(.+)>$/gm;
const MAP_TYPE_LIST: RegExp = /^\((.+)\)$/gm;

const config = (function () {
    try {
        return require(process.cwd() + '/tsdconfig.json');
    } catch {
        return require('../tsdconfig.json');
    }
}()) as IConfig;

config.mapType = function (type: string): string {

    type = type.replace(MAP_TYPE_LIST, '$1');

    if (MAP_TYPE_GENERIC.test(type)) {
        return type.replace(
            MAP_TYPE_GENERIC,
            function (match, generic, type) {
                return generic + '<' + config.mapType(type.trim()) + '>';
            }
        );
    }

    if (type.indexOf('|') > -1) {
        return (
            '(' +
            type.split('|').map(type => config.mapType(type.trim())).join('|') +
            ')'
        );
    }

    if (config.typeMapping[type]) {
        return config.typeMapping[type];
    }

    return type;
};

export = config;

interface IConfig {
    destinationPath: string;
    treeNamespaceJsonPath: string;
    treeOptionsJsonPath: string;
    typeMapping: { [key: string]: string };
    mapType (type: string): string; 
}
