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
            typeList = [] as Array<string>;

        type.split('|')
            .forEach(type => {
                if (type.indexOf('<') > 0) {
                    genericLevel += (
                        type.split('<').length - type.split('>').length
                    );
                    typeList.push(type);
                } else if (genericLevel > 0) {
                    genericLevel -= type.split('>').length - 1;
                    typeList[typeList.length-1] += '|' + type;
                } else {
                    typeList.push(type);
                }
            });

        return '(' + typeList.map(config.mapType).join('|') + ')';
    }

    if (config.typeMapping[type]) {
        return config.typeMapping[type];
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
                return 'object';
            } else {
                return 'undefined';
            }
    }

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
    mapValue (value: any): string;
}
