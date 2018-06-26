/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './Utilities';



export function parse(json: any): Promise<INode> {

    return new Promise((resolve, reject) => {

        let globalNode = createGlobalNode(json);

        splitExtendedNodes(globalNode, globalNode);

        resolve(globalNode);
    });
}



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



function splitExtendedNodes(node: INode, globalNode: INode) {

    let children = (node.children || {}),
        newName = '';

    Object
        .keys(children)
        .forEach(childName => {

            let childNode = children[childName];

            prepareName(
                (node.meta.fullname || node.meta.name),
                childName,
                childNode
            );

            if (Object.keys(childNode.children).length === 0) {
                prepareType(node);
                return;
            }

            let newName = (childNode.meta.name || childName);

            if (newName.indexOf('Options') === -1) {
                newName = newName + 'Options';
            }

            newName = utils.capitalize(newName);

            let newNode = {
                    children: Object.assign({}, childNode.children),
                    doclet: Object.assign({}, childNode.doclet),
                    meta: Object.assign({}, childNode.meta, {
                        fullname: newName,
                        name: newName
                    })
                },
                oldNode = {

                };

            childNode.children = {};
            childNode.doclet.type = { names: [ newName ] };

            if (globalNode.children[newName]) {
                mergeNode(globalNode.children[newName], newNode);
            } else {
                globalNode.children[newName] = newNode;
            }

            splitExtendedNodes(newNode, globalNode);
        })
}



function mergeNode(targetNode: INode, sourceNode: INode): INode {

    let sourceChildren = sourceNode.children,
        sourceDoclet = sourceNode.doclet,
        sourceMeta = sourceNode.meta,
        targetChildren = targetNode.children,
        targetDoclet = targetNode.doclet,
        targetMeta = targetNode.meta;

    let mergedExclude = [] as Array<string>,
        mergedProducts = [] as Array<string>,
        mergedSamples = [] as Array<ISample>,
        mergedTypeNames = [] as Array<string>;

    utils.mergeArray(
        mergedExclude,
        (targetDoclet.exclude || []),
        (sourceDoclet.exclude || [])
    );

    utils.mergeArray(
        mergedProducts,
        (targetDoclet.products || []),
        (sourceDoclet.products || [])
    );

    utils.mergeArray(
        mergedSamples,
        (targetDoclet.samples || []),
        (sourceDoclet.samples || [])
    );

    utils.mergeArray(
        mergedTypeNames,
        (targetDoclet.type && targetDoclet.type.names || []),
        (sourceDoclet.type && sourceDoclet.type.names || [])
    );

    Object.assign(targetDoclet, sourceDoclet, {
        defaultByProduct: Object.assign(
            (targetDoclet.defaultByProduct || {}),
            (sourceDoclet.defaultByProduct || {})
        ),
        exclude: mergedExclude,
        products: mergedProducts,
        samples: mergedSamples,
        type: {
            names: mergedTypeNames
        }
    });

    Object
        .keys(sourceChildren)
        .forEach(sourceChildName => {
            if (targetChildren[sourceChildName]) {
                mergeNode(
                    targetChildren[sourceChildName],
                    sourceChildren[sourceChildName]
                );
            } else {
                targetChildren[sourceChildName] = (
                    sourceChildren[sourceChildName]
                );
            }
        });

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



function prepareType(node: INode) {

    if (node.doclet.type && node.doclet.type.names) {
        node.doclet.type = {
            names: node.doclet.type.names.map(utils.typeMapper)
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
    description?: string;
    exclude?: Array<string>;
    extends?: string;
    products?: Array<string>;
    sample?: ISample;
    samples?: Array<ISample>;
    since?: string;
    type?: IType;
    undocumented?: boolean;
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

export interface IType {
    names: Array<string>;
}
