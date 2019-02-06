/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as Config from './Config';
import * as Parser from './OptionsParser';
import * as TSD from './TypeScriptDeclarations';
import * as Utils from './Utilities';



export function generate (
    optionsNode: Parser.INode
): Promise<TSD.ModuleDeclaration> {

    return new Promise(
        resolve => resolve((new Generator(optionsNode)).namespace)
    );
}



const ANY_TYPE = /(^|[\<\(\|])any([\|\)\>]|$)/;



class Generator {

    /* *
     *
     *  Static Properties
     *
     * */

    private static _series: Array<string> = [];

    /* *
     *
     *  Static Functions
     *
     * */

    private static getCamelCaseName (node: Parser.INode): string {

        let name = (node.meta.fullname || node.meta.name || '');

        return (TSD.IDeclaration
            .namespaces(name)
            .map(Utils.capitalize)
            .join('')
            .replace(/Options/g, '') +
            'Options'
        );
    }

    private static getNormalizedDoclet (node: Parser.INode): Parser.IDoclet {

        let doclet = node.doclet,
            description = (node.doclet.description || '').trim(),
            name = (node.meta && (node.meta.fullname || node.meta.name) || ''),
            removedLinks = [] as Array<string>;

        description = Utils.removeExamples(description);
        description = Utils.removeLinks(description, removedLinks);
        description = Utils.transformLists(description);

        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }

        if (doclet.type && doclet.type.names) {
            doclet.type.names = doclet.type.names.map(
                type => Config.mapType(type)
            );
        }
        else {
            doclet.type = { names: [ 'any' ] };
        }

        if (doclet.products) {

            removedLinks.length = 0;

            doclet.products.forEach(product =>
                removedLinks.push(Config.seeLink(name, 'option', product))
            );

            if (description &&
                description[0] !== '('
            ) {
                description = (
                    '(' + doclet.products
                        .map(Utils.capitalize)
                        .join(', ') +
                    ') ' + description
                );
            }
        }

        if (removedLinks.length > 0) {
            doclet.see = removedLinks
                .map(link => Utils.urls(link)[0])
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

    public constructor (parsedOptions: Parser.INode) {

        this._namespace = new TSD.ModuleDeclaration('Highcharts');

        this.generateInterfaceDeclaration(parsedOptions);
        this.generateSeriesDeclaration();
    }

    /* *
     *
     *  Properties
     *
     * */

    public get namespace(): TSD.ModuleDeclaration {
        return this._namespace;
    }
    private _namespace: TSD.ModuleDeclaration;

    /* *
     *
     *  Functions
     *
     * */

    private generateInterfaceDeclaration (
        sourceNode: Parser.INode
    ): (TSD.InterfaceDeclaration|undefined) {

        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            name = Generator.getCamelCaseName(sourceNode),
            declaration = new TSD.InterfaceDeclaration(name),
            children = Utils.Dictionary.values(sourceNode.children);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        this.namespace.addChildren(declaration);

        if (name === 'SeriesOptions') {
            children
                .filter(child => Object.keys(child.children).length === 0)
                .forEach(child => this.generatePropertyDeclaration(
                    child, declaration
                ));
            children
                .filter(child => Object.keys(child.children).length > 0)
                .forEach(child => {
                    let seriesDeclaration = this.generateSeriesTypeDeclaration(
                        child, declaration
                    );
                    if (seriesDeclaration) {
                        Generator._series.push(seriesDeclaration.fullName);
                    }
                });
        }
        else {
            children.forEach(child => this.generatePropertyDeclaration(
                child, declaration
            ));
        }

        return declaration;
    }

    private generatePropertyDeclaration (
        sourceNode: Parser.INode,
        targetDeclaration: TSD.IDeclaration
    ): (TSD.PropertyDeclaration|undefined) {

        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode);

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
                .map(type => Config.mapType(type))
                .map(type => {
                    if (ANY_TYPE.test(type) &&
                        interfaceDeclaration
                    ) {
                        replacedAnyType = true;
                        return type.replace(
                            new RegExp(ANY_TYPE, 'gm'),
                            '$1' + interfaceDeclaration.name + '$2'
                        );
                    }
                    return type;
                });

            if (!replacedAnyType) {
                sourceNode.doclet.type.names.push(
                    interfaceDeclaration.fullName
                );
            }
        }

        let declaration = new TSD.PropertyDeclaration(
            sourceNode.meta.name || ''
        );

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (sourceNode.meta.fullname !== 'series.type') {
            declaration.isOptional = true;
        }

        let isValueType = false;

        if (doclet.values) {
            let values = Utils.json(doclet.values, true);
            if (values instanceof Array) {
                let mergedTypes = Utils.uniqueArray(
                    declaration.types, values.map(Config.mapValue)
                );
                declaration.types.length = 0;
                declaration.types.push(...mergedTypes);
                isValueType = true;
            }
        }

        if (!isValueType &&
            doclet.type
        ) {
            let mergedTypes = Utils.uniqueArray(
                declaration.types, doclet.type.names
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateSeriesTypeDeclaration (
        sourceNode: Parser.INode,
        targetDeclaration: TSD.IDeclaration
    ): (TSD.InterfaceDeclaration|undefined) {

        if (sourceNode.doclet.access === 'private' ||
            !sourceNode.meta.name
        ) {
            return undefined;
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            name = Generator.getCamelCaseName(sourceNode),
            declaration = new TSD.InterfaceDeclaration(name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        declaration.types.push(
            (
                'Highcharts.Plot' +
                Utils.capitalize(sourceNode.meta.name) +
                'Options'
            ),
            'Highcharts.SeriesOptions'
        );

        this.namespace.addChildren(declaration);

        let dataNode = sourceNode.children['data'];

        if (dataNode) {
            this.generatePropertyDeclaration(dataNode, declaration);
        }

        let typePropertyDeclaration = new TSD.PropertyDeclaration('type');

        typePropertyDeclaration.description = (
            '(' + Object.keys(Config.products).map(Utils.capitalize).join (', ') + ') ' +
            'This property is only in TypeScript non-optional and might be ' +
            '`undefined` in series objects from unknown sources.'
        );
        typePropertyDeclaration.types.push('"' + sourceNode.meta.name + '"');

        declaration.addChildren(typePropertyDeclaration);

        (sourceNode.doclet.exclude || []).forEach(exclude => {
            if (!declaration.getChildren(exclude)) {
                let excludeDeclaration = new TSD.PropertyDeclaration(exclude);
                excludeDeclaration.isOptional = true;
                excludeDeclaration.types.push('undefined');
                declaration.addChildren(excludeDeclaration);
            }
        });

        return declaration;
    }

    private generateSeriesDeclaration () {

        let optionsDeclaration = this.namespace.getChildren('Options')[0];

        if (!optionsDeclaration) {
            throw new Error('Highcharts.Options not declared!');
            return;
        }

        let seriesPropertyDeclaration = optionsDeclaration.getChildren(
            'series'
        )[0];

        if (!seriesPropertyDeclaration) {
            throw new Error('Highcharts.Options#series not declared!');
            return;
        }

        let seriesTypeDeclaration = new TSD.TypeDeclaration(
            'SeriesOptionsType'
        );

        seriesTypeDeclaration.description = (
            'The possible types of series options.'
        );
        seriesTypeDeclaration.types.push(...Generator._series);

        this.namespace.addChildren(seriesTypeDeclaration);

        seriesPropertyDeclaration.types.length = 0;
        seriesPropertyDeclaration.types.push(
            'Array<Highcharts.SeriesOptionsType>'
        );
    }
 
    public toString(): string {

        return this.namespace.toString();
    }
}
