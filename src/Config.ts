/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

const MAP_TYPE_GENERIC: RegExp = /^([\w\.]+?)\.?<(.+)>$/gm;
const MAP_TYPE_LIST: RegExp = /^\((.+)\)$/gm;

const config = (function () {
    try {
        return require(process.cwd() + '/tsdconfig.json');
    } catch {
        return require('../tsdconfig.json');
    }
}()) as IConfig;

config.cwd = process.cwd();
config.mapType = function (type: string): string {

    type = type.replace(MAP_TYPE_LIST, '$1');

    if (MAP_TYPE_GENERIC.test(type)) {
        return type.replace(
            MAP_TYPE_GENERIC,
            (match, generic, genericType) => {
                return generic + '<' + config.mapType(genericType) + '>';
            }
        );
    }

    if (type.indexOf('|') > 0) {

        let genericLevel = 0,
            typeSplit = [] as Array<string>;

        type.split('|')
            .forEach(type => {
                if (type.indexOf('<') > 0) {
                    if (type.indexOf('>') === -1) {
                        genericLevel++;
                    }
                    typeSplit.push(type);
                } else if (genericLevel > 0) {
                    if (type.indexOf('>') > 0) {
                        genericLevel--;
                    }
                    typeSplit[typeSplit.length-1] += '|' + type;
                } else {
                    typeSplit.push(type)
                }
            });

        return '(' + typeSplit.map(config.mapType).join('|') + ')';
    }

    if (config.typeMapping[type]) {
        return config.typeMapping[type];
    }

    return type;
};

export = config;

interface IConfig {
    cwd: string;
    mainModule: string;
    treeNamespaceJsonPath: string;
    treeOptionsJsonPath: string;
    typeMapping: { [key: string]: string };
    typeModule: string;
    mapType (type: string): string; 
}
