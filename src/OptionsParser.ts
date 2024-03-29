/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/


import * as Config from './Config';
import * as FS from 'fs';
import * as TSD from './TypeScriptDeclarations';
import * as Utilities from './Utilities';


/* *
 *
 *  Constants
 *
 * */


const PRODUCTS = Object.keys(Config.products);


/* *
 *
 *  Functions
 *
 * */


/**
 * Parse options JSON and returns a dictionary of options nodes.
 *
 * @param optionsJSON
 *        The JSON dictionary to parse.
 */
export function parse(json: any): Promise<INode> {
    return new Promise(resolve => resolve((new Parser(json)).root));
}


/* *
 *
 *  Class
 *
 * */


class Parser extends Object {


    /* *
     *
     *  Constructor
     *
     * */


    /**
     * Complete nodes in the JSON dictionary with inherited children.
     *
     * @param json
     *        The JSON dictionary to complete.
     */
    public constructor (json: Utilities.Dictionary<INode>) {

        super();

        Object
            .keys(json)
            .forEach(key => {
                if (!json[key].doclet) {
                    delete json[key];
                }
            });

        this._root = {
            doclet: {
                products: PRODUCTS.slice()
            },
            meta: {},
            children: json
        };

        this.removeDeprecatedNodes(this._root);
        this.removeInternalNodes(this._root);
        this.completeNodeNames(this._root, '');
        this.completeNodeExtensions(this._root);
        this.completeNodeNames(this._root, '');
        this.completeNodeProducts(this._root, PRODUCTS);
        this.completeNodeTypes(this._root);
        this.removeProductNodes(this._root, PRODUCTS);

        this._modules = {} as Utilities.Dictionary<INode>;

        PRODUCTS.forEach(
            product => {

                const productNode = {
                    doclet: {
                        description: 'The option tree for every chart.',
                        products: PRODUCTS.slice()
                    },
                    meta: {
                        fullname: 'options'
                    },
                    children: {}
                } as INode;

                this.cloneNodeInto(
                    this._root, 
                    productNode,
                    product
                );

                this._modules[Config.products[product]] = productNode;
            }
        );
    }


    /* *
     *
     *  Properties
     *
     * */


    public get modules(): Utilities.Dictionary<INode> {
        return this._modules;
    }
    private _modules: Utilities.Dictionary<INode>;


    public get root(): INode {
        return this._root;
    }
    private _root: INode;


    /* *
     *
     *  Functions
     *
     * */


    /**
     * Transfers non existing properties and children to a node.
     *
     * @param sourceNode
     *        Node to clone from.
     *
     * @param targetNode
     *        Node to clone into.
     *
     * @param product
     *        Product to clone.
     */
    private cloneNodeInto (
        sourceNode: INode,
        targetNode: INode,
        product?: string
    ) {

        let sourceDoclet = sourceNode.doclet as any,
            sourceMeta = sourceNode.meta as any,
            targetDoclet = targetNode.doclet as any,
            targetExclude = (targetNode.doclet.exclude || []),
            targetMeta = targetNode.meta as any,
            targetName = (targetMeta.fullname || targetMeta.name);

        if (
            product &&
            sourceDoclet.products?.indexOf(product) === -1
        ) {
            return;
        }

        if (
            targetDoclet.type &&
            sourceDoclet.type &&
            targetDoclet.type.names.length === 1 &&
            targetDoclet.type.names[0] === '*' &&
            (
                sourceDoclet.type.names.length > 1 ||
                sourceDoclet.type.names[0] !== '*'
            )
        ) {
            targetDoclet.type.names = sourceDoclet.type.names.slice();
        }

        let sourceChildren = sourceNode.children,
            targetChildren = targetNode.children;

        Object
            .keys(sourceDoclet)
            .filter(key => typeof targetDoclet[key] === 'undefined')
            .forEach(key => targetDoclet[key] = Utilities.clone(
                sourceDoclet[key], Number.MAX_SAFE_INTEGER
            ));

        Object
            .keys(sourceMeta)
            .filter(key => typeof targetMeta[key] === 'undefined')
            .forEach(key => targetMeta[key] = Utilities.clone(
                sourceMeta[key], Number.MAX_SAFE_INTEGER
            ));

        Object
            .keys(sourceChildren)
            .filter(key => targetExclude.indexOf(key) === -1)
            .forEach(key => {

                if (product &&
                    (sourceChildren[key].doclet.products || [])
                        .indexOf(product) === -1
                ) {
                    return;
                }

                if (!targetChildren[key]) {
                    targetChildren[key] = {
                        children: {},
                        doclet: {},
                        meta: {
                            fullname: (
                                targetName ?
                                    targetName + '.' + key :
                                    key
                            ),
                            name: key
                        }
                    }
                }

                this.cloneNodeInto(
                    sourceChildren[key], targetChildren[key], product
                );
            });
    }


