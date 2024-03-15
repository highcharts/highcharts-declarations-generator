/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/


import * as Config from './Config';
import * as Parser from './OptionsParser';
import * as TSD from './TypeScriptDeclarations';
import * as Utilities from './Utilities';

/* *
 *
 *  Types
 *
 * */


type ModuleDictionary = Utilities.Dictionary<TSD.ModuleDeclaration>;


/* *
 *
 *  Constants
 *
 * */


const ANY_TYPE = /(^|[\<\(\|])any([\|\)\>]|$)/;


const COPYRIGHT_HEADER = 'Copyright (c) Highsoft AS. All rights reserved.';


const SERIES_NAME = /^Highcharts\.(?:Plot|Series)(([A-Z][a-z]+)(?:[A-Z][a-z]+)?)\w*Options$/;


/* *
 *
 *  Functions
 *
 * */


export async function generate (
    optionsNode: Parser.INode
): Promise<ModuleDictionary> {

    const optionsNamespace = new OptionsGenerator(optionsNode).namespace;
    const declarationModules: ModuleDictionary = {
        [Config.mainModule]: optionsNamespace
    };
    const optionsPath = Utilities
        .path(Utilities.parent(Config.mainModule), 'options');
    const seriesTypes: Array<string> = [];

    for (
        const child
        of optionsNamespace.getChildren('PlotOptions')[0].getChildren()
    ) {
        seriesTypes.push(child.name);
    }

    let moduleImport: string;
    let modulePath: string;
    let name: string;
    let type: string;
    let type2: string;

    for (const child of optionsNamespace.getChildren()) {

        name = TSD.IDeclaration.extractTypeNames(child.fullName)[0];
        type = (name.match(SERIES_NAME)?.[1] || '').toLowerCase();
        type2 = (name.match(SERIES_NAME)?.[2] || '').toLowerCase();

        if (seriesTypes.includes(type) || seriesTypes.includes(type2)) {

            if (!seriesTypes.includes(type)) {
                type = type2;
            }

            modulePath = Utilities.path(optionsPath, type);

            if (!declarationModules[modulePath]) {
                declarationModules[modulePath] = new TSD.ModuleDeclaration(modulePath);
                declarationModules[modulePath].imports.push(
                    'import * as Highcharts from "' +
                    Utilities.relative(modulePath, Config.mainModule, true) +
                    '";'
                );
                declarationModules[modulePath]
                    .addChildren(new TSD.ExternalModuleDeclaration(
                        Config.mainModule,
                        Utilities.relative(modulePath, Config.mainModule, true)
                    ));

            }

            declarationModules[modulePath]
                .getChildren()[0]
                .addChildren(...optionsNamespace.removeChild(child.name));

            moduleImport = (
                'import "' +
                Utilities.relative(Config.mainModule, modulePath, true) +
                '";'
            );

            if (!optionsNamespace.imports.includes(moduleImport)) {
                optionsNamespace.imports.push(moduleImport);
            }

        }

    }

    return declarationModules;
}


/* *
 *
 *  Class
 *
 * */


class OptionsGenerator {



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


    private static getCamelCaseName (
        name: string
    ): string {

        return (TSD.IDeclaration
            .namespaces(name)
            .map(name => name
                .split(/\W+/g)
                .map(Utilities.capitalize)
                .join(''))
            .join('')
            .replace(/Options/g, '') +
            'Options'
        );
    }


    private static getNormalizedDoclet (
        node: Parser.INode
    ): Parser.IDoclet {

        let doclet = node.doclet,
            description = (node.doclet.description || '').trim(),
            name = (node.meta.fullname || node.meta.name || ''),
            removedLinks = [] as Array<string>;

        description = Utilities.removeExamples(description);
        description = Utilities.removeLinks(description, removedLinks);
        description = Utilities.transformLists(description);

        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }

