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
    optionsDeclaration: tsd.NamespaceDeclaration
): Promise<void> {

    let promises = [] as Array<Promise<void>>;

    Object
        .keys(modulesDictionary)
        .forEach(modulePath => {

            let generator = new Generator(
                modulePath,
                modulesDictionary[modulePath],
                optionsDeclaration
            );

            let dts = generator.toString(),
                dtsFilePath = modulePath + '.d.ts';

            promises.push(
                utils
                    .save(dtsFilePath, dts)
                    .then(() => console.log('Saved ' + dtsFilePath))
            );

            let dtsSource = dts
                    .replace(IMPORT_HIGHCHARTS_MODULE, '$1$2.src$3')
                    .replace(DECLARE_HIGHCHARTS_MODULE, '$1$2.src$3'),
                dtsSourceFilePath = modulePath + '.src.d.ts';

            promises.push(
                utils
                    .save(dtsSourceFilePath, dtsSource)
                    .then(() => console.log('Saved ' + dtsSourceFilePath))
            );
        })

    return Promise
        .all(promises)
        .then(() => undefined);
}



const DECLARE_HIGHCHARTS_MODULE = /(declare module ")(.*highcharts)(" \{)/gm;
const IMPORT_HIGHCHARTS_MODULE = /(import \* as Highcharts from ")(.*highcharts)(";)/gm;



class Generator extends Object {

    /* *
     *
     *  Static Functions
     *
     * */

    private static getNormalizedDoclet(sourceNode: parser.INode): parser.IDoclet {

        let doclet = (sourceNode.doclet || {
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
        doclet.name = namespaces[namespaces.length - 1];
        
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

        let sourceChildren = sourceDeclaration.getChildren(),
            targetChild = undefined as (tsd.IDeclaration|undefined),
            targetChildrenNames = targetDeclaration.getChildrenNames();

        sourceChildren.forEach(sourceChild => {

            targetChild = targetDeclaration.getChild(sourceChild.name)[0];

            if (targetChild) {
                Generator.mergeDeclarations(targetChild, sourceChild);
            } else {
                targetDeclaration.addChildren(sourceChild.clone());
            }
        });
    }

    /* *
     *
     *  Constructor
     *
     * */

    public constructor (
        modulePath: string,
        node: parser.INode,
        namespaceDeclaration: tsd.NamespaceDeclaration,
    ) {

        super();

        this._modulePath = modulePath;
        this._namespace = namespaceDeclaration;
        this._root = new tsd.GlobalDeclaration();

        if (modulePath === config.mainModule) {
            this.root.exports.push('export = Highcharts;');
            this.root.addChildren(this.namespace);
        } else {
            this.root.imports.push(
                'import * as Highcharts from "' +
                utils.relative(modulePath, config.mainModule, true) +
                '";'
            );
        }

        this.generate(node);
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

    public get modulePath(): string {
        return this._modulePath;
    }
    private _modulePath: string;

    public get root(): tsd.GlobalDeclaration {
        return this._root;
    }
    private _root: tsd.GlobalDeclaration;

    /* *
     *
     *  Functions
     *
     * */

    private generate (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration = this._root
    ) {

        let kind = (sourceNode.doclet && sourceNode.doclet.kind || '');

        switch (kind) {
            default:
                console.error(
                    'Unknown kind: ' + kind,
                    sourceNode
                );
                break;
            case 'class':
                this.generateClass(sourceNode, targetDeclaration);
                break;
            case 'constructor':
                this.generateConstructor(sourceNode, targetDeclaration);
                break;
            case 'function':
                this.generateFunction(sourceNode, targetDeclaration);
                break;
            case 'global':
                this.generateGlobal(sourceNode);
                break;
            case 'interface':
                this.generateInterface(sourceNode, this.namespace);
                break;
            case 'namespace':
                this.generateNamespace(sourceNode, targetDeclaration);
                break;
            case 'member':
                this.generateProperty(sourceNode, targetDeclaration);
                break;
            case 'typedef':
                if (sourceNode.children) {
                    this.generateInterface(sourceNode, this.namespace);
                } else {
                    this.generateType(sourceNode, this.namespace);
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

        let doclet = Generator.getNormalizedDoclet(sourceNode);

        if (doclet.isGlobal) {
            targetDeclaration = this._root;
        }

        let declaration = new tsd.ClassDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            declaration.types.push(
                ...doclet.types.filter(type => type !== 'any')
            );
        }

        targetDeclaration.addChildren(declaration);

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
/*
        if (doclet.events) {
            declaration.addChildren(...this.generateEvents(doclet.events));
        }
 */
        if (doclet.fires) {
            declaration.events.push(...doclet.fires);
        }

        if (doclet.isPrivate) {
            declaration.isPrivate = true;
        }

        if (doclet.parameters) {
            declaration.setParameters(
                ...this.generateParameters(doclet.parameters)
            );
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
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

    private generateFunction (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.FunctionDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode);

        if (doclet.isGlobal) {
            targetDeclaration = this._root;
        }

        let declaration = new tsd.FunctionDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
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

        if (doclet.parameters) {
            declaration.setParameters(
                ...this.generateParameters(doclet.parameters)
            );
        }

        if (doclet.return) {
            if (doclet.return.description) {
                declaration.typesDescription = doclet.return.description;
            }
            if (doclet.return.types) {
                declaration.types.push(...doclet.return.types);
            }
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateGlobal (sourceNode: parser.INode): tsd.GlobalDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = this._root;
        
        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (!this._namespace.description) {
            this._namespace.description = declaration.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (this._root.hasChildren) {
            declaration.addChildren(...this._root.removeChildren());
        }

        this._root = declaration;

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateInterface (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.InterfaceDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode);

        if (doclet.isGlobal) {
            targetDeclaration = this._root;
        }

        let declaration = new tsd.InterfaceDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            declaration.types.push(
                ...doclet.types.filter(type => type !== 'any')
            );
        }

        let existingChild = targetDeclaration.getChild(declaration.name)[0];

        if (existingChild) {
            Generator.mergeDeclarations(existingChild, declaration);
        } else {
            targetDeclaration.addChildren(declaration);
        }

        if (sourceNode.children) {
            this.generateChildren(sourceNode.children, declaration);
        }

        return declaration;
    }

    private generateModule (
        modulePath: string,
        targetDeclaration: tsd.IDeclaration
    ): tsd.ModuleDeclaration {

        let declaration = new tsd.ModuleDeclaration(
            utils.relative(modulePath, config.mainModule, true)
        );
        
        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateNamespace (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.NamespaceDeclaration {

        if (this.modulePath !== config.mainModule) {
            targetDeclaration = this.generateModule(
                this.modulePath, this._root
            );
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.NamespaceDeclaration(doclet.name);

        if (doclet.isGlobal) {
            targetDeclaration = this._root;
        }

        let child = targetDeclaration.getChild(doclet.name)[0];

        if (child) {
            declaration = child as tsd.NamespaceDeclaration;
        }

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (!child) {
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

                if (parameter.isOptional) {
                    declaration.isOptional = true;
                }

                if (parameter.isVariable) {
                    declaration.isOptional = false;
                    declaration.isVariable = true;
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

        let doclet = Generator.getNormalizedDoclet(sourceNode);

        if (doclet.isGlobal) {
            targetDeclaration = this._root;
        }

        let declaration = new tsd.PropertyDeclaration(doclet.name);

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
            declaration.types.push(...doclet.types);
        }

        targetDeclaration.addChildren(declaration);

        return declaration;
    }

    private generateType (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.TypeDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode);

        if (doclet.isGlobal) {
            targetDeclaration = this._root;
        }

        let declaration = new tsd.TypeDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            declaration.types.push(...doclet.types);
        }

        let existingChild = targetDeclaration.getChild(declaration.name)[0];

        if (existingChild) {
            Generator.mergeDeclarations(existingChild, declaration);
        } else {
            targetDeclaration.addChildren(declaration);
        }

        return declaration;
    }

    public toString (): string {

        return this._root.toString();
    }
}
