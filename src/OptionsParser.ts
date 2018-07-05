/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './Utilities';



export function parse(json: any): Promise<INode> {

    return new Promise((resolve, reject) => {

        let globalNode = createGlobalNode(json);

        prepareNode(globalNode);
        splitLargeNodes(globalNode, globalNode);
        extendNodes(globalNode);

        resolve(globalNode);
    });
}



let nodeDictionary = new utils.Dictionary<INode>();



function createGlobalNode(json: utils.Dictionary<INode>): INode {

    let optionsNode = {
            children: Object.assign({}, json),
            doclet: {
                type: { names: [ 'object' ] }
            },
            meta: {
                filename: '',
                fullname: 'Options',
                line: 0,
                lineEnd: 0,
                name: 'Options'
            }
        } as INode;

    delete optionsNode.children['_meta'];

    return {
        children: { 'Options': optionsNode },
        doclet: {
            type: { names: [ 'global' ] }
        },
        meta: {
            filename: '',
            fullname: '',
            line: 0,
            lineEnd: 0,
            name: ''
       }
    };
}



function extendNodes (node: INode) {

    let children = node.children,
        exclude = (node.doclet.exclude || []),
        sourceNames = (node.doclet.extends || '');

    if (sourceNames) {

        sourceNames
            .split(',')
            .map(sourceName =>
                sourceName === 'series' ?
                'plotOptions.series' :
                sourceName
            )
            .forEach(sourceName => {

                let sourceNode = nodeDictionary[sourceName];

                if (!sourceNode) {
                    return;
                }

                mergeNode(node, sourceNode, true, true);

                Object
                    .keys(sourceNode.children)
                    .filter(childName => exclude.indexOf(childName) === -1)
                    .forEach(childName => {

                        if (children[childName]) {
                            return;
                        }

                        children[childName] = utils.duplicateObject(
                            sourceNode.children[childName]
                        );
                    });
            });
    }

    Object
        .keys(children)
        .forEach(childName => extendNodes(children[childName]));
}



function generateOptionsTypeName (name: string): string {

    if (name[0] === '{') {
        console.error('Invalid name: ', name);
        name = name.substr(1, name.length - 2);
    }

    if (name === 'series') {
        name = 'PlotSeriesOptions';
    } else {
        name = name
            .split('.')
            .map(utils.capitalize)
            .join('');
        name = name.replace('Options', '') + 'Options';
    }

    name = (INTERFACE_MAPPING[name] || name);

    return name;
}



/**
 * Merge properties of a node by replacing basic types and joining arrays.
 */
function mergeNode(
    targetNode: INode,
    sourceNode: INode,
    targetWins: boolean = false,
    skipChildren: boolean = false,
): INode {

    let sourceChildren = sourceNode.children,
        sourceDoclet = sourceNode.doclet,
        targetChildren = targetNode.children,
        targetDoclet = targetNode.doclet;

    Object
        .keys(sourceDoclet)
        .forEach(key => {
            switch (key) {
                case 'defaultByProduct':
                    if (targetWins) {
                        targetDoclet[key] = Object.assign(
                            (sourceDoclet[key] || {}),
                            (targetDoclet[key] || {})
                        );
                    } else {
                        targetDoclet[key] = Object.assign(
                            (targetDoclet[key] || {}),
                            (sourceDoclet[key] || {})
                        );
                    }
                    return;
                case 'exclude':
                case 'products':
                case 'samples':
                    (targetDoclet as any)[key] = utils.mergeArrays(
                        ((targetDoclet as any)[key] || []),
                        ((sourceDoclet as any)[key] || [])
                    );
                    return;
                case 'type':
                case 'values':
                    targetDoclet[key] = sourceDoclet[key];
                    return;
                default:
                    if (targetWins) {
                        (targetDoclet as any)[key] = (
                            (targetDoclet as any)[key] ||
                            (sourceDoclet as any)[key]
                        );
                    } else {
                        (targetDoclet as any)[key] = (
                            (sourceDoclet as any)[key] ||
                            (targetDoclet as any)[key]
                        );
                    }
                    return;
            }
        });

    if (!skipChildren) {
        Object
            .keys(sourceChildren)
            .forEach(sourceChildName => {
                if (targetChildren[sourceChildName]) {
                    mergeNode(
                        targetChildren[sourceChildName],
                        sourceChildren[sourceChildName],
                        targetWins
                    );
                } else {
                    targetChildren[sourceChildName] = (
                        sourceChildren[sourceChildName]
                    );
                }
            });
    }

    return targetNode;
}



function prepareName(parentName: string = '', name: string, node: INode) {

    if (!node.meta.name) {
        node.meta.name = name;
    }

    if (!node.meta.fullname) {
        if (parentName) {
            node.meta.fullname = parentName + '.';
        }
        node.meta.fullname += node.meta.name;
    }
}



