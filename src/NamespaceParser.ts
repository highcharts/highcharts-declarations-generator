/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './Utilities';



export function splitIntoFiles(
    json: any
): Promise<utils.Dictionary<NamespaceNode>> {

    return new Promise((resolve, reject) => {

        let fileDictionary = new utils.Dictionary<NamespaceNode>();

        transferNodes(json, fileDictionary);

        resolve(fileDictionary);
    });
}



function findFileNode(
    fileDictionary: utils.Dictionary<NamespaceNode>,
    filePath: string,
    name: string
): NamespaceNode {

    let node = fileDictionary[filePath];
    
    if (!node) {
        node = fileDictionary[filePath] = {};
    }

    if (name === '') {
        return node;
    }

    let parts = name.split('.');

    parts.forEach(part => {
        if (typeof node.children === 'undefined') {
            node.children = {};
        }
        if (typeof node.children[part] === 'undefined') {
            node.children[part] = {};
        }
        node = node.children[part];
    });

    return node;
}



function transferNodes(
    sourceNode: NamespaceNode,
    fileDictionary: utils.Dictionary<NamespaceNode>
) {

    if (sourceNode.doclet &&
        sourceNode.meta
    ) {

        let sourceDoclet = sourceNode.doclet,
            sourceMeta = sourceNode.meta;

        (sourceMeta.files || []).forEach(file => {

            let targetNode = findFileNode(
                    fileDictionary, file.path, (sourceDoclet.name || '')
                ),
                targetDoclet = targetNode.doclet;

            if (!targetDoclet) {
                targetDoclet = targetNode.doclet = {} as any;
            }

            transferProps(sourceDoclet, targetDoclet);
        });
    }

    if (sourceNode.children) {

        let sourceChildren = sourceNode.children;

        Object
            .keys(sourceChildren || {})
            .forEach(key => transferNodes(sourceChildren[key], fileDictionary));
    }
}



function transferProps(source: any, target: any) {

    if (source && target) {
        Object
            .keys(source)
            .forEach(key => target[key] = source[key]);
    }
}



/* *
 *
 *  JSON Interfaces
 * 
 * */



export interface NamespaceTree {
    children?: utils.Dictionary<NamespaceNode>;
    doclet: {
        description: string;
        kind: 'global';
        longname: string;
    };
    meta:  NamespaceMeta & {
        branch: string;
        commit: string;
        date: string;
        version: string;
        files?: Array<NamespaceFile>;
    };
}



// Level 1



export interface NamespaceNode {
    children?: utils.Dictionary<NamespaceNode>;
    doclet?: NamespaceDoclet;
    meta?: NamespaceMeta;
}



// Level 2



export interface NamespaceDoclet {
    description: string;
    kind: NamespaceKind;
    name: string;
    defaultValue?: (boolean | number | string);
    isDeprecated?: boolean;
    isOptional?: boolean;
    parameters?: utils.Dictionary<NamespaceParameter>;
    return?: NamespaceReturn;
    types?: NamespaceTypes;
}



export interface NamespaceMeta {
    files: Array<NamespaceFile>;
}



// Level 3



export type NamespaceKind = (
    'class' |
    'function' |
    'member' |
    'namespace' | 
    'typedef'
);



export interface NamespaceParameter {
    description?: string;
    types?: NamespaceTypes;
}



export interface NamespaceReturn {
    description?: string;
    types?: NamespaceTypes;
}



export type NamespaceTypes = Array<string>;



export interface NamespaceFile {
    path: string;
    line: number;
}
