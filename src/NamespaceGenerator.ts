/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as parser from './NamespaceParser';
import * as tsd from './TypeScriptDeclarations';
import * as utils from './Utilities';



export function saveIntoFiles(
    filesDictionary: utils.Dictionary<parser.INode>
): Promise<void> {

    let promises = [] as Array<Promise<void>>;

    Object
        .keys(filesDictionary)
        .forEach(filePath => {

            let dtsFilePath = utils.getDeclarationFilePath(filePath),
                generator = new Generator(filesDictionary[filePath]);

            promises.push(
                utils
                    .save(dtsFilePath, generator.toString())
                    .then(() => console.log('Saved ' + dtsFilePath))
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

    private static getDoclet(sourceNode: parser.INode): parser.IDoclet {

        let doclet = (sourceNode.doclet || {
            description: '',
            kind: 'global',
            name: ''
        });

        let description = (doclet.description || '').trim(),
            nameParts = (doclet.name || '').split('.');

        description = description.replace(
            /\{@link\W+([^\}\|]+)[\S\s]*\}/gm, '$1'
        );
        description = description.replace(
            /\s+\-\s+/gm, '\n\n- '
        );

        doclet.description = description;
        doclet.name = nameParts[nameParts.length - 1].trim();
        
        if (doclet.types) {
            doclet.types = doclet.types.map(utils.filterType);
        }

        return doclet;
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

    private _global: tsd.IDeclaration;

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

        console.log('Generate ' + kind + ' declaration for ' + name);

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
                childDeclaration = this.generateFunction(sourceNode);
                break;
            case 'global':
                this._global = this.generateGlobal(sourceNode);
                break;
            case 'member':
                //childDeclaration = this.generateMember(sourceNode);
                break;
            case 'namespace':
                childDeclaration = this.generateNamespace(sourceNode);
                break;
            case 'typedef':
                if (sourceNode.children) {
                    //childDeclaration = this.generateInterface(sourceNode);
                } else {
                    childDeclaration = this.generateTypeAlias(sourceNode);
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

        let doclet = Generator.getDoclet(node),
            declaration = new tsd.ClassDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.parameters) {
            declaration.setParameters(
                ...this.generateParameters(doclet.parameters)
            );
        }

        if (doclet.types) {
            declaration.types.push(...doclet.types);
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateFunction (node: parser.INode): tsd.FunctionDeclaration {

        let doclet = Generator.getDoclet(node),
            declaration = new tsd.FunctionDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.parameters) {
            declaration.setParameters(
                ...this.generateParameters(doclet.parameters)
            );
        }

        if (doclet.types) {
            declaration.types.push(...doclet.types);
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateGlobal (node: parser.INode): tsd.IDeclaration {

        let doclet = Generator.getDoclet(node),
            declaration = this._global;
        
        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateNamespace (node: parser.INode): tsd.IDeclaration {

        let doclet = Generator.getDoclet(node),
            declaration = new tsd.NamespaceDeclaration(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
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

                if (parameter.description) {
                    declaration.description = parameter.description;
                }

                if (parameter.types) {
                    declaration.types.push(...parameter.types);
                }

                return declaration;
            });
    }

    private generateTypeAlias (node: parser.INode): tsd.IDeclaration {

        let doclet = Generator.getDoclet(node),
            declaration = new tsd.TypeAlias(doclet.name);

        if (doclet.description) {
            declaration.description = doclet.description;
        }

        if (doclet.types) {
            declaration.types.push(...doclet.types);
        }

        return declaration;
    }

    public toString(): string {

        return this._global.toString();
    }
}
