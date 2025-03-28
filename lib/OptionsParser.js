"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
const Config = require("./Config");
const FS = require("fs");
const TSD = require("./TypeScriptDeclarations");
const Utilities = require("./Utilities");
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
function parse(json) {
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
    constructor(json) {
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
        this._modules = {};
        PRODUCTS.forEach(product => {
            const productNode = {
                doclet: {
                    description: 'The option tree for every chart.',
                    products: PRODUCTS.slice()
                },
                meta: {
                    fullname: 'options'
                },
                children: {}
            };
            this.cloneNodeInto(this._root, productNode, product);
            this._modules[Config.products[product]] = productNode;
        });
    }
    /* *
     *
     *  Properties
     *
     * */
    get modules() {
        return this._modules;
    }
    get root() {
        return this._root;
    }
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
    cloneNodeInto(sourceNode, targetNode, product) {
        var _a;
        let sourceDoclet = sourceNode.doclet, sourceMeta = sourceNode.meta, targetDoclet = targetNode.doclet, targetExclude = (targetNode.doclet.exclude || []), targetMeta = targetNode.meta, targetName = (targetMeta.fullname || targetMeta.name);
        if (product &&
            ((_a = sourceDoclet.products) === null || _a === void 0 ? void 0 : _a.indexOf(product)) === -1) {
            return;
        }
        if (targetDoclet.type &&
            sourceDoclet.type &&
            targetDoclet.type.names.length === 1 &&
            targetDoclet.type.names[0] === '*' &&
            (sourceDoclet.type.names.length > 1 ||
                sourceDoclet.type.names[0] !== '*')) {
            targetDoclet.type.names = sourceDoclet.type.names.slice();
        }
        let sourceChildren = sourceNode.children, targetChildren = targetNode.children;
        Object
            .keys(sourceDoclet)
            .filter(key => typeof targetDoclet[key] === 'undefined')
            .forEach(key => targetDoclet[key] = Utilities.clone(sourceDoclet[key], Number.MAX_SAFE_INTEGER));
        Object
            .keys(sourceMeta)
            .filter(key => typeof targetMeta[key] === 'undefined')
            .forEach(key => targetMeta[key] = Utilities.clone(sourceMeta[key], Number.MAX_SAFE_INTEGER));
        Object
            .keys(sourceChildren)
            .filter(key => targetExclude.indexOf(key) === -1)
            .forEach(key => {
            if (product &&
                (sourceChildren[key].doclet.products || [])
                    .indexOf(product) === -1) {
                return;
            }
            if (!targetChildren[key]) {
                targetChildren[key] = {
                    children: {},
                    doclet: {},
                    meta: {
                        fullname: (targetName ?
                            targetName + '.' + key :
                            key),
                        name: key
                    }
                };
            }
            this.cloneNodeInto(sourceChildren[key], targetChildren[key], product);
        });
    }
    /**
     * Completes nodes with inherited children.
     *
     * @param node
     *        The node to complete.
     */
    completeNodeExtensions(node) {
        const nodeChildren = node.children;
        const nodeExtends = (node.doclet.extends || '')
            .split(/[\s,]+/g)
            .filter(name => !!name.trim())
            .sort(xName => xName === 'series' ? 1 : 0)
            .map(xName => xName === 'series' ? 'plotOptions.series' : xName);
        if (nodeExtends[0]) {
            node.doclet._extends = nodeExtends;
            delete node.doclet.extends;
            nodeExtends.forEach(xName => {
                let xNode = this.findNode(xName);
                if (!xNode) {
                    FS.writeFileSync('tree-error.json', JSON.stringify(this._root, (key, value) => (key === 'doclet' || key === 'meta' ?
                        undefined :
                        value), '\t'));
                    throw new Error('Extends: Node ' + xName + ' not found! ' +
                        'Referenced by ' + (node.meta.fullname || node.meta.name) + '.');
                    return;
                }
                this.cloneNodeInto(xNode, node);
            });
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
    completeNodeNames(node, nodeName) {
        let children = node.children, lastPointIndex = nodeName.lastIndexOf('.');
        node.meta.fullname = nodeName;
        if (lastPointIndex === -1) {
            node.meta.name = nodeName;
        }
        else {
            node.meta.name = nodeName.substr(lastPointIndex + 1);
        }
        Object
            .keys(children)
            .forEach(childName => this.completeNodeNames(children[childName], (nodeName ? nodeName + '.' + childName : childName)));
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
    completeNodeProducts(node, parentProducts) {
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
            .forEach(childNode => this.completeNodeProducts(childNode, parentProducts));
    }
    /**
     * Update the type of the node, or determines a type, if no is set.
     *
     * @param node
     *        Node to update.
     */
    completeNodeTypes(node) {
        var _a;
        let mappedOptionType = (node.meta.fullname &&
            Config.mapOptionType(node.meta.fullname));
        if (mappedOptionType) {
            node.doclet.type = { names: [mappedOptionType] };
        }
        else if ((_a = node.doclet.type) === null || _a === void 0 ? void 0 : _a.names) {
            // nothing to do
        }
        else if (node.meta.default) {
            node.doclet.type = { names: [typeof node.meta.default] };
        }
        else {
            let defaultValue = node.doclet.defaultvalue;
            if (typeof defaultValue === 'undefined') {
                defaultValue = node.doclet.default;
            }
            if (typeof defaultValue === 'undefined' &&
                node.doclet.defaultByProduct) {
                let productDefaults = node.doclet.defaultByProduct;
                Object.keys(productDefaults).some(key => {
                    defaultValue = productDefaults[key];
                    return true;
                });
            }
            if (typeof defaultValue === 'undefined') {
                node.doclet.type = { names: ['object'] };
            }
            else {
                switch (defaultValue) {
                    default:
                        if (typeof defaultValue === 'number' ||
                            !isNaN(parseInt(defaultValue)) ||
                            !isNaN(parseFloat(defaultValue))) {
                            node.doclet.type = { names: ['number'] };
                        }
                        else {
                            node.doclet.type = { names: ['string'] };
                        }
                        break;
                    case false:
                    case true:
                    case 'false':
                    case 'true':
                        node.doclet.type = { names: ['boolean'] };
                        break;
                    case null:
                    case 'null':
                    case 'undefined':
                        node.doclet.type = { names: ['*'] };
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
    findNode(nodeName) {
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
    removeDeprecatedNodes(node) {
        let children = node.children;
        for (const key of Object.keys(children)) {
            if (children[key].doclet.deprecated === true) {
                delete children[key];
            }
            else {
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
    removeInternalNodes(node) {
        let children = node.children;
        for (const key of Object.keys(children)) {
            if (children[key].doclet.internal) {
                delete children[key];
            }
            else {
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
    removeProductNodes(node, products) {
        let children = node.children, childProducts;
        for (const key in children) {
            childProducts = children[key].doclet.products || products;
            if (!childProducts.some(product => products.includes(product))) {
                delete children[key];
            }
            else {
                this.removeProductNodes(children[key], childProducts);
            }
        }
    }
}
//# sourceMappingURL=OptionsParser.js.map