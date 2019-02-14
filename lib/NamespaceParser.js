"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
const Config = require("./Config");
const Utils = require("./Utilities");
const TSD = require("./TypeScriptDeclarations");
function parse(json) {
    return new Promise(resolve => resolve((new NamespaceParser(json)).modules));
}
exports.parse = parse;
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
    static isEqualDoclet(docletA, docletB) {
        let nameA = TSD.IDeclaration.namespaces(docletA.name).join('.'), nameB = TSD.IDeclaration.namespaces(docletB.name).join('.');
        return (nameA === nameB &&
            (Object.keys(docletA).length == 1 ||
                Object.keys(docletB).length == 1 ||
                Utils.isDeepEqual(docletA, docletB)));
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
    constructor(sourceNode) {
        this._modules = {};
        this.transferNodes(sourceNode);
    }
    /* *
     *
     *  Properties
     *
     * */
    get modules() {
        return this._modules;
    }
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
    findNode(rootNode, nodeName, overload = false) {
        let found = false, node = rootNode, spaceNames = TSD.IDeclaration.namespaces(nodeName, true), indexEnd = (spaceNames.length - 1);
        spaceNames.forEach((spaceName, index) => {
            if (!node.children) {
                node.children = [];
            }
            if (overload &&
                index === indexEnd) {
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
                };
                if (newNode.doclet.name.endsWith(':')) {
                    newNode.doclet.kind = 'namespace';
                }
                else if (node.doclet.name.endsWith(':')) {
                    newNode.doclet.kind = node.doclet.name.substr(0, (node.doclet.name.length - 1));
                }
                else if (index !== indexEnd) {
                    let referenceNode = this.findNodeInMainModules(spaceName);
                    if (referenceNode &&
                        referenceNode.doclet.kind) {
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
    findNodeInMainModules(nodeName) {
        let found = false, mainModule = this.modules[Config.mainModule], node = mainModule, spaceNames = TSD.IDeclaration.namespaces(nodeName, true), indexEnd = (spaceNames.length - 1);
        spaceNames.every((spaceName, index) => {
            if (!node ||
                !node.children ||
                node.children.length === 0) {
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
                Object.keys(node.doclet).length > 1) {
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
        }
        ;
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
    prepareModule(modulePath) {
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
    transferNodes(sourceNode) {
        if (!sourceNode.doclet ||
            !sourceNode.meta) {
            if (sourceNode.children) {
                sourceNode.children.forEach(sourceChild => this.transferNodes(sourceChild));
            }
            return;
        }
        let sourceDoclet = sourceNode.doclet, sourceMeta = sourceNode.meta;
        (sourceMeta.files || [])
            .map(file => Utils.base(file.path))
            .forEach(modulePath => {
            let moduleNode = this.prepareModule(modulePath), targetName = (sourceDoclet.name || ''), targetNode = this.findNode(moduleNode, targetName), targetDoclet = targetNode.doclet;
            if (targetDoclet &&
                !NamespaceParser.isEqualDoclet(targetDoclet, sourceDoclet)) {
                targetNode = this.findNode(moduleNode, targetName, true);
                targetDoclet = targetNode.doclet;
            }
            if (!targetDoclet) {
                targetDoclet = targetNode.doclet = {};
            }
            Object
                .keys(sourceDoclet)
                .forEach(key => targetDoclet[key] = sourceDoclet[key]);
        });
        if (sourceNode.children) {
            sourceNode.children.forEach(sourceChild => this.transferNodes(sourceChild));
        }
    }
}
//# sourceMappingURL=NamespaceParser.js.map