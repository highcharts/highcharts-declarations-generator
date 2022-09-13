"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.save = exports.generate = void 0;
const Config = require("./Config");
const TSD = require("./TypeScriptDeclarations");
const Utils = require("./Utilities");
/* *
 *
 *  Constants
 *
 * */
const COPYRIGHT_HEADER = 'Copyright (c) Highsoft AS. All rights reserved.';
/* *
 *
 *  Functions
 *
 * */
function generate(moduleNodes, optionDeclarations) {
    return new Promise(resolve => {
        const declarationModules = {};
        const globalsNamespace = new TSD.ModuleDeclaration('globals');
        const globalsModule = Utils.path(Utils.parent(Config.mainModule), 'globals');
        const referenceDictionary = Generator.referenceDictionary;
        if (Object.keys(referenceDictionary).length === 0) {
            optionDeclarations
                .getChildren()
                .forEach(child => referenceDictionary[TSD.IDeclaration.extractTypeNames(child.fullName)[0]] = [child]);
        }
        Object
            .keys(moduleNodes)
            .forEach(moduleNode => declarationModules[moduleNode] = new Generator(moduleNode, moduleNodes[moduleNode], globalsNamespace, optionDeclarations).moduleNamespace);
        declarationModules[globalsModule] = globalsNamespace;
        moveReferenceDeclarations(declarationModules[Config.mainModule], referenceDictionary);
        resolve(declarationModules);
    });
}
exports.generate = generate;
function moveReferenceDeclarations(mainNamespace, referenceDictionary) {
    const _move = (declaration) => {
        const mainChildFullNames = mainNamespace.getChildrenNames(true);
        const mainFullName = mainNamespace.fullName;
        declaration
            .getReferencedTypes(true)
            .filter(type => !!referenceDictionary[type])
            .forEach(type => referenceDictionary[type]
            .filter(referenceDeclaration => referenceDeclaration.parent &&
            referenceDeclaration.parent !== mainNamespace &&
            referenceDeclaration.parent.fullName === mainFullName &&
            mainChildFullNames
                .indexOf(referenceDeclaration.fullName) === -1)
            .forEach(referenceDeclaration => {
            const referenceParent = referenceDeclaration.parent;
            if (!referenceParent) {
                return;
            }
            const mainDeclarationIDs = mainNamespace
                .getChildren(referenceDeclaration.name)
                .map(declaration => declaration.uniqueID);
            const referenceDeclarations = referenceParent
                .removeChild(referenceDeclaration.name)
                .filter(declaration => mainDeclarationIDs
                .indexOf(declaration.uniqueID) === -1);
            mainNamespace
                .addChildren(...referenceDeclarations);
            referenceDeclarations
                .forEach(_move);
        }));
    };
    mainNamespace
        .getChildren()
        .forEach(_move);
}
function save(declarationsModules) {
    const mainModuleRegExp = /(".*\/[A-z]+)(";|" {)/g;
    return new Promise((resolve, reject) => {
        const savePromises = [];
        let declarations = '';
        let declarationsModule;
        Object
            .keys(declarationsModules)
            .forEach(module => {
            declarationsModule = declarationsModules[module];
            declarationsModule.copyright = COPYRIGHT_HEADER;
            declarations = declarationsModule.toString(undefined, Config.withoutDoclets);
            if (!declarations) {
                return;
            }
            savePromises.push(Utils.save((module + '.d.ts'), declarations));
            savePromises.push(Utils.save((module + '.src.d.ts'), declarations.replace(mainModuleRegExp, '$1.src$2')));
        });
        Promise
            .all(savePromises)
            .then(() => resolve())
            .catch(reject);
    });
}
exports.save = save;
/* *
 *
 *  Classes
 *
 * */
class Generator {
    /* *
     *
     *  Constructor
     *
     * */
    constructor(modulePath, moduleNode, globalsNamespace, optionsNamespace) {
        this._globalsNamespace = globalsNamespace;
        this._mainNamespace = optionsNamespace;
        this._modulePath = modulePath;
        if (this.modulePath === Config.mainModule) {
            this._isMainModule = true;
            this._moduleNamespace = this._mainNamespace;
            this.moduleNamespace.imports.push(('import * as globals from "' + Utils.relative(modulePath, Config.mainModule.replace(/highcharts$/, 'globals'), true) + '";'));
            this.moduleNamespace.exports.push('export as namespace Highcharts;');
        }
        else {
            this._isMainModule = false;
            this._moduleNamespace = new TSD.ModuleDeclaration();
            let factoryDeclaration = new TSD.FunctionDeclaration('factory');
            factoryDeclaration.description = ('Adds the module to the imported Highcharts namespace.');
            let factoryParameterDeclaration = new TSD.ParameterDeclaration('highcharts');
            factoryParameterDeclaration.description = ('The imported Highcharts namespace to extend.');
            factoryParameterDeclaration.types.push('typeof Highcharts');
            factoryDeclaration.setParameters(factoryParameterDeclaration);
            this.moduleNamespace.imports.push(('import * as globals from "' + Utils.relative(modulePath, Config.mainModule.replace(/highcharts$/, 'globals'), true) + '";'), ('import * as _Highcharts from "' + Utils.relative(modulePath, Config.mainModule, true) + '";'));
            this.moduleNamespace.addChildren(factoryDeclaration);
            this.moduleNamespace.exports.push('export default factory;');
            this.moduleNamespace.exports.push('export let Highcharts: typeof _Highcharts;');
        }
        this.generate(moduleNode);
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
        doclet.types = Utils.uniqueArray(doclet.types);
        if (!Config.withoutLinks && removedLinks.length > 0) {
            let see = [];
            removedLinks.forEach(link => see.push(...Utils.urls(link)));
            if (see.length > 0) {
                doclet.see = Utils.uniqueArray([
                    Config.seeLink(namespaces.join('.'), doclet.kind)
                ]);
            }
        }
        return doclet;
    }
    /* *
     *
     *  Properties
     *
     * */
    get globalsNamespace() {
        return this._globalsNamespace;
    }
    get isMainModule() {
        return this._isMainModule;
    }
    get mainNamespace() {
        return this._mainNamespace;
    }
    get moduleNamespace() {
        return this._moduleNamespace;
    }
    get modulePath() {
        return this._modulePath;
    }
    /* *
     *
     *  Functions
     *
     * */
    generate(sourceNode, targetDeclaration = this._moduleNamespace) {
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
                this.generateModule(sourceNode);
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
            targetDeclaration = this.globalsNamespace;
        }
        else if (this.isMainModule &&
            targetDeclaration.kind !== this.mainNamespace.kind) {
            targetDeclaration = this.mainNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.ClassDeclaration) {
            declaration = existingChild;
        }
        else if (!(existingChild instanceof TSD.InterfaceDeclaration) &&
            this.isDeclaredSomewhere(targetDeclaration, declaration)) {
            return;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
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
            this.setDeclared(declaration);
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
                    existingChild instanceof TSD.ConstructorDeclaration) {
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
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
        }
        targetDeclaration.addChildren(declaration);
        this.setDeclared(declaration);
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
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.InterfaceDeclaration(doclet.name), globalDeclaration = (this._moduleNamespace.getChildren('external:')[0] ||
            new TSD.NamespaceDeclaration('external:'));
        if (!globalDeclaration.parent) {
            this._moduleNamespace.addChildren(globalDeclaration);
        }
        let existingChild = globalDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.InterfaceDeclaration) {
            declaration = existingChild;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (!declaration.parent) {
            globalDeclaration.addChildren(declaration);
            this.setDeclared(declaration);
        }
        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }
        return declaration;
    }
    generateExternalModule(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), 
        // reference namespace of highcharts.js with module path
        declaration = new TSD.ExternalModuleDeclaration(this._mainNamespace.name, Utils.relative(this.modulePath, Config.mainModule, true));
        if (doclet.isGlobal) {
            // add global declaration in the current module file scope
            targetDeclaration = this.moduleNamespace;
        }
        let existingChild = targetDeclaration.getChildren(Config.mainModule)[0];
        if (existingChild instanceof TSD.ExternalModuleDeclaration) {
            declaration = existingChild;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
            this.setDeclared(declaration);
        }
        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }
        return declaration;
    }
    generateFunction(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.FunctionDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalsNamespace;
        }
        if (typeof doclet.deprecated === 'string') {
            declaration.deprecated = doclet.deprecated;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        else {
            (targetDeclaration.getChildren(declaration.name) || []).some(existingChild => {
                if (existingChild instanceof TSD.FunctionDeclaration &&
                    existingChild.description &&
                    existingChild.isStatic === doclet.isStatic) {
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
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
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
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        targetDeclaration.addChildren(declaration);
        this.setDeclared(declaration);
        return declaration;
    }
    generateFunctionInterface(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.InterfaceDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalsNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.InterfaceDeclaration) {
            declaration = existingChild;
        }
        if (doclet.description &&
            !this.isDeclaredSomewhere(targetDeclaration, declaration)) {
            declaration.description = doclet.description;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
            this.setDeclared(declaration);
        }
        let functionDeclaration = new TSD.FunctionDeclaration('');
        existingChild = targetDeclaration.getChildren(functionDeclaration.name)[0];
        if (existingChild instanceof TSD.FunctionDeclaration) {
            functionDeclaration = existingChild;
        }
        if (doclet.description &&
            !this.isDeclaredSomewhere(targetDeclaration, declaration)) {
            functionDeclaration.description = doclet.description;
        }
        if (doclet.parameters &&
            !functionDeclaration.hasParameters) {
            functionDeclaration.setParameters(...this.generateParameters(doclet.parameters));
        }
        if (doclet.randomID &&
            !functionDeclaration.uniqueID) {
            functionDeclaration.uniqueID = doclet.randomID;
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
        if (!functionDeclaration.parent) {
            declaration.addChildren(functionDeclaration);
            this.setDeclared(functionDeclaration);
        }
        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }
        return declaration;
    }
    generateFunctionType(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.FunctionTypeDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalsNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.FunctionTypeDeclaration) {
            declaration = existingChild;
        }
        else if (this.isDeclaredSomewhere(targetDeclaration, declaration)) {
            return;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (doclet.parameters &&
            !declaration.hasParameters) {
            declaration.setParameters(...this.generateParameters(doclet.parameters));
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
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
            this.setDeclared(declaration);
        }
        return declaration;
    }
    generateInterface(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.InterfaceDeclaration(doclet.name);
        if (doclet.isGlobal) {
            targetDeclaration = this.globalsNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.InterfaceDeclaration) {
            declaration = existingChild;
        }
        if (doclet.description &&
            !this.isDeclaredSomewhere(targetDeclaration, declaration)) {
            declaration.description = doclet.description;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
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
            this.setDeclared(declaration);
        }
        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }
        return declaration;
    }
    generateModule(sourceNode) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = this._moduleNamespace;
        if (!this._mainNamespace.description) {
            this._mainNamespace.description = declaration.description;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (this._moduleNamespace.hasChildren) {
            declaration.addChildren(...this._moduleNamespace.removeChildren());
        }
        this._moduleNamespace = declaration;
        this.setDeclared(declaration);
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
            return this.generateExternalModule(sourceNode, targetDeclaration);
        }
        if (doclet.isGlobal) {
            // add global declaration in the current module file scope
            targetDeclaration = this.moduleNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.NamespaceDeclaration) {
            declaration = existingChild;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
        }
        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }
        if (!declaration.parent) {
            targetDeclaration.addChildren(declaration);
            this.setDeclared(declaration);
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
            targetDeclaration = this.globalsNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.PropertyDeclaration) {
            declaration = existingChild;
        }
        if (doclet.description &&
            !this.isDeclaredSomewhere(targetDeclaration, declaration)) {
            declaration.description = doclet.description;
        }
        if (doclet.isOptional) {
            declaration.isOptional = true;
        }
        if (doclet.isPrivate) {
            declaration.isPrivate = true;
        }
        if (doclet.isReadOnly) {
            declaration.isReadOnly = true;
        }
        if (doclet.isStatic) {
            declaration.isStatic = true;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
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
            this.setDeclared(declaration);
        }
        return declaration;
    }
    generateType(sourceNode, targetDeclaration) {
        let doclet = Generator.getNormalizedDoclet(sourceNode), declaration = new TSD.TypeDeclaration(doclet.name);
        if (doclet.isGlobal) {
            // global helper types are always limited to the main module scope
            targetDeclaration = this.globalsNamespace;
        }
        let existingChild = targetDeclaration.getChildren(declaration.name)[0];
        if (existingChild instanceof TSD.TypeDeclaration) {
            declaration = existingChild;
        }
        else if (this.isDeclaredSomewhere(targetDeclaration, declaration)) {
            return;
        }
        if (doclet.description) {
            declaration.description = doclet.description;
        }
        if (!declaration.uniqueID &&
            doclet.randomID) {
            declaration.uniqueID = doclet.randomID;
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
            this.setDeclared(declaration);
        }
        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }
        return declaration;
    }
    isDeclaredSomewhere(targetDeclaration, declaration, ...declarationKind) {
        const dictionary = Generator.referenceDictionary;
        const fullName = (TSD.IDeclaration.extractTypeNames(targetDeclaration.fullName + '.' + declaration.fullName)[0] ||
            '');
        if (declarationKind.length === 0) {
            return !!dictionary[fullName];
        }
        else {
            return declarationKind.some(kind => dictionary[fullName].some(declaration => declaration.kind === kind));
        }
    }
    setDeclared(declaration) {
        const dictionary = Generator.referenceDictionary;
        const fullName = (TSD.IDeclaration.extractTypeNames(declaration.fullName)[0] || '');
        if (!dictionary[fullName]) {
            dictionary[fullName] = [declaration];
        }
        else if (dictionary[fullName].every(reference => reference !== declaration)) {
            dictionary[fullName].push(declaration);
        }
    }
    toString() {
        return this.moduleNamespace.toString();
    }
}
/* *
 *
 *  Static Properties
 *
 * */
Generator.referenceDictionary = {};
//# sourceMappingURL=NamespaceGenerator.js.map