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

        let generator = new Generator(optionsJSON);

        resolve(generator.namespace);

    });
}



const GENERIC_ANY_TYPE = /([\<\(\|])any([\|\)\>])/gm;

const SERIES_TYPE = /^series\.(\w+)$/gm;



class Generator extends Object {

    /* *
     *
     *  Static Functions
     *
     * */

    private static getCamelCaseName (node: parser.INode): string {

        let name = (node.meta.fullname || node.meta.name || '');

        if (name.indexOf('Highcharts.') > -1) {
            name = name.substr(11);
        }

        return (tsd.IDeclaration
            .namespaces(name)
            .map(utils.capitalize)
            .join('')
            .replace('Options', '') +
            'Options'
        );
    }

    private static getModifiedDoclet (node: parser.INode): parser.IDoclet {

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

    /* *
     *
     *  Constructor
     *
     * */

    public constructor (optionsJSON: utils.Dictionary<parser.INode>) {

        super();

        this._namespace = new tsd.NamespaceDeclaration('Highcharts');
        this._seriesTypes = [];

        this.generateInterfaceDeclaration({
            children: optionsJSON,
            doclet: {
                description: 'The option tree for every chart.'
            },
            meta: {
                filename: '',
                fullname: 'Highcharts.Options',
                line: 0,
                lineEnd: 0
            }
        });

        let optionsDeclaration = this._namespace.getChildren('Options')[0];

        if (!optionsDeclaration) {
            console.error('Highcharts.Options not declared!');
            return;
        }

        let seriesPropertyDeclaration = optionsDeclaration.getChildren(
            'series'
        )[0];

        if (!seriesPropertyDeclaration) {
            console.error('Highcharts.Options#series not declared');
            return;
        }

        let seriesTypeDeclaration = new tsd.TypeDeclaration('SeriesType');

        seriesTypeDeclaration.description = 'The possible series types.';
        seriesTypeDeclaration.types.push(...this._seriesTypes);

        this._namespace.addChildren(seriesTypeDeclaration);

        seriesPropertyDeclaration.types.length = 0;
        seriesPropertyDeclaration.types.push(
            'Array<' + seriesTypeDeclaration.fullName + '>'
        );
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

    private _seriesTypes: Array<string>;

    /* *
     *
     *  Functions
     *
     * */

    private generateInterfaceDeclaration (
        sourceNode: parser.INode
    ): (tsd.InterfaceDeclaration|undefined) {

        let doclet = Generator.getModifiedDoclet(sourceNode);

        if (doclet.undocumented) {
            return;
        }

        let name = Generator.getCamelCaseName(sourceNode),
            declaration = new tsd.InterfaceDeclaration(name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        this.namespace.addChildren(declaration);

        utils.Dictionary
            .values(sourceNode.children)
            .forEach(child => {
                if (name === 'SeriesOptions' &&
                    Object.keys(child.children).length > 0
                ) {
                    let seriesDeclaration = this.generateSeriesDeclaration(
                        child
                    );
                    if (seriesDeclaration) {
                        this._seriesTypes.push(
                            seriesDeclaration.fullName
                        );
                    }
                }
                else {
                    this.generatePropertyDeclaration(child, declaration)
                }
            });

        return declaration;
    }

    private generatePropertyDeclaration (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): (tsd.PropertyDeclaration|undefined) {

        let doclet = Generator.getModifiedDoclet(sourceNode);

        if (doclet.undocumented) {
            return;
        }

        if (Object.keys(sourceNode.children).length > 0) {

            let interfaceDeclaration = this.generateInterfaceDeclaration(sourceNode),
                replacedAnyType = false;

            if (interfaceDeclaration) {

                sourceNode.children = {};
                sourceNode.doclet.type = (sourceNode.doclet.type || { names: [] });
                sourceNode.doclet.type.names = sourceNode.doclet.type.names
                    .map(config.mapType)
                    .filter(name => (name !== 'any' && name !== 'object'))
                    .map(name => {
                        if (name.indexOf('any') === -1 ||
                            !GENERIC_ANY_TYPE.test(name) ||
                            !interfaceDeclaration
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
                    sourceNode.doclet.type.names.push(interfaceDeclaration.fullName);
                }
            }
        }

        let declaration = new tsd.PropertyDeclaration(
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

        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateSeriesDeclaration(
        sourceNode: parser.INode
    ): (tsd.InterfaceDeclaration|undefined) {

        let doclet = Generator.getModifiedDoclet(sourceNode);

        if (doclet.undocumented ||
            !sourceNode.meta.name
        ) {
            return;
        }

        let name = Generator.getCamelCaseName(sourceNode),
            declaration = new tsd.InterfaceDeclaration(name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        declaration.types.push(
            'Highcharts.Plot' +
            utils.capitalize(sourceNode.meta.name) +
            'Options'
        );
        declaration.types.push('Highcharts.SeriesOptions');

        let dataNode = sourceNode.children['data'];

        if (!dataNode) {
            console.error('No data description found!');
            return;
        }

        this.namespace.addChildren(declaration);

        this.generatePropertyDeclaration(dataNode, declaration);

        let typeDeclaration = new tsd.PropertyDeclaration('type');

        typeDeclaration.isOptional = true;
        typeDeclaration.types.push('"' + sourceNode.meta.name + '"');

        declaration.addChildren(typeDeclaration);

        return declaration;
    }

    public toString(): string {

        return this.namespace.toString();
    }
}
