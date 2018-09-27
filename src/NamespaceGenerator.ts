/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as config from './Config';
import * as parser from './NamespaceParser';
import * as tsd from './TypeScriptDeclarations';
import * as utils from './Utilities';



export function saveIntoFiles(
    modulesDictionary: utils.Dictionary<parser.INode>,
    optionsDeclarations: utils.Dictionary<tsd.NamespaceDeclaration>
): Promise<void> {

    // no product specific options tree for convenience
    let mainOptionsDeclarations = optionsDeclarations['highcharts'],
        mainOptionsTypes = Generator.getOptionTypes(mainOptionsDeclarations),
        promises = [] as Array<Promise<void>>;

    Object
        .keys(modulesDictionary)
        .map(modulePath => {

            let mainModules = config.mainModules,
                product = Object
                    .keys(mainModules)
                    .find(product => modulePath === mainModules[product]),
                generator = new Generator(
                    modulePath,
                    modulesDictionary[modulePath],
                    mainOptionsDeclarations,
                    mainOptionsTypes
                );

            return {
                generator: generator,
                modulePath: modulePath
            };
        })
        .forEach(dts => {

            let dtsFileContent = dts.generator.toString(),
                dtsFilePath = dts.modulePath + '.d.ts';

            promises.push(
                utils
                    .save(dtsFilePath, dtsFileContent)
                    .then(() => console.info('Saved ' + dtsFilePath))
            );

            let dtsSourceFilceContent = dtsFileContent
                    .replace(IMPORT_HIGHCHARTS_MODULE, '$1$2.src$3')
                    .replace(DECLARE_HIGHCHARTS_MODULE, '$1$2.src$3'),
                dtsSourceFilePath = dts.modulePath + '.src.d.ts';

            promises.push(
                utils
                    .save(dtsSourceFilePath, dtsSourceFilceContent)
                    .then(() => console.info('Saved ' + dtsSourceFilePath))
            );
        })

    return Promise
        .all(promises)
        .then(() => undefined);
}



