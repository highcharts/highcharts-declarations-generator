/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './Utilities';
import { ENGINE_METHOD_PKEY_ASN1_METHS } from 'constants';



type Kinds = (
    'global' |
    'namespace' |
    'type' |
    'interface' |
    'class' |
    'constant' |
    'static property' |
    'static function' |
    'constructor' |
    'property' |
    'function' |
    'parameter'
);



const KIND_ORDER = [
    'global',
    'namespace',
    'type',
    'interface',
    'class',
    'constant',
    'static property',
    'static function',
    'constructor',
    'property',
    'function',
    'parameter'
] as Array<Kinds>;



/**
 * Base class for TypeScript declarations.
 * 
 * @extends Object
 */
export abstract class IDeclaration extends Object {

    /* *
     *
     *  Static Properties
     *
     * */

    private readonly _kindOrder = [
    ];

    /* *
     *
     *  Static Functions
     * 
     * */

    /**
     * Simplifies full qualified names.
     * 
     * @param {string} name
     * The name to simplify.
     * 
     * @return {string}
     * The simplified name.
     */
    protected static simplifyName(name: string): string {

        let nameParts = name.split('.');

        return nameParts[nameParts.length-1];
    }

    /* *
    *
    *  Constructor
    * 
    * */

    /**
     * Initiates a new TypeScript declaration.
     * 
     * @param {string} name
     * The name of the declaration.
     */
    public constructor (name: string) {
        super();

        this._name = IDeclaration.simplifyName(name);
        this._fullname = name;

        this._children = {};
        this._description = '';
        this._isPrivate = false;
        this._isStatic = false;
        this._parent = undefined;
        this._types = [];
    }

    /* *
    *
    *  Properties
    * 
    * */

    private _children: utils.Dictionary<IDeclaration>;

    /**
     * Description of this declaration.
     */
    public get description(): string {
        return this._description;
    }
    public set description(value: string) {
        this._description = value;
    }
    private _description: string;

    /**
     * Name of this declaration.
     */
    public get name(): string {
        return this._name;
    }
    private _name: string;

    /**
     * Full qualifierd name of this declaration.
     */
    public get fullname(): string {
        return this._fullname;
    }
    private _fullname: string;

    /**
     * Visibility of this TypeScript declaration.
     */
    public get isPrivate(): boolean {
        return this._isPrivate;
    }
    public set isPrivate(value: boolean) {
        this._isPrivate = value;
    }
    private _isPrivate: boolean;

    /**
     * Instantiation of this TypeScript declaration.
     */
    public get isStatic(): boolean {
        return this._isStatic;
    }
    public set isStatic(value: boolean) {
        this._isStatic = value;
    }
    private _isStatic: boolean;

    /**
     * Kind of declaration.
     */
    abstract kind: Kinds;

    /**
     * Parent declaration of this declaration.
     */
    public get parent(): (IDeclaration | undefined) {
        return this._parent;
    }
    private _parent: (IDeclaration | undefined);

    /**
     * Types of this TypeScript declaration.
     */
    public get types(): Array<string> {
        return this._types;
    }
    private _types: Array<string>;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Add child declarations to this declaration.
     * 
     * @param {Array<IDeclaration>} declarations
     * The declarations to add.
     */
    public addChildren(...declarations: Array<IDeclaration>) {

        let children = this._children,
            name = '';

        declarations.forEach(declaration => {

            name = declaration.name;

            if (declaration.parent) {
                throw new Error(
                    'Declaration has already a parent.' +
                    ' (' + this.name + '.' + name + ')'
                );
            }

            if (children[name]) {
                throw new Error(
                    'Declaration with this name already added.' +
                    ' (' + this.name + '.' + name + ')'
                );
            }

            children[name] = declaration;
            declaration._parent = this;
        });
    }

    /**
     * Returns the named child declaration of this declaration, if founded.
     * 
     * @param {string} name
     * The name of the child declaration.
     */
    public getChild(name: string): (IDeclaration|undefined) {

        return this._children[name];
    }

