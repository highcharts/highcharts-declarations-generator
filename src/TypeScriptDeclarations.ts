/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/

/* *
 *
 *  Types
 *
 * */

/**
 * Declaration kinds as a typed string.
 */
export type Kinds = (
    'global' |
    'type' |
    'interface' |
    'class' |
    'constant' |
    'static property' |
    'static function' |
    'constructor' |
    'property' |
    'event' |
    'function' |
    'parameter' |
    'module' |
    'namespace'
);

/* *
 *
 *  Interfaces
 *
 * */

/**
 * Generic dictionary
 */
interface Dictionary<T> { [key: string]: T };

/**
 * Path elements
 */
interface PathElements {
    directories: string[];
    extension: string;
    file: string;
    name: string;
    path: string;
    scope: string;
}

/* *
 *
 *  Classes
 *
 * */

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

    /**
     * Order of the different declaration kinds.
     */
    private static readonly KIND_ORDER = [
        'global',
        'type',
        'interface',
        'class',
        'constant',
        'static property',
        'static function',
        'constructor',
        'property',
        'event',
        'function',
        'parameter',
        'module',
        'namespace'
    ] as Array<Kinds>;

    /**
     * Finds all type names.
     */
    private static readonly EXTRACT_TYPE_NAMES: RegExp = (
        /(?:[\w\.]+?|\"(?:[^\"]|\\\")*?\")(?=[\|\,\(\)\[\]\<\>]|$)/
    );

    /**
     * Finds separator characters in fullnames.
     */
    private static readonly NAMESPACE_KEYWORDS = /\w+\:/;

    /**
     * Finds subspaces in fullnames.
     */
    private static readonly NAMESPACES_SUBSPACE = /(?:<.+>|\[.+\])$/;

    /**
     * Escape double lines like in Markdown.
     */
    private static readonly NORMALIZE_ESCAPE: RegExp = /\n\s*\n/;

    /**
     * Escape lists like in Markdown.
     */
    private static readonly NORMALIZE_LIST: RegExp = /\n(?:[\-\+\*]|\d+\.) /;

    /**
     * Reduce spaces and line breaks to one space character.
     */
    private static readonly NORMALIZE_SPACE: RegExp = /\s+/;

    /**
     * Unescape double lines.
     */
    private static readonly NORMALIZE_UNESCAPE: RegExp = /<br>/;

    /**
     * Finds spaces and line breaks.
     */
    private static readonly PAD_SPACE: RegExp = /\s/;

    /**
     * Finds path separator
     */
    private static readonly PATH_SEPARATOR: RegExp = /\/\\/;

    /**
     * Finds all type names and match into two groups: type name and separator
     * suffixes (or string end).
     */
    public static readonly TYPE_NAME: RegExp = (
        /([\w\.]+?|\"(?:\\\\|\\\"|[^\"])*?\")([\|\,\(\)\[\]\<\>]|$)/
    );

    /**
     * Finds all possible separator characters after a type name.
     */
    public static readonly TYPE_SEPARATOR: RegExp = /[\|\,\(\)\[\]\<\>]/;

    /* *
     *
     *  Static Functions
     *
     * */

    /**
     * Returns source code with shorter lines, if possible.
     *
     * @param sourceCode
     *        The source code in which to break long lines in shorter ones.
     *
     * @param maxLength
     *        The maximum length a source line should have.
     */
    public static breakLongLines(
        sourceCode: string, maxLength: number = 200
    ): string {

        return sourceCode
            .split('\n')
            .map(line => {

                let breakPosition = -1,
                    currentLine = '',
                    extraLines = '';

                while (line.length > maxLength) {

                    currentLine = line.substr(0, maxLength)
                    
                    breakPosition = currentLine.lastIndexOf(',') + 1;

                    if (breakPosition <= 0) {
                        breakPosition = currentLine.lastIndexOf('|') + 1;
                    }

                    if (breakPosition <= 0) {
                        break;
                    }

                    extraLines += currentLine.substr(0, breakPosition) + '\n';

                    line = line.substr(breakPosition).trim();
                }

                return extraLines + line;

            })
            .join('\n');

    }

    /**
     * Extract all types in given type strings.
     *
     * @param types
     *        The types to extract from.
     */
    public static extractTypeNames (...types: Array<string>): Array<string> {

        let extractedTypes = [] as Array<string>,
            search = new RegExp(IDeclaration.EXTRACT_TYPE_NAMES, 'gm');

        types.forEach(type => extractedTypes.push(
            ...(type.match(search) || [])
        ));

        return extractedTypes;
    }



    /**
     * Returns a indented string, that fits into a specific width and spans over
     * several lines.
     *
     * @param text
     *        The string to pad.
     *
     * @param linePrefix 
     *        The prefix for each line.
     *
     * @param wrap 
     *        The maximum width of the padded string.
     */
    protected static indent (
        text: string, linePrefix: string = '', wrap: number = 80
    ): string {

        let newLine = true,
            line = '',
            paddedStr = '',
            words = text.split(new RegExp(IDeclaration.PAD_SPACE, 'gm'));

        words.forEach(word => {

            if (!newLine && word === '') {
                paddedStr += (
                    line.trimRight() + '\n' +
                    linePrefix.trimRight() + '\n'
                );
                newLine = true;
                return;
            }

            if (!newLine && line.length + word.length + 1 > wrap) {
                paddedStr += line.trimRight() + '\n';
                newLine = true;
            }

            if (newLine) {
                line = linePrefix + word;
                newLine = false;
            }
            else {
                line += ' ' + word;
            }
        });

        return (newLine ? paddedStr : paddedStr + line.trimRight() + '\n');
    }

    /**
     * Splits a name into the namespace components.
     *
     * @param name
     *        The name to split into spaces.
     *
     * @param withFullNames
     *        Array contains the full names of the spaces.
     */
    public static namespaces (
        name: string, withFullNames: boolean = false
    ): Array<string> {

        if (!name) {
            return [];
        }

        let subspace = (name.match(new RegExp(IDeclaration.NAMESPACES_SUBSPACE, 'gm')) || [])[0];

        if (subspace) {
            name = name.substr(0, name.length - subspace.length);
        }

        let namespaces = name
            .replace(new RegExp(IDeclaration.NAMESPACE_KEYWORDS, 'gm'), '$&.')
            .split('.');

        if (subspace) {
            if (subspace.indexOf(':') > 0 &&
                subspace.indexOf(':number') === -1 &&
                subspace.indexOf(':string') === -1
            ) {
                subspace = subspace.replace(':', ' in ');
            }
            namespaces[namespaces.length-1] += subspace;
        }

        namespaces = namespaces.filter(spaceName => !!spaceName);

        if (withFullNames) {

            let fullSpace = '';

            namespaces = namespaces.map(space => {

                if (fullSpace) {
                    fullSpace += '.' + space;
                }
                else {
                    fullSpace = space;
                }

                return fullSpace;
            });
        }

        return namespaces;
    }

    /**
     * Reduce space and line breaks to one space character and returns the
     * normalized text.
     *
     * @param text
     *        The text string to normalize.
     *
     * @param preserveParagraphs 
     *        Preserve double line breaks.
     */
    protected static normalize (
        text: string, preserveParagraphs: boolean = false
    ): string {

        if (preserveParagraphs) {
            return text
                .replace(new RegExp(IDeclaration.NORMALIZE_ESCAPE, 'gm'), '<br>')
                .replace(new RegExp(IDeclaration.NORMALIZE_LIST, 'gm'), '<br>-')
                .replace(new RegExp(IDeclaration.NORMALIZE_SPACE, 'gm'), ' ')
                .replace(new RegExp(IDeclaration.NORMALIZE_UNESCAPE, 'gm'), '\n\n');
        } else {
            return text.replace(new RegExp(IDeclaration.NORMALIZE_SPACE, 'gm'), ' ');
        }
    }

    /**
     * Returns a simplified name of a provided full qualified name.
     *
     * @param name
     *        The name to simplify.
     */
    public static simplifyName (name: string): string {

        let nameParts = IDeclaration.namespaces(name);

        return (nameParts[nameParts.length-1] || '');
    }

    /**
     * Returns a simplified type.
     *
     * @param rootName
     *        The root to remove.
     *
     * @param types
     *        The types to simplify.
     */
    public static simplifyType (rootName: string, ...types: Array<string>): Array<string> {

        rootName = rootName + '.';

        const scopeLength = rootName.length;

        return types.map(type => type.replace(
            new RegExp(IDeclaration.TYPE_NAME, 'gm'),
            (match, name, suffix) => (
                name.startsWith(rootName) ?
                name.substr(scopeLength) + suffix :
                match
            )
        ));
    }

    /**
     * Sorts: KIND_ORDER:0 < KIND_ORDER:1
     *
     * @param declarationA
     *        The first declaration to compare.
     *
     * @param declarationB 
     *        The second declaration to compare.
     */
    public static sortDeclaration (
        declarationA: IDeclaration, declarationB: IDeclaration
    ): number {

        let index1 = IDeclaration.KIND_ORDER.indexOf(declarationA.kind),
            index2 = IDeclaration.KIND_ORDER.indexOf(declarationB.kind);

        if (index1 !== index2) {
            return (index1 - index2);
        }

        let nameA = declarationA.name.toLowerCase(),
            nameB = declarationB.name.toLowerCase();

        if (nameA !== nameB) {
            return (nameA < nameB ? -1 : 1);
        }

        if ((declarationA instanceof ConstructorDeclaration ||
            declarationA instanceof FunctionDeclaration) &&
            (declarationB instanceof ConstructorDeclaration ||
            declarationB instanceof FunctionDeclaration)
        ) {
            let lengthA = declarationA.getParameters().length,
                lengthB = declarationB.getParameters().length;

            return (lengthA - lengthB);
        }

        return 0;
    }

    /**
     * Sorts: primitives < classes < generics < null < undefined < any
     *
     * @param typeA
     *        The first type to compare.
     *
     * @param typeB
     *        The second type to compare.
     */
    public static sortType (typeA: string, typeB: string): number {

        switch (typeA) {
            case 'any':
                return 1;
            case 'null':
                return (
                    typeB === 'any' ? -1 :
                    typeB === 'undefined' ? -1 :
                    1
                );
            case 'undefined':
                return (typeB === 'any' ? -1 : 1);
        }

        switch (typeB) {
            case 'any':
            case 'null':
            case 'undefined':
                return -1;
        }

        if (typeA.indexOf('<') > -1 &&
            typeB.indexOf('<') === -1
        ) {
            return 1;
        }

        if (typeB.indexOf('<') > -1 &&
            typeA.indexOf('<') === -1
        ) {
            return -1;
        }

        if (typeA[0] === '"' &&
            typeB[0] !== '"'
        ) {
            return -1;
        }

        if (typeB[0] === '"' &&
            typeA[0] !== '"'
        ) {
            return 1;
        }

        let typeALC = typeA.toLowerCase(),
            typeBLC = typeB.toLowerCase();

        if (typeA !== typeALC &&
            typeB === typeBLC
        ) {
            return 1;
        }

        if (typeB !== typeBLC &&
            typeA === typeALC
        ) {
            return -1;
        }

        return (typeALC < typeBLC ? -1 : typeALC > typeBLC ? 1 : 0);
    }

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Initiates a new TypeScript declaration.
     *
     * @param name
     *        The name of the declaration.
     */
    public constructor (name: string) {
        super();

        this._name = IDeclaration.simplifyName(name);
        this._children = [];
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
     * Returns the full qualified name of the declaration including namespaces.
     */
    public get fullName(): string {

        let parentName = this.parent && this.parent.fullName;

        if (parentName) {
            return parentName + '.' + this.name;
        }
        else {
            return this.name;
        }
    }

    /**
     * Returns true, if the declaration contains child declarations.
     */
    public get hasChildren(): boolean {
        return (this._children.length > 0);
    }
    private _children: Array<IDeclaration>;

    /**
     * Returns true, if the declaration includes types.
     */
    public get hasTypes(): boolean {
        return (this._types.length > 0);
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
     * Name of this declaration.
     */
    public get name(): string {
        return this._name;
    }
    private _name: string;

    /**
     * Parent declaration of this declaration.
     */
    public get parent(): (IDeclaration | undefined) {
        return this._parent;
    }
    private _parent: (IDeclaration | undefined);

    /**
     * Named root of this declaration.
     */
    public get root (): (IDeclaration | undefined) {

        let root = this.parent;

        while (root && root.parent && root.parent.name) {
            root = root.parent;
        }

        return root;
    }

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
     * @param declarations
     *        The declarations to add.
     */
    public addChildren(...declarations: Array<IDeclaration>) {

        let children = this._children,
            name = '';

        declarations.forEach(declaration => {

            name = declaration.name;

            if (declaration === this ||
                declaration === this.root
            ) {
                throw new Error(
                    'Declaration is already part of this namespace.' +
                    ' (' + name + '<=>' + this.name + ')'
                );
            }

            if (declaration.parent) {
                throw new Error(
                    'Declaration has already a parent.' +
                    ' (' + this.name + '.' + name + ')'
                );
            }

            children.push(declaration);
            declaration._parent = this;
        });
    }

    /**
     * Test parent relation and returns true if parent kind matchs.
     *
     * @param kinds
     *        The possible kinds to test again.
     */
    public childOfKind (...kinds: Array<Kinds>): boolean {
        return (this.parent && this.parent.kindOf(...kinds) || false);
    }

    /**
     * Test parent relations and returns true if one of the parents contains
     * type.
     *
     * @param fullName
     *        Full name to check.
     */
    public childOfName (fullName: string): boolean {

        let found = false,
            parent = this.parent;

        while (parent) {
            if (fullName === parent.fullName) {
                found = true;
                break;
            }
            else {
                parent = parent.parent;
            }
        }

        return found;
    }

    /**
     * Checks parent relation.
     */
    public childOfSpace (): boolean {
        return this.childOfKind('global', 'module', 'namespace');
    }

    /**
     * Returns a clone of this declaration.
     */
    public abstract clone (): IDeclaration;

    /**
     * Returns the child declarations of this declaration, if founded.
     *
     * @param name
     *        The name of the child declaration.
     */
    public getChildren (name?: string): Array<IDeclaration> {

        if (!name) {
            return this._children.sort(IDeclaration.sortDeclaration);
        }

        let foundChildren = [] as Array<IDeclaration>;

        this._children.forEach(child => {
            if (child.name === name) {
                foundChildren.push(child);
            }
        });

        return foundChildren;
    }

    /**
     * Returns a sorted array with the names of all child declarations.
     *
     * @param withFullname
     *        Set to true to get the fullname.
     */
    public getChildrenNames (withFullname?: boolean): Array<string> {

        const prefix = (withFullname ? this.fullName + '.' : '');

        return this.getChildren().map(child => prefix + child.name);
    }

    /**
     * Returns true, if declaration is of given kind.
     *
     * @param kinds
     *        Declarations kinds looking for.
     */
    public kindOf (...kinds: Array<Kinds>): boolean {
        return kinds.some(kind => kind === this.kind);
    }

    /**
     * Removes a child declaration from this declaration and returns the child
     * declaration, if founded.
     *
     * @param name
     *        Name of the child declaration.
     */
    public removeChild (name: string): Array<IDeclaration> {

        let recoverChildren = [] as Array<IDeclaration>,
            removedChildren = [] as Array<IDeclaration>;

        this._children.forEach(child => {
            if (child.name !== name) {
                recoverChildren.push(child);
            }
            else {
                removedChildren.push(child);
                child._parent = undefined;
            }
        });

        this._children.length = 0;
        this._children.push(...recoverChildren);

        return removedChildren;
    }

    /**
     * Removes all child declarations from this declaration and returns them as
     * an array.
     */
    public removeChildren (): Array<IDeclaration> {

        let removedChildren = [] as Array<IDeclaration>;

        this.getChildrenNames()
            .forEach(childName => {

                let children = this.removeChild(childName);

                if (children.length > 0) {
                    removedChildren.push(...children);
                }
            });

        return removedChildren;
    }

    /**
     * Returns the TypeScript declarations of all children as a joined string.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param infix
     *        The separation string between children.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    protected renderChildren (
        indent: string = '', infix: string = '', withoutDoclet: boolean = false
    ): string {

        if (!this.hasChildren) {
            return '';
        }

        return this
            .getChildren()
            .map(child => child.toString(indent, withoutDoclet))
            .join(infix);
    }

    /**
     * Return the comment lines with the default value for this TypeScript
     * declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     */
    protected renderDefaultValue (indent: string = ''): string {

        if (typeof this.defaultValue === 'undefined') {
            return '';
        }

        return (
            indent + ' * (Default value: ' + this.defaultValue + ')\n'
        );
    }

    /**
     * Returns the comment string for this TypeScript declaration.
     *
     * @param indent 
     *        The indentation string for formatting.
     *
     * @param includeMeta
     *        True for extra lines with additional information;
     */
    protected renderDescription (
        indent: string = '', includeMeta: boolean = false
    ): string {

        if (!this.description) {
            return '';
        }

        let renderedDescription = IDeclaration.normalize(
            this.description, true
        );

        renderedDescription = IDeclaration.indent(
            renderedDescription,
            indent + ' * '
        );

        if (includeMeta) {
            let renderedDefaultValue = this.renderDefaultValue(indent),
                renderedSee = this.renderSee(indent);

            if (renderedDefaultValue) {
                renderedDescription += renderedDefaultValue;
            }

            if (renderedSee) {
                renderedDescription += (
                    indent + ' *' + '\n' +
                    renderedSee
                );
            }
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
    protected renderScopePrefix (): string {

        switch (this.parent && this.parent.kind) {
            default:
                return '';
            case 'class':
                let str = ''; // public is default
                if (this.isPrivate) {
                    str = 'private ';
                }
                if (this.isStatic) {
                    str += 'static ';
                }
                return str;
            case 'namespace':
                switch (this.parent && this.parent.name) {
                    default:
                        switch (this.kind) {
                            default:
                                return 'declare ';
                            case 'function':
                            case 'property':
                                return 'export ';
                        }
                    case 'external:':
                        return '';
                }
            case 'global':
                switch (this.kind) {
                    default:
                        return 'export ';
                    case 'module':
                    case 'namespace':
                        return 'declare ';
                }
        }
    }

    /**
     * Return the comment lines with the see links for this TypeScript
     * declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     */
    protected renderSee (indent: string = ''): string {

        let see = this.see;

        if (see.length === 0) {
            return '';
        }

        return (
            see.map(link => indent + ' * @see ' + link)
                .join('\n') + '\n'
        );
    }

    /**
     * Returns the possible types of this TypeScript declaration.
     *
     * @param useParentheses
     *        Wraps several types in parentheses.
     *
     * @param filterUndefined
     *        Whether to filter undefined, if declaration has an optional flag.
     */
    protected renderTypes (
        useParentheses: boolean = false,
        filterUndefined: boolean = false,
        filterFunctions: boolean = false
    ): string {

        const root = this.root;

        let types = this.types.slice();

        if (root && root.name) {
            types = IDeclaration.simplifyType(root.name, ...types);
        }

        if (filterUndefined &&
            this.isOptional
        ) {
            types = types.filter(type => type !== 'undefined');
        }

        if (filterFunctions) {
            types = types.map(type => type.replace(
                    new RegExp(IDeclaration.TYPE_NAME, 'gm'),
                    (match, name, separator) => {
                        switch(name) {
                            default:
                                return match;
                            case 'function':
                            case 'Function':
                                return '() => void' + separator;
                        }
                    }
            ));
        }

        if (types.length === 0) {
            return '';
        }

        if (useParentheses &&
            types.length > 1
        ) {
            return '(' + types.sort(IDeclaration.sortType).join('|') + ')';
        } else {
            return types.sort(IDeclaration.sortType).join('|');
        }
    }

    /**
     * Returns a rendered string of this TypeScript declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public abstract toString (indent?: string, withoutDoclet?: boolean): string;
}

/**
 * Extended base class for TypeScript declarations with parameters and types
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
     * @param name
     *        The name of the declaration.
     */
    public constructor (name: string) {

        super(name);

        this._events = [];
        this._parameters = [];
        this._typesDescription = '';
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * The events, this declaration emits.
     */
    public get events(): Array<string> {
        return this._events;
    }
    private _events: Array<string>;

    /**
     * Returns true, if declaration has parameters.
     */
    public get hasParameters(): boolean {
        return this._parameters.length > 0;
    }
    private _parameters: Array<ParameterDeclaration>;

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
     * Returns a parameter declaration, if founded.
     */
    public getParameter(name: string): (ParameterDeclaration|undefined) {

        return this
            .getParameters()
            .find(parameter => parameter.name === name);
    }

    public getParameters(): Array<ParameterDeclaration> {

        return this._parameters.slice();
    }

    /**
     * Returns an array with the names of all parameter declarations.
     */
    public getParameterNames(): Array<string> {

        return this
            .getParameters()
            .map(parameter => parameter.name);
    }

    /**
     * Returns the comment lines of emitted events for this TypeScript
     * declaration.
     */
    protected renderEvents(indent: string = ''): string {

        let events = this.events.map(eventName => {

            let colonIndex = eventName.indexOf('#event:');

            if (this.parent &&
                colonIndex > -1
            ) {
                return eventName.substr(colonIndex + 7);
            }
            else {
                return eventName;
            }
        });

        if (events.length === 0) {
            return '';
        }

        return (
            events
                .map(eventName => indent + ' * @fires ' + eventName)
                .join('\n') + '\n'
        );
    }

    /**
     * Returns the parameter brackets of this TypeScript declaration.
     */
    protected renderParameterBrackets(): string {

        let parameters = this._parameters;

        if (!this.hasParameters) {
            return '()';
        }

        return (
            '(' + parameters
                .map(parameter => parameter.toString())
                .join(', ') +
            ')'
        );
    }

    /**
     * Returns the comment lines of parameters, return, events, and see for this
     * TypeScript declaration.
     *
     * @param indent 
     *        The indentation string for formatting.
     */
    protected renderExtendedDescription(indent: string = ''): string {

        let parameters = this._parameters,
            renderedExtendedDescription = '',
            renderedEvents = this.renderEvents(indent),
            renderedSee = this.renderSee(indent);
        
        renderedExtendedDescription += parameters
            .map(parameter => parameter.renderParameterDescription(indent))
            .filter(parameter => !!parameter)
            .join(indent + ' *\n');

        if (this.typesDescription) {
            if (renderedExtendedDescription) {
                renderedExtendedDescription += indent + ' *\n';
            }
            renderedExtendedDescription += this.renderReturn(indent);
        }

        if (renderedEvents) {
            if (renderedExtendedDescription) {
                renderedExtendedDescription += indent + ' *\n';
            }
            renderedExtendedDescription += renderedEvents;
        }

        if (renderedSee) {
            if (renderedExtendedDescription) {
                renderedExtendedDescription += indent + ' *\n';
            }
            renderedExtendedDescription += renderedSee;
        }

        if (this.description) {
            if (renderedExtendedDescription) {
                renderedExtendedDescription = (
                    indent + ' *\n' + renderedExtendedDescription
                );
            }
            renderedExtendedDescription = (
                IDeclaration.indent(
                    IDeclaration.normalize(this.description, true),
                    indent + ' * '
                ) +
                renderedExtendedDescription
            );
        }

        if (!renderedExtendedDescription) {
            return '';
        }

        return (
            indent + '/**\n' +
            renderedExtendedDescription +
            indent + ' *' + '/\n'
        );
    }

    /**
     * Returns a comment line with the return information for this TypeScript
     * declaration. Uses types and typesDescription for this purpose.
     *
     * @param indent 
     *        The indentation string for formatting.
     */
    protected renderReturn(indent: string = ''): string {

        if (!this.typesDescription) {
            return '';
        }

        return (
            indent + ' * @return ' +
            IDeclaration
                .indent(
                    IDeclaration.normalize(this.typesDescription, true),
                    indent + ' *         '
                )
                .substr(indent.length + 11)
        );
    }

    /**
     * Adds parameter declarations to this TypeScriot declaration.
     *
     * @param merge
     *        Merge parameters with existing ones.
     *
     * @param declarations
     *        The parameter declarations to add.
     */
    public setParameters(...declarations: Array<ParameterDeclaration>) {

        let parameters = this._parameters,
            parameterNames = this.getParameterNames(),
            name = '';

        declarations.forEach(declaration => {

            if (declaration.parent) {
                throw new Error('Parameter declaration has already a parent.');
            }

            declaration.setParameterParent(this);

            name = declaration.name;

            if (parameterNames.indexOf(name) === -1) {
                parameters.push(declaration)
            }
        });
    }

    /**
     * Returns a rendered string of this extended TypeScript declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public abstract toString(indent?: string, withoutDoclet?: boolean): string;
}

/**
 * Class for class declarations in TypeScript.
 *
 * @extends IExtendedDeclaration
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
     * True, if class implements interfaces.
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
     * Returns a clone of this class declaration.
     */
    public clone (): ClassDeclaration {

        let clone = new ClassDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.typesDescription = this.typesDescription;
        clone.events.push(...this.events);
        clone.implements.push(...this.implements);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));
        clone.setParameters(...this.getParameters().map(
            parameter => parameter.clone()
        ));

        return clone;
    }

    /**
     * Returns a rendered string of this class declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString (
        indent: string = '',
        withoutDoclet: boolean = false
    ): string {

        if (this.hasParameters &&
            this.getChildren('constructor').length === 0
        ) {
            let constructor = new ConstructorDeclaration();
            constructor.description = this.description;
            constructor.setParameters(...this.getParameters());
            this.addChildren(constructor);
        }

        let childIndent = indent + '    ',
            renderedChildren = this.renderChildren(
                childIndent, undefined, withoutDoclet
            ),
            renderedClass = 'class ' + this.name,
            renderedDescription = this.renderDescription(indent);

        if (this.hasTypes) {
            renderedClass += (
                ' extends ' + this.renderTypes().replace('|', ', ')
            );
        }

        if (this.hasImplements) {
            renderedClass += ' implements ' + this.implements.join(', ');
        }

        renderedClass = this.renderScopePrefix() + renderedClass;

        if (renderedChildren) {
            renderedChildren = (
                '{\n' +
                renderedChildren +
                indent + '}'
            );
        }
        else {
            renderedChildren = '{}';
        }

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            IDeclaration.breakLongLines(
                indent + renderedClass + ' ' + renderedChildren + '\n'
            )
        );
    }
}

/**
 * Class for constructor declarations in TypeScript. This is used by the class
 * declaration.
 *
 * @extends IExtendedDeclaration
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

        super('constructor');
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
     * Returns a clone of this constructor declaration.
     */
    public clone (): ConstructorDeclaration {

        let clone = new ConstructorDeclaration();

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.typesDescription = this.typesDescription;
        clone.events.push(...this.events);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));
        clone.setParameters(...this.getParameters().map(
            parameter => parameter.clone()
        ));

        return clone;
    }

    /**
     * Returns a rendered string of this constructor declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString (
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let renderedConstructor = 'constructor',
            renderedDescription = this.renderExtendedDescription(indent);
        
        renderedConstructor += this.renderParameterBrackets();

        renderedConstructor = this.renderScopePrefix() + renderedConstructor;

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            IDeclaration.breakLongLines(indent + renderedConstructor + ';\n')
        );
    }
}

/**
 * Class for event declarations in TypeScript's doclets.
 *
 * @extends IDeclaration
 */
export class EventDeclaration extends IDeclaration {

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'event';

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a clone of this function declaration.
     */
    public clone(): EventDeclaration {

        let clone = new EventDeclaration(this.name);

        clone.description = this.description;
        clone.types.push(...this.types);

        return clone;
    }

    /**
     * Returns a rendered string of this event declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString(
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let renderedDescription = this.renderDescription(indent),
            renderedTypes = this.renderTypes(false);

        if (renderedDescription) {
            renderedDescription += indent + ' *\n';
        }

        if (withoutDoclet) {
            return '';
        }

        return (
            renderedDescription +
            indent + ' * @event ' + this.fullName + '\n' +
            indent + ' * @type {' + renderedTypes + '}\n'
        );
    }
}

/**
 * Class for external module declarations in TypeScript.
 * 
 * @extends IDeclaration
 */
export class ExternalModuleDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    public constructor (name: string, relativePath: string) {

        super(name);

        this._path = relativePath;

    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Kind of declaration.
     */
    public readonly kind = 'module';

    public get path (): string {
        return this._path;
    }
    public set path (value: string) {
        this._path = value;
    }
    private _path: string;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a clone of this namespace declaration.
     */
    public clone (): ExternalModuleDeclaration {

        let clone = new ExternalModuleDeclaration(this.name, this.path);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));

        return clone;
    }

    /**
     * Returns a rendered string of this namespace declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString (
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let childIndent = indent + '    ',
            renderedChildren = this.renderChildren(
                childIndent, undefined, withoutDoclet
            ),
            renderedDescription = this.renderDescription(indent),
            renderedModule = 'module "' + this.path + '"';

        renderedModule = this.renderScopePrefix() + renderedModule;

        if (renderedChildren) {
            renderedChildren = '{\n' + renderedChildren + indent + '}';
        }
        else {
            renderedChildren = '{}';
        }

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            indent + renderedModule + ' ' + renderedChildren+ '\n'
        );
    }
}

/**
 * Class for function declarations in TypeScript.
 *
 * @extends IExtendedDeclaration
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
     * Returns a clone of this function declaration.
     */
    public clone(): FunctionDeclaration {

        let clone = new FunctionDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.typesDescription = this.typesDescription;
        clone.events.push(...this.events);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));
        clone.setParameters(...this.getParameters().map(
            parameter => parameter.clone()
        ));

        return clone;
    }

    /**
     * Returns a rendered string of this function declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString(
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let renderedDescription = this.renderExtendedDescription(indent),
            renderedFunction = this.name,
            renderedParameters = this.renderParameterBrackets(),
            renderedScope = this.renderScopePrefix(),
            renderedReturn = this.renderTypes(true, true, true);

        renderedFunction += renderedParameters + ': ';
        renderedFunction += (renderedReturn || 'void');

        if (this.childOfSpace()) {
            renderedFunction = renderedScope + 'function ' + renderedFunction;
        }
        else {
            renderedFunction = (renderedScope + renderedFunction).trim();
        }

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            IDeclaration.breakLongLines(indent + renderedFunction + ';\n')
        );
    }
}

/**
 * Class for function type declarations in TypeScript.
 *
 * @extends IExtendedDeclaration
 */
export class FunctionTypeDeclaration extends IExtendedDeclaration {

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
     * Returns a clone of this type declaration.
     */
    public clone (): FunctionTypeDeclaration {

        let clone = new FunctionTypeDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.typesDescription = this.typesDescription;
        clone.events.push(...this.events);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));
        clone.setParameters(...this.getParameters().map(
            parameter => parameter.clone()
        ));

        return clone;
    }

    /**
     * Returns a rendered string of this type declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString(
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let renderedDescription = this.renderExtendedDescription(indent),
            renderedParameters = this.renderParameterBrackets(),
            renderedScope = this.renderScopePrefix(),
            renderedType = this.renderTypes(true);
        
        if (!renderedType) {
            renderedType = 'void';
        }

        renderedType = renderedParameters + ' => ' + renderedType;
        renderedType = 'type ' + this.name + ' = ' + renderedType + ';';

        if (renderedScope) {
            renderedType = renderedScope + renderedType;
        }

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            IDeclaration.breakLongLines(indent + renderedType + '\n')
        );
    }
}

/**
 * Class for interface declarations in TypeScript.
 *
 * @extends IDeclaration
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
     * Returns a clone of this interface declaration.
     */
    public clone (): InterfaceDeclaration {

        let clone = new InterfaceDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));

        return clone;
    }

    /**
     * Returns a rendered string of this interface declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString(
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let childIndent = indent + '    ',
            renderedChildren = this.renderChildren(
                childIndent, undefined, withoutDoclet
            ),
            renderedDescription = this.renderDescription(indent, true),
            renderedInterface = this.name;

        if (!this.childOfSpace()) {
            renderedInterface += ': ';
        } else {

            renderedInterface = 'interface ' + renderedInterface;

            if (this.hasTypes) {
                renderedInterface += ' extends ' + this.renderTypes().replace('|', ', ');
            }
        }

        renderedInterface = this.renderScopePrefix() + renderedInterface;

        if (renderedChildren) {
            renderedChildren = (
                '{\n' +
                renderedChildren +
                indent + '}'
            );
        }
        else {
            renderedChildren = '{}';
        }

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            IDeclaration.breakLongLines(
                indent + renderedInterface + ' ' + renderedChildren + '\n'
            )
        );
    }
}

/**
 * Class for declarations in a module file.
 *
 * @extends IDeclaration
 */
