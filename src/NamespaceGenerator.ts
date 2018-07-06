/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as parser from './NamespaceParser';
import * as tsd from './TypeScriptDeclarations';
import * as utils from './Utilities';



export function saveIntoFiles(
    filesDictionary: utils.Dictionary<parser.INode>,
    optionsDeclarations: tsd.IDeclaration
): Promise<void> {

    let promises = [] as Array<Promise<void>>;

    Object
        .keys(filesDictionary)
        .forEach(filePath => {

            let fileBase = utils.base(filePath),
                dtsFilePath = fileBase + '.d.ts',
                dtsSourceFilePath = fileBase + '.src.d.ts',
                generator = new Generator(filesDictionary[filePath]),
                namespace = generator.global.getChild('Highcharts');

            if (namespace) {
                Generator.mergeDeclaration(namespace, optionsDeclarations);
            }

            promises.push(
                utils
                    .save(dtsFilePath, generator.toString())
                    .then(() => console.log('Saved ' + dtsFilePath))
                    .then(() => utils.copy(dtsFilePath, dtsSourceFilePath))
                    .then(() => console.log('Saved ' + dtsSourceFilePath))
            );
        })

    return Promise
        .all(promises)
        .then(() => undefined);
}



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
            doclet.types = doclet.types.map(utils.mapType);
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

    public static mergeDeclaration(
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
                Generator.mergeDeclaration(targetChild, sourceChild);
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

    public constructor (node: parser.INode) {

        super();

        this._global = new tsd.GlobalDeclaration();

        this.generate(node);
    }

    /* *
     *
     *  Properties
     *
     * */

    public get global(): tsd.GlobalDeclaration {
        return this._global;
    }
    private _global: tsd.GlobalDeclaration;

    /* *
     *
     *  Functions
     *
     * */

    private generate(
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration = this._global
    ) {

        let childDeclaration = undefined as (tsd.IDeclaration|undefined),
            kind = (sourceNode.doclet && sourceNode.doclet.kind || ''),
            name = (sourceNode.doclet && sourceNode.doclet.name || '');

        switch (kind) {
            default:
                console.error(
                    'Unknown kind: ' + kind,
                    sourceNode
                );
                break;
            case 'class':
                childDeclaration = this.generateClass(sourceNode);
                break;
            case 'function':
                if (sourceNode.children) {
                    childDeclaration = this.generateInterface(sourceNode);
                    childDeclaration.addChildren(
                        new tsd.PropertyDeclaration('()')
                    );
                } else {
                    childDeclaration = this.generateFunction(sourceNode);
                }
                break;
            case 'global':
                this._global = this.generateGlobal(sourceNode);
                break;
            case 'namespace':
                childDeclaration = this.generateNamespace(sourceNode);
                break;
            case 'member':
                childDeclaration = this.generateProperty(sourceNode);
                break;
            case 'typedef':
                if (sourceNode.children) {
                    childDeclaration = this.generateInterface(sourceNode);
                } else {
                    childDeclaration = this.generateType(sourceNode);
                }
                break;
        }

        if (childDeclaration) {
            targetDeclaration.addChildren(childDeclaration);
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

    private generateClass (node: parser.INode): tsd.ClassDeclaration {

        let doclet = Generator.getNormalizedDoclet(node),
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
            declaration.types.push(...doclet.types
                .map(utils.mapType)
                .filter(type => type !== 'object')
            );
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateFunction (node: parser.INode): tsd.FunctionDeclaration {

        let doclet = Generator.getNormalizedDoclet(node),
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
                declaration.types.push(
                    ...doclet.return.types.map(utils.mapType)
                );
            }
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateGlobal (node: parser.INode): tsd.GlobalDeclaration {

        let doclet = Generator.getNormalizedDoclet(node),
            declaration = this._global;
        
        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateInterface (node: parser.INode): tsd.InterfaceDeclaration {

        let doclet = Generator.getNormalizedDoclet(node),
            declaration = new tsd.InterfaceDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            declaration.types.push(...doclet.types
                .map(utils.mapType)
                .filter(type => type !== 'object')
            );
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateNamespace (node: parser.INode): tsd.NamespaceDeclaration {

        let doclet = Generator.getNormalizedDoclet(node),
            declaration = new tsd.NamespaceDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
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
                    declaration.types.push(...parameter.types.map(utils.mapType));
                }

                return declaration;
            });
    }

    private generateProperty (node: parser.INode): tsd.PropertyDeclaration {

        let doclet = Generator.getNormalizedDoclet(node),
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
            declaration.types.push(...doclet.types.map(utils.mapType));
        }

        return declaration;
    }

    private generateType (node: parser.INode): tsd.TypeDeclaration {

        let doclet = Generator.getNormalizedDoclet(node),
            declaration = new tsd.TypeDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.see) {
            declaration.see.push(...doclet.see);
        }

        if (doclet.types) {
            declaration.types.push(...doclet.types.map(utils.mapType));
        }

        return declaration;
    }

    public toString(): string {

        return this._global.toString();
    }
}