    /**
     * Returns an array with the names of all child declarations.
     */
    public getChildrenNames(): Array<string> {

        let children = this._children;

        return Object
            .keys(children)
            .sort((name1, name2) => {

                let index1 = KIND_ORDER.indexOf(children[name1].kind),
                    index2 = KIND_ORDER.indexOf(children[name2].kind);
                

                if (index1 === index2) {
                    return (name1 < name2 ? -1 : 1);
                } else {
                    return (index1 - index2);
                }
            });
    }

    /**
     * Returns true, if the declaration contains child declarations.
     * 
     * @returns {boolean}
     * True, if child declarations exist
     */
    public hasChildren(): boolean {
        return (Object.keys(this._children).length > 0);
    }

    /**
     * Removes a child declaration from this declaration.
     *
     * @param {string} name
     * Name of the child declaration.
     * 
     * @returns {IDeclaration|undefined}
     * Declaration, if founded.
     */
    public removeChild(name: string): (IDeclaration|undefined) {

        let children = this._children,
            declaration = children[name];

        if (declaration) {
            delete children[name];
            declaration._parent = undefined;
        }

        return declaration;
    }

    /**
     * Returns the TypeScript declarations of all children as a joined string.
     *
     * @param {string} indent
     * The indentation string for formatting.
     *
     * @param {string} infix
     * The separation string between children.
     */
    protected renderChildren(indent: string = '', infix: string = ''): string {

        let children = this._children;

        return this
            .getChildrenNames()
            .map(name => children[name].toString(indent))
            .join(infix);
    }

    /**
     * Returns the comment lines for this TypeScript declaration.
     *
     * @param {string} indent 
     * The indentation string for formatting.
     */
    protected renderDescription(indent: string = ''): string {

        if (!this.description) {
            return '';
        }
        
        return (
            indent + '/**\n' +
            utils.pad(utils.normalize(this.description, true), (indent + ' * ')) +
            indent + ' *' + '/\n'
        );
    }

    /**
     * Returns the visibility string of this TypeScript declaration.
     */
    protected renderScopePrefix(): string {

        if (this.parent instanceof ClassDeclaration) {
            return (this.isPrivate ? 'private ' : 'public ');
        }

        if (this.parent instanceof GlobalDeclaration ||
            this.parent instanceof NamespaceDeclaration
        ) {
            return (this.isPrivate ? '' : 'export ');
        }

        return '';
    }

    /**
     * Returns the possible types of this TypeScript declaration.
     */
    protected renderTypes(): string {

        return this.types.sort().join('|');
    }

    /**
     * Returns the string of this TypeScript declaration.
     *
     * @param {string} indent
     * The indentation string for formatting.
     */
    public abstract toString(indent?: string): string;
}


/**
 * Extended class for TypeScript declarations with parameters and visibility.
 * 
 * @extends IDeclaration
 */