const DECLARE_HIGHCHARTS_MODULE = /(declare module ")(.*highcharts)(" \{)/gm;

const IMPORT_HIGHCHARTS_MODULE = /(import \* as Highcharts from ")(.*highcharts)(";)/gm;

const CUSTOM_TYPE = /Highcharts.\w(?:<.*?>)?/gm;



class Generator extends Object {

    /* *
     *
     *  Static Functions
     *
     * */

    private static getNormalizedDoclet(sourceNode: parser.INode): parser.IDoclet {

        let doclet = utils.clone(sourceNode.doclet || {
            description: '',
            kind: 'global',
            name: ''
        });

        let description = (doclet.description || '').trim(),
            namespaces = tsd.IDeclaration.namespaces(doclet.name || ''),
            removedLinks = [] as Array<string>,
            values;

        description = utils.removeExamples(description);
        description = utils.removeLinks(description, removedLinks);
        description = utils.transformLists(description);

        doclet.description = description;
        doclet.name = (namespaces[namespaces.length - 1] || '');

        if (doclet.parameters) {

            let parameters = doclet.parameters,
                parameterDescription;

            Object
                .keys(parameters)
                .map(name => {

                    parameterDescription = parameters[name].description;

                    if (parameterDescription) {
                        parameterDescription = utils.removeLinks(
                            parameterDescription, removedLinks
                        );
                        parameterDescription = utils.transformLists(
                            parameterDescription
                        );
                        parameters[name].description = parameterDescription;
                    }

                    parameters[name].types = (parameters[name].types || ['any'])
                        .map(config.mapType);
                });
        }

        if (doclet.products) {

            let products = doclet.products
                .map(utils.capitalize)
                .join(', ');

            doclet.description = '(' + products + ') ' + description;
        }

        if (doclet.return) {

            let returnDescription = doclet.return.description;

            if (returnDescription) {
                returnDescription = utils.removeLinks(
                    returnDescription, removedLinks
                );
                returnDescription = utils.transformLists(
                    returnDescription
                );
                doclet.return.description = returnDescription;
            }

            doclet.return.types = (doclet.return.types || ['any'])
                .map(config.mapType);
        }

        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }

        if (doclet.values) {
            try {
                values = utils.json((doclet.values || ''), true);
            } catch (error) {
                console.error(error);
            }
        }

        if (values instanceof Array) {
            doclet.types = values.map(config.mapValue);
        } else if (doclet.types) {
            doclet.types = doclet.types.map(config.mapType);
            if (doclet.name[0] !== '[' &&
                doclet.types.length > 1 &&
                doclet.types.some(config.findUndefined)
            ) {
                doclet.isOptional = true;
                doclet.types = doclet.types.filter(config.filterUndefined);
            }
        } else {
            doclet.types = [ 'any' ];
        }

        if (removedLinks.length > 0) {

            let see = [] as Array<string>;

            removedLinks.forEach(link =>
                see.push(...utils.urls(link))
            );

            if (see.length > 0) {
                doclet.see = [
                    config.seeLink(namespaces.join('.'), doclet.kind)
                ];
            }
        }

        return doclet;
    }

    public static getOptionTypes(declaration: tsd.IDeclaration): Array<string> {

        return utils
            .uniqueArray(
                ...declaration.types
                    .map(tsd.IDeclaration.extractTypeNames),
                ...declaration
                    .getChildren()
                    .map(child => Generator.getOptionTypes(child))
            )
            .filter(type =>
                !utils.isCoreType(type) &&
                type.indexOf('Highcharts.') === 0 &&
                type.lastIndexOf('Options') !== (type.length - 8)
            );
    }
/*
    public static mergeDeclarations(
        targetDeclaration: tsd.IDeclaration,
        sourceDeclaration: tsd.IDeclaration
    ) {

        if (!targetDeclaration.description) {
            targetDeclaration.description = sourceDeclaration.description;
        }

        targetDeclaration.types.push(...utils.mergeArrays(
            targetDeclaration.types, sourceDeclaration.types
        ));

        let existingChild = undefined as (tsd.IDeclaration|undefined),
            sourceChildren = sourceDeclaration.getChildren(),
            targetChildrenNames = targetDeclaration.getChildrenNames();

        sourceChildren.forEach(sourceChild => {

            existingChild = targetDeclaration.getChildren(sourceChild.name)[0];

            if (existingChild) {
                Generator.mergeDeclarations(existingChild, sourceChild);
            } else {
                targetDeclaration.addChildren(sourceChild.clone());
            }
        });
    }
 */
    /* *
     *
     *  Constructor
     *
     * */

    public constructor (
        modulePath: string,
        node: parser.INode,
        optionDeclarations: tsd.NamespaceDeclaration,
        optionTypes: Array<string>
    ) {

        super();

        this._modulePath = modulePath;
        this._moduleGlobal = new tsd.ModuleGlobalDeclaration();
        this._namespace = optionDeclarations;
        this._optionTypes = optionTypes;

        if (this.isMainModule) {
            this.moduleGlobal.addChildren(this.namespace);
            this.moduleGlobal.exports.push(
                'export = Highcharts;',
                'export as namespace Highcharts;'
            );
        } else {

            let factoryDeclaration = new tsd.FunctionDeclaration(
                'factory'
            );
            factoryDeclaration.description = (
                'Adds the module to the imported Highcharts namespace.'
            );
            this.moduleGlobal.addChildren(factoryDeclaration);

            let factoryParameterDeclaration = new tsd.ParameterDeclaration(
                'highcharts'
            );
            factoryParameterDeclaration.description = (
                'The imported Highcharts namespace to extend.'
            );
            factoryParameterDeclaration.types.push('typeof Highcharts');
            factoryDeclaration.setParameters(factoryParameterDeclaration);

            this.moduleGlobal.imports.push(
                'import * as Highcharts from "' + utils.relative(
                    modulePath, config.mainModules['highcharts'], true
                ) + '";'
            );
            this.moduleGlobal.exports.push('export = factory;');
        }

        this.generate(node);
    }

    /* *
     *
     *  Properties
     *
     * */

    public get isMainModule(): boolean {
        return (this.modulePath === config.mainModules['highcharts']);
    }

    public get optionTypes(): Array<string> {
        return this._optionTypes;
    }
    private _optionTypes: Array<string>;

    public get moduleGlobal(): tsd.ModuleGlobalDeclaration {
        return this._moduleGlobal;
    }
    private _moduleGlobal: tsd.ModuleGlobalDeclaration;

    public get modulePath(): string {
        return this._modulePath;
    }
    private _modulePath: string;

    public get namespace(): tsd.NamespaceDeclaration {
        return this._namespace;
    }
    private _namespace: tsd.NamespaceDeclaration;

    /* *
     *
     *  Functions
     *
     * */

    private generate (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration = this._moduleGlobal
    ) {

        let kind = (sourceNode.doclet && sourceNode.doclet.kind || '');

        switch (kind) {
            default:
                console.error(
                    'Unknown kind: ' + kind,
                    this.modulePath,
                    sourceNode,
                );
                break;
            case 'class':
                this.generateClass(sourceNode, targetDeclaration);
                break;
            case 'constructor':
                this.generateConstructor(sourceNode, targetDeclaration);
                break;
            case 'external':
                this.generateExternal(sourceNode);
                break;
            case 'function':
                this.generateFunction(sourceNode, targetDeclaration);
                break;
            case 'global':
                this.generateModuleGlobal(sourceNode);
                break;
            case 'interface':
                this.generateInterface(sourceNode, targetDeclaration);
                break;
            case 'namespace':
                this.generateNamespace(sourceNode, targetDeclaration);
                break;
            case 'member':
                this.generateProperty(sourceNode, targetDeclaration);
                break;
            case 'typedef':
                if (sourceNode.doclet.parameters ||
                    sourceNode.doclet.return
                ) {
                    this.generateFunctionInterface(sourceNode, targetDeclaration);
                }
                else if (sourceNode.children &&
                    sourceNode.children.length > 0 &&
                    sourceNode.doclet.types &&
                    sourceNode.doclet.types[0] !== '*'
                ) {
                    this.generateInterface(sourceNode, targetDeclaration);
                }
                else {
                    this.generateType(sourceNode, targetDeclaration);
                }
                break;
        }
    }

    private generateChildren (
        nodeChildren: Array<parser.INode>,
        targetDeclaration: tsd.IDeclaration
    ) {

        nodeChildren.forEach(nodeChild =>
             this.generate(nodeChild, targetDeclaration)
        );
    }

    private generateClass (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.ClassDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.ClassDeclaration(doclet.name);

        if (doclet.isGlobal) {
            targetDeclaration = this.moduleGlobal;
        }
        else if (this.isMainModule &&
            targetDeclaration.kind !== 'namespace'
        ) {
            targetDeclaration = this.namespace;
        }

        let existingChild = targetDeclaration.getChildren(declaration.name)[0];

        if (existingChild &&
            existingChild.kind === 'class'
        ) {
            declaration = existingChild as tsd.ClassDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            let mergedTypes = utils.uniqueArray(
                declaration.types, doclet.types.filter(type => type !== 'any')
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateConstructor (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.ConstructorDeclaration {

        let declaration = new tsd.ConstructorDeclaration(),
            doclet = Generator.getNormalizedDoclet(sourceNode);

        if (doclet.description) {
            declaration.description = doclet.description;
        }
        else {
            (targetDeclaration.getChildren(declaration.name) || []).some(
                existingChild => {
                    if (existingChild.description &&
                        existingChild.kind === 'constructor'
                    ) {
                        declaration.description = existingChild.description;
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            );
        }

        if (doclet.events) {
            declaration.addChildren(...this.generateEvents(doclet.events));
        }

        if (doclet.fires) {
            declaration.events.push(...doclet.fires);
        }

        if (doclet.isPrivate) {
            declaration.isPrivate = true;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.parameters) {

            let parameterDeclarations = this.generateParameters(
                doclet.parameters
            );

            if (parameterDeclarations.length > 1 &&
                parameterDeclarations[0].isOptional &&
                !parameterDeclarations[1].isOptional
            ) {
                let overloadedDeclaration = declaration.clone(),
                    overloadedParameterDeclarations = parameterDeclarations.map(
                        parameterDeclaration => parameterDeclaration.clone()
                    );

                overloadedParameterDeclarations.shift();
                overloadedDeclaration.setParameters(
                    ...overloadedParameterDeclarations
                );
                targetDeclaration.addChildren(overloadedDeclaration);

                parameterDeclarations[0].isOptional = false;
                declaration.setParameters(
                    ...parameterDeclarations
                );
            }
            else {
                declaration.setParameters(
                    ...parameterDeclarations
                );
            }
        }

        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateEvents (
        events: utils.Dictionary<parser.IEvent>
    ): Array<tsd.EventDeclaration> {

        let declaration;

        return Object
            .keys(events)
            .map(eventName => {

                declaration = new tsd.EventDeclaration(eventName);

                declaration.description = events[eventName].description;
                declaration.types.push(
                    ...events[eventName].types.map(config.mapType)
                );

                return declaration;
            });
    }

    private generateExternal (
        sourceNode: parser.INode
    ): tsd.InterfaceDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.InterfaceDeclaration(doclet.name),
            globalDeclaration = (
                this._moduleGlobal.getChildren('external:')[0] ||
                new tsd.NamespaceDeclaration('external:')
            );

        let existingChild = globalDeclaration.getChildren(declaration.name)[0];

        if (existingChild &&
            existingChild.kind === 'interface'
        ) {
            declaration = existingChild as tsd.InterfaceDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (!declaration.parent) {
            globalDeclaration.addChildren(declaration);
        }

        if (!globalDeclaration.parent) {
            this._moduleGlobal.addChildren(globalDeclaration);
        }

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateFunction (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.FunctionDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.FunctionDeclaration(doclet.name);

        if (doclet.isGlobal) {
            targetDeclaration = this.moduleGlobal;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }
        else {
            (targetDeclaration.getChildren(declaration.name) || []).some(
                existingChild => {
                    if (existingChild.description &&
                        ((!doclet.isStatic &&
                        existingChild.kind === 'function') ||
                        (doclet.isStatic &&
                        existingChild.kind === 'static function'))
                    ) {
                        declaration.description = existingChild.description;
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            );
        }

        if (doclet.events) {
            declaration.addChildren(...this.generateEvents(doclet.events));
        }

        if (doclet.fires) {
            declaration.events.push(...doclet.fires);
        }

        if (doclet.isPrivate) {
            declaration.isPrivate = true;
        }

        if (doclet.isStatic) {
            declaration.isStatic = true;
        }

        if (doclet.return) {
            if (doclet.return.description) {
                declaration.typesDescription = doclet.return.description;
            }
            if (doclet.return.types) {
                let mergedTypes = utils.uniqueArray(
                    declaration.types, doclet.return.types
                );
                declaration.types.length = 0;
                declaration.types.push(...mergedTypes);
            }
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.parameters) {

            let parameterDeclarations = this.generateParameters(
                doclet.parameters
            );

            if (parameterDeclarations.length > 1 &&
                parameterDeclarations[0].isOptional &&
                !parameterDeclarations[1].isOptional
            ) {
                let overloadedDeclaration = declaration.clone(),
                    overloadedParameterDeclarations = parameterDeclarations.map(
                        parameterDeclaration => parameterDeclaration.clone()
                    );

                overloadedParameterDeclarations.shift();
                overloadedDeclaration.setParameters(
                    ...overloadedParameterDeclarations
                );
                targetDeclaration.addChildren(overloadedDeclaration);

                parameterDeclarations[0].isOptional = false;
                declaration.setParameters(
                    ...parameterDeclarations
                );
            }
            else {
                declaration.setParameters(
                    ...parameterDeclarations
                );
            }
        }

        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateFunctionInterface (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.InterfaceDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.InterfaceDeclaration(doclet.name);

        if (doclet.isGlobal) {
            targetDeclaration = this.moduleGlobal;
        }
        else if ((this.isMainModule ||
            this.isOptionType(doclet.name)) &&
            targetDeclaration.kind !== 'namespace'
        ) {
            targetDeclaration = this.namespace;
        }

        let existingChild = targetDeclaration.getChildren(declaration.name)[0];

        if (existingChild &&
            existingChild.kind === 'interface'
        ) {
            declaration = existingChild as tsd.InterfaceDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            let mergedTypes = utils.uniqueArray(
                declaration.types,
                doclet.types.filter(type => type !== 'Function')
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        let functionDeclaration = new tsd.FunctionDeclaration('');

        existingChild = targetDeclaration.getChildren(
            functionDeclaration.name
        )[0];

        if (existingChild &&
            existingChild.kind === 'function'
        ) {
            functionDeclaration = existingChild as tsd.FunctionDeclaration;
        }

        if (doclet.description) {
            functionDeclaration.description = doclet.description;
        }

        if (doclet.parameters) {
            functionDeclaration.setParameters(
                ...this.generateParameters(doclet.parameters)
            );
        }

        if (doclet.return) {
            if (doclet.return.description) {
                functionDeclaration.typesDescription = (
                    doclet.return.description
                );
            }
            if (doclet.return.types) {
                let mergedTypes = utils.uniqueArray(
                    functionDeclaration.types,
                    doclet.return.types
                );
                functionDeclaration.types.length = 0;
                functionDeclaration.types.push(...mergedTypes);
            }
        }

        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }

        if (!functionDeclaration.parent) {
            declaration.addChildren(functionDeclaration);
        }

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateModuleGlobal (sourceNode: parser.INode): tsd.ModuleGlobalDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = this._moduleGlobal;

        if (this.isMainModule &&
            doclet.description
        ) {
            declaration.description = doclet.description;
        }

        if (!this._namespace.description) {
            this._namespace.description = declaration.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (this._moduleGlobal.hasChildren) {
            declaration.addChildren(...this._moduleGlobal.removeChildren());
        }

        this._moduleGlobal = declaration;

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateInterface (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.InterfaceDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.InterfaceDeclaration(doclet.name);

        if (doclet.isGlobal) {
            targetDeclaration = this.moduleGlobal;
        }
        else if ((this.isMainModule ||
            this.isOptionType(doclet.name)) &&
            targetDeclaration.kind !== 'namespace'
        ) {
            targetDeclaration = this.namespace;
        }

        let existingChild = targetDeclaration.getChildren(declaration.name)[0];

        if (existingChild &&
            existingChild.kind === 'interface'
        ) {
            declaration = existingChild as tsd.InterfaceDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            let mergedTypes = utils.uniqueArray(
                declaration.types, doclet.types.filter(type => type !== 'any')
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateNamespace (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.IDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration;

        if (doclet.name.endsWith(':')) {
            // creates a namespace if it is a special keyword
            declaration = new tsd.NamespaceDeclaration(doclet.name);
        }
        else if (this.isMainModule) {
            // create namespace in highcharts.js
            declaration = this.namespace;
        }
        else {
            // reference namespace of highcharts.js with module path
            declaration = (
                targetDeclaration.getChildren(
                    config.mainModules['highcharts']
                )[0] ||
                new tsd.ModuleDeclaration(utils.relative(
                    this.modulePath, config.mainModules['highcharts'], true
                ))
            );
        }

        if (doclet.isGlobal) {
            // add global declaration in the current module file scope
            targetDeclaration = this.moduleGlobal;
        }

        let existingChild = targetDeclaration.getChildren(declaration.name)[0];

        if (existingChild &&
            existingChild.kind === 'namespace'
        ) {
            declaration = existingChild as tsd.NamespaceDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateParameters (
        parameters: utils.Dictionary<parser.IParameter>
    ): Array<tsd.ParameterDeclaration> {

        let declaration = undefined as (tsd.ParameterDeclaration|undefined),
            parameter = undefined as (parser.IParameter|undefined);

        return Object
            .keys(parameters)
            .map(name => {

                declaration = new tsd.ParameterDeclaration(name);
                parameter = parameters[name];

                if (parameter.defaultValue) {
                    declaration.defaultValue = parameter.defaultValue;
                }

                if (parameter.description) {
                    declaration.description = parameter.description;
                }

                if (parameter.isVariable) {
                    declaration.isVariable = true;
                }
                else if (parameter.isOptional) {
                    declaration.isOptional = true;
                }

                if (parameter.types) {
                    declaration.types.push(...parameter.types);
                }

                return declaration;
            });
    }

    private generateProperty (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.PropertyDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.PropertyDeclaration(doclet.name);

        if (doclet.isGlobal) {
            targetDeclaration = this.moduleGlobal;
        }

        let existingChild = targetDeclaration.getChildren(declaration.name)[0];

        if (existingChild &&
            ((!doclet.isStatic &&
            existingChild.kind === 'property') ||
            (doclet.isStatic &&
            existingChild.kind === 'static property'))
        ) {
            declaration = existingChild as tsd.PropertyDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.isOptional) {
            declaration.isOptional = true;
        }

        if (doclet.isPrivate) {
            declaration.isPrivate = true;
        }

        if (doclet.isStatic) {
            declaration.isStatic = true;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            let mergedTypes = utils.uniqueArray(
                declaration.types, doclet.types
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }

        return declaration;
    }

    private generateType (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.TypeDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.TypeDeclaration(doclet.name);

        if (doclet.isGlobal) {
            // global helper types are always limited to the module scope
            targetDeclaration = this.moduleGlobal;
        }
        else if ((this.isMainModule ||
            this.isOptionType(doclet.name)) &&
            targetDeclaration.kind !== 'namespace'
        ) {
            targetDeclaration = this.namespace;
        }

        let existingChild = targetDeclaration.getChildren(declaration.name)[0];

        if (existingChild &&
            existingChild.kind === 'type'
        ) {
            declaration = existingChild as tsd.TypeDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            let mergedTypes = utils.uniqueArray(
                declaration.types, doclet.types
            );
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }

        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private isOptionType (name: string): boolean {

        if (!name.startsWith('Highcharts.')) {
            name = ('Highcharts.' + name);
        }

        if (this.optionTypes.indexOf(name) > -1) {
            return true;
        }
        else {
            return false;
        }
    }

    public toString (): string {

        return this.moduleGlobal.toString();
    }
}
