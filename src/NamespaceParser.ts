/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/

import { sep, posix } from 'path';
import * as Config from './Config';
import * as Utils from './Utilities';
import * as TSD from './TypeScriptDeclarations';



export function parse(json: any): Promise<Utils.Dictionary<INode>> {
    return new Promise(resolve => resolve((new NamespaceParser(json)).modules));
}



class NamespaceParser {

    /* *
     *
     *  Static Functions
     *
     * */

    /**
     * Compares two light doclets for basic equality. Returns true, if the
     * doclet is basically equal.
     *
     * @param docletA
     *        First doclet to analyze.
     *
     * @param docletB
     *        Second doclet to analyze.
     */
    private static isEqualDoclet (docletA: IDoclet, docletB: IDoclet): boolean {

        let nameA = TSD.IDeclaration.namespaces(docletA.name).join('.'),
            nameB = TSD.IDeclaration.namespaces(docletB.name).join('.');

        return (
            nameA === nameB &&
            (
                Object.keys(docletA).length == 1 ||
                Object.keys(docletB).length == 1 ||
                Utils.isDeepEqual(docletA, docletB)
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
    public constructor (sourceNode: INode) {

        this._modules = {};

        this.transferNodes(sourceNode);
    }

    /* *
     *
     *  Properties
     *
     * */

    public get modules (): Utils.Dictionary<INode> {
        return this._modules;
    }
    private _modules: Utils.Dictionary<INode>;

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
            spaceNames = TSD.IDeclaration.namespaces(nodeName, true),
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

                if (newNode.doclet.name.endsWith(':')) {
                    newNode.doclet.kind = 'namespace';
                }
                else if (node.doclet.name.endsWith(':')) {
                    newNode.doclet.kind = node.doclet.name.substr(
                        0, (node.doclet.name.length - 1)
                    ) as any;
                }
                else if (index !== indexEnd) {

                    let referenceNode = this.findNodeInMainModules(
                        spaceName
                    );

                    if (referenceNode &&
                        referenceNode.doclet.kind
                    ) {
                        switch (referenceNode.doclet.kind) {
                            default:
                                newNode.doclet.kind = referenceNode.doclet.kind;
                            case 'class':
                                newNode.doclet.kind = 'interface';
                        }
                    }
                }

                node.children.push(newNode);

                node = newNode;
            }
        });

        return node;
    }

    /**
     * Finds a node in the main modules for reference.
     *
     * @param nodeName
     *        The full name of the node to find.
     */
    private findNodeInMainModules (nodeName: string): (INode|undefined) {

        let found = false,
            mainModule = this.modules[Config.mainModule],
            node = mainModule as (INode|undefined),
            spaceNames = TSD.IDeclaration.namespaces(nodeName, true),
            indexEnd = (spaceNames.length - 1);

        spaceNames.every((spaceName, index) => {

            if (!node ||
                !node.children ||
                node.children.length === 0
            ) {
                return false;
            }

            node.children
                .some(child => {
                    if (child.doclet.name === spaceName) {
                        node = child;
                        return true;
                    }
                    else {
                        node = undefined;
                        return false;
                    }
                });

            if (node &&
                node !== mainModule &&
                Object.keys(node.doclet).length > 1
            ) {
                found = (index === indexEnd);
                return true;
            }
            else {
                return false;
            }

        });

        if (found) {
            return node;
        }
        else {
            return undefined;
        };
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

        let modules = this._modules;

        modules[modulePath] = (modules[modulePath] || {
            children: [],
            doclet: {
                description: '',
                kind: 'global',
                name: '',
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

        sourceDoclet.randomID = Math.round(
            Math.random() >= 0.5 ?
                ((Math.random() * (Number.MAX_SAFE_INTEGER - 1)) + 1) :
                ((Math.random() * (Number.MIN_SAFE_INTEGER + 1)) - 1)
        );

        (sourceMeta.files || [])
            .map(file => Utils.base(file.path.split(sep).join(posix.sep)))
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
    events?: Utils.Dictionary<IEvent>;
    fires?: Array<string>;
    isDeprecated?: boolean;
    isGlobal?: boolean;
    isOptional?: boolean;
    isPrivate?: boolean;
    isReadOnly?: boolean;
    isStatic?: boolean;
    parameters?: Utils.Dictionary<IParameter>;
    products?: Array<string>
    randomID?: number;
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
    'external' |
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