export abstract class IExtendedDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     * 
     * */

    public constructor (name: string) {

        super(name);

        this._parameters = {};
    }

    /* *
     *
     *  Properties
     *
     * */

    private _parameters: utils.Dictionary<ParameterDeclaration>;

    /* *
     *
     *  Functions
     * 
     * */

    /**
     * Returns a parameter declaration, if founded.
     */
    public getParameter(name: string): (ParameterDeclaration|undefined) {

        return this._parameters[name];
    }

    /**
     * Returns an array with the names of all parameter declarations.
     */
    public getParameterNames(): Array<string> {

        return Object.keys(this._parameters);
    }
    /**
     * Returns true, if declaration has parameters.
     */
    public hasParameters(): boolean {

        return (Object.keys(this._parameters).length > 0);
    }

    /**
     * Returns the parameters bracket of this TypeScript declaration.
     */
    protected renderParametersBracket(): string {

        let parameters = this._parameters;

        return (
            '(' +
            Object
                .keys(parameters)
                .map(parameterName => parameters[parameterName].toString())
                .join(', ') +
            ')'
        );
    }

    /**
     * Returns the comment lines with parameters for this TypeScript
     * declaration.
     *
     * @param {string} indent 
     * The indentation string for formatting.
     */
    protected renderParametersDescription(indent: string = ''): string {

        let parameters = this._parameters,
            list = '';
        
        list += Object
            .keys(parameters)
            .map(parameterName => parameters[parameterName]
                .renderParameterDescription(indent)
            )
            .join(indent + ' *\n');

        if (list) {
            list = indent + ' *\n' + list;
        }

        if (!this.description && !list) {
            return '';
        }

        return (
            indent + '/**\n' +
            utils.pad(
                utils.normalize(this.description, true), (indent + ' * ')
            ) +
            list +
            indent + ' *' + '/\n'
        );
    }

    /**
     * Adds parameter declarations to this TypeScriot declaration.
     * 
     * @param {Array<ParameterDeclaration>} declarations
     * The parameter declarations to add.
     */
    public setParameters(...declarations: Array<ParameterDeclaration>) {

        let parameters = this._parameters,
            name = '';

        declarations.forEach(declaration => {

            if (declaration.parent) {
                throw new Error('Parameter declaration has already a parent.');
            }

            name = declaration.name;

            if (parameters[name]) {
                throw new Error('Parameter declaration with this name already added.');
            }

            parameters[name] = declaration;
        });
    }

    /**
     * Returns the string of this extended TypeScript declaration.
     *
     * @param {string} indent
     * The indentation string for formatting.
     */
    public abstract toString(indent?: string): string;
}



export class ClassDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Constructors
     * 
     * */

    public constructor (name: string) {

        super(name);

        this._implements = [];
    }

    /* *
     *
     *  Properties
     * 
     * */

    /**
     * Implemented interfaces of this class declaration.
     */
    public get implements(): Array<string> {
        return this._implements;
    }
    private _implements: Array<string>

    public get kind(): Kinds {
        return 'class';
    }

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns the string of this class declaration.
     *
     * @param {string} indent
     * The indentation string for formatting.
     */
    public toString(indent: string = ''): string {

        if (this.hasParameters()) {
            let constructor = new ConstructorDeclaration();
            constructor.description = this.description;
            this.getParameterNames()
                .map(parameterName => this.getParameter(parameterName))
                .forEach(parameter => {
                    if (parameter) {
                        constructor.setParameters(parameter);
                    }
                });
            this.addChildren(constructor);
        }

        let childIndent = indent + '    ',
            renderedClass = 'class ' + this.name + ' ';

        if (this.types.length > 0) {
            renderedClass += 'extends ' + this.renderTypes();
        }

        if (this.implements.length > 0) {
            renderedClass += 'implements ' + this.implements.join(', ');
        }

        renderedClass = this.renderScopePrefix() + renderedClass;

        return (
            this.renderDescription(indent) +
            indent + renderedClass + '{\n\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' + indent+ '}\n'
        );

        return renderedClass;
    }
}


export class ConstructorDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Constructor
     * 
     * */

    public constructor () {

        super('');
    }

    /* *
     *
     *  Properties
     * 
     * */

    public get kind (): Kinds {
        return 'constructor';
    }

    /* *
     *
     *  Functions
     * 
     * */

    public toString (indent: string = ''): string {

        let renderedConstructor = 'constructor ';
        
        renderedConstructor = this.renderScopePrefix() + renderedConstructor;

        renderedConstructor += this.renderParametersBracket();

        return (
            this.renderParametersDescription(indent) +
            indent + renderedConstructor + ';\n'
        );
    }
}