        if (doclet.type && doclet.type.names) {
            doclet.type.names = Utilities.uniqueArray(
                doclet.type.names.map(type => Config.mapType(type))
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
                        .map(Utilities.capitalize)
                        .join(', ') +
                    ') ' + description
                );
            }
        }

        if (!Config.withoutLinks && removedLinks.length > 0) {
            doclet.see = removedLinks
                .map(link => Utilities.urls(link)[0])
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
        parsedOptions: Parser.INode
    ) {

        this._namespace = new TSD.ModuleDeclaration('Highcharts');

        this.generateInterfaceDeclaration(parsedOptions);
        this.generateSeriesDeclaration();
        this.generateLiteralTypeDeclarations();

    }


    /* *
     *
     *  Properties
     *
     * */


    public get namespace (): TSD.ModuleDeclaration {
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

        let doclet = OptionsGenerator.getNormalizedDoclet(sourceNode),
            name = OptionsGenerator.getCamelCaseName(
                sourceNode.meta.fullname || sourceNode.meta.name || ''
            ),
            declaration = new TSD.InterfaceDeclaration(
                sourceNode.doclet.declare || name
            ),
            children = Utilities.Dictionary.values(sourceNode.children);

        let existingChild = this.namespace.getChildren(declaration.name)[0];

        if (existingChild instanceof TSD.InterfaceDeclaration) {
            declaration = existingChild;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (typeof doclet.deprecated === 'string') {
            declaration.deprecated = doclet.deprecated;
        }

        if (!declaration.parent) {
            this.namespace.addChildren(declaration);
        }

        if (name === 'SeriesOptions') {

            declaration.description += [
                '\n\n',
                'You have to extend the `SeriesOptions` via an interface ',
                'to allow custom properties:', '\n',
                '```', '\n',
                'declare interface SeriesOptions {', '\n',
                '    customProperty: string;', '\n',
                '}', '\n',
            ].join('');

            children
                .filter(child => (
                    Object.keys(child.children).length === 0 ||
                    !child.doclet._extends ||
                    child.doclet._extends.every(
                        name => !name.startsWith('plotOptions')
                    )
                ))
                .forEach(child => this.generatePropertyDeclaration(
                    child, declaration
                ));

            children
                .filter(child => (
                    Object.keys(child.children).length > 0 &&
                    child.doclet._extends &&
                    child.doclet._extends.some(
                        name => name.startsWith('plotOptions')
                    )
                ))
                .forEach(child => {

                    let seriesDeclaration = this.generateSeriesTypeDeclaration(
                        child, this.namespace
                    );

                    if (seriesDeclaration) {
                        OptionsGenerator._series.push(seriesDeclaration.fullName);
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


    private generateLiteralTypeDeclarations (
        sourceDeclaration: TSD.IDeclaration = this._namespace
    ) {

        const types = sourceDeclaration.types;

        if (sourceDeclaration instanceof TSD.PropertyDeclaration &&
            types.length > 1 &&
            types.every(type => type.startsWith('"'))
        ) {

            let name = (
                sourceDeclaration.declareName ||
                'Options' + Utilities.capitalize(sourceDeclaration.name) + 'Value'
            );

            const declaration = this.generateTypeDeclaration(name, types);

            if (declaration) {
                sourceDeclaration.types.length = 0;
                sourceDeclaration.types.push(declaration.fullName);
            }
        }

        if (sourceDeclaration.hasChildren) {
            sourceDeclaration
                .getChildren()
                .forEach(child => this.generateLiteralTypeDeclarations(child));
        }
    }


    private generatePropertyDeclaration (
        sourceNode: Parser.INode,
        targetDeclaration: TSD.IDeclaration
    ): (TSD.PropertyDeclaration|undefined) {

        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }

        let doclet = OptionsGenerator.getNormalizedDoclet(sourceNode);

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
                    if (ANY_TYPE.test(type) && interfaceDeclaration) {
                        replacedAnyType = true;
                        return type.replace(
                            new RegExp(ANY_TYPE, 'gm'),
                            '$1' + interfaceDeclaration.fullName + '$2'
                        );
                    }
                    return type;
                });

            if (!replacedAnyType) {
                sourceNode.doclet.type.names.push(
                    interfaceDeclaration.fullName
                );
            }

            sourceNode.doclet.type.names = Utilities.uniqueArray(
                sourceNode.doclet.type.names
            );
        }

        let declaration = new TSD.PropertyDeclaration(
            sourceNode.meta.name || ''
        );

        let existingChild = targetDeclaration.getChildren(declaration.name)[0];

        if (existingChild instanceof TSD.PropertyDeclaration) {
            declaration = existingChild;
        }

        if (doclet.declare) {
            declaration.declareName = doclet.declare;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (sourceNode.meta.fullname !== 'series.type') {
            declaration.isOptional = true;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.deprecated) {
            declaration.deprecated = doclet.deprecated;
        }

        let isValueType = false;

        if (doclet.values) {
            let values = Utilities.json(doclet.values, true);
            if (values instanceof Array) {
                let mergedTypes = Utilities.uniqueArray(
                    declaration.types, values.map(Config.mapValue)
                );
                declaration.types.length = 0;
                declaration.types.push(...mergedTypes);
                isValueType = true;
            }
        }

        if (!isValueType && doclet.type) {
            const mergedTypes = Utilities.uniqueArray(
                declaration.types, doclet.type.names
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }

        return declaration;
    }


    private generateSeriesDeclaration () {

        let optionsDeclaration = this.namespace.getChildren('Options')[0];

        if (!optionsDeclaration) {
            throw new Error('Highcharts.Options not declared!');
        }

        let seriesPropertyDeclaration = optionsDeclaration.getChildren(
            'series'
        )[0];

        if (!seriesPropertyDeclaration) {
            throw new Error('Highcharts.Options#series not declared!');
        }

        let seriesRegistryDeclaration = new TSD.InterfaceDeclaration('SeriesOptionsRegistry');
        seriesRegistryDeclaration.description = 'The registry for all types of series options.';
        OptionsGenerator._series.forEach(series =>
            seriesRegistryDeclaration.addChildren(
                new TSD.PropertyDeclaration(series, series)
            )
        );
        this.namespace.addChildren(seriesRegistryDeclaration);

        let seriesTypeDeclaration = new TSD.TypeDeclaration(
            'SeriesOptionsType',
            'SeriesOptionsRegistry[keyof SeriesOptionsRegistry]'
        );
        seriesTypeDeclaration.description = 'The possible types of series options.';
        this.namespace.addChildren(seriesTypeDeclaration);

        seriesPropertyDeclaration.types.length = 0;
        seriesPropertyDeclaration.types.push('Array<Highcharts.SeriesOptionsType>');
    }


    private generateSeriesTypeDeclaration (
        sourceNode: Parser.INode,
        targetDeclaration: TSD.ModuleDeclaration
    ): (TSD.InterfaceDeclaration|undefined) {

        if (!sourceNode.meta.name ||
            sourceNode.doclet.access === 'private'
        ) {
            return undefined;
        }

        let doclet = OptionsGenerator.getNormalizedDoclet(sourceNode),
            name = OptionsGenerator.getCamelCaseName(
                sourceNode.meta.fullname || sourceNode.meta.name || ''
            ),
            declaration = new TSD.InterfaceDeclaration(name),
            children = sourceNode.children,
            extendedChildren = [ 'type' ] as Array<string>;

        (sourceNode.doclet._extends || [])
            .map(name => OptionsGenerator.getCamelCaseName(name))
            .map(name => this.namespace.getChildren(name)[0])
            .forEach(
                declaration =>
                    extendedChildren.push(...declaration.getChildrenNames())
            );
        extendedChildren = Utilities.uniqueArray(extendedChildren);

        if (doclet.description) {
            declaration.description = doclet.description;
            declaration.description += [
                '\n\n',
                'You have to extend the `', declaration.name,
                '` via an interface to allow custom properties:', '\n',
                '```', '\n',
                'declare interface ', declaration.name, ' {', '\n',
                '    customProperty: string;', '\n',
                '}', '\n',
            ].join('');
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        declaration.types.push(
            (
                'Highcharts.Plot' +
                Utilities.capitalize(sourceNode.meta.name) +
                'Options'
            ),
            'Highcharts.SeriesOptions'
        );

        let typePropertyDeclaration = new TSD.PropertyDeclaration('type');

        typePropertyDeclaration.description = (
            '(' + Object.keys(Config.products).map(Utilities.capitalize).join (', ') + ') ' +
            'This property is only in TypeScript non-optional and might be ' +
            '`undefined` in series objects from unknown sources.'
        );
        typePropertyDeclaration.types.push('"' + sourceNode.meta.name + '"');

        if (doclet.deprecated) {
            declaration.deprecated = doclet.deprecated;
        }

        declaration.addChildren(typePropertyDeclaration);

        targetDeclaration.addChildren(declaration);

        Object
            .keys(children)
            .filter(childName => extendedChildren.indexOf(childName) === -1)
            .forEach(
                childName =>
                    this.generatePropertyDeclaration(
                        children[childName], declaration
                    )
            );

        Utilities
            .uniqueArray(sourceNode.doclet.exclude || [])
            .filter(childName => extendedChildren.indexOf(childName) === -1)
            .filter(
                childName => declaration.getChildren(childName).length === 0
            )
            .forEach(
                childName => {
                    const child = new TSD.PropertyDeclaration(childName);
                    child.description = 'Not available';
                    child.isOptional = true;
                    child.types.push('undefined');
                    declaration.addChildren(child);
                }
            );

        return declaration;
    }


    private generateTypeDeclaration (
        name: string, types: Array<string>, description?: string
    ): (TSD.TypeDeclaration|undefined) {

        const existingDeclaration = this.namespace.getChildren(name)[0];

        if (existingDeclaration instanceof TSD.TypeDeclaration) {

            if (Utilities.isDeepEqual(existingDeclaration.types, types)) {
                return existingDeclaration;
            }

            console.error(name + ' already exists with different types');
            console.info(existingDeclaration.types, 'vs.', types);
            console.info('Merge types of ' + name);

            const mergedTypes = Utilities.uniqueArray(
                existingDeclaration.types,
                types
            );

            existingDeclaration.types.length = 0;
            existingDeclaration.types.push(...mergedTypes);

            return existingDeclaration;
        }

        const newDeclaration = new TSD.TypeDeclaration(name);

        if (description) {
            newDeclaration.description = description;
        }

        newDeclaration.types.push(...types);

        this.namespace.addChildren(newDeclaration);

        return newDeclaration;
    }


    public toString (): string {

        return this.namespace.toString();
    }


}
