/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

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



class Generator extends Object {

    /* *
     *
     *  Static Functions
     *
     * */

    private static getDoclet (node: parser.INode): parser.IDoclet {

        let doclet = node.doclet,
            description = (node.doclet.description || '').trim(),
            removedLinks = [] as Array<string>;

        description = utils.removeExamples(description);
        description = utils.removeLinks(description, removedLinks);
        description = utils.transformLists(description);

        doclet.description = description;

        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }

        if (removedLinks.length > 0) {

            let see = [] as Array<string>;

            removedLinks.forEach(link =>
                see.push(...utils.urls(link))
            );

            if (see.length > 0) {
                doclet.see = see;
            }
        }

        return doclet;
    }

    private static getName (node: parser.INode): string {

        return ((node.meta.fullname || node.meta.name || '')
            .split('.')
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
        } catch (error) {
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

            let interfaceDeclaration = this.generateInterface(sourceNode);

            sourceNode.children = {};
            sourceNode.doclet.type = { names: [ interfaceDeclaration.name ] };
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
            try {
                let values = utils.json(doclet.values, true);
                if (values instanceof Array) {
                    declaration.types.push(...values
                        .map(value => {
                            switch(typeof value) {
                                default:
                                    return value.toString();
                                case 'string':
                                    return '"' + value + '"';
                                case 'undefined':
                                case 'object':
                                    if (value) {
                                        return 'object';
                                    } else {
                                        return 'undefined';
                                    }
                            }
                        })
                    );
                }
            } catch (error) {
                console.log('Error: ', sourceNode.meta.fullname, doclet.values);
                console.error(error);
            }
        }

        if (!declaration.hasTypes && doclet.type) {
            declaration.types.push(...doclet.type.names);
        }

        try {
            targetDeclaration.addChildren(declaration);
        } catch (error) {
            console.log(sourceNode);
            throw error;
        }

        return declaration;
    }

    public toString(): string {

        return this.namespace.toString();
    }
}