export class ModuleDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Initiates a new global declaration.
     */
    public constructor (name: string = '') {

        super(name);

        this._copyright = '';
        this._exports = [];
        this._imports = [];
    }

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Copyright header
     */
    public get copyright (): string {
        return this._copyright;
    }
    public set copyright (value: string) {
        this._copyright = value;
    }
    private _copyright: string;

    /**
     * Import statemens.
     */
    public get exports (): Array<string> {
        return this._exports;
    }
    private _exports: Array<string>;

    /**
     * Import statemens.
     */
    public get imports (): Array<string> {
        return this._imports;
    }
    private _imports: Array<string>;

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
     * Returns a clone of this global declaration.
     */
    public clone(): ModuleDeclaration {

        let clone = new ModuleDeclaration(this.name);

        clone.copyright = this.copyright;
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.exports.push(...this.exports);
        clone.imports.push(...this.imports);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));

        return clone;
    }

    /**
     * Return the copyright header.
     */
    protected renderCopyright(): string {

        if (!this.copyright) {
            return '';
        }

        let renderedCopyright = IDeclaration.normalize(
            this.copyright, true
        );

        renderedCopyright = IDeclaration.indent(
            renderedCopyright,
            ' *  '
        );

        return (
            '/' + '*!*\n *\n' +
            renderedCopyright +
            ' *\n *!*' + '/\n'
        );
    }

    /**
     * Returns a rendered string of assigned exports statements.
     */
    protected renderExports(): string {

        if (this.exports.length === 0) {
            return '';
        }

        return (
            this.exports.join('\n') + '\n'
        );
    }

    /**
     * Returns a rendered string of assigned import statements.
     */
    protected renderImports(): string {

        if (this.imports.length === 0) {
            return '';
        }

        return (
            this.imports.join('\n') + '\n'
        );
    }

    /**
     * Returns a rendered string of this global declaration.
     *
     * @param indent
     *        The indentation string for formatting child declarations.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString(indent: string = '', withoutDoclet: boolean = false): string {

        let renderedChildren = this.renderChildren(
                indent, undefined, withoutDoclet
            ),
            renderedCopyright = this.renderCopyright(),
            renderedDescription = this.renderDescription(''),
            renderedExports = this.renderExports(),
            renderedImports = this.renderImports();

        if (renderedDescription) {
            renderedDescription = (
                renderedDescription.replace('/**', '/*') + '\n'
            );
        }

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedCopyright +
            renderedDescription +
            renderedImports +
            renderedChildren +
            renderedExports
        );
    }
}

/**
 * Class for namespace declarations in TypeScript.
 *
 * @extends IDeclaration
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
     * Returns a clone of this namespace declaration.
     */
    public clone (): NamespaceDeclaration {

        let clone = new NamespaceDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));

        return clone;
    }

    /**
     * Returns a rendered string of this namespace declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString (
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let childIndent = indent + '    ',
            renderedChildren = this.renderChildren(
                childIndent, undefined, withoutDoclet
            ),
            renderedDescription = this.renderDescription(indent),
            renderedNamespace = (
                this.name === 'external:' ?
                'global' :
                'namespace ' + this.name.replace(':', '')
            );

        renderedNamespace = this.renderScopePrefix() + renderedNamespace;

        if (renderedChildren) {
            renderedChildren = (
                '{\n' +
                renderedChildren +
                indent + '}'
            );
        }
        else {
            renderedChildren = '{}';
        }

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            indent + renderedNamespace + ' ' + renderedChildren+ '\n'
        );
    }
}

/**
 * Class for parameter declarations in TypeScript, that are used in the
 * constructor and functions.
 *
 * @extends IDeclaration
 */
