"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const Config = require("./Config");
const TSD = require("./TypeScriptDeclarations");
const Utils = require("./Utilities");
/**
 * Parse options JSON and returns a dictionary of options nodes.
 *
 * @param optionsJSON
 *        The JSON dictionary to parse.
 */
function parse(optionsJSON) {
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
exports.parse = parse;
class Parser extends Object {
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Complete nodes in the JSON dictionary with inherited children.
     *
     * @param optionsJSON
     *        The JSON dictionary to complete.
     */
    constructor(optionsJSON) {
        super();
        /* *
         *
         *  Functions
         *
         * */
        this._cloneC = 0;
        this._options = optionsJSON;
        Object
            .keys(optionsJSON)
            .forEach(key => {
            if (!optionsJSON[key].doclet) {
                delete optionsJSON[key];
            }
            else {
                this.completeNodeNames(optionsJSON[key], key);
                this.completeNodeExtensions(optionsJSON[key]);
                this.completeNodeNames(optionsJSON[key], key);
                this.completeNodeProducts(optionsJSON[key], Config.products);
                this.completeNodeTypes(optionsJSON[key]);
            }
        });
    }
    get options() {
        return this._options;
    }
    /**
     * Transfers non existing properties and children to a node.
     *
     * @param sourceNode
     *        Node to clone from.
     *
     * @param targetNode
     *        Node to clone into.
     */
    cloneNodeInto(sourceNode, targetNode) {
        let sourceDoclet = sourceNode.doclet, sourceMeta = sourceNode.meta, targetDoclet = targetNode.doclet, targetExclude = (targetNode.doclet.exclude || []), targetMeta = targetNode.meta, targetName = (targetMeta.fullname || targetMeta.name);
        let sourceChildren = sourceNode.children, targetChildren = targetNode.children;
        Object
            .keys(sourceDoclet)
            .filter(key => typeof targetDoclet[key] === 'undefined')
            .forEach(key => targetDoclet[key] = Utils.clone(sourceDoclet[key], Number.MAX_SAFE_INTEGER));
        Object
            .keys(sourceMeta)
            .filter(key => typeof targetMeta[key] === 'undefined')
            .forEach(key => targetMeta[key] = Utils.clone(sourceMeta[key], Number.MAX_SAFE_INTEGER));
        Object
            .keys(sourceChildren)
            .filter(key => targetExclude.indexOf(key) === -1)
            .forEach(key => {
            if (!targetChildren[key]) {
                targetChildren[key] = {
                    children: {},
                    doclet: {},
                    meta: {
                        filename: sourceMeta.filename,
                        fullname: (targetName && targetName + key),
                        line: sourceMeta.line,
                        lineEnd: sourceMeta.lineEnd,
                        name: key
                    }
                };
            }
            this.cloneNodeInto(sourceChildren[key], targetChildren[key]);
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
        const nodeExtends = (node.doclet.extends || '');
        if (nodeExtends) {
            delete node.doclet.extends;
            nodeExtends
                .split(/[\s,]+/g)
                .sort(xName => xName === 'series' ? 1 : 0)
                .map(xName => xName === 'series' ? 'plotOptions.series' : xName)
                .forEach(xName => {
                let xNode = this.findNode(xName);
                if (!xNode) {
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
            .forEach(childName => this.completeNodeNames(children[childName], nodeName + '.' + childName));
    }
    /**
     * Update the products information of the node, or determines the products,
     * if not set.
     *
     * @param  node
     *         Node to update.
     *
     * @param  parentProducts
     *         Products array of the parent node.
     */
    completeNodeProducts(node, parentProducts) {
        if (node.doclet.products) {
            parentProducts = node.doclet.products;
        }
        else {
            node.doclet.products = parentProducts;
        }
        let children = node.children;
        Object
            .keys(children)
            .map(childName => children[childName])
            .forEach(childNode => this.completeNodeProducts(childNode, parentProducts.slice()));
    }
    /**
     * Update the type of the node, or determines a type, if no is set.
     *
     * @param node
     *        Node to update.
     */
    completeNodeTypes(node) {
        let mappedOptionType = (node.meta.fullname &&
            Config.mapOptionType(node.meta.fullname));
        if (mappedOptionType) {
            node.doclet.type = { names: [mappedOptionType] };
        }
        else if (node.doclet.type && node.doclet.type.names) {
            // nothing to do
        }
        else if (node.meta.default) {
            node.doclet.type = { names: [typeof node.meta.default] };
        }
        else {
            let defaultValue = (node.doclet.default && node.doclet.default.value ||
                node.doclet.defaultvalue);
            if (!defaultValue && node.doclet.defaultByProduct) {
                let productDefaults = node.doclet.defaultByProduct;
                Object.keys(productDefaults).some(key => {
                    defaultValue = productDefaults[key];
                    return true;
                });
            }
            if (!defaultValue) {
                node.doclet.type = { names: ['object'] };
                return;
            }
            switch (defaultValue) {
                case 'false':
                case 'true':
                    node.doclet.type = { names: ['boolean'] };
                    return;
                case '0':
                case '1':
                    node.doclet.type = { names: ['number'] };
                    return;
                case 'null':
                case 'undefined':
                    node.doclet.type = { names: ['*'] };
                    return;
            }
            if (parseInt(defaultValue) !== NaN ||
                parseFloat(defaultValue) !== NaN) {
                node.doclet.type = { names: ['number'] };
            }
            else {
                node.doclet.type = { names: ['string'] };
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
        let currentNode = {
            children: this.options,
            doclet: {},
            meta: {}
        };
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
}
//# sourceMappingURL=OptionsParser.js.map