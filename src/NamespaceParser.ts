/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as config from './Config';
import * as utils from './Utilities';
import * as tsd from './TypeScriptDeclarations';



export function parseIntoFiles(json: any): Promise<utils.Dictionary<INode>> {

    return new Promise((resolve, reject) => {

        let modules = new utils.Dictionary<INode>(),
            parser = new NamespaceParser(json, modules);

        resolve(modules);
    });
}



class NamespaceParser {

    /* *
     *
     *  Static Functions
     *
     * */

    /**
     * Compares two light doclets for basic equality. Returns true, if the doclet is
     * basically equal.
     *
     * @param docletA
     *        First doclet to analyze.
     *
     * @param docletB
     *        Second doclet to analyze.
     */
    private static isEqualDoclet (docletA: IDoclet, docletB: IDoclet) {

        let nameA = tsd.IDeclaration.namespaces(docletA.name).join('.'),
            nameB = tsd.IDeclaration.namespaces(docletB.name).join('.');

        return (
            nameA === nameB &&
            (
                Object.keys(docletA).length == 1 ||
                Object.keys(docletB).length == 1 ||
                utils.isDeepEqual(docletA, docletB)
            )
        );
    }

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Copies all nodes into there modules.
     *
     * @param sourceNode
     *        The node to copy into the modules.
     *
     * @param targetModules
     *        The module dictionary to copy the node in.
     */
    public constructor (
        sourceNode: INode, targetModules: utils.Dictionary<INode>
    ) {

        this._targetModules = targetModules;

        this.transferNodes(sourceNode);
    }

    /* *
     *
     *  Properties
     *
     * */

    public get targetModules (): utils.Dictionary<INode> {
        return this._targetModules;
    }
    private _targetModules: utils.Dictionary<INode>;

    /* *
     *
     *  Functions
     *
     * */

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
    private findNode (
        rootNode: INode, nodeName: string, overload: boolean = false
    ): INode {

        let found = false,
            node = rootNode,
            spaceNames = tsd.IDeclaration.namespaces(nodeName, true),
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
                    if (child.doclet.name === spaceName) {
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
    private prepareModule (modulePath: string): INode {

        let modules = this._targetModules;

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

    /**
     * Copies all nodes into there modules.
     *
     * @param sourceNode
     *        The node to copy into the modules.
     */
    private transferNodes (sourceNode: INode) {

        if (!sourceNode.doclet ||
            !sourceNode.meta
        ) {
            if (sourceNode.children) {
                sourceNode.children.forEach(
                    sourceChild => this.transferNodes(sourceChild)
                );
            }
            return;
        }

        let sourceDoclet = sourceNode.doclet,
            sourceMeta = sourceNode.meta;

        (sourceMeta.files || [])
            .map(file => utils.base(file.path))
            .forEach(modulePath => {

                let moduleNode = this.prepareModule(modulePath),
                    targetName = (sourceDoclet.name || ''),
                    targetNode = this.findNode(moduleNode, targetName),
                    targetDoclet = targetNode.doclet;
                
                if (targetDoclet &&
                    !NamespaceParser.isEqualDoclet(targetDoclet, sourceDoclet)
                ) {
                    targetNode = this.findNode(moduleNode, targetName, true);
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

        if (sourceNode.children) {
            sourceNode.children.forEach(
                sourceChild => this.transferNodes(sourceChild)
            );
        }
    }

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
    'constructor' |
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