export class ParameterDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Initiates a new parameter declaration.
     *
     * @param name
     *        The name of the parameter.
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
    public readonly kind = 'parameter';

    /**
     * Variable number of parameters.
     */
    public get isVariable (): boolean {
        return this._isVariable;
    }
    public set isVariable (value: boolean) {
        this._isVariable = value;
    }
    private _isVariable: boolean;

    public get parameterParent (): (IDeclaration|undefined) {
        return this._parameterParent;
    }
    private _parameterParent: (IDeclaration|undefined);

    public get parent (): (IDeclaration|undefined) {
        return (this.parameterParent && this.parameterParent.parent);
    }

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a clone of this parameter declaration.
     */
    public clone (): ParameterDeclaration {

        let clone = new ParameterDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.isVariable = this.isVariable;
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));

        return clone;
    }

    /**
     * Returns a rendered string of the comment part for the parameter.
     *
     * @param indent
     *        The indentation string for formatting.
     */
    public renderParameterDescription (indent: string = ''): string {

        if (!this.description) {
            return '';
        }

        let defaultValue = (this.defaultValue || '').toString(),
            renderedTypes = '@param ' + this.name;

        if (defaultValue) {
            defaultValue = ' (Default value: ' + defaultValue + ')';
        }

        return (
            indent + ' * ' + renderedTypes + '\n' +
            IDeclaration.indent(
                IDeclaration.normalize(this.description + defaultValue, true),
                indent + ' *        '
            )
        );
    }

    public setParameterParent (parentDeclaration: IDeclaration) {

        this._parameterParent = parentDeclaration;
    }

    /**
     * Returns a rendered string of this parameter declaration.
     */
    public toString (): string {

        let renderedParameter = this.name,
            renderedTypes = this.renderTypes(true, true, true);

        if (this.isOptional) {
            renderedParameter += '?';
        }

        if (this.isVariable) {
            renderedParameter = '...' + renderedParameter;
            renderedTypes = 'Array<' + renderedTypes + '>';
        }

        renderedParameter += ': ' + renderedTypes;

        return renderedParameter;
    }
}

