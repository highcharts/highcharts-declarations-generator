/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './Utilities';



/**
 * The declaration kinds as a typed string.
 */
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
    'argument'
);



/**
 * The order of the different declaration kinds.
 */
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
    'argument'
] as Array<Kinds>;



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
     * Returns a simplified name of a provided full qualified name.
     *
     * @param {string} name
     *        The name to simplify.
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
     *        The name of the declaration.
     */
    public constructor (name: string) {
        super();

        this._name = IDeclaration.simplifyName(name);
        this._fullname = name;

        this._children = {};
        this._defaultValue = undefined;
        this._description = '';
        this._isOptional = false;
        this._isPrivate = false;
        this._isStatic = false;
        this._parent = undefined;
        this._see = [];
        this._types = [];
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Default value and type for this declaration.
     */
    public get defaultValue(): (boolean|number|string|undefined) {
        return this._defaultValue;
    }
    public set defaultValue(value: (boolean|number|string|undefined)) {
        this._defaultValue = value;
    }
    private _defaultValue: (boolean|number|string|undefined);

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
     * Returns true, if the declaration contains child declarations.
     */
    public get hasChildren(): boolean {
        return (Object.keys(this._children).length > 0);
    }
    private _children: utils.Dictionary<IDeclaration>;

    /**
     * Returns true, if the declaration includes types.
     */
    public get hasTypes(): boolean {
        return (this._types.length > 0);
    }

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
     * Parent relation.
     */
    public get isInClass(): boolean {

        return (this._parent && this._parent.kind) === 'class';
    }

    /**
     * Parent relation.
     */
    public get isInSpace(): boolean {

        switch (this._parent && this._parent.kind) {
            default:
                return false;
            case 'global':
            case 'namespace':
                return true;
        }
    }

    /**
     * Requirement of this TypeScript declaration.
     */
    public get isOptional(): boolean {
        return this._isOptional;
    }
    public set isOptional(value: boolean) {
        this._isOptional = value;
    }
    private _isOptional: boolean;

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
     * Link references in this TypeScript declaration.
     */
    public get see(): Array<string> {
        return this._see;
    }
    private _see: Array<string>;

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
     *        The declarations to add.
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
     *        The name of the child declaration.
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
                    return (name1.toLowerCase() < name2.toLowerCase() ? -1 : 1);
                } else {
                    return (index1 - index2);
                }
            });
    }

    /**
     * Removes a child declaration from this declaration and returns the child
     * declaration, if founded.
     *
     * @param {string} name
     *        Name of the child declaration.
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
     *        The indentation string for formatting.
     *
     * @param {string} infix
     *        The separation string between children.
     */
    protected renderChildren(indent: string = '', infix: string = ''): string {

        let children = this._children;

        return this
            .getChildrenNames()
            .map(name => children[name].toString(indent))
            .join(infix);
    }

    /**
     * Return the comment lines with the default value for this TypeScript
     * declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    protected renderDefaultValue(indent: string = ''): string {

        if (this.defaultValue === undefined) {
            return '';
        }

        return (
            indent + '(Default value: ' + this.defaultValue + ')\n'
        );
    }

    /**
     * Returns the comment string for this TypeScript declaration.
     *
     * @param {string} indent 
     *        The indentation string for formatting.
     *
     * @param {boolean} includeMeta
     *        True for extra lines with additional information;
     */
    protected renderDescription(
        indent: string = '', includeMeta: boolean = false
    ): string {

        if (!this.description) {
            return '';
        }

        let renderedDescription = utils.normalize(this.description, true);

        renderedDescription = utils.pad(renderedDescription, (indent + ' * '));

        if (includeMeta) {
            renderedDescription += this.renderDefaultValue(indent + ' * ');
            renderedDescription += this.renderSee(indent + ' * ');
        }

        return (
            indent + '/**\n' +
            renderedDescription +
            indent + ' *' + '/\n'
        );
    }

    /**
     * Returns the visibility string of this TypeScript declaration.
     */
    protected renderScopePrefix(): string {

        if (this.isInClass) {

            let str = 'public ';

            if (this.isPrivate) {
                str = 'private ';
            }

            if (this.isStatic) {
                str += 'static ';
            }

            return str;
        }

        if (this.isInSpace) {
            return (this.isPrivate ? '' : 'export ');
        }

        return '';
    }

    /**
     * Return the comment lines with the see links for this TypeScript
     * declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    protected renderSee(indent: string = ''): string {

        if (this.see.length === 0) {
            return '';
        }

        return (
            indent + '\n' +
            this.see.map(link => indent + '@see ' + link).join('\n') + '\n'
        );
    }

    /**
     * Returns the possible types of this TypeScript declaration.
     *
     * @param {boolean} useParentheses
     *        Wraps several types in parentheses.
     */
    protected renderTypes(useParentheses: boolean = false): string {

        if (useParentheses &&
            this.types.length > 1
        ) {
            return '(' + this.types.sort().join('|') + ')';
        } else {
            return this.types.sort().join('|');
        }
    }

    /**
     * Returns a rendered string of this TypeScript declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public abstract toString(indent?: string): string;
}


/**
 * Extended base class for TypeScript declarations with arguments and types
 * description. This is used by class, constructor, and function declarations.
 *
 * @extends IDeclaration
 */
