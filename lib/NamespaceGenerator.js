"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const Config = require("./Config");
const TSD = require("./TypeScriptDeclarations");
const Utils = require("./Utilities");
function generate(modulesDictionary, optionsDeclarations) {
    const DECLARE_HIGHCHARTS_MODULE = /(declare module ")(.*highcharts)(" \{)/;
    const IMPORT_HIGHCHARTS_MODULE = (/(import \* as Highcharts from ")(.*highcharts)(";)/);
    // no product specific options tree for convenience
    let globalDtsFilePath = Config.mainModule.replace(/highcharts$/, 'globals.d.ts'), mainGlobalDeclarations = new TSD.ModuleGlobalDeclaration(), promises = [];
    Object
        .keys(modulesDictionary)
        .map(modulePath => {
        let generator = new Generator(modulePath, modulesDictionary[modulePath], mainGlobalDeclarations, optionsDeclarations);
        return {
            generator: generator,
            modulePath: modulePath
        };
    })
        .forEach(dts => {
        let dtsFileContent = dts.generator.toString(), dtsFilePath = dts.modulePath + '.d.ts';
        promises.push(Utils
            .save(dtsFilePath, dtsFileContent)
            .then(() => console.info('Saved', dtsFilePath)));
        let dtsSourceFileContent = dtsFileContent
            .replace(new RegExp(IMPORT_HIGHCHARTS_MODULE, 'gm'), '$1$2.src$3')
            .replace(new RegExp(DECLARE_HIGHCHARTS_MODULE, 'gm'), '$1$2.src$3'), dtsSourceFilePath = dts.modulePath + '.src.d.ts';
        promises.push(Utils
            .save(dtsSourceFilePath, dtsSourceFileContent)
            .then(() => console.info('Saved', dtsSourceFilePath)));
    });
    promises.push(Utils
        .save(globalDtsFilePath, mainGlobalDeclarations.toString())
        .then(() => console.info('Saved', globalDtsFilePath)));
    return Promise
        .all(promises)
        .then(() => undefined);
}
exports.generate = generate;
class Generator {
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
    constructor(modulePath, node, globalDeclarations, optionDeclarations) {
        this._globalNamespace = globalDeclarations;
        this._mainNamespace = optionDeclarations;
        this._modulePath = modulePath;
        if (this.isMainModule) {
            this._moduleGlobal = optionDeclarations;
            //this.moduleGlobal.addChildren(this.mainNamespace);
            this.moduleGlobal.imports.push(('import * as globals from "' + Utils.relative(modulePath, Config.mainModule.replace(/highcharts$/, 'globals'), true) + '";'));
            this.moduleGlobal.exports.push('export as namespace Highcharts;');
        }
        else {
            this._moduleGlobal = new TSD.ModuleGlobalDeclaration('Highcharts');
            let factoryDeclaration = new TSD.FunctionDeclaration('factory');
            factoryDeclaration.description = ('Adds the module to the imported Highcharts namespace.');
            let factoryParameterDeclaration = new TSD.ParameterDeclaration('highcharts');
            factoryParameterDeclaration.description = ('The imported Highcharts namespace to extend.');
            factoryParameterDeclaration.types.push('typeof Highcharts');
            factoryDeclaration.setParameters(factoryParameterDeclaration);
            this.moduleGlobal.imports.push(('import * as globals from "' + Utils.relative(modulePath, Config.mainModule.replace(/highcharts$/, 'globals'), true) + '";'), ('import * as Highcharts from "' + Utils.relative(modulePath, Config.mainModule, true) + '";'));
            this.moduleGlobal.addChildren(factoryDeclaration);
            this.moduleGlobal.exports.push('export default factory;');
        }
        this.generate(node);
    }
    /* *
     *
     *  Static Functions
     *
     * */
    static getNormalizedDoclet(sourceNode) {
        let doclet = Utils.clone(sourceNode.doclet || {
            description: '',
            kind: 'global',
            name: ''
        });
        let description = (doclet.description || '').trim(), namespaces = TSD.IDeclaration.namespaces(doclet.name || ''), removedLinks = [], values;
        description = Utils.removeExamples(description);
        description = Utils.removeLinks(description, removedLinks);
        description = Utils.transformLists(description);
        doclet.description = description;
        doclet.name = (namespaces[namespaces.length - 1] || '');
        if (doclet.parameters) {
            let parameters = doclet.parameters, parameterDescription;
            Object
                .keys(parameters)
                .map(name => {
                parameterDescription = parameters[name].description;
                if (parameterDescription) {
                    parameterDescription = Utils.removeLinks(parameterDescription, removedLinks);
                    parameterDescription = Utils.transformLists(parameterDescription);
                    parameters[name].description = parameterDescription;
                }
                parameters[name].types = (parameters[name].types || ['any']).map(type => Config.mapType(type));
            });
        }
        if (doclet.products) {
            let products = doclet.products
                .map(Utils.capitalize)
                .join(', ');
            doclet.description = '(' + products + ') ' + description;
        }
        if (doclet.return) {
            let returnDescription = doclet.return.description;
            if (returnDescription) {
                returnDescription = Utils.removeLinks(returnDescription, removedLinks);
                returnDescription = Utils.transformLists(returnDescription);
                doclet.return.description = returnDescription;
            }
            doclet.return.types = (doclet.return.types || ['any']).map(type => Config.mapType(type));
        }
        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }
        if (doclet.values) {
            try {
                values = Utils.json((doclet.values || ''), true);
            }
            catch (error) {
                console.error(error);
            }
        }
        if (values instanceof Array) {
            doclet.types = values.map(Config.mapValue);
        }
        else if (doclet.types) {
            doclet.types = doclet.types.map(type => Config.mapType(type, false));
            if (doclet.name[0] !== '[' &&
                doclet.types.length > 1 &&
                doclet.types.some(type => type === 'undefined')) {
                doclet.isOptional = true;
                doclet.types = doclet.types.filter(type => type !== 'undefined');
            }
        }
        else {
            doclet.types = ['any'];
        }
        if (removedLinks.length > 0) {
            let see = [];
            removedLinks.forEach(link => see.push(...Utils.urls(link)));
            if (see.length > 0) {
                doclet.see = [
                    Config.seeLink(namespaces.join('.'), doclet.kind)
                ];
            }
        }
        return doclet;
    }
    /* *
     *
     *  Properties
     *
     * */
    get globalNamespace() {
        return this._globalNamespace;
    }
    get isMainModule() {
        return (this.modulePath === Config.mainModule);
    }
    get mainNamespace() {
        return this._mainNamespace;
    }
    get moduleGlobal() {
        return this._moduleGlobal;
    }
    get modulePath() {
        return this._modulePath;
    }
    /* *
     *
     *  Functions
     *
     * */
    generate(sourceNode, targetDeclaration = this._moduleGlobal) {
        let kind = (sourceNode.doclet && sourceNode.doclet.kind || '');
        switch (kind) {
            default:
                console.error('Unknown kind: ' + kind, this.modulePath, sourceNode);
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
                    sourceNode.doclet.return) {
                    if (sourceNode.children &&
                        sourceNode.children.length > 0) {
                        this.generateFunctionInterface(sourceNode, targetDeclaration);
                    }
                    else {
                        this.generateFunctionType(sourceNode, targetDeclaration);
                    }
                }
                else if (sourceNode.children &&
                    sourceNode.children.length > 0 &&
                    sourceNode.doclet.types &&
                    sourceNode.doclet.types[0] !== '*') {
                    this.generateInterface(sourceNode, targetDeclaration);
                }
                else {
                    this.generateType(sourceNode, targetDeclaration);
                }
                break;
        }
    }
    generateChildren(nodeChildren, targetDeclaration) {
        nodeChildren.forEach(nodeChild => this.generate(nodeChild, targetDeclaration));
    }
    generateClass(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.ClassDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalNamespace;
        }
        else if (this.isMainModule &&
            targetDeclaration.kind !== this.mainNamespace.kind) {
            targetDeclaration = this.mainNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'class') {
            declaration = existingChild;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (doclet.types) {
            let mergedTypes = Utils.uniqueArray(declaration.types, doclet.types.filter(type => type !== type.toLowerCase()));
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
    generateConstructor(sourceNode, targetDeclaration) {
        let declaration = new TSD.ConstructorDeclaration(), doclet = Generator.getNormalizedDoclet(sourceNode);
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        else {
            (targetDeclaration.getChildren(declaration.name) || []).some(existingChild => {
                if (existingChild.description &&
                    existingChild.kind === 'constructor') {
                    declaration.description = existingChild.description;
                    return true;
                }
                else {
                    return false;
                }
            });
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
            let parameterDeclarations = this.generateParameters(doclet.parameters);
            if (parameterDeclarations.length > 1 &&
                parameterDeclarations[0].isOptional &&
                !parameterDeclarations[1].isOptional) {
                let overloadedDeclaration = declaration.clone(), overloadedParameterDeclarations = parameterDeclarations.map(parameterDeclaration => parameterDeclaration.clone());
                overloadedParameterDeclarations.shift();
                overloadedDeclaration.setParameters(...overloadedParameterDeclarations);
                targetDeclaration.addChildren(overloadedDeclaration);
                parameterDeclarations[0].isOptional = false;
                declaration.setParameters(...parameterDeclarations);
            }
            else {
                declaration.setParameters(...parameterDeclarations);
            }
        }
        targetDeclaration.addChildren(declaration);
        return declaration;
    }
    generateEvents(events) {
        let declaration;
        return Object
            .keys(events)
            .map(eventName => {
            declaration = new TSD.EventDeclaration(eventName);
            declaration.description = events[eventName].description;
            declaration.types.push(...events[eventName].types.map(type => Config.mapType(type)));
            return declaration;
        });
    }
    generateExternal(sourceNode) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.InterfaceDeclaration(doclet.name), globalDeclaration = (this._moduleGlobal.getChildren('external:')[0] ||
            new TSD.NamespaceDeclaration('external:'));
        let existingChild = globalDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'interface') {
            declaration = existingChild;
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
    generateFunction(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.FunctionDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalNamespace;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        else {
            (targetDeclaration.getChildren(declaration.name) || []).some(existingChild => {
                if (existingChild.description &&
                    ((!doclet.isStatic &&
                        existingChild.kind === 'function') ||
                        (doclet.isStatic &&
                            existingChild.kind === 'static function'))) {
                    declaration.description = existingChild.description;
                    return true;
                }
                else {
                    return false;
                }
            });
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
                let mergedTypes = Utils.uniqueArray(declaration.types, doclet.return.types);
                declaration.types.length = 0;
                declaration.types.push(...mergedTypes);
            }
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (doclet.parameters) {
            let parameterDeclarations = this.generateParameters(doclet.parameters);
            if (parameterDeclarations.length > 1 &&
                parameterDeclarations[0].isOptional &&
                !parameterDeclarations[1].isOptional) {
                let overloadedDeclaration = declaration.clone(), overloadedParameterDeclarations = parameterDeclarations.map(parameterDeclaration => parameterDeclaration.clone());
                overloadedParameterDeclarations.shift();
                overloadedDeclaration.setParameters(...overloadedParameterDeclarations);
                targetDeclaration.addChildren(overloadedDeclaration);
                parameterDeclarations[0].isOptional = false;
                declaration.setParameters(...parameterDeclarations);
            }
            else {
                declaration.setParameters(...parameterDeclarations);
            }
        }
        targetDeclaration.addChildren(declaration);
        return declaration;
    }
    generateFunctionType(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.FunctionTypeDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalNamespace;
        }
        else if ((this.isMainModule ||
            this.isOptionType(doclet.name)) &&
            targetDeclaration.kind !== this.mainNamespace.kind) {
            targetDeclaration = this.mainNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'type') {
            declaration = existingChild;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (doclet.parameters) {
            declaration.setParameters(...this.generateParameters(doclet.parameters));
        }
        if (doclet.return) {
            if (doclet.return.description) {
                declaration.typesDescription = doclet.return.description;
            }
            if (doclet.return.types) {
                let mergedTypes = Utils.uniqueArray(declaration.types, doclet.return.types);
                declaration.types.length = 0;
                declaration.types.push(...mergedTypes);
            }
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }
        return declaration;
    }
    generateFunctionInterface(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.InterfaceDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalNamespace;
        }
        else if ((this.isMainModule ||
            this.isOptionType(doclet.name)) &&
            targetDeclaration.kind !== this.mainNamespace.kind) {
            targetDeclaration = this.mainNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'interface') {
            declaration = existingChild;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        let functionDeclaration = new TSD.FunctionDeclaration('');
        existingChild = targetDeclaration.getChildren(functionDeclaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'function') {
            functionDeclaration = existingChild;
        }
        if (doclet.description) {
            functionDeclaration.description = doclet.description;
        }
        if (doclet.parameters) {
            functionDeclaration.setParameters(...this.generateParameters(doclet.parameters));
        }
        if (doclet.return) {
            if (doclet.return.description) {
                functionDeclaration.typesDescription = (doclet.return.description);
            }
            if (doclet.return.types) {
                let mergedTypes = Utils.uniqueArray(functionDeclaration.types, doclet.return.types);
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
    generateInterface(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.InterfaceDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalNamespace;
        }
        else if ((this.isMainModule ||
            this.isOptionType(doclet.name)) &&
            targetDeclaration.kind !== this.mainNamespace.kind) {
            targetDeclaration = this.mainNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'interface') {
            declaration = existingChild;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (doclet.types) {
            let mergedTypes = Utils.uniqueArray(declaration.types, doclet.types.filter(type => type !== type.toLowerCase()));
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
    generateModule(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), 
        // reference namespace of highcharts.js with module path
        declaration = new TSD.ModuleDeclaration(Utils.relative(this.modulePath, Config.mainModule, true));
        if (doclet.isGlobal) {
            // add global declaration in the current module file scope
            targetDeclaration = this.moduleGlobal;
        }
        let existingChild = targetDeclaration.getChildren(Config.mainModule)[0];
        if (existingChild &&
            existingChild.kind === 'module') {
            declaration = existingChild;
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
    generateModuleGlobal(sourceNode) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = this._moduleGlobal;
        if (this.isMainModule &&
            doclet.description) {
            declaration.description = doclet.description;
        }
        if (!this._mainNamespace.description) {
            this._mainNamespace.description = declaration.description;
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
    generateNamespace(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration;
        if (doclet.name.endsWith(':')) {
            // creates a namespace if it is a special keyword
            declaration = new TSD.NamespaceDeclaration(doclet.name);
        }
        else if (this.isMainModule) {
            // use main namespace in highcharts.js
            declaration = this.mainNamespace;
            if (declaration === this.mainNamespace) {
                if (sourceNode.children) {
                    this.generateChildren(sourceNode.children, declaration);
                }
                return declaration;
            }
        }
        else {
            return this.generateModule(sourceNode, targetDeclaration);
        }
        if (doclet.isGlobal) {
            // add global declaration in the current module file scope
            targetDeclaration = this.moduleGlobal;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'namespace') {
            declaration = existingChild;
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
    generateParameters(parameters) {
        let declaration = undefined, parameter = undefined;
        return Object
            .keys(parameters)
            .map(name => {
            declaration = new TSD.ParameterDeclaration(name);
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
    generateProperty(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.PropertyDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            ((!doclet.isStatic &&
                existingChild.kind === 'property') ||
                (doclet.isStatic &&
                    existingChild.kind === 'static property'))) {
            declaration = existingChild;
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
            let mergedTypes = Utils.uniqueArray(declaration.types, doclet.types);
            declaration.types.length = 0;
            declaration.types.push(...mergedTypes);
        }
        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
        }
        return declaration;
    }
    generateType(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.TypeDeclaration(doclet.name);
        if (doclet.isGlobal) {
            // global helper types are always limited to the module scope
            targetDeclaration = this.globalNamespace;
        }
        else if ((this.isMainModule ||
            this.isOptionType(doclet.name)) &&
            targetDeclaration.kind !== this.mainNamespace.kind) {
            targetDeclaration = this.mainNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild &&
            existingChild.kind === 'type') {
            declaration = existingChild;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (doclet.types) {
            let mergedTypes = Utils.uniqueArray(declaration.types, doclet.types.filter(type => !sourceNode.children ||
                type !== type.toLowerCase()));
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
    isOptionType(name, baseDeclaration = this.mainNamespace) {
        if (!name.startsWith('Highcharts.')) {
            name = ('Highcharts.' + name);
        }
        if (!Generator.OPTION_TYPE.test(name)) {
            return false;
        }
        let isOptionType = TSD.IDeclaration
            .extractTypeNames(...baseDeclaration.types)
            .filter(type => !Utils.isCoreType(type))
            .some(type => (type === name));
        if (!isOptionType &&
            baseDeclaration instanceof TSD.IExtendedDeclaration) {
            isOptionType = baseDeclaration
                .getParameters()
                .map(param => TSD.IDeclaration.extractTypeNames(...param.types))
                .some(types => types.indexOf(name) > -1);
        }
        if (!isOptionType) {
            isOptionType = baseDeclaration
                .getChildren()
                .some(child => this.isOptionType(name, child));
        }
        ;
        return isOptionType;
    }
    toString() {
        return this.moduleGlobal.toString();
    }
}
/* *
 *
 *  Static Properties
 *
 * */
Generator.OPTION_TYPE = (/^Highcharts.\w+(?:CallbackFunction|Object|Options)$/);
//# sourceMappingURL=NamespaceGenerator.js.map