/**
 * Class for property declarations in TypeScript, that can be found in a class,
 * global scope, interface, and namespace.
 *
 * @extends IDeclaration
 */
export class PropertyDeclaration extends IDeclaration {

    /* *
     *
     *  Constructor
     *
     * */

    public constructor (name: string) {

        super(name);

        this._isIndexer = (name[0] === '[');
        this._isReadOnly = false;
    }

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

    public get isIndexer(): boolean {
        return this._isIndexer;
    }
    private _isIndexer: boolean;

    /**
     * Returns true, if property can not changed directly.
     */
    public get isReadOnly(): boolean {
        return this._isReadOnly;
    }
    public set isReadOnly(value: boolean) {
        this._isReadOnly = value;
    }
    private _isReadOnly: boolean;

    /* *
     *
     *  Functions
     *
     * */

    /**
     * Returns a clone of this property declaration.
     */
    public clone (): PropertyDeclaration {

        let clone = new PropertyDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isReadOnly = this.isReadOnly;
        clone.isStatic = this.isStatic;
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));

        return clone;
    }


    /**
     * Returns a rendered string of this property declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString (
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let childIndent = indent + '    ',
            childOfSpace = this.childOfSpace(),
            isIndexer = false,
            renderedDescription = this.renderDescription(indent, true),
            renderedMember = this.name.replace(':', ': ');

        // special treatment for indexers
        if (renderedMember[0] === '[' &&
            renderedMember.indexOf(' ') > -1
        ) {

            const root = this.root;

            if (root && root.name) {

                // type is part of the member name
                let typePosition = (renderedMember.lastIndexOf(' ') + 1),
                    type = renderedMember.substr(typePosition);

                renderedMember = renderedMember.substr(0, typePosition);
                renderedMember += IDeclaration.simplifyType(root.name, type)[0];

                isIndexer = true;
            }
        }

        if (!isIndexer) {

            if (this.isReadOnly) {
                renderedMember = 'readonly ' + renderedMember;
            }

            if (childOfSpace) {
                renderedMember = 'let ' + renderedMember;
            }

            if (this.isOptional) {

                if (!childOfSpace) {
                    renderedMember += '?';
                }
                else if (this.types.indexOf('undefined') === -1) {
                    this.types.push('undefined');
                }
            }
        }

        if (this.hasChildren) {
            renderedMember += (
                ': {\n' +
                this.renderChildren(childIndent, undefined, withoutDoclet) +
                indent + '};'
            );
        } else if (this.hasTypes) {
            renderedMember += (
                ': ' +
                this.renderTypes(true, this.isIndexer, !childOfSpace) +
                ';'
            );
        } else {
            renderedMember += ': any;';
        }

        renderedMember = this.renderScopePrefix() + renderedMember + '\n';

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            IDeclaration.breakLongLines(indent + renderedMember)
        );
    }
}

/**
 * Class for type alias declarations in TypeScript.
 *
 * @extends IDeclaration
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
     * Returns a clone of this type declaration.
     */
    public clone (): TypeDeclaration {

        let clone = new TypeDeclaration(this.name);

        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));

        return clone;
    }

    /**
     * Returns a rendered string of this type declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     *
     * @param withoutDoclet
     *        Set to true to get declarations without any description.
     */
    public toString(
        indent: string = '', withoutDoclet: boolean = false
    ): string {

        let childIndent = indent + '    ',
            renderedChildren = this.renderChildren(
                childIndent, undefined, withoutDoclet
            ),
            renderedDescription = this.renderDescription(indent),
            renderedType = this.renderTypes(true);

        if (!renderedType) {
            renderedType = 'any';
        }

        if (this.hasChildren) {
            renderedType = (
                'type ' + this.name + ' = {\n' +
                renderedChildren +
                indent + '};'
            );
        } else {
            renderedType = 'type ' + this.name + ' = ' + renderedType + ';';
        }

        renderedType = this.renderScopePrefix() + renderedType + '\n';

        if (withoutDoclet) {
            renderedDescription = '';
        }

        return (
            renderedDescription +
            IDeclaration.breakLongLines(indent + renderedType)
        );
    }
}