    /**
     * Completes nodes with inherited children.
     *
     * @param node
     *        The node to complete.
     */
    private completeNodeExtensions(node: INode) {

        const nodeChildren = node.children;
        const nodeExtends = (node.doclet.extends || '')
            .split(/[\s,]+/g)
            .filter(name => !!name.trim())
            .sort(xName => xName === 'series' ? 1 : 0)
            .map(xName => xName === 'series' ? 'plotOptions.series' : xName);

        if (nodeExtends[0]) {

            node.doclet._extends = nodeExtends;

            delete node.doclet.extends;

            nodeExtends.forEach(
                xName => {

                    let xNode = this.findNode(xName);

                    if (!xNode) {

                        FS.writeFileSync(
                            'tree-error.json',
                            JSON.stringify(
                                this._root,
                                (key, value) => (
                                    key === 'doclet' || key === 'meta' ?
                                        undefined :
                                        value
                                ),
                                '\t'
                            )
                        );

                        throw new Error(
                            'Extends: Node ' + xName + ' not found! ' +
                            'Referenced by ' + (
                                node.meta.fullname || node.meta.name
                            ) + '.'
                        );

                        return;
                    }

                    this.cloneNodeInto(xNode, node);

                }
            );

        }

        Object
            .keys(nodeChildren)
            .forEach(key => this.completeNodeExtensions(nodeChildren[key]));
    }


    /**
     * Update the node names with the give one.
     *
     * @param node
     *        Node to update.
     *
     * @param nodeName
     *        New fullname.
     */
    private completeNodeNames (node: INode, nodeName: string) {

        let children = node.children,
            lastPointIndex = nodeName.lastIndexOf('.');

        node.meta.fullname = nodeName;

        if (lastPointIndex === -1) {
            node.meta.name = nodeName;
        }
        else {
            node.meta.name = nodeName.substr(lastPointIndex + 1);
        }

        Object
            .keys(children)
            .forEach(childName => this.completeNodeNames(
                children[childName],
                (nodeName ? nodeName + '.' + childName : childName)
            ));
    }


    /**
     * Update the products information of the node, or determines the products,
     * if not set.
     *
     * @param node
     *        Node to update.
     * 
     * @param parentProducts
     *        Products array of the parent node.
     */
    private completeNodeProducts (node: INode, parentProducts: Array<string>) {

        if (node.doclet.products) {
            parentProducts = node.doclet.products;
        }
        else {
            node.doclet.products = parentProducts.slice();
        }

        let children = node.children;

        Object
            .keys(children)
            .map(childName => children[childName])
            .forEach(childNode => this.completeNodeProducts(
                childNode, parentProducts
            ));
    }


