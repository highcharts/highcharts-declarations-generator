"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const Config = require("./Config");
const TSD = require("./TypeScriptDeclarations");
const Utilities = require("./Utilities");
/* *
 *
 *  Functions
 *
 * */
function generate(optionsNode) {
    return new Promise(resolve => resolve((new Generator(optionsNode)).namespace));
}
exports.generate = generate;
/* *
 *
 *  Constants
 *
 * */
const ANY_TYPE = /(^|[\<\(\|])any([\|\)\>]|$)/;
/* *
 *
 *  Class
 *
 * */
class Generator {
    /* *
     *
     *  Static Functions
     *
     * */
    static getCamelCaseName(name) {
        return (TSD.IDeclaration
            .namespaces(name)
            .map(name => name
            .split(/\W+/g)
            .map(Utilities.capitalize)
            .join(''))
            .join('')
            .replace(/Options/g, '') +
            'Options');
    }
    static getNormalizedDoclet(node) {
        let doclet = node.doclet, description = (node.doclet.description || '').trim(), name = (node.meta.fullname || node.meta.name || ''), removedLinks = [];
        description = Utilities.removeExamples(description);
        description = Utilities.removeLinks(description, removedLinks);
        description = Utilities.transformLists(description);
        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }
        if (doclet.type && doclet.type.names) {
            doclet.type.names = Utilities.uniqueArray(doclet.type.names.map(type => Config.mapType(type)));
        }
        else {
            doclet.type = { names: ['any'] };
        }
        if (doclet.products) {
            removedLinks.length = 0;
            doclet.products.forEach(product => removedLinks.push(Config.seeLink(name, 'option', product)));
            if (description &&
                description[0] !== '(') {
                description = ('(' + doclet.products
                    .map(Utilities.capitalize)
                    .join(', ') +
                    ') ' + description);
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
    constructor(parsedOptions) {
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
    get namespace() {
        return this._namespace;
    }
    /* *
     *
     *  Functions
     *
     * */
    generateInterfaceDeclaration(sourceNode) {
        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }
        let doclet = Generator.getNormalizedDoclet(sourceNode), name = Generator.getCamelCaseName(sourceNode.meta.fullname || sourceNode.meta.name || ''), declaration = new TSD.InterfaceDeclaration(sourceNode.doclet.declare || name), children = Utilities.Dictionary.values(sourceNode.children);
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
                .filter(child => (Object.keys(child.children).length === 0 ||
                !child.doclet._extends ||
                child.doclet._extends.every(name => !name.startsWith('plotOptions'))))
                .forEach(child => this.generatePropertyDeclaration(child, declaration));
            children
                .filter(child => (Object.keys(child.children).length > 0 &&
                child.doclet._extends &&
                child.doclet._extends.some(name => name.startsWith('plotOptions'))))
                .forEach(child => {
                let seriesDeclaration = this.generateSeriesTypeDeclaration(child, this.namespace);
                if (seriesDeclaration) {
                    Generator._series.push(seriesDeclaration.fullName);
                }
            });
        }
        else {
            children.forEach(child => this.generatePropertyDeclaration(child, declaration));
        }
        return declaration;
    }
    generateLiteralTypeDeclarations(sourceDeclaration = this._namespace) {
        const types = sourceDeclaration.types;
        if (sourceDeclaration instanceof TSD.PropertyDeclaration &&
            types.length > 1 &&
            types.every(type => type.startsWith('"'))) {
            let name = (sourceDeclaration.declareName ||
                'Options' + Utilities.capitalize(sourceDeclaration.name) + 'Value');
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
    generatePropertyDeclaration(sourceNode, targetDeclaration) {
        if (sourceNode.doclet.access === 'private') {
            return undefined;
        }
        let doclet = Generator.getNormalizedDoclet(sourceNode);
        if (Object.keys(sourceNode.children).length > 0) {
            let interfaceDeclaration = this.generateInterfaceDeclaration(sourceNode), replacedAnyType = false;
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
                    return type.replace(new RegExp(ANY_TYPE, 'gm'), '$1' + interfaceDeclaration.fullName + '$2');
                }
                return type;
            });
            if (!replacedAnyType) {
                sourceNode.doclet.type.names.push(interfaceDeclaration.fullName);
            }
            sourceNode.doclet.type.names = Utilities.uniqueArray(sourceNode.doclet.type.names);
        }
        let declaration = new TSD.PropertyDeclaration(sourceNode.meta.name || '');
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
                let mergedTypes = Utilities.uniqueArray(declaration.types, values.map(Config.mapValue));
                declaration.types.length = 0;
                declaration.types.push(...mergedTypes);
                isValueType = true;
            }
        }
        if (!isValueType && doclet.type) {
            const mergedTypes = Utilities.uniqueArray(declaration.types, doclet.type.names);
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }
        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }
        return declaration;
    }
    generateSeriesDeclaration() {
        let optionsDeclaration = this.namespace.getChildren('Options')[0];
        if (!optionsDeclaration) {
            throw new Error('Highcharts.Options not declared!');
        }
        let seriesPropertyDeclaration = optionsDeclaration.getChildren('series')[0];
        if (!seriesPropertyDeclaration) {
            throw new Error('Highcharts.Options#series not declared!');
        }
        let seriesRegistryDeclaration = new TSD.InterfaceDeclaration('SeriesOptionsRegistry');
        seriesRegistryDeclaration.description = 'The registry for all types of series options.';
        Generator._series.forEach(series => seriesRegistryDeclaration.addChildren(new TSD.PropertyDeclaration(series, series)));
        this.namespace.addChildren(seriesRegistryDeclaration);
        let seriesTypeDeclaration = new TSD.TypeDeclaration('SeriesOptionsType', 'SeriesOptionsRegistry[keyof SeriesOptionsRegistry]');
        seriesTypeDeclaration.description = 'The possible types of series options.';
        this.namespace.addChildren(seriesTypeDeclaration);
        seriesPropertyDeclaration.types.length = 0;
        seriesPropertyDeclaration.types.push('Array<Highcharts.SeriesOptionsType>');
    }
    generateSeriesTypeDeclaration(sourceNode, targetDeclaration) {
        if (!sourceNode.meta.name ||
            sourceNode.doclet.access === 'private') {
            return undefined;
        }
        let doclet = Generator.getNormalizedDoclet(sourceNode), name = Generator.getCamelCaseName(sourceNode.meta.fullname || sourceNode.meta.name || ''), declaration = new TSD.InterfaceDeclaration(name), children = sourceNode.children, extendedChildren = ['type'];
        (sourceNode.doclet._extends || [])
            .map(name => Generator.getCamelCaseName(name))
            .map(name => this.namespace.getChildren(name)[0])
            .forEach(declaration => extendedChildren.push(...declaration.getChildrenNames()));
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
        declaration.types.push(('Highcharts.Plot' +
            Utilities.capitalize(sourceNode.meta.name) +
            'Options'), 'Highcharts.SeriesOptions');
        let typePropertyDeclaration = new TSD.PropertyDeclaration('type');
        typePropertyDeclaration.description = ('(' + Object.keys(Config.products).map(Utilities.capitalize).join(', ') + ') ' +
            'This property is only in TypeScript non-optional and might be ' +
            '`undefined` in series objects from unknown sources.');
        typePropertyDeclaration.types.push('"' + sourceNode.meta.name + '"');
        if (doclet.deprecated) {
            declaration.deprecated = doclet.deprecated;
        }
        declaration.addChildren(typePropertyDeclaration);
        targetDeclaration.addChildren(declaration);
        Object
            .keys(children)
            .filter(childName => extendedChildren.indexOf(childName) === -1)
            .forEach(childName => this.generatePropertyDeclaration(children[childName], declaration));
        Utilities
            .uniqueArray(sourceNode.doclet.exclude || [])
            .filter(childName => extendedChildren.indexOf(childName) === -1)
            .filter(childName => declaration.getChildren(childName).length === 0)
            .forEach(childName => {
            const child = new TSD.PropertyDeclaration(childName);
            child.description = 'Not available';
            child.isOptional = true;
            child.types.push('undefined');
            declaration.addChildren(child);
        });
        return declaration;
    }
    generateTypeDeclaration(name, types, description) {
        const existingDeclaration = this.namespace.getChildren(name)[0];
        if (existingDeclaration instanceof TSD.TypeDeclaration) {
            if (Utilities.isDeepEqual(existingDeclaration.types, types)) {
                return existingDeclaration;
            }
            console.error(name + ' already exists with different types');
            console.info(existingDeclaration.types, 'vs.', types);
            console.info('Merge types of ' + name);
            const mergedTypes = Utilities.uniqueArray(existingDeclaration.types, types);
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
    toString() {
        return this.namespace.toString();
    }
}
/* *
 *
 *  Static Properties
 *
 * */
Generator._series = [];
//# sourceMappingURL=OptionsGenerator.js.map