export abstract class IExtendedDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Initiates a new TypeScript declaration with additional properties.
     *
     * @param {string} name
     *        The name of the declaration.
     */
    public constructor (name: string) {

        super(name);

        this._arguments = {};
        this._typesDescription = '';
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Returns true, if declaration has arguments.
     */
    public get hasArguments(): boolean {
        return (Object.keys(this._arguments).length > 0);
    }
    private _arguments: utils.Dictionary<ArgumentDeclaration>;

    /**
     * Returns the description for the return types.
     */
    public get typesDescription(): string {
        return this._typesDescription;
    }
    public set typesDescription(value: string) {
        this._typesDescription = value;
    }
    private _typesDescription: string;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a argument declaration, if founded.
     */
    public getArgument(name: string): (ArgumentDeclaration|undefined) {

        return this._arguments[name];
    }

    /**
     * Returns an array with the names of all argument declarations.
     */
    public getArgumentNames(): Array<string> {

        return Object.keys(this._arguments);
    }

    /**
     * Returns the arguments bracket of this TypeScript declaration.
     */
    protected renderArgumentsBracket(): string {

        let allArguments = this._arguments;

        return (
            '(' +
            Object
                .keys(allArguments)
                .map(argumentName => allArguments[argumentName].toString())
                .join(', ') +
            ')'
        );
    }

    /**
     * Returns the comment lines with arguments for this TypeScript declaration.
     *
     * @param {string} indent 
     *        The indentation string for formatting.
     */
    protected renderArgumentsDescription(indent: string = ''): string {

        let allArguments = this._arguments,
            list = '';
        
        list += Object
            .keys(allArguments)
            .map(argumentName => allArguments[argumentName]
                .renderArgumentDescription(indent)
            )
            .join(indent + ' *\n');

        if (this.typesDescription) {
            list += (
                indent + ' *\n' +
                indent + ' * @return {' + this.renderTypes() + '}\n' +
                utils.pad(this.typesDescription, (indent + ' *         '))
            );
        }

        if (this.see.length > -1) {
            list += this.renderSee(indent + ' * ');
        }

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
     * Adds argument declarations to this TypeScriot declaration.
     *
     * @param {Array<ArgumentDeclaration>} declarations
     *        The argument declarations to add.
     */
    public setArguments(...declarations: Array<ArgumentDeclaration>) {

        let allArguments = this._arguments,
            name = '';

        declarations.forEach(declaration => {

            if (declaration.parent) {
                throw new Error('Argument declaration has already a parent.');
            }

            name = declaration.name;

            if (allArguments[name]) {
                throw new Error('Argument declaration with this name already added.');
            }

            allArguments[name] = declaration;
        });
    }

    /**
     * Returns a rendered string of this extended TypeScript declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public abstract toString(indent?: string): string;
}



/**
 * Class for argument declarations in TypeScript, that are used in the
 * constructor and functions.
 *
 * @extends {IDeclaration}
 */
export class ArgumentDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Initiates a new argument declaration.
     *
     * @param {string} name
     *        The name of the argument.
     */
    public constructor (name: string) {

        super(name);

        this._isVariable = false;
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'argument';

    /**
     * Variable number of arguments.
     */
    public get isVariable(): boolean {
        return this._isVariable;
    }
    public set isVariable(value: boolean) {
        this._isVariable = value;
    }
    private _isVariable: boolean;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of the comment part for arguments.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public renderArgumentDescription(indent: string = ''): string {

        let defaultValue = (this.defaultValue || '').toString(),
            renderedTypes = this.renderTypes();

        if (!renderedTypes) {
            renderedTypes = 'any';
        }

        if (this.isVariable) {
            renderedTypes = '...Array<' + renderedTypes + '>';
        }

        renderedTypes = '@param  {' + renderedTypes + '} ' + this.name;

        if (defaultValue) {
            defaultValue = '(Default value: ' + defaultValue + ')';
        }

        return (
            indent + ' * ' + renderedTypes + '\n' +
            utils.pad(
                utils.normalize(this.description),
                (indent + ' *         ')
            ) +
            this.renderDefaultValue(indent + ' *         ')
        );
    }

    /**
     * Returns a rendered string of this argument declaration.
     */
    public toString(): string {

        let renderedArgument = this.name,
            renderedTypes = this.renderTypes(true);

        if (this.isOptional) {
            renderedArgument += '?';
        }

        if (this.isVariable) {
            renderedArgument = '...' + renderedArgument;
            renderedTypes = 'Array<' + renderedTypes + '>';
        }

        renderedArgument += ': ' + renderedTypes;

        return renderedArgument;
    }
}



/**
 * Class for class declarations in TypeScript.
 *
 * @extends {IExtendedDeclaration}
 */
export class ClassDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Constructors
     *
     * */

    /**
     * Initiates a new class declaration.
     *
     * @param {string} name
     *        The name of the class.
     */
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
     * Returns true, if class implements interfaces.
     */
    public get hasImplements(): boolean {
        return (this._implements.length > 0);
    }

    /**
     * Implemented interfaces of this class declaration.
     */
    public get implements(): Array<string> {
        return this._implements;
    }
    private _implements: Array<string>

    /**
     * Kind of declaration.
     */
    public readonly kind = 'class';

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this class declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public toString(indent: string = ''): string {

        if (this.hasArguments) {
            let constructor = new ConstructorDeclaration();
            constructor.description = this.description;
            this.getArgumentNames()
                .map(argumentName => this.getArgument(argumentName))
                .forEach(argument => {
                    if (argument) {
                        constructor.setArguments(argument);
                    }
                });
            this.addChildren(constructor);
        }

        let childIndent = indent + '    ',
            renderedClass = this.name;

        if (!this.isInSpace) {
            renderedClass += ': ';
        } else {

            renderedClass = 'class ' + renderedClass;

            if (this.hasTypes) {
                renderedClass += 'extends ' + this.renderTypes();
            }

            if (this.hasImplements) {
                renderedClass += 'implements ' + this.implements.join(', ');
            }
        }

        renderedClass = this.renderScopePrefix() + renderedClass;

        return (
            this.renderDescription(indent) +
            indent + renderedClass + ' {\n' +
            '\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' +
            indent+ '}\n'
        );

        return renderedClass;
    }
}



/**
 * Class for constructor declarations in TypeScript. This is used by the class
 * declaration.
 *
 * @extends {IExtendedDeclaration}
 */
export class ConstructorDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Initiates a new constructor declaration.
     */
    public constructor () {

        super('');
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'constructor';

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this constructor declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public toString (indent: string = ''): string {

        let renderedConstructor = 'constructor';
        
        renderedConstructor += ' ' + this.renderArgumentsBracket();

        renderedConstructor = this.renderScopePrefix() + renderedConstructor;

        return (
            this.renderArgumentsDescription(indent) +
            indent + renderedConstructor + ';\n'
        );
    }
}

/**
 * Class for extended declarations in TypeScript.
 *
 * @extends {IExtendedDeclaration}
 */
export class FunctionDeclaration extends IExtendedDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public get kind (): ('static function' | 'function') {
        return (this.isStatic ? 'static function' : 'function');
    }

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this function declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public toString(indent: string = ''): string {

        let renderedFunction = this.name,
            renderedTypes = this.renderTypes(true);

        renderedFunction += ' ' + this.renderArgumentsBracket();

        renderedFunction += ': ' + (renderedTypes || 'void');

        if (this.isInSpace) {
            renderedFunction = 'function ' + renderedFunction;
        }

        renderedFunction = this.renderScopePrefix() + renderedFunction;

        return (
            this.renderArgumentsDescription(indent) +
            indent + renderedFunction + ';\n'
        );
    }
}