    /**
     * Update the type of the node, or determines a type, if no is set.
     *
     * @param node
     *        Node to update.
     */
    private completeNodeTypes (node: INode) {

        let mappedOptionType = (
            node.meta.fullname &&
            Config.mapOptionType(node.meta.fullname)
        );

        if (mappedOptionType) {
            node.doclet.type = { names: [mappedOptionType] };
        }
        else if (node.doclet.type?.names) {
            // nothing to do
        }
        else if (node.meta.default) {
            node.doclet.type = { names: [ typeof node.meta.default ] };
        }
        else {

            let defaultValue: (boolean|number|string|null|undefined) =
                node.doclet.defaultvalue;
            
            if (typeof defaultValue === 'undefined') {
                defaultValue = node.doclet.default;
            }

            if (
                typeof defaultValue === 'undefined' &&
                node.doclet.defaultByProduct
            ) {

                let productDefaults = node.doclet.defaultByProduct;

                Object.keys(productDefaults).some(key => {
                    defaultValue = productDefaults[key];
                    return true;
                });
            }

            if (typeof defaultValue === 'undefined') {
                node.doclet.type = { names: [ 'object' ] };
            }
            else {
                switch (defaultValue) {
                    default:
                        if (
                            typeof defaultValue === 'number' ||
                            !isNaN(parseInt(defaultValue)) ||
                            !isNaN(parseFloat(defaultValue))
                        ) {
                            node.doclet.type = { names: [ 'number' ] };
                        }
                        else {
                            node.doclet.type = { names: [ 'string' ] };
                        }
                        break;
                    case false:
                    case true:
                    case 'false':
                    case 'true':
                        node.doclet.type = { names: [ 'boolean' ] };
                        break;
                    case null:
                    case 'null':
                    case 'undefined':
                        node.doclet.type = { names: [ '*' ] };
                        break;
                }
            }

        }

        let children = node.children;

        Object
            .keys(children)
            .map(childName => children[childName])
            .forEach(childNode => this.completeNodeTypes(childNode));
    }


    /**
     * Finds a node in the json dictionary.
     *
     * @param nodeName
     *        The name of the node to find.
     */
    private findNode (nodeName: string): (INode | undefined) {

        if (!nodeName) {
            throw new Error('No node name has been provided.');
        }

        let currentNode = this._root;

        TSD.IDeclaration
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


    /**
     * Removes all deprecated nodes to speed things up.
     *
     * @param node
     *        Node with children to check.
     */
    private removeDeprecatedNodes(node: INode) {

        let children = node.children;

        for (const key of Object.keys(children)) {
            if (children[key].doclet.deprecated === true) {
                delete children[key];
            } else {
                this.removeDeprecatedNodes(children[key]);
            }
        }

    }


    /**
     * Removes all internal nodes to speed things up.
     *
     * @param node
     *        Node with children to check.
     */
    private removeInternalNodes(
        node: INode
    ) {

        let children = node.children;

        for (const key of Object.keys(children)) {
            if (children[key].doclet.internal) {
                delete children[key];
            } else {
                this.removeInternalNodes(children[key]);
            }
        }

    }


    /**
     * Removes product-unrelated child nodes.
     *
     * @param node
     *        Root node with children to check.
     *
     * @param products
     *        Array of parent products.
     */
    private removeProductNodes(
        node: INode,
        products: Array<string>
    ) {

        let children = node.children,
            childProducts: Array<string>;

        for (const key in children) {

            childProducts = children[key].doclet.products || products;

            if (!childProducts.some(product => products.includes(product))) {
                delete children[key];
            } else {
                this.removeProductNodes(children[key], childProducts);
            }

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
    children: Utilities.Dictionary<INode>;
    doclet: IDoclet;
    meta: IMeta;
}



// Level 2



export interface IDoclet {
    _extends?: Array<string>;
    access?: string;
    context?: string;
    declare?: string;
    default?: (boolean|null|number|string);
    defaultByProduct?: Utilities.Dictionary<string>;
    defaultvalue?: string;
    deprecated?: (boolean|string);
    description?: string;
    exclude?: Array<string>;
    extends?: string;
    internal?: boolean;
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
    column?: number;
    default?: (boolean|null|number|string);
    filename?: string;
    fullname?: string;
    line?: number;
    lineEnd?: number;
    name?: string;
}



// Level 3



export interface IDefault {
    value: (boolean|null|number|string);
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
