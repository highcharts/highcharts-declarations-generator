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



const API_BASE_URL = 'https://api.highcharts.com/';
const DECLARE_HIGHCHARTS_MODULE = /(declare module ")(.*highcharts)(" \{)/gm;
const IMPORT_HIGHCHARTS_MODULE = /(import \* as Highcharts from ")(.*highcharts)(";)/gm;
const NAME_LAST = /\.(\w+)$/gm;



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
            removedLinks = [] as Array<string>;

        description = utils.removeExamples(description);
        description = utils.removeLinks(description, removedLinks);
        description = utils.transformLists(description);

        doclet.description = description;

        let nameParts = (doclet.name || '').split('.');

        doclet.name = nameParts[nameParts.length - 1].trim();
        
        if (doclet.parameters) {

            let parameters = doclet.parameters,
                parameterDescription;

            Object
                .keys(parameters)
                .map(name => {

                    parameterDescription = parameters[name].description;

                    if (parameterDescription) {
                        parameters[name].description = utils.removeLinks(
                            parameterDescription, removedLinks
                        );
                    }
                });
        }

        if (doclet.return &&
            doclet.return.description
        ) {
            doclet.return.description = utils.removeLinks(
                doclet.return.description, removedLinks
            );
        }

        if (doclet.see) {
            removedLinks.push(...doclet.see);
            delete doclet.see;
        }

        if (doclet.types) {
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
                doclet.see = see;
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

            targetChild = targetDeclaration.getChild(sourceChild.name);

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
            case 'function':
                this.generateFunction(sourceNode, targetDeclaration);
                break;
            case 'global':
                this.generateGlobal(sourceNode);
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
        nodeChildren: utils.Dictionary<parser.INode>,
        targetDeclaration: tsd.IDeclaration
    ) {

        Object
            .keys(nodeChildren)
            .forEach(childName => this
                .generate(nodeChildren[childName], targetDeclaration)
            );
    }

    private generateClass (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.ClassDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.ClassDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.parameters) {
            declaration.setParameters(
                ...this.generateParameters(doclet.parameters)
            );
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

    private generateFunction (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.FunctionDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.FunctionDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
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

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.InterfaceDeclaration(doclet.name);

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

        let existingChild = targetDeclaration.getChild(declaration.name);

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
                this.modulePath, targetDeclaration
            );
        }

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.NamespaceDeclaration(doclet.name),
            child = targetDeclaration.getChild(doclet.name);

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

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.PropertyDeclaration(doclet.name);

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

    private generateSeeApiDocumentation (targetDeclaration: tsd.IDeclaration) {

        switch (targetDeclaration.kind) {
            default:
                return '';
            case 'global':
                return API_BASE_URL + 'highcharts/class-reference/';
            case 'class':
            case 'namespace':
                return (
                    API_BASE_URL +
                    'highcharts/class-reference/Highcharts.' +
                    targetDeclaration.fullname
                );
            case 'function':
            case 'property':
                return (
                    API_BASE_URL +
                    'highcharts/class-reference/' +
                    targetDeclaration.fullname.replace(NAME_LAST, '#.$1')
                )
            case 'interface':
                return (
                    API_BASE_URL +
                    'highcharts/options/'
                )
        }
    }

    private generateType (
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration
    ): tsd.TypeDeclaration {

        let doclet = Generator.getNormalizedDoclet(sourceNode),
            declaration = new tsd.TypeDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            declaration.types.push(...doclet.types);
        }

        let existingChild = targetDeclaration.getChild(declaration.name);

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