/**
 * Class for global declarations in TypeScript.
 *
 * @extends {IDeclaration}
 */
export class GlobalDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Initiates a new global declaration.
     */
    public constructor () {

        super('[global]');
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'global';

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this global declaration.
     */
    public toString(): string {

        return (
            this.renderDescription('') +
            '\n' +
            this.renderChildren('', '\n')
        );
    }
}



/**
 * Class for interface declarations in TypeScript.
 *
 * @extends {IDeclaration}
 */
export class InterfaceDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'interface';

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this interface declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public toString(indent: string = ''): string {

        let childIndent = indent + '    ',
            renderedInterface = this.name;

        if (!this.isInSpace) {
            renderedInterface += ': ';
        } else {

            renderedInterface = 'interface ' + this.name ;

            if (this.hasTypes) {
                renderedInterface += ' extends ' + this.types.join(', ');
            }
        }

        renderedInterface = this.renderScopePrefix() + renderedInterface;

        return (
            this.renderDescription(indent) +
            indent + renderedInterface + ' {\n' +
            '\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' +
            indent + '}\n'
        );
    }
}



/**
 * Class for namespace declarations in TypeScript.
 *
 * @extends {IDeclaration}
 */
export class NamespaceDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'namespace';

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this namespace declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public toString(indent: string = ''): string {

        let childIndent = indent + '    ',
            renderedNamespace = this.name;

        if (!this.isInSpace) {
            renderedNamespace += ': ';
        } else {
            renderedNamespace = 'declare namespace ' + renderedNamespace;
        }

        return (
            this.renderDescription(indent) +
            indent + renderedNamespace + ' {\n' +
            '\n' +
            this.renderChildren(childIndent, '\n') +
            '\n' + 
            indent + '}\n' +
            indent + 'export = ' + this.name + ';\n'
        );
    }
}



