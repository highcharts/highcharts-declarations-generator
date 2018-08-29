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
): Promise<utils.Dictionary<tsd.NamespaceDeclaration>> {
    return new Promise((resolve, reject) => {

        let productNamespaces = (
            new utils.Dictionary<tsd.NamespaceDeclaration>()
        );

        Object
            .keys(config.mainModules)
            .forEach(product => {

                let generator = new Generator(product, optionsJSON);
                
                productNamespaces[product] = generator.namespace
            }); 

        resolve(productNamespaces);
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

        if (doclet.products) {

            removedLinks.length = 0;

            doclet.products.forEach(product =>
                removedLinks.push(config.seeLink(name, 'option', product))
            );

            if (description &&
                description[0] !== '('
            ) {
                description = (
                    '(' + doclet.products
                        .map(utils.capitalize)
                        .join(', ') +
                    ') ' + description
                );
            }
        }

        if (removedLinks.length > 0) {
            doclet.see = removedLinks
                .map(link => utils.urls(link)[0])
                .filter(link => !!link);
        }

        doclet.description = description;

        return doclet;
    }

    /* *
     *
     *  Constructor
     *
     * */

    public constructor (
        product: string,
        optionsJSON: utils.Dictionary<parser.INode>
    ) {

        super();

        this._namespace = new tsd.NamespaceDeclaration('Highcharts');
        this._product = product;
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

        this.generateSeriesDeclaration();
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

    private _product: string;

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
/*
        if (doclet.products &&
            doclet.products.indexOf(this._product) === -1
        ) {
            return;
        }
 */
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
                    let seriesDeclaration = this.generateSeriesTypeDeclaration(
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
/*
        if (doclet.products &&
            doclet.products.indexOf(this._product) === -1
        ) {
            return;
        }
 */
        if (Object.keys(sourceNode.children).length > 0) {

            let interfaceDeclaration = this.generateInterfaceDeclaration(
                    sourceNode
                ),
                replacedAnyType = false;

            if (!interfaceDeclaration) {
                return;
            }

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
                sourceNode.doclet.type.names.push(
                    interfaceDeclaration.fullName
                );
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

    private generateSeriesTypeDeclaration (
        sourceNode: parser.INode
    ): (tsd.InterfaceDeclaration|undefined) {

        let doclet = Generator.getModifiedDoclet(sourceNode);
/*
        if (doclet.products &&
            doclet.products.indexOf(this._product) === -1
        ) {
            return;
        }
 */
        if (!sourceNode.meta.name) {
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
            (
                'Highcharts.Plot' +
                utils.capitalize(sourceNode.meta.name) +
                'Options'
            ),
            'Highcharts.SeriesOptions'
        );

        let dataNode = sourceNode.children['data'];

        if (!dataNode) {
            console.error('No data description found!');
            return;
        }

        this.namespace.addChildren(declaration);

        this.generatePropertyDeclaration(dataNode, declaration);

        let typeDeclaration = new tsd.PropertyDeclaration('type');

        typeDeclaration.description = (
            utils.capitalize(sourceNode.meta.name) +
            ' series type.'
        );
        typeDeclaration.isOptional = true;
        typeDeclaration.isReadOnly = true;
        typeDeclaration.types.push('"' + sourceNode.meta.name + '"');

        declaration.addChildren(typeDeclaration);

        let childrenNames = declaration.getChildrenNames(),
            excludeDeclaration;

        (sourceNode.doclet.exclude || [])
            .filter(name => childrenNames.indexOf(name) === -1)
            .forEach(name => {

                excludeDeclaration = new tsd.PropertyDeclaration(name);

                excludeDeclaration.isOptional = true;
                excludeDeclaration.types.push('undefined');

                declaration.addChildren(excludeDeclaration);
            });

        return declaration;
    }

    private generateSeriesDeclaration () {

        let optionsDeclaration = this.namespace.getChildren('Options')[0];

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

        this.namespace.addChildren(seriesTypeDeclaration);

        seriesPropertyDeclaration.types.length = 0;
        seriesPropertyDeclaration.types.push(
            'Array<' + seriesTypeDeclaration.fullName + '>'
        );
    }

    public toString(): string {

        return this.namespace.toString();
    }
}
