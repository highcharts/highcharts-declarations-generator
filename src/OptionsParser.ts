/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as config from './Config';
import * as tsd from './TypeScriptDeclarations';
import * as utils from './Utilities';


/**
 * Parse options JSON and returns a dictionary of options nodes.
 *
 * @param {Dictionary<INode>} optionsJSON
 *        The JSON dictionary to parse.
 */
export function parse(optionsJSON: utils.Dictionary<INode>): Promise<utils.Dictionary<INode>> {
    return new Promise((resolve, reject) => {

        let parsedOptions = new Parser(optionsJSON);

        resolve(parsedOptions.options);
/*
        utils
            .save('tree-extended.json', JSON.stringify(optionsJSON, (key, value) => (
                key === 'doclet' ? undefined : value
            ), '\t'))
            .then(() => resolve(parsedOptions.options));
 */
    });
}



class Parser extends Object {

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Complete nodes in the JSON dictionary with inherited children.
     *
     * @param {Dictionary<INode>} optionsJSON
     *        The JSON dictionary to complete.
     */
    public constructor (optionsJSON: utils.Dictionary<INode>) {

        super();

        this._options = optionsJSON;

        Object
            .keys(optionsJSON)
            .forEach(key => {
                if (!optionsJSON[key].doclet) {
                    delete optionsJSON[key];
                } else {
                    this.completeNodeNames(optionsJSON[key], key);
                    this.completeNodeExtensions(optionsJSON[key]);
                    this.completeNodeNames(optionsJSON[key], key);
                    this.completeNodeTypes(optionsJSON[key]);
                }
            });
    }

    /* *
     *
     *  Properties
     *
     * */
    private _clone?: INode;
    public get options(): utils.Dictionary<INode> {
        return this._options;
    }
    private _options: utils.Dictionary<INode>;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Completes nodes with inherited children.
     *
     * @param {INode} node
     *        The node to complete.
     */
    private completeNodeExtensions(node: INode) {

        let nodeChildren = node.children,
            nodeExcludes = (node.doclet.exclude || []),
            nodeExtends = (node.doclet.extends || '');

        if (nodeExtends) {

            delete node.doclet.extends;

            nodeExtends
                .split(',')
                .sort(xName => xName === 'series' ? 1 : 0)
                .map(xName => xName === 'series' ? 'plotOptions.series' : xName)
                .forEach(xName => {

                    if (xName.indexOf('{') > -1) {
                        console.error(
                            'Extends: ' +
                            'Curly brackets notation should be avoided.',
                            xName
                        );
                        xName = xName.substr(1, xName.length - 2);
                    }

                    let xNode = this.findNode(xName);

                    if (!xNode) {
                        console.error(
                            'Extends: Node ' + xName + ' not found.',
                            node.meta.fullname || node.meta.name
                        );
                        return;
                    }

                    let xChildren = xNode.children;

                    Object
                        .keys(xChildren)
                        .forEach(xChildName => {
                            if (!nodeChildren[xChildName] &&
                                nodeExcludes.indexOf(xChildName) === -1
                            ) {
                                nodeChildren[xChildName] = utils.clone(
                                    xChildren[xChildName],
                                    Number.MAX_SAFE_INTEGER
                                );
                            }
                        });
                });
        }

        Object
            .keys(nodeChildren)
            .forEach(nodeChildName => this.completeNodeExtensions(
                nodeChildren[nodeChildName]
            ));
    }

    /**
     * Update the node names with the give one.
     *
     * @param {INode} node
     *        Node to update.
     *
     * @param {string} nodeName
     *        New fullname.
     */
    private completeNodeNames (node: INode, nodeName: string) {

        let children = node.children,
            lastPointIndex = nodeName.lastIndexOf('.');

        node.meta.fullname = nodeName;

        if (lastPointIndex === -1) {
            node.meta.name = nodeName;
        } else {
            node.meta.name = nodeName.substr(lastPointIndex + 1);
        }

        Object
            .keys(children)
            .forEach(childName => this.completeNodeNames(
                children[childName], nodeName + '.' + childName
            ));
    }

    /**
     * Update the type of the node, and determines a type, if no is set.
     *
     * @param {INode} node
     *        Node to update.
     */
    private completeNodeTypes (node: INode) {

        if (node.doclet.type && node.doclet.type.names) {
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

        let children = node.children;

        Object
            .keys(children)
            .forEach(childName => this.completeNodeTypes(children[childName]));
    }

    /**
     * Finds a node in the json dictionary.
     *
     * @param {string} nodeName
     *        The name of the node to find.
     */
    private findNode (nodeName: string): (INode | undefined) {

        if (!nodeName) {
            throw new Error('No node name has been provided.');
        }

        let currentNode = {
            children: this.options,
            doclet: {},
            meta: {}
        } as INode;

        tsd.IDeclaration
            .namespaces(nodeName)
            .every(spaceName => {
                currentNode = currentNode.children[spaceName];
                if (!currentNode) {
                    return false;
                }
                if (currentNode.doclet.extends) {
                    this.completeNodeExtensions(currentNode);
                }
                return true;
            });

        return currentNode;
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
    deprecated?: boolean;
    description?: string;
    exclude?: Array<string>;
    extends?: string;
    products?: Array<string>;
    sample?: ISample;
    samples?: Array<ISample>;
    see?: Array<string>;
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
