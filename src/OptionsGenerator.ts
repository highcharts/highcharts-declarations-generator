/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as config from './Config';
import * as parser from './OptionsParser';
import * as tsd from './TypeScriptDeclarations';
import * as utils from './Utilities';



export function generate (
    optionsJSON: utils.Dictionary<parser.INode>
): Promise<tsd.NamespaceDeclaration> {
    return new Promise((resolve, reject) => {
        resolve((new Generator(optionsJSON)).namespace);
    });
}



const GENERIC_ANY_TYPE = /([\<\(\|])any([\|\)\>])/gm;



class Generator extends Object {

    /* *
     *
     *  Static Functions
     *
     * */

    private static getDoclet (node: parser.INode): parser.IDoclet {

        let doclet = node.doclet,
            description = (node.doclet.description || '').trim(),
            name = (node.meta && (node.meta.fullname || node.meta.name) || ''),
            removedLinks = [] as Array<string>;

        description = utils.removeExamples(description);
        description = utils.removeLinks(description, removedLinks);
        description = utils.transformLists(description);

        doclet.description = description;

        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }

        if (doclet.type && doclet.type.names) {
            doclet.type.names = doclet.type.names
                .map(config.mapType);
        }
        else {
            doclet.type = { names: [ 'any' ] };
        }

        if (removedLinks.length > 0) {

            let see = [] as Array<string>;

            removedLinks.forEach(link =>
                see.push(...utils.urls(link))
            );

            if (name && see.length > 0) {
                if (doclet.products) {
                    see.length = 0;
                    doclet.products.forEach(product =>
                        see.push(config.seeLink(name, 'option', product))
                    );
                }
                else {
                    doclet.see = [ config.seeLink(name, 'option') ];
                }
            }
        }

        return doclet;
    }

    private static getName (node: parser.INode): string {

        return (utils
            .namespaces(node.meta.fullname || node.meta.name || '')
            .map(utils.capitalize)
            .join('')
            .replace('Options', '') +
            'Options'
        );
    }

    /* *
     *
     *  Constructor
     *
     * */

    public constructor (optionsJSON: utils.Dictionary<parser.INode>) {

        super();

        this._namespace = new tsd.NamespaceDeclaration('Highcharts');

        utils.Dictionary
            .values(optionsJSON)
            .forEach(option => this.generateInterface(option));
    }

    /* *
     *
     *  Properties
     *
     * */

    public get namespace(): tsd.NamespaceDeclaration {
        return this._namespace;
    }
    private _namespace: tsd.NamespaceDeclaration;

    /* *
     *
     *  Functions
     *
     * */

    private generateInterface (
        sourceNode: parser.INode
    ): tsd.InterfaceDeclaration {

        let doclet = Generator.getDoclet(sourceNode),
            name = Generator.getName(sourceNode),
            declaration = new tsd.InterfaceDeclaration(name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        try {
            this.namespace.addChildren(declaration);
        }
        catch (error) {
            console.log(sourceNode);
            throw error;
        }

        let children = sourceNode.children,
            childNames = Object.keys(children);

        childNames.forEach(childName => {
            this.generateProperty(children[childName], declaration);
        });

        return declaration;
    }

    private generateProperty (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.PropertyDeclaration {

        if (Object.keys(sourceNode.children).length > 0) {

            let interfaceDeclaration = this.generateInterface(sourceNode),
                replacedAnyType = false;

            sourceNode.children = {};
            sourceNode.doclet.type = (sourceNode.doclet.type || { names: [] });
            sourceNode.doclet.type.names = sourceNode.doclet.type.names
                .map(config.mapType)
                .filter(name => (name !== 'any' && name !== 'object'))
                .map(name => {
                    if (name.indexOf('any') === -1 ||
                        !GENERIC_ANY_TYPE.test(name)
                    ) {
                        return name;
                    }
                    else {
                        replacedAnyType = true;
                        return name.replace(
                            GENERIC_ANY_TYPE,
                            '$1' + interfaceDeclaration.name + '$2'
                        );
                    }
                });

            if (!replacedAnyType) {
                sourceNode.doclet.type.names.push(interfaceDeclaration.fullname);
            }
        }

        let doclet = Generator.getDoclet(sourceNode),
            declaration = new tsd.PropertyDeclaration(
                sourceNode.meta.name || ''
            );

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        declaration.isOptional = true;

        if (doclet.values) {
            let values = utils.json(doclet.values, true);
            if (values instanceof Array) {
                declaration.types.push(...values.map(config.mapValue));
            }
        }

        if (!declaration.hasTypes && doclet.type) {
            declaration.types.push(...doclet.type.names);
        }

        try {
            targetDeclaration.addChildren(declaration);
        }
        catch (error) {
            console.log(sourceNode);
            throw error;
        }

        return declaration;
    }

    public toString(): string {

        return this.namespace.toString();
    }
}
