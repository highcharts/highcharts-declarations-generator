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
 * @param sourceNode
 *        The node to copy into the modules.
 *
 * @param targetModules
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
                targetNode = findNode(moduleNode, targetName),
                targetDoclet = targetNode.doclet;

            if (targetDoclet &&
                !isEqual(targetDoclet, sourceDoclet)
            ) {
                targetNode = findNode(moduleNode, targetName, true);
                targetDoclet = targetNode.doclet;
            }

            if (!targetDoclet) {
                targetDoclet = targetNode.doclet = {} as any;
            }

            Object
                .keys(sourceDoclet)
                .forEach(key =>
                    (targetDoclet as any)[key] = (sourceDoclet as any)[key]
                );
        });
    }

    if (sourceNode.children) {
        sourceNode.children.forEach(
            sourceChild => transferNodes(sourceChild, targetModules)
        );
    }
}



/**
 * Compares two light doclets for basic equality. Returns true, if the doclet is
 * basically equal.
 *
 * @param docletA
 *        First node to analyze.
 *
 * @param docletB
 *        Second node to analyze.
 */
function isEqual (docletA: IDoclet, docletB: IDoclet) {

    return (
        typeof docletA === typeof docletB &&
        typeof docletA.name === typeof docletB.name &&
        docletA.name === docletB.name &&
        (
            Object.keys(docletA).length == 1 ||
            Object.keys(docletB).length == 1 ||
            utils.isDeepEqual(docletA, docletB)
        )
    );
}



/**
 * Search a node and returns it, if founded.
 *
 * @param rootNode
 *        The root node to search in.
 *
 * @param nodeName
 *        The full name of the node to find.
 *
 * @param overload
 *        Create additional node.
 */
function findNode (
    rootNode: INode, nodeName: string, overload: boolean = false
): INode {

    let found = false,
        node = rootNode,
        spaceNames = utils.namespaces(nodeName, true),
        indexEnd = (spaceNames.length - 1);

    spaceNames.forEach((spaceName, index) => {

        if (!node.children) {
            node.children = [];
        }

        if (overload &&
            index === indexEnd
        ) {
            found = false;
        }
        else {
            found = node.children.some(child => {
                if (child.doclet &&
                    child.doclet.name === spaceName
                ) {
                    node = child;
                    return true;
                }
                else {
                    return false;
                }
            });
        }

        if (!found) {

            let newNode = {
                doclet: {
                    name: spaceName
                }
            } as INode;

            node.children.push(newNode);

            node = newNode;
        }
    });

    return node;
}



/**
 * Prepares and returns the specified module.
 *
 * @param modules
 *        The dictionary with all modules.
 *
 * @param modulePath
 *        The file path to the module.
 */
function prepareModule (
    modules: utils.Dictionary<INode>, modulePath: string
): INode {

    modules[modulePath] = (modules[modulePath] || {
        children: [],
        doclet: {
            description: '',
            kind: 'global',
            name: '',
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
    doclet: IDoclet;
    children?: Array<INode>;
    meta?: IMeta;
}



// Level 2



export interface IDoclet {
    description: string;
    kind: IKind;
    name: string;
    defaultValue?: (boolean | number | string);
    events?: utils.Dictionary<IEvent>;
    fires?: Array<string>;
    isDeprecated?: boolean;
    isGlobal?: boolean;
    isOptional?: boolean;
    isPrivate?: boolean;
    isStatic?: boolean;
    parameters?: utils.Dictionary<IParameter>;
    return?: IReturn;
    see?: Array<string>;
    types?: ITypes;
    values?: string;
}



export interface IMeta {
    files: Array<IFile>;
}



// Level 3



export interface IEvent {
    description: string;
    types: ITypes;
}



export interface IFile {
    path: string;
    line: number;
}



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
