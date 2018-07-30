/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as config from './Config';
import * as utils from './Utilities';



export function parseIntoFiles(json: any): Promise<utils.Dictionary<INode>> {

    return new Promise((resolve, reject) => {

        let modules = new utils.Dictionary<INode>();

        transferNodes(json, modules);

        resolve(modules);
    });
}



/**
 * Copies all nodes into there modules.
 *
 * @param {INode} sourceNode
 *        The node to copy into the modules.
 *
 * @param {Dictionary<INode>} targetModules
 *        The module dictionary to copy the node in.
 */
function transferNodes (
    sourceNode: INode, targetModules: utils.Dictionary<INode>
) {

    if (sourceNode.doclet &&
        sourceNode.meta
    ) {

        let sourceDoclet = sourceNode.doclet,
            sourceMeta = sourceNode.meta;

        (sourceMeta.files || [])
            .map(file => utils.base(file.path))
            .forEach(modulePath => {

            let moduleNode = prepareModule(targetModules, modulePath),
                targetName = (sourceDoclet.name || ''),
                targetNode = (
                    findNode(moduleNode, targetName) ||
                    createNode(moduleNode, targetName)
                ),
                targetDoclet = targetNode.doclet;

            if (!targetDoclet) {
                targetDoclet = targetNode.doclet = {
                    description: ''
                } as IDoclet;
            }

            Object
                .keys(sourceDoclet)
                .forEach(key =>
                    (targetDoclet as any)[key] =
                    (sourceDoclet as any)[key]
                );
        });
    }

    if (sourceNode.children) {

        let sourceChildren = sourceNode.children;

        Object
            .keys(sourceChildren || {})
            .forEach(key => transferNodes(sourceChildren[key], targetModules));
    }
}



/**
 * Creates an returns a node in the given root node.
 *
 * @param {INode} rootNode
 *        The root node to create the node in.
 *
 * @param {string} nodeName
 *        The full name of the node to create.
 */
function createNode (rootNode: INode, nodeName: string): INode {

    if (!rootNode) {
        throw new Error('No root node has been provided.');
    }

    let node = rootNode;

    if (nodeName) {
        nodeName
            .split('.')
            .forEach(childName => {
                if (!node.children) {
                    node.children = {};
                }
                if (!node.children[childName]) {
                    node.children[childName] = {};
                }
                node = node.children[childName];
            });
    }

    return node
}



/**
 * Search a node and returns it, if founded.
 *
 * @param {INode} rootNode
 *        The root node to search in.
 *
 * @param {string} nodeName
 *        The full name of the node to find.
 */
function findNode (
    rootNode: INode, nodeName: string
): (INode | undefined) {

    if (!rootNode) {
        throw new Error('No root node has been provided.');
    }

    let node = rootNode as (INode | undefined);

    if (nodeName) {
        nodeName
            .split('.')
            .every(childName => {
                if (node) {
                    node = (node.children && node.children[childName]);
                    return true;
                } else {
                    return false;
                }
            });
    }

    return node;
}



/**
 * Update the type of the node.
 *
 * @param {INode} node
 *        The node to update.
 */
function mapNodeTypes (node: INode) {

    let types = (node.doclet && node.doclet.types)

    if (!node.doclet) {
        return;
    }

    if (!node.doclet.types) {
        node.doclet.types = [ 'any' ];
    } else {
        node.doclet.types.map(config.mapType);
    }
}



/**
 * Prepares and returns the specified module.
 *
 * @param {Dictionary<INode>} modules
 *        The dictionary with all modules.
 *
 * @param {string} modulePath
 *        The file path to the module.
 */
function prepareModule (
    modules: utils.Dictionary<INode>, modulePath: string
): INode {

    modules[modulePath] = (modules[modulePath] || {
        children: {},
        doclet: {
            kind: 'namespace',
            name: 'Highcharts',
        },
        meta: {
            files: [{
                line: 0,
                path: modulePath + '.js'
            }]
        }
    });

    return modules[modulePath];
}



/* *
 *
 *  JSON Interface
 * 
 * */



// Level 1



export interface INode {
    children?: utils.Dictionary<INode>;
    doclet?: IDoclet;
    meta?: IMeta;
}



// Level 2



export interface IDoclet {
    description: string;
    kind: IKind;
    name: string;
    defaultValue?: (boolean | number | string);
    isDeprecated?: boolean;
    isGlobal?: boolean;
    isOptional?: boolean;
    isPrivate?: boolean;
    isStatic?: boolean;
    parameters?: utils.Dictionary<IParameter>;
    return?: IReturn;
    see?: Array<string>;
    types?: ITypes;
}



export interface IMeta {
    files: Array<IFile>;
}



// Level 3



export type IKind = (
    'class' |
    'function' |
    'global' |
    'interface' |
    'member' |
    'namespace' | 
    'typedef'
);



export interface IParameter {
    defaultValue?: (boolean|number|string);
    description?: string;
    isOptional?: boolean;
    isVariable?: boolean;
    types?: ITypes;
}



export interface IReturn {
    description?: string;
    types?: ITypes;
}



export type ITypes = Array<string>;



export interface IFile {
    path: string;
    line: number;
}