/**
 * Class for property declarations in TypeScript, that can be found in a class,
 * global scope, interface, and namespace.
 *
 * @extends {IDeclaration}
 */
export class PropertyDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public get kind (): ('static property' | 'property') {
        return (this.isStatic ? 'static property' : 'property');
    }

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this property declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public toString(indent: string = ''): string {

        let childIndent = indent + '    ',
            renderedMember = this.name;
            
        if (this.isOptional) {
            renderedMember += '?';
        }

        if (this.isInSpace) {
            renderedMember = 'let ' + renderedMember;
        }

        renderedMember = this.renderScopePrefix() + renderedMember + ': ';

        if (this.hasChildren) {
            renderedMember += '{\n' + this.renderChildren(childIndent, '\n') + '}';
        } else if (this.hasTypes) {
            renderedMember += this.renderTypes(true) + ';';
        } else {
            renderedMember += 'any;';
        }

        return (
            this.renderDescription(indent, true) +
            indent + renderedMember + '\n'
        );
    }
}



/**
 * Class for type alias declarations in TypeScript.
 *
 * @extends {IDeclaration}
 */
export class TypeDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'type';

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a rendered string of this type declaration.
     *
     * @param {string} indent
     *        The indentation string for formatting.
     */
    public toString(indent: string = ''): string {

        let renderedType = this.renderTypes(true);
        
        if (!renderedType) {
            renderedType = 'any';
        }

        renderedType = 'type ' + this.name + ' = ' + renderedType;

        renderedType = this.renderScopePrefix() + renderedType;

        return (
            this.renderDescription(indent) +
            indent + renderedType + ';\n'
        );
    }
}