export class FunctionDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Properties
     * 
     * */

    public get kind (): Kinds {
        return 'function';
    }

    /* *
     *
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {

        let renderedFunction = 'function ' + this.name;

        if (this.parent instanceof ClassDeclaration ||
            this.parent instanceof InterfaceDeclaration
        ) {
            renderedFunction = this.name;
        }

        renderedFunction += this.renderParametersBracket();

        if (this.types.length > 0) {
            renderedFunction += ': ' + this.renderTypes();
        }

        renderedFunction = this.renderScopePrefix() + renderedFunction;

        return (
            this.renderParametersDescription(indent) +
            indent + renderedFunction + ';\n'
        );
    }
}



export class GlobalDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     * 
     * */

    public constructor () {

        super('');
    }

    /* *
     *
     *  Properties
     *
     * */

    public get kind (): Kinds {
        return 'global';
    }

    /* *
     *
     *  Functions
     *
     * */

    public toString(): string {

        return (
            this.renderDescription('') +
            '\n' +
            this.renderChildren('', '\n')
        );
    }
}



export class InterfaceDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    public get kind (): Kinds {
        return 'interface';
    }

    /* *
     *
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {

        let childIndent = indent + '    ',
            renderedInterface = 'interface ' + this.name;

        if (this.types.length > 0) {
            renderedInterface += ' extends ' + this.types.join(', ');
        }

        renderedInterface = this.renderScopePrefix() + renderedInterface;

        return (
            this.renderDescription(indent) +
            indent + renderedInterface + '{\n\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' + indent + '}\n'
        );
    }
}



export class NamespaceDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     * 
     * */

    public get kind (): Kinds {
        return 'namespace';
    }

    /* *
     *
     *  Functions
     * 
     * */

    public toString(indent: string = ''): string {

        let childIndent = indent + '    ',
            renderedNamespace = 'declare namespace ' + this.name;

        return (
            this.renderDescription(indent) +
            indent + renderedNamespace + '{\n\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' + indent + '}\n' +
            indent + 'export = ' + this.name + ';\n'
        );
    }
}



export class ParameterDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     * 
     * */

    public get kind (): Kinds {
        return 'parameter';
    }

    /* *
     *
     *  Functions
     *
     * */

    public renderParameterDescription(indent: string = ''): string {

        let renderedTypes = this.renderTypes();

        if (!renderedTypes) {
            renderedTypes = 'any';
        }

        return (
            indent + ' * @param {' + renderedTypes + '} ' + this.name + '\n' +
            utils.pad(utils.normalize(this.description), (indent + ' * '))
        );
    }

    public toString(): string {

        return this.name + ': ' + this.renderTypes();
    }
}



export class PropertyDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Constructor
     * 
     * */

    public constructor (name: string) {

        super(name);

        this._isOptional = false;
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Visibility of this TypeScript declaration.
     */
    public get isOptional(): boolean {
        return this._isOptional;
    }
    public set isOptional(value: boolean) {
        this._isOptional = value;
    }
    private _isOptional: boolean;

    public get kind (): Kinds {
        return (this.isStatic ? 'static property' : 'property');
    }

    /* *
     *
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {

        let childIndent = indent + '    ',
            renderedMember = 'let ' + this.name;

        if (this.parent instanceof ClassDeclaration ||
            this.parent instanceof InterfaceDeclaration ||
            this.parent instanceof PropertyDeclaration
        ) {
            renderedMember = this.name;
        }

        if (this.isOptional) {
            renderedMember += '?';
        }

        renderedMember = this.renderScopePrefix() + renderedMember + ': ';

        if (this.hasChildren()) {
            renderedMember += '{' + this.renderChildren(childIndent, '\n') + '}';
        } else if (this.types.length > 0) {
            renderedMember += this.renderTypes();
        } else {
            renderedMember += 'any';
        }

        return (
            this.renderDescription(indent) +
            indent + renderedMember + ';\n'
        );
    }
}



export class TypeDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    public get kind (): Kinds {
        return 'type';
    }

    /* *
     *
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {

        let renderedType = 'type ' + this.name;
        
        renderedType = this.renderScopePrefix() + renderedType;

        if (this.types.length > 0) {
            renderedType += ' = ' + this.renderTypes();
        } else {
            renderedType += ' = any';
        }

        return (
            this.renderDescription(indent) +
            indent + renderedType + ';\n'
        );
    }
}
