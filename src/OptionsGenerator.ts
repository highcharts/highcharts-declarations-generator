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
): Promise<utils.Dictionary<tsd.ModuleGlobalDeclaration>> {
    return new Promise((resolve, reject) => {

        let productNamespaces = (
            new utils.Dictionary<tsd.ModuleGlobalDeclaration>()
        );

        Object
            .keys(config.mainModules)
            .forEach(product => {

                let generator = new Generator(product, optionsJSON);
                
                productNamespaces[product] = generator.mainNamespace
            }); 

        resolve(productNamespaces);
    });
}



const GENERIC_ANY_TYPE = /([\<\(\|])any([\|\)\>])/;



class Generator {

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

    private static getNormalizedDoclet (node: parser.INode): parser.IDoclet {

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
            doclet.type.names = doclet.type.names.map(
                type => config.mapType(type)
            );
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

        this._mainNamespace = new tsd.ModuleGlobalDeclaration('Highcharts');
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

    public get mainNamespace(): tsd.ModuleGlobalDeclaration {
        return this._mainNamespace;
    }
    private _mainNamespace: tsd.ModuleGlobalDeclaration;

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

        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode);
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

        this.mainNamespace.addChildren(declaration);

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

        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode);
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
                .map(type => config.mapType(type))
                .filter(type => type !== 'any')
                .map(type => {
                    if (type.indexOf('any') === -1 ||
                        !GENERIC_ANY_TYPE.test(type) ||
                        !interfaceDeclaration
                    ) {
                        return type;
                    }
                    else {
                        replacedAnyType = true;
                        return type.replace(
                            new RegExp(GENERIC_ANY_TYPE, 'gm'),
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

        let isValueType = false;

        if (doclet.values) {
            let values = utils.json(doclet.values, true);
            if (values instanceof Array) {
                let mergedTypes = utils.uniqueArray(
                    declaration.types, values.map(config.mapValue)
                );
                declaration.types.length = 0;
                declaration.types.push(...mergedTypes);
                isValueType = true;
            }
        }

        if (!isValueType &&
            doclet.type
        ) {
            let mergedTypes = utils.uniqueArray(
                declaration.types, doclet.type.names
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateSeriesTypeDeclaration (
        sourceNode: parser.INode
    ): (tsd.InterfaceDeclaration|undefined) {

        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode);
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

        this.mainNamespace.addChildren(declaration);

        this.generatePropertyDeclaration(dataNode, declaration);

        let typePropertyDeclaration = new tsd.PropertyDeclaration('type');

        typePropertyDeclaration.description = (
            utils.capitalize(sourceNode.meta.name) + ' series type.'
        );
        typePropertyDeclaration.isOptional = true;
        typePropertyDeclaration.types.push('"' + sourceNode.meta.name + '"');

        declaration.addChildren(typePropertyDeclaration);

        (sourceNode.doclet.exclude || []).forEach(name => {
            if (!declaration.getChildren(name)) {
                let excludeDeclaration = new tsd.PropertyDeclaration(name);
                excludeDeclaration.isOptional = true;
                excludeDeclaration.types.push('undefined');
                declaration.addChildren(excludeDeclaration);
            }
        });

        return declaration;
    }

    private generateSeriesDeclaration () {

        let optionsDeclaration = this.mainNamespace.getChildren('Options')[0];

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

        this.mainNamespace.addChildren(seriesTypeDeclaration);

        seriesPropertyDeclaration.types.length = 0;
        seriesPropertyDeclaration.types.push(
            'Array<SeriesOptions>' // + seriesTypeDeclaration.fullName + '>'
        );
    }
 
    public toString(): string {

        return this.mainNamespace.toString();
    }
}
