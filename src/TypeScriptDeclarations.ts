/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './Utilities';



/**
 * Base class for TypeScript declarations.
 * 
 * @extends Object
 */
export abstract class IDeclaration extends Object {

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

            if (declaration.parent) {
                throw new Error(
                    'Declaration has already a parent.' +
                    ' (' + declaration.parent.name + ')'
                );
            }

            name = declaration.name;

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

        return Object.keys(this._children);
    }

    /**
     * Removes a child declaration from this declaration.
     *
     * @param {string} name
     * The name of the child declaration.
     * 
     * @return {IDeclaration|undefined}
     * The declaration, if founded.
     */
    public removeChild(name: string): (IDeclaration|undefined) {

        let children = this._children,
            declaration = children[name];

        if (declaration) {
            delete children[name];
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

        return Object
            .keys(children)
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

        if (this.parent instanceof NamespaceDeclaration) {
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

        let childIndent = (indent + '    '),
            str = this.renderScopePrefix() + 'class ' + this.name;

        if (this.types.length > 0) {
            str += ' extends ' + this.renderTypes();
        }

        if (this.implements.length > 0) {
            str += ' implements ' + this.implements.join(', ');
        }

        let cstr = 'public constructor ' + this.renderParametersBracket();

        return (
            this.renderDescription(indent) +
            indent + str + ' {\n' +
            this.renderParametersDescription(childIndent) +
            childIndent + cstr + ';\n\n' +
            this.renderChildren(childIndent, '\n') +
            indent + '}\n'
        );

        return str;
    }
}


export class FunctionDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {

        let str = ('function ' + this.name);

        if (this.parent instanceof ClassDeclaration ||
            this.parent instanceof InterfaceDeclaration
        ) {
            str = this.name;
        }

        str = this.renderScopePrefix() + str;
        str += this.renderParametersBracket();

        if (this.types.length > 0) {
            str += ': ' + this.renderTypes();
        }

        return (
            this.renderParametersDescription(indent) +
            indent + str + ';\n'
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
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {

        let childIndent = (indent + '    '),
            str = this.renderScopePrefix() + 'interface ' + this.name;

        if (this.types.length > 0) {
            str += ' extends ' + this.types.join(', ');
        }

        return (
            this.renderDescription(indent) +
            indent + str + ' {\n' +
            '\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' +
            indent + '}\n'
        );
    }
}



export class MemberDeclaration extends IExtendedDeclaration {

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

    /* *
     *
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {


        let str = ('let ' + this.name);

        if (this.parent instanceof ClassDeclaration ||
            this.parent instanceof InterfaceDeclaration
        ) {
            str = this.name;
        }

        if (this.isOptional) {
            str += '?';
        }

        str = this.renderScopePrefix() + str;

        if (this.types.length > 0) {
            str += ': ' + this.renderTypes();
        }

        return (
            this.renderDescription(indent) +
            indent + str + ';\n'
        )
    }
}



export class NamespaceDeclaration extends IDeclaration {

    /* *
     *
     *  Functions
     * 
     * */

    public toString(indent: string = ''): string {

        let childIndent = (indent + '    ');

        return (
            this.renderDescription(indent) +
            indent + 'namespace ' + this.name + '{\n' +
            '\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' +
            indent + '}\n' +
            '\n' +
            indent + 'export = ' + this.name + ';\n'
        );
    }
}



export class ParameterDeclaration extends IDeclaration {

    /* *
     *
     *  Functions
     *
     * */

    /**
     * 
     * @param indent 
     */
    public renderParameterDescription(indent: string = ''): string {

        return (
            indent + ' * @param {' + this.renderTypes() + '} ' +
            this.name + '\n' +
            utils.pad(utils.normalize(this.description), (indent + ' * '))
        );
    }

    public toString(): string {

        return this.name + ': ' + this.renderTypes();
    }
}



export class TypeAlias extends IDeclaration {

    /* *
     *
     *  Functions
     *
     * */

    public toString(indent: string = ''): string {

        return (
            this.renderDescription(indent) +
            this.renderScopePrefix() + indent + 'type ' + this.name + ' = ' + this.renderTypes() + ';\n'
        );
    }
}
