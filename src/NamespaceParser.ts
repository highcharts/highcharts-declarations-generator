/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './Utilities';



export function splitIntoFiles(json: any): Promise<utils.Dictionary<INode>> {

    return new Promise((resolve, reject) => {

        let fileDictionary = {};

        transferNodes(json, fileDictionary);

        resolve(fileDictionary);
    });
}



function findFileNode(
    fileDictionary: utils.Dictionary<INode>, filePath: string, name: string
): INode {

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
    sourceNode: INode, fileDictionary: utils.Dictionary<INode>
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
