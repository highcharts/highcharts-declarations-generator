"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeDeclaration = exports.PropertyDeclaration = exports.ParameterDeclaration = exports.NamespaceDeclaration = exports.ModuleDeclaration = exports.InterfaceDeclaration = exports.FunctionTypeDeclaration = exports.FunctionDeclaration = exports.ExternalModuleDeclaration = exports.EventDeclaration = exports.ConstructorDeclaration = exports.ClassDeclaration = exports.IExtendedDeclaration = exports.IDeclaration = void 0;
;
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
class IDeclaration extends Object {
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
    constructor(name, ...types) {
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
        this._types = [...types];
        this._uniqueID = 0;
    }
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
    static breakLongLines(sourceCode, maxLength = 200) {
        return sourceCode
            .split('\n')
            .map(line => {
            let breakPosition = -1, currentLine = '', extraLines = '';
            while (line.length > maxLength) {
                currentLine = line.substr(0, maxLength);
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
    static extractTypeNames(...types) {
        let extractedTypes = [], search = new RegExp(IDeclaration.EXTRACT_TYPE_NAMES, 'gm');
        types.forEach(type => extractedTypes.push(...(type.match(search) || [])));
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
    static indent(text, linePrefix = '', wrap = 80) {
        let newLine = true, line = '', paddedStr = '', words = text.split(new RegExp(IDeclaration.PAD_SPACE, 'gm'));
        words.forEach(word => {
            if (!newLine && word === '') {
                paddedStr += (line.trimRight() + '\n' +
                    linePrefix.trimRight() + '\n');
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
    static namespaces(name, withFullNames = false) {
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
                subspace.indexOf(':string') === -1) {
                subspace = subspace.replace(':', ' in ');
            }
            namespaces[namespaces.length - 1] += subspace;
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
    static normalize(text, preserveParagraphs = false) {
        if (preserveParagraphs) {
            return text
                .replace(new RegExp(IDeclaration.NORMALIZE_ESCAPE, 'gm'), '<br>')
                .replace(new RegExp(IDeclaration.NORMALIZE_LIST, 'gm'), '<br>-')
                .replace(new RegExp(IDeclaration.NORMALIZE_SPACE, 'gm'), ' ')
                .replace(new RegExp(IDeclaration.NORMALIZE_UNESCAPE, 'gm'), '\n\n');
        }
        else {
            return text.replace(new RegExp(IDeclaration.NORMALIZE_SPACE, 'gm'), ' ');
        }
    }
    /**
     * Returns a simplified name of a provided full qualified name.
     *
     * @param name
     *        The name to simplify.
     */
    static simplifyName(name) {
        let nameParts = IDeclaration.namespaces(name);
        return (nameParts[nameParts.length - 1] || '');
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
    static simplifyType(rootName, ...types) {
        rootName = rootName + '.';
        const scopeLength = rootName.length;
        return types.map(type => type.replace(new RegExp(IDeclaration.TYPE_NAME, 'gm'), (match, name, suffix) => (name.startsWith(rootName) ?
            name.substr(scopeLength) + suffix :
            match)));
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
    static sortDeclaration(declarationA, declarationB) {
        let index1 = IDeclaration.KIND_ORDER.indexOf(declarationA.kind), index2 = IDeclaration.KIND_ORDER.indexOf(declarationB.kind);
        if (index1 !== index2) {
            return (index1 - index2);
        }
        let nameA = declarationA.name.toLowerCase(), nameB = declarationB.name.toLowerCase();
        if (nameA !== nameB) {
            return (nameA < nameB ? -1 : 1);
        }
        if ((declarationA instanceof ConstructorDeclaration ||
            declarationA instanceof FunctionDeclaration) &&
            (declarationB instanceof ConstructorDeclaration ||
                declarationB instanceof FunctionDeclaration)) {
            let lengthA = declarationA.getParameters().length, lengthB = declarationB.getParameters().length;
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
    static sortType(typeA, typeB) {
        switch (typeA) {
            case 'any':
                return 1;
            case 'null':
                return (typeB === 'any' ? -1 :
                    typeB === 'undefined' ? -1 :
                        1);
            case 'undefined':
                return (typeB === 'any' ? -1 : 1);
        }
        switch (typeB) {
            case 'any':
            case 'null':
            case 'undefined':
                return -1;
        }
        if ((typeA[0] === '(' &&
            typeB[0] !== '(') ||
            (typeA[0] === '{' &&
                typeB[0] !== '{')) {
            return -1;
        }
        if ((typeB[0] === '(' &&
            typeA[0] !== '(') ||
            (typeB[0] === '{' &&
                typeA[0] !== '{')) {
            return 1;
        }
        if (typeA.indexOf('<') > -1 &&
            typeB.indexOf('<') === -1) {
            return 1;
        }
        if (typeB.indexOf('<') > -1 &&
            typeA.indexOf('<') === -1) {
            return -1;
        }
        if (typeA[0] === '"' &&
            typeB[0] !== '"') {
            return -1;
        }
        if (typeB[0] === '"' &&
            typeA[0] !== '"') {
            return 1;
        }
        let typeALC = typeA.toLowerCase(), typeBLC = typeB.toLowerCase();
        if (typeA !== typeALC &&
            typeB === typeBLC) {
            return 1;
        }
        if (typeB !== typeBLC &&
            typeA === typeALC) {
            return -1;
        }
        return (typeALC < typeBLC ? -1 : typeALC > typeBLC ? 1 : 0);
    }
    /* *
     *
     *  Properties
     *
     * */
    /**
     * Default value and type for this declaration.
     */
    get defaultValue() {
        return this._defaultValue;
    }
    set defaultValue(value) {
        this._defaultValue = value;
    }
    /**
     * Description of this declaration.
     */
    get description() {
        return this._description;
    }
    set description(value) {
        this._description = value;
    }
    /**
     * Returns the full qualified name of the declaration including namespaces.
     */
    get fullName() {
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
    get hasChildren() {
        return (this._children.length > 0);
    }
    /**
     * Returns true, if the declaration includes types.
     */
    get hasTypes() {
        return (this._types.length > 0);
    }
    /**
     * Requirement of this TypeScript declaration.
     */
    get isOptional() {
        return this._isOptional;
    }
    set isOptional(value) {
        this._isOptional = value;
    }
    /**
     * Visibility of this TypeScript declaration.
     */
    get isPrivate() {
        return this._isPrivate;
    }
    set isPrivate(value) {
        this._isPrivate = value;
    }
    /**
     * Instantiation of this TypeScript declaration.
     */
    get isStatic() {
        return this._isStatic;
    }
    set isStatic(value) {
        this._isStatic = value;
    }
    /**
     * Name of this declaration.
     */
    get name() {
        return this._name;
    }
    /**
     * Parent declaration of this declaration.
     */
    get parent() {
        return this._parent;
    }
    /**
     * Named root of this declaration.
     */
    get root() {
        let root = this.parent;
        while (root && root.parent && root.parent.name) {
            root = root.parent;
        }
        return root;
    }
    /**
     * Link references in this TypeScript declaration.
     */
    get see() {
        return this._see;
    }
    /**
     * Types of this TypeScript declaration.
     */
    get types() {
        return this._types;
    }
    /**
     * Unique ID to identify clones.
     */
    get uniqueID() {
        return this._uniqueID;
    }
    set uniqueID(value) {
        this._uniqueID = value;
    }
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
    addChildren(...declarations) {
        let children = this._children, name = '';
        declarations.forEach(declaration => {
            name = declaration.name;
            if (declaration === this ||
                declaration === this.root) {
                throw new Error('Declaration is already part of this namespace.' +
                    ' (' + name + '<=>' + this.name + ')');
            }
            if (declaration.parent) {
                throw new Error('Declaration has already a parent.' +
                    ' (' + this.name + '.' + name + ')');
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
    childOfKind(...kinds) {
        return (this.parent && this.parent.kindOf(...kinds) || false);
    }
    /**
     * Test parent relations and returns true if one of the parents contains
     * type.
     *
     * @param fullName
     *        Full name to check.
     */
    childOfName(fullName) {
        let found = false, parent = this.parent;
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
    childOfSpace() {
        return this.childOfKind('global', 'module', 'namespace');
    }
    /**
     * Returns the child declarations of this declaration, if founded.
     *
     * @param name
     *        The name of the child declaration.
     */
    getChildren(name) {
        if (!name) {
            return this._children.sort(IDeclaration.sortDeclaration);
        }
        let foundChildren = [];
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
    getChildrenNames(withFullname) {
        const prefix = (withFullname ? this.fullName + '.' : '');
        return this.getChildren().map(child => prefix + child.name);
    }
    /**
     * Returns a array with the referenced types of this declaration.
     *
     * @param includeChildren
     *        True, to include referenced types of child declarations
     */
    getReferencedTypes(includeChildren) {
        const referencedTypes = [];
        if (this instanceof IExtendedDeclaration) {
            this.getParameters()
                .forEach(parameter => referencedTypes.push(...IDeclaration
                .extractTypeNames(...parameter.types)
                .filter(type => referencedTypes.indexOf(type) === -1)));
        }
        referencedTypes.push(...IDeclaration
            .extractTypeNames(...this.types)
            .filter(type => referencedTypes.indexOf(type) === -1));
        if (includeChildren) {
            this
                .getChildren()
                .forEach(child => referencedTypes.push(...child
                .getReferencedTypes(includeChildren)
                .filter(type => referencedTypes.indexOf(type) === -1)));
        }
        return referencedTypes;
    }
    /**
     * Returns true, if declaration is of given kind.
     *
     * @param kinds
     *        Declarations kinds looking for.
     */
    kindOf(...kinds) {
        return kinds.some(kind => kind === this.kind);
    }
    /**
     * Removes a child declaration from this declaration and returns the child
     * declaration, if founded.
     *
     * @param name
     *        Name of the child declaration.
     */
    removeChild(name) {
        let recoverChildren = [], removedChildren = [];
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
    removeChildren() {
        let removedChildren = [];
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
    renderChildren(indent = '', infix = '', withoutDoclet = false) {
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
    renderDefaultValue(indent = '') {
        if (typeof this.defaultValue === 'undefined') {
            return '';
        }
        return (indent + ' * (Default value: ' + this.defaultValue + ')\n');
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
    renderDescription(indent = '', includeMeta = false) {
        if (!this.description) {
            return '';
        }
        let renderedDescription = IDeclaration.normalize(this.description, true);
        renderedDescription = IDeclaration.indent(renderedDescription, indent + ' * ');
        if (includeMeta) {
            let renderedDefaultValue = this.renderDefaultValue(indent), renderedSee = this.renderSee(indent);
            if (renderedDefaultValue) {
                renderedDescription += renderedDefaultValue;
            }
            if (renderedSee) {
                renderedDescription += (indent + ' *' + '\n' +
                    renderedSee);
            }
        }
        return (indent + '/**\n' +
            renderedDescription +
            indent + ' *' + '/\n');
    }
    /**
     * Returns the visibility string of this TypeScript declaration.
     */
    renderScopePrefix() {
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
    renderSee(indent = '') {
        let see = this.see;
        if (see.length === 0) {
            return '';
        }
        return (see.map(link => indent + ' * @see ' + link)
            .join('\n') + '\n');
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
    renderTypes(useParentheses = false, filterUndefined = false, filterFunctions = false) {
        const root = this.root;
        let types = this.types.slice();
        if (root && root.name) {
            types = IDeclaration.simplifyType(root.name, ...types);
        }
        if (filterUndefined &&
            this.isOptional) {
            types = types.filter(type => type !== 'undefined');
        }
        if (filterFunctions) {
            types = types.map(type => type.replace(new RegExp(IDeclaration.TYPE_NAME, 'gm'), (match, name, separator) => {
                switch (name) {
                    default:
                        return match;
                    case 'function':
                    case 'Function':
                        return '() => void' + separator;
                }
            }));
        }
        if (types.length === 0) {
            return '';
        }
        if (useParentheses &&
            types.length > 1) {
            return '(' + types.sort(IDeclaration.sortType).join('|') + ')';
        }
        else {
            return types.sort(IDeclaration.sortType).join('|');
        }
    }
    /**
     * Returns a JSON object of the relation between TypeScript declarations for
     * debug purposes.
     */
    toJSON() {
        const json = {
            name: this.name,
            kind: this.kind
        };
        if (this.hasTypes) {
            json.types = this.types.slice();
        }
        if (this.hasChildren) {
            json.children = this
                .getChildren()
                .map(child => child.toJSON());
        }
        return json;
    }
}
exports.IDeclaration = IDeclaration;
/* *
 *
 *  Static Properties
 *
 * */
/**
 * Order of the different declaration kinds.
 */
IDeclaration.KIND_ORDER = [
    'global',
    'type',
    'interface',
    'constant',
    'enum',
    'class',
    'static property',
    'static function',
    'constructor',
    'property',
    'event',
    'function',
    'parameter',
    'module',
    'namespace'
];
/**
 * Finds all type names.
 */
IDeclaration.EXTRACT_TYPE_NAMES = (/(?:[\w\.]+?|\"(?:[^\"]|\\\")*?\")(?=[\|\,\(\)\[\]\<\>]|$)/);
/**
 * Finds separator characters in fullnames.
 */
IDeclaration.NAMESPACE_KEYWORDS = /\w+\:/;
/**
 * Finds subspaces in fullnames.
 */
IDeclaration.NAMESPACES_SUBSPACE = /(?:<.+>|\[.+\])$/;
/**
 * Escape double lines like in Markdown.
 */
IDeclaration.NORMALIZE_ESCAPE = /\n\s*\n/;
/**
 * Escape lists like in Markdown.
 */
IDeclaration.NORMALIZE_LIST = /\n(?:[\-\+\*]|\d+\.) /;
/**
 * Reduce spaces and line breaks to one space character.
 */
IDeclaration.NORMALIZE_SPACE = /\s+/;
/**
 * Unescape double lines.
 */
IDeclaration.NORMALIZE_UNESCAPE = /<br>/;
/**
 * Finds spaces and line breaks.
 */
IDeclaration.PAD_SPACE = /\s/;
/**
 * Finds path separator
 */
IDeclaration.PATH_SEPARATOR = /\/\\/;
/**
 * Finds all type names and match into two groups: type name and separator
 * suffixes (or string end).
 */
IDeclaration.TYPE_NAME = (/([\w\.]+?|\"(?:\\\\|\\\"|[^\"])*?\")([\|\,\(\)\[\]\<\>]|$)/);
/**
 * Finds all possible separator characters after a type name.
 */
IDeclaration.TYPE_SEPARATOR = /[\|\,\(\)\[\]\<\>]/;
/**
 * Extended base class for TypeScript declarations with parameters and types
 * description. This is used by class, constructor, and function declarations.
 *
 * @extends IDeclaration
 */
class IExtendedDeclaration extends IDeclaration {
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
    constructor(name) {
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
    get events() {
        return this._events;
    }
    /**
     * Returns true, if declaration has parameters.
     */
    get hasParameters() {
        return this._parameters.length > 0;
    }
    /**
     * Returns the description for the return types.
     */
    get typesDescription() {
        return this._typesDescription;
    }
    set typesDescription(value) {
        this._typesDescription = value;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a parameter declaration, if founded.
     */
    getParameter(name) {
        return this
            .getParameters()
            .find(parameter => parameter.name === name);
    }
    getParameters() {
        return this._parameters.slice();
    }
    /**
     * Returns an array with the names of all parameter declarations.
     */
    getParameterNames() {
        return this
            .getParameters()
            .map(parameter => parameter.name);
    }
    /**
     * Returns the comment lines of emitted events for this TypeScript
     * declaration.
     */
    renderEvents(indent = '') {
        let events = this.events.map(eventName => {
            let colonIndex = eventName.indexOf('#event:');
            if (this.parent &&
                colonIndex > -1) {
                return eventName.substr(colonIndex + 7);
            }
            else {
                return eventName;
            }
        });
        if (events.length === 0) {
            return '';
        }
        return (events
            .map(eventName => indent + ' * @fires ' + eventName)
            .join('\n') + '\n');
    }
    /**
     * Returns the parameter brackets of this TypeScript declaration.
     */
    renderParameterBrackets() {
        let parameters = this._parameters;
        if (!this.hasParameters) {
            return '()';
        }
        return ('(' + parameters
            .map(parameter => parameter.toString())
            .join(', ') +
            ')');
    }
    /**
     * Returns the comment lines of parameters, return, events, and see for this
     * TypeScript declaration.
     *
     * @param indent
     *        The indentation string for formatting.
     */
    renderExtendedDescription(indent = '') {
        let parameters = this._parameters, renderedExtendedDescription = '', renderedEvents = this.renderEvents(indent), renderedSee = this.renderSee(indent);
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
                renderedExtendedDescription = (indent + ' *\n' + renderedExtendedDescription);
            }
            renderedExtendedDescription = (IDeclaration.indent(IDeclaration.normalize(this.description, true), indent + ' * ') +
                renderedExtendedDescription);
        }
        if (!renderedExtendedDescription) {
            return '';
        }
        return (indent + '/**\n' +
            renderedExtendedDescription +
            indent + ' *' + '/\n');
    }
    /**
     * Returns a comment line with the return information for this TypeScript
     * declaration. Uses types and typesDescription for this purpose.
     *
     * @param indent
     *        The indentation string for formatting.
     */
    renderReturn(indent = '') {
        if (!this.typesDescription) {
            return '';
        }
        return (indent + ' * @return ' +
            IDeclaration
                .indent(IDeclaration.normalize(this.typesDescription, true), indent + ' *         ')
                .substr(indent.length + 11));
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
    setParameters(...declarations) {
        let parameters = this._parameters, parameterNames = this.getParameterNames(), name = '';
        declarations.forEach(declaration => {
            if (declaration.parent) {
                throw new Error('Parameter declaration has already a parent.');
            }
            declaration.setParameterParent(this);
            name = declaration.name;
            if (parameterNames.indexOf(name) === -1) {
                parameters.push(declaration);
            }
        });
    }
    /**
     * Returns a JSON object of the relation between TypeScript declarations for
     * debug purposes.
     */
    toJSON() {
        const json = super.toJSON();
        if (this.hasParameters) {
            json.parameters = this
                .getParameters()
                .map(parameter => parameter.toJSON());
        }
        return json;
    }
}
exports.IExtendedDeclaration = IExtendedDeclaration;
/**
 * Class for class declarations in TypeScript.
 *
 * @extends IExtendedDeclaration
 */
class ClassDeclaration extends IExtendedDeclaration {
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
    constructor(name) {
        super(name);
        /**
         * Kind of declaration.
         */
        this.kind = 'class';
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
    get hasImplements() {
        return (this._implements.length > 0);
    }
    /**
     * Implemented interfaces of this class declaration.
     */
    get implements() {
        return this._implements;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this class declaration.
     */
    clone() {
        let clone = new ClassDeclaration(this.name);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.typesDescription = this.typesDescription;
        clone.uniqueID = this.uniqueID;
        clone.events.push(...this.events);
        clone.implements.push(...this.implements);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));
        clone.setParameters(...this.getParameters().map(parameter => parameter.clone()));
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
    toString(indent = '', withoutDoclet = false) {
        if (this.hasParameters &&
            this.getChildren('constructor').length === 0) {
            let constructor = new ConstructorDeclaration();
            constructor.description = this.description;
            constructor.setParameters(...this.getParameters());
            this.addChildren(constructor);
        }
        let childIndent = indent + '    ', renderedChildren = this.renderChildren(childIndent, undefined, withoutDoclet), renderedClass = 'class ' + this.name, renderedDescription = this.renderDescription(indent);
        if (this.hasTypes) {
            renderedClass += (' extends ' + this.renderTypes().replace('|', ', '));
        }
        if (this.hasImplements) {
            renderedClass += ' implements ' + this.implements.join(', ');
        }
        renderedClass = this.renderScopePrefix() + renderedClass;
        if (renderedChildren) {
            renderedChildren = ('{\n' +
                renderedChildren +
                indent + '}');
        }
        else {
            renderedChildren = '{}';
        }
        if (withoutDoclet) {
            renderedDescription = '';
        }
        return (renderedDescription +
            IDeclaration.breakLongLines(indent + renderedClass + ' ' + renderedChildren + '\n'));
    }
}
exports.ClassDeclaration = ClassDeclaration;
/**
 * Class for constructor declarations in TypeScript. This is used by the class
 * declaration.
 *
 * @extends IExtendedDeclaration
 */
class ConstructorDeclaration extends IExtendedDeclaration {
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Initiates a new constructor declaration.
     */
    constructor() {
        super('constructor');
        /* *
         *
         *  Properties
         *
         * */
        /**
         * Kind of declaration
         */
        this.kind = 'constructor';
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this constructor declaration.
     */
    clone() {
        let clone = new ConstructorDeclaration();
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.typesDescription = this.typesDescription;
        clone.uniqueID = this.uniqueID;
        clone.events.push(...this.events);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));
        clone.setParameters(...this.getParameters().map(parameter => parameter.clone()));
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
    toString(indent = '', withoutDoclet = false) {
        let renderedConstructor = 'constructor', renderedDescription = this.renderExtendedDescription(indent);
        renderedConstructor += this.renderParameterBrackets();
        renderedConstructor = this.renderScopePrefix() + renderedConstructor;
        if (withoutDoclet) {
            renderedDescription = '';
        }
        return (renderedDescription +
            IDeclaration.breakLongLines(indent + renderedConstructor + ';\n'));
    }
}
exports.ConstructorDeclaration = ConstructorDeclaration;
/**
 * Class for event declarations in TypeScript's doclets.
 *
 * @extends IDeclaration
 */
class EventDeclaration extends IDeclaration {
    constructor() {
        /* *
         *
         *  Properties
         *
         * */
        super(...arguments);
        /**
         * Kind of declaration.
         */
        this.kind = 'event';
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this event declaration.
     */
    clone() {
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
    toString(indent = '', withoutDoclet = false) {
        let renderedDescription = this.renderDescription(indent), renderedTypes = this.renderTypes(false);
        if (renderedDescription) {
            renderedDescription += indent + ' *\n';
        }
        if (withoutDoclet) {
            return '';
        }
        return (renderedDescription +
            indent + ' * @event ' + this.fullName + '\n' +
            indent + ' * @type {' + renderedTypes + '}\n');
    }
}
exports.EventDeclaration = EventDeclaration;
/**
 * Class for external module declarations in TypeScript.
 *
 * @extends IDeclaration
 */
class ExternalModuleDeclaration extends IDeclaration {
    /* *
     *
     *  Constructor
     *
     * */
    constructor(name, relativePath) {
        super(name);
        /* *
         *
         *  Properties
         *
         * */
        /**
         * Kind of declaration.
         */
        this.kind = 'module';
        this._path = relativePath;
    }
    get path() {
        return this._path;
    }
    set path(value) {
        this._path = value;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this namespace declaration.
     */
    clone() {
        let clone = new ExternalModuleDeclaration(this.name, this.path);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.uniqueID = this.uniqueID;
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
    toString(indent = '', withoutDoclet = false) {
        let childIndent = indent + '    ', renderedChildren = this.renderChildren(childIndent, undefined, withoutDoclet), renderedDescription = this.renderDescription(indent), renderedModule = 'module "' + this.path + '"';
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
        return (renderedDescription +
            indent + renderedModule + ' ' + renderedChildren + '\n');
    }
}
exports.ExternalModuleDeclaration = ExternalModuleDeclaration;
/**
 * Class for function declarations in TypeScript.
 *
 * @extends IExtendedDeclaration
 */
class FunctionDeclaration extends IExtendedDeclaration {
    /* *
     *
     *  Properties
     *
     * */
    /**
     * Kind of declaration.
     */
    get kind() {
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
    clone() {
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
        clone.setParameters(...this.getParameters().map(parameter => parameter.clone()));
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
    toString(indent = '', withoutDoclet = false) {
        let renderedDescription = this.renderExtendedDescription(indent), renderedFunction = this.name, renderedParameters = this.renderParameterBrackets(), renderedReturn = this.renderTypes(true, true), renderedScope = this.renderScopePrefix();
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
        return (renderedDescription +
            IDeclaration.breakLongLines(indent + renderedFunction + ';\n'));
    }
}
exports.FunctionDeclaration = FunctionDeclaration;
/**
 * Class for function type declarations in TypeScript.
 *
 * @extends IExtendedDeclaration
 */
class FunctionTypeDeclaration extends IExtendedDeclaration {
    constructor() {
        /* *
         *
         *  Properties
         *
         * */
        super(...arguments);
        /**
         * Kind of declaration.
         */
        this.kind = 'type';
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this type declaration.
     */
    clone() {
        let clone = new FunctionTypeDeclaration(this.name);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.typesDescription = this.typesDescription;
        clone.uniqueID = this.uniqueID;
        clone.events.push(...this.events);
        clone.see.push(...this.see);
        clone.types.push(...this.types);
        clone.addChildren(...this.getChildren().map(child => child.clone()));
        clone.setParameters(...this.getParameters().map(parameter => parameter.clone()));
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
    toString(indent = '', withoutDoclet = false) {
        let renderedDescription = this.renderExtendedDescription(indent), renderedParameters = this.renderParameterBrackets(), renderedScope = this.renderScopePrefix(), renderedType = this.renderTypes(true);
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
        return (renderedDescription +
            IDeclaration.breakLongLines(indent + renderedType + '\n'));
    }
}
exports.FunctionTypeDeclaration = FunctionTypeDeclaration;
/**
 * Class for interface declarations in TypeScript.
 *
 * @extends IDeclaration
 */
class InterfaceDeclaration extends IDeclaration {
    constructor() {
        /* *
         *
         *  Properties
         *
         * */
        super(...arguments);
        /**
         * Kind of declaration.
         */
        this.kind = 'interface';
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this interface declaration.
     */
    clone() {
        let clone = new InterfaceDeclaration(this.name);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.uniqueID = this.uniqueID;
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
    toString(indent = '', withoutDoclet = false) {
        let childIndent = indent + '    ', renderedChildren = this.renderChildren(childIndent, undefined, withoutDoclet), renderedDescription = this.renderDescription(indent, true), renderedInterface = this.name;
        if (!this.childOfSpace()) {
            renderedInterface += ': ';
        }
        else {
            renderedInterface = 'interface ' + renderedInterface;
            if (this.hasTypes) {
                renderedInterface += ' extends ' + this.renderTypes().replace('|', ', ');
            }
        }
        renderedInterface = this.renderScopePrefix() + renderedInterface;
        if (renderedChildren) {
            renderedChildren = ('{\n' +
                renderedChildren +
                indent + '}');
        }
        else {
            renderedChildren = '{}';
        }
        if (withoutDoclet) {
            renderedDescription = '';
        }
        return (renderedDescription +
            IDeclaration.breakLongLines(indent + renderedInterface + ' ' + renderedChildren + '\n'));
    }
}
exports.InterfaceDeclaration = InterfaceDeclaration;
/**
 * Class for declarations in a module file.
 *
 * @extends IDeclaration
 */
class ModuleDeclaration extends IDeclaration {
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Initiates a new global declaration.
     */
    constructor(name = '') {
        super(name);
        /**
         * Kind of declaration.
         */
        this.kind = 'global';
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
    get copyright() {
        return this._copyright;
    }
    set copyright(value) {
        this._copyright = value;
    }
    /**
     * Import statemens.
     */
    get exports() {
        return this._exports;
    }
    /**
     * Import statemens.
     */
    get imports() {
        return this._imports;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this global declaration.
     */
    clone() {
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
    renderCopyright() {
        if (!this.copyright) {
            return '';
        }
        let renderedCopyright = IDeclaration.normalize(this.copyright, true);
        renderedCopyright = IDeclaration.indent(renderedCopyright, ' *  ');
        return ('/' + '*!*\n *\n' +
            renderedCopyright +
            ' *\n *!*' + '/\n');
    }
    /**
     * Returns a rendered string of assigned exports statements.
     */
    renderExports() {
        if (this.exports.length === 0) {
            return '';
        }
        return (this.exports.join('\n') + '\n');
    }
    /**
     * Returns a rendered string of assigned import statements.
     */
    renderImports() {
        if (this.imports.length === 0) {
            return '';
        }
        return (this.imports.join('\n') + '\n');
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
    toString(indent = '', withoutDoclet = false) {
        let renderedChildren = this.renderChildren(indent, undefined, withoutDoclet), renderedCopyright = this.renderCopyright(), renderedDescription = this.renderDescription(''), renderedExports = this.renderExports(), renderedImports = this.renderImports();
        if (renderedDescription) {
            renderedDescription = (renderedDescription.replace('/**', '/*') + '\n');
        }
        if (withoutDoclet) {
            renderedDescription = '';
        }
        return (renderedCopyright +
            renderedDescription +
            renderedImports +
            renderedChildren +
            renderedExports);
    }
}
exports.ModuleDeclaration = ModuleDeclaration;
/**
 * Class for namespace declarations in TypeScript.
 *
 * @extends IDeclaration
 */
class NamespaceDeclaration extends IDeclaration {
    constructor() {
        /* *
         *
         *  Properties
         *
         * */
        super(...arguments);
        /**
         * Kind of declaration.
         */
        this.kind = 'namespace';
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this namespace declaration.
     */
    clone() {
        let clone = new NamespaceDeclaration(this.name);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.uniqueID = this.uniqueID;
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
    toString(indent = '', withoutDoclet = false) {
        let childIndent = indent + '    ', renderedChildren = this.renderChildren(childIndent, undefined, withoutDoclet), renderedDescription = this.renderDescription(indent), renderedNamespace = (this.name === 'external:' ?
            'global' :
            'namespace ' + this.name.replace(':', ''));
        renderedNamespace = this.renderScopePrefix() + renderedNamespace;
        if (renderedChildren) {
            renderedChildren = ('{\n' +
                renderedChildren +
                indent + '}');
        }
        else {
            renderedChildren = '{}';
        }
        if (withoutDoclet) {
            renderedDescription = '';
        }
        return (renderedDescription +
            indent + renderedNamespace + ' ' + renderedChildren + '\n');
    }
}
exports.NamespaceDeclaration = NamespaceDeclaration;
/**
 * Class for parameter declarations in TypeScript, that are used in the
 * constructor and functions.
 *
 * @extends IDeclaration
 */
class ParameterDeclaration extends IDeclaration {
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
    constructor(name) {
        super(name);
        /* *
         *
         *  Properties
         *
         * */
        /**
         * Kind of declaration.
         */
        this.kind = 'parameter';
        this._isVariable = false;
    }
    /**
     * Variable number of parameters.
     */
    get isVariable() {
        return this._isVariable;
    }
    set isVariable(value) {
        this._isVariable = value;
    }
    get parameterParent() {
        return this._parameterParent;
    }
    get parent() {
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
    clone() {
        let clone = new ParameterDeclaration(this.name);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.isVariable = this.isVariable;
        clone.uniqueID = this.uniqueID;
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
    renderParameterDescription(indent = '') {
        if (!this.description) {
            return '';
        }
        let defaultValue = (this.defaultValue || '').toString(), renderedTypes = '@param ' + this.name;
        if (defaultValue) {
            defaultValue = ' (Default value: ' + defaultValue + ')';
        }
        return (indent + ' * ' + renderedTypes + '\n' +
            IDeclaration.indent(IDeclaration.normalize(this.description + defaultValue, true), indent + ' *        '));
    }
    setParameterParent(parentDeclaration) {
        this._parameterParent = parentDeclaration;
    }
    /**
     * Returns a rendered string of this parameter declaration.
     */
    toString() {
        let renderedParameter = this.name, renderedTypes = this.renderTypes(true, true);
        if (this.isOptional) {
            renderedParameter += '?';
        }
        if (this.isVariable) {
            renderedParameter = '...' + renderedParameter;
            if (!renderedTypes.includes('Array<')) {
                renderedTypes = 'Array<' + renderedTypes + '>';
            }
        }
        renderedParameter += ': ' + renderedTypes;
        return renderedParameter;
    }
}
exports.ParameterDeclaration = ParameterDeclaration;
/**
 * Class for property declarations in TypeScript, that can be found in a class,
 * global scope, interface, and namespace.
 *
 * @extends IDeclaration
 */
class PropertyDeclaration extends IDeclaration {
    /* *
     *
     *  Constructor
     *
     * */
    constructor(name, ...types) {
        super(name, ...types);
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
    get kind() {
        return (this.isStatic ? 'static property' : 'property');
    }
    get isIndexer() {
        return this._isIndexer;
    }
    /**
     * Returns true, if property can not changed directly.
     */
    get isReadOnly() {
        return this._isReadOnly;
    }
    set isReadOnly(value) {
        this._isReadOnly = value;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this property declaration.
     */
    clone() {
        let clone = new PropertyDeclaration(this.name);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isReadOnly = this.isReadOnly;
        clone.isStatic = this.isStatic;
        clone.uniqueID = this.uniqueID;
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
    toString(indent = '', withoutDoclet = false) {
        let childIndent = indent + '    ', childOfSpace = this.childOfSpace(), isIndexer = false, renderedDescription = this.renderDescription(indent, true), renderedMember = this.name.replace(':', ': ');
        // special treatment for indexers
        if (renderedMember[0] === '[' &&
            renderedMember.indexOf(' ') > -1) {
            const root = this.root;
            if (root && root.name) {
                // type is part of the member name
                let typePosition = (renderedMember.lastIndexOf(' ') + 1), type = renderedMember.substr(typePosition);
                renderedMember = renderedMember.substr(0, typePosition);
                renderedMember += IDeclaration.simplifyType(root.name, type)[0];
                isIndexer = true;
            }
        }
        else if (/\W/.test(renderedMember)) {
            renderedMember = '"' + renderedMember + '"';
        }
        if (!isIndexer) {
            if (this.isReadOnly &&
                !(this.parent instanceof InterfaceDeclaration)) {
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
            renderedMember += (': {\n' +
                this.renderChildren(childIndent, undefined, withoutDoclet) +
                indent + '};');
        }
        else if (this.hasTypes) {
            renderedMember += (': ' +
                this.renderTypes(true, this.isIndexer) +
                ';');
        }
        else {
            renderedMember += ': any;';
        }
        renderedMember = this.renderScopePrefix() + renderedMember + '\n';
        if (withoutDoclet) {
            renderedDescription = '';
        }
        return (renderedDescription +
            IDeclaration.breakLongLines(indent + renderedMember));
    }
}
exports.PropertyDeclaration = PropertyDeclaration;
/**
 * Class for type alias declarations in TypeScript.
 *
 * @extends IDeclaration
 */
class TypeDeclaration extends IDeclaration {
    constructor() {
        /* *
         *
         *  Properties
         *
         * */
        super(...arguments);
        /**
         * Kind of declaration.
         */
        this.kind = 'type';
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns a clone of this type declaration.
     */
    clone() {
        let clone = new TypeDeclaration(this.name);
        clone.defaultValue = this.defaultValue;
        clone.description = this.description;
        clone.isOptional = this.isOptional;
        clone.isPrivate = this.isPrivate;
        clone.isStatic = this.isStatic;
        clone.uniqueID = this.uniqueID;
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
    toString(indent = '', withoutDoclet = false) {
        let childIndent = indent + '    ', renderedChildren = this.renderChildren(childIndent, undefined, withoutDoclet), renderedDescription = this.renderDescription(indent), renderedType = this.renderTypes(true);
        if (!renderedType) {
            renderedType = 'any';
        }
        if (this.hasChildren) {
            renderedType = ('type ' + this.name + ' = {\n' +
                renderedChildren +
                indent + '};');
        }
        else {
            renderedType = 'type ' + this.name + ' = ' + renderedType + ';';
        }
        renderedType = this.renderScopePrefix() + renderedType + '\n';
        if (withoutDoclet) {
            renderedDescription = '';
        }
        return (renderedDescription +
            IDeclaration.breakLongLines(indent + renderedType));
    }
}
exports.TypeDeclaration = TypeDeclaration;
//# sourceMappingURL=TypeScriptDeclarations.js.map