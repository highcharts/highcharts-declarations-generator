/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

const MAP_TYPE_GENERIC: RegExp = /^([\w\.]+?)\.?<(.+)>$/gm;
const MAP_TYPE_LIST: RegExp = /^\((.+)\)$/gm;

const SEE_LINK_NAME_LAST = /\.(\w+)$/gm;

const config = (function () {
    try {
        return require(process.cwd() + '/tsdconfig.json');
    } catch {
        return require('../tsdconfig.json');
    }
}()) as IConfig;

config.cwd = process.cwd();

config.filterUndefined = function (type: string): boolean {
    return (type !== 'undefined');
};

config.findUndefined = function (type: string): boolean {
    return (type === 'undefined');
};

config.mapOptionType = function (option: string): string {
    return config.optionTypeMapping[option];
};

config.mapType = function (type: string): string {

    type = type.replace(MAP_TYPE_LIST, '$1');

    if (MAP_TYPE_GENERIC.test(type)) {
        return type.replace(
            MAP_TYPE_GENERIC,
            (match, generic, genericType) => {
                if (generic === 'Array' &&
                    genericType.indexOf(',') > 0 &&
                    genericType.indexOf('<') === -1
                ) {
                    return '[' + config.mapType(genericType) + ']';
                }
                else {
                    return generic + '<' + config.mapType(genericType) + '>';
                }
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
                name.replace(SEE_LINK_NAME_LAST, '#$1')
            );
        case 'member':
            return (
                config.seeBaseUrl + 'class-reference/' +
                name.replace(SEE_LINK_NAME_LAST, '#.$1')
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
    optionTypeMapping: { [key: string]: string };
    seeBaseUrl: string;
    treeNamespaceJsonPath: string;
    treeOptionsJsonPath: string;
    typeMapping: { [key: string]: string };
    filterUndefined (type: string): boolean;
    findUndefined (type: string): boolean;
    mapOptionType (option: string): string;
    mapType (type: string): string;
    mapValue (value: any): string;
    seeLink (name: string, kind: string, product?: string): string;
}