function prepareNode (node: INode) {

    let children = node.children,
        childNames = Object.keys(children),
        name = node.meta.fullname;

    if (name && childNames.length > 0) {
        nodeDictionary[name] = node;
    }

    childNames
        .forEach(childName => {

            let childNode = children[childName];

            prepareName(
                (node.meta.fullname || node.meta.name),
                childName,
                childNode
            );

            if (childNode.meta.fullname) {
                nodeDictionary[childNode.meta.fullname] = childNode;
            }

            if (Object.keys(childNode.children).length === 0) {
                prepareType(childNode);
            }

            if (childNode.doclet.deprecated === true) {
                delete children[childName];
            } else {
                prepareNode(childNode);
            }
        });
}



function prepareType(node: INode) {

    if (node.doclet.type && node.doclet.type.names) {
        node.doclet.type = {
            names: node.doclet.type.names.map(utils.mapType)
        };
        return;
    }

    if (node.meta.default) {
        node.doclet.type = { names: [ typeof node.meta.default ] };
        return;
    }

    let defaultValue = (
        node.doclet.default && node.doclet.default.value ||
        node.doclet.defaultvalue
    );

    if (!defaultValue && node.doclet.defaultByProduct) {

        let productDefaults = node.doclet.defaultByProduct;

        Object.keys(productDefaults).some(key => {
            defaultValue = productDefaults[key];
            return true;
        })
    }

    if (!defaultValue) {
        node.doclet.type = { names: [ 'object' ] };
        return;
    }

    switch (defaultValue) {
        case 'false':
        case 'true':
            node.doclet.type = { names: [ 'boolean' ] };
            return;
        case '0':
        case '1':
            node.doclet.type = { names: [ 'number ' ] };
            return;
        case 'null':
        case 'undefined':
            node.doclet.type = { names: [ '*' ] };
            return;
    }

    if (parseInt(defaultValue) !== NaN ||
        parseFloat(defaultValue) !== NaN
    ) {
        node.doclet.type = { names: [ 'number' ] };
    } else {
        node.doclet.type = { names: [ 'string' ] };
    }
}



function splitLargeNodes (node: INode, globalNode: INode) {

    let children = (node.children || {}),
        newName = '';

    Object
        .keys(children)
        .forEach(childName => {

            let childNode = children[childName],
                childTypes = (
                    (childNode.doclet.type && childNode.doclet.type.names) ||
                    []
                ).join('|');

            if (Object.keys(childNode.children).length === 0) {
                return;
            }

            let newName = generateOptionsTypeName(
                    childNode.meta.fullname || childName
                ),
                newFullname = 'Highcharts.' + newName,
                newNode = utils.duplicateObject(childNode, 1);

            newNode.meta.fullname = newFullname;
            newNode.meta.name = newName;

            childNode.children = {};

            if (childTypes.indexOf('Array') === 0 ) {
                childNode.doclet.type = { names: [ 'Array<' + newFullname + '>' ] };
            } else {
                childNode.doclet.type = { names: [ newFullname ] };
            }

            let globalChildren = globalNode.children;

            if (globalChildren[newName]) {
                mergeNode(globalChildren[newName], newNode);
            } else {
                globalChildren[newName] = newNode;
            }

            splitLargeNodes(newNode, globalNode);
        })
}



/* *
 *
 *  JSON Interface
 * 
 * */

// Level 1

export interface INode {
    children: utils.Dictionary<INode>;
    doclet: IDoclet;
    meta: IMeta;
}

// Level 2

export interface IDoclet {
    context?: string;
    default?: IDefault;
    defaultByProduct?: utils.Dictionary<string>;
    defaultvalue?: string;
    deprecated?: boolean;
    description?: string;
    exclude?: Array<string>;
    extends?: string;
    products?: Array<string>;
    sample?: ISample;
    samples?: Array<ISample>;
    since?: string;
    tags?: Array<ITags>;
    type?: IType;
    undocumented?: boolean;
    values?: string;
}

export interface IMeta {
    filename: string;
    line: number;
    lineEnd: number;
    column?: number;
    default?: (boolean|number|string);
    fullname?: string;
    name?: string;
}

// Level 3

export interface IDefault {
    value: string;
    product: Array<string>;
}

export interface ISample {
    value: string;
    products: Array<string>
    name?: string;
}

export interface ITags {
    originalTitle: string;
    text: string;
    title: string;
    value: string;
}

export interface IType {
    names: Array<string>;
}



/* *
 *
 *  TypeScript Interface Mapping
 *
 * */

export const INTERFACE_MAPPING: utils.Dictionary<string> = {
}
