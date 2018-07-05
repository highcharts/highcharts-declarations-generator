/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as parser from './OptionsParser';
import * as tsd from './TypeScriptDeclarations';
import * as utils from './Utilities';



export function generate(
    optionsDictionary: parser.INode
): Promise<tsd.IDeclaration> {

    return new Promise((resolve, reject) => {

        let generator = new Generator(optionsDictionary);

        console.log('Generated options.');

        resolve(generator.root);
    });
}

class Generator extends Object {

    /* *
     *
     *  Static Functions
     *
     * */

    private static getDescription(node: parser.INode): string {

        let description = (node.doclet.description || '').trim();

        description = utils.removeExamples(description);
        description = utils.removeLinks(description);
        description = utils.transformLists(description);

        return description;
    }

    private static getName(node: parser.INode): string {

        return (node.meta.fullname || node.meta.name || '');
    }

    private static getType(node: parser.INode): string {

        return (
            node.doclet.type &&
            node.doclet.type.names ||
            [ '*' ]
        ).join('|');
    }

    /* *
     *
     *  Constructor
     *
     * */

    public constructor (node: parser.INode) {

        super();

        this._root = new tsd.GlobalDeclaration();

        this.generate(node);
    }

    /* *
     *
     *  Properties
     *
     * */

    public get root(): tsd.IDeclaration {
        return this._root;
    }
    private _root: tsd.IDeclaration;

    /* *
     *
     *  Functions
     *
     * */

    private generate(
        sourceNode: parser.INode,
        targetDeclaration: tsd.IDeclaration = this._root
    ) {

        let childDeclaration = undefined as (tsd.IDeclaration|undefined);

        switch (Generator.getType(sourceNode)) {
            default:
                if (Object.keys(sourceNode.children).length === 0) {
                    childDeclaration = this.generateProperty(sourceNode);
                } else {
                    childDeclaration = this.generateInterface(sourceNode);
                }
                break;
            case 'global':
                this._root = this.generateGlobal(sourceNode);
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

    private generateGlobal (node: parser.INode): tsd.GlobalDeclaration {

        let description = Generator.getDescription(node),
            name = Generator.getName(node),
            declaration = new tsd.GlobalDeclaration();

        if (description) {
            declaration.description = description;
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateInterface (node: parser.INode): tsd.InterfaceDeclaration {

        let description = Generator.getDescription(node),
            name = Generator.getName(node),
            declaration = new tsd.InterfaceDeclaration(name);

        if (description) {
            declaration.description = description;
        }

        if (node.children) {
            this.generateChildren(node.children, declaration);
        }

        return declaration;
    }

    private generateProperty (node: parser.INode): tsd.PropertyDeclaration {

        let description = Generator.getDescription(node),
            name = Generator.getName(node),
            declaration = new tsd.PropertyDeclaration(name),
            doclet = node.doclet;

        if (description) {
            declaration.description = description;
        }

        declaration.isOptional = true;

        if (doclet.values) {
            try {
                let values = utils.json(doclet.values, true);
                if (values instanceof Array) {
                    declaration.types.push(...values
                        .map(value => {switch(value) {
                            default:
                                return '"' + value + '"';
                            case 'undefined':
                            case 'null':
                                return value;
                        }})
                    );
                }
            } catch (error) {
                console.log('Error: ', node.meta.fullname, doclet.values);
                console.error(error);
            }
        }
        
        if (!declaration.hasTypes &&
            doclet.type &&
            doclet.type.names
        ) {
            declaration.types.push(...doclet.type.names.map(utils.mapType));
        }

        return declaration;
    }

    public toString(): string {

        return this._root.toString();
    }
}

/*
export class OptionsGenerator extends Object {

    /* *
     *
     *  Constructor
     * 
     * */
/*
    public constructor (
        product: HighsoftProducts
    ) {
        super();
        this._product = product;
    }

    /* *
     *
     *  Properties
     * 
     * */
/*
    public get product(): HighsoftProducts {
        return this._product;
    }
    private _product: HighsoftProducts;

    /* *
     *
     *  Functions
     *
     * */
/*
    public generate (
        json: helpers.Dictionary<TreeEntry>,
        targetFilePath: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                delete json._meta;
                let productCL = utils.capitalize(this.product),
                    interfaceProperty = this.walkMember({
                    children: json,
                    doclet: {
                        defaultvalue: 'undefined',
                        description: 'The ' + productCL + ' options',
                        products: [ this.product ],
                        type: {
                            names: [ 'interface' ]
                        }
                    },
                    meta: {
                        name:  productCL + 'Options'
                    }
                });
                utils
                    .save(targetFilePath, (
                            interfaceProperty && interfaceProperty.toString() ||
                            '{}'
                    ))
                    .then(resolve);
            } catch (err) {
                reject(err);
            }
        });
    }

    private walk (node: TreeEntry): dom.Type {
        var t: dom.UnionType;
        t.kind
        if (!node ||
            !node.doclet ||
            !node.doclet.description ||
            !node.doclet.type ||
            !node.doclet.type.names ||
            !node.meta ||
            !node.meta.name
        ) {
            return null;
        }

        let comment = node.doclet.description,
            name = node.meta.name,
            children = [] as Array<dom.ObjectTypeMember>;

        Object
            .keys(node.children)
            .forEach(key => {
                let interfaceProperty = this.walkMember(node.children[key]);
                if (interfaceProperty) {
                    children.push(interfaceProperty);
                }
            });

        let dec = dom.create.interface(name);

        dec.comment = comment;
        dec.members.push(...children);

        return dec;
    }

    private walkMember (node: TreeEntry): dom.ObjectTypeMember {

        if (!node ||
            !node.doclet ||
            !node.doclet.description ||
            !node.doclet.type ||
            !node.doclet.type.names ||
            !node.meta ||
            !node.meta.name
        ) {
            return null;
        }

        let comment = node.doclet.description,
            name = node.meta.name,
            type = utils.convertType(node.doclet.type.names),
            children = [] as Array<dom.ObjectTypeMember>;

        Object
            .keys(node.children)
            .forEach(key => {
                let interfaceProperty = this.walk(node.children[key]);
                if (interfaceProperty) {
                    children.push(interfaceProperty);
                }
            });

        let mem = dom.create.property(name, dom.type.object);

        if (type === 'interface') {
        }
        return new dom.create(comment, name, type, children);
    }
}



export class InterfaceProperty extends IDeclaration {

    /* *
     *
     *  Constructor
     * 
     * */
/*
    public constructor(
        comment: string,
        name: string,
        type: string,
        children: Array<InterfaceProperty>
    ) {
        super(comment);
        this._name = name;
        this._type = type;
        this._children = children;
    }

    /* *
     *
     *  Properties
     * 
     * */
/*
    public get children(): Array<InterfaceProperty> {
        return this._children;
    }
    private _children: Array<InterfaceProperty>;

    public get name(): string {
        return this._name;
    }
    private _name: string;

    public get type(): string {
        return this._type;
    }
    private _type: string;

    /* *
     *
     *  Functions
     * 
     * */
/*
    public parseComment(comment: string): string {
        try {
            console.log(comment);
        } catch (err) {
        } finally {
            return comment;
        }
    }

    public toString(indent: number = 0): string {
        let space = new Array(indent + 1).join(' '),
            str = '';

        str += space + '/**\n';
        str += utils.pad(this.comment, ' * ', indent) + '\n';
        str += space + ' *' + '/\n';

        if (this.type === 'interface') {
            str += space + 'interface ' + this.name + ' ';
        } else {
            str += space + this.name + ': ';
        }

        if (this.type === 'interface' ||
            this.children.length > 0
        ) {
            if (this.type !== 'interface' &&
                this.type !== 'object'
            ) {
                str += utils.filterType(this.type) + '|';
            }
            str += '{\n\n';
            this.children.forEach(child => {
                str += child.toString(indent + 4) + '\n';
            });
            str += space + '}\n';
        } else {
            str += utils.filterType(this.type) + ';\n';
        }

        return str;
    }

}

export enum MemberFlags {
    Abstract,
    Class,
    Constant,
    Constructor,
    Default,
    Function,
    Get,
    Interface,
    Module,
    Namespace,
    Optional,
    Private,
    Property,
    Protected,
    Public,
    Set,
    Static
}

export class Member extends Object {

    /* *
     *
     *  Constructor
     * 
     * */
/*
    public constructor (name: string, comment: string, parent?: Member) {
        super();

        this._name = name;
        this._comment = comment;
        this._parent = parent;

        this._arguments = [];
        this._children = [];
        this._flags = {};
    }

    /* *
     *
     *  Properties
     * 
     * */
/*
    public get arguments(): Array<Member> {
        return this._arguments;
    }
    private _arguments: Array<Member>;

    public get children(): Array<Member> {
        return this._children;
    }
    private _children: Array<Member>;

    public get comment(): string {
        return this._comment;
    }
    private _comment: string;

    public get flags(): helpers.Dictionary<boolean> {
        return this._flags;
    }
    private _flags: helpers.Dictionary<boolean>

    public get name(): string {
        return this._name;
    }
    private _name: string;

    public get parent(): (Member | undefined) {
        return this._parent;
    }
    private _parent: (Member | undefined);

    /* *
     *
     *  Functions
     * 
     * */
/*
    public clearFlag(flag: MemberFlags) {
        delete this._flags[flag];
    }

    public getFullname(): string {
        return (this.parent ? (this.parent.name + '.' + this.name) : this.name);
    }

    protected getSpace(): string {
        return (this.parent ? this.parent.getSpace() + '    ' : '');
    }

    public hasChildren(): boolean {
        return (this.children.length > 0);
    }

    public is(flag: MemberFlags): boolean {
        return (this._flags[flag] && this._flags[flag] === true);
    }

    public setFlag(flag: MemberFlags) {
        this._flags[flag] = true;
    }

    public stringify(prefix?: string): string {
        if (this.is(MemberFlags.Interface)) {
            return (new InterfaceMember(
                this.name, this.comment, this.parent
            )).stringify(prefix);
        }
    }

    protected stringifyComment(space?: string): string {
        space = (space || this.getSpace());
        return (
            space + '/**\n' +
            utils.pad(this.comment, space + ' * ') + '\n' +
            space + ' *' + '/\n'
        );
    }

}

export class InterfaceMember extends Member {

    /* *
     *
     *  Constructor
     * 
     * */
/*
    public constructor(name: string, comment: string, parent?: Member) {
        super(name, comment, parent);
        this.setFlag(MemberFlags.Interface);
    }

    /* *
     *
     *  Functions
     * 
     * */
/*
    public stringify(prefix?: string): string {
        let space = this.getSpace(),
            str = this.stringifyComment(space);

        str += space + (prefix ? prefix + ' ' : '');
        str += 'interface ' + this.name + ' ';
        str += '{\n\n';

        this.children.forEach(child => {
            str += child.stringify() + '\n';
        });

        str += space + '}\n';

        return str;
    }
}

export class PropertyMember extends Member {

    /* *
     *
     *  Constructor
     * 
     * */
/*
    public constructor (
        name: string,
        comment: string,
        parent: Member,
        type?: string,
        value?: string
    ) {
        super(name, comment, parent);
        this.setFlag(MemberFlags.Property);
        this._type = (type || 'any');
    }

    /* *
     *
     *  Properties
     * 
     * */
/*
    public get type(): string {
        return this._type
    }
    private _type: string;

    public get value(): (boolean | number | string | undefined) {
        return this._value;
    }
    private _value: (boolean | number | string | undefined);

    /* *
     *
     *  Functions
     * 
     * */
/*
    public stringify(prefix?: string): string {
        let space = this.getSpace(),
            str = this.stringifyComment(space),
            type = this.type;

        str += this.name;

        if (type === 'any') {
            if (this.hasChildren()) {
                str += ': {\n';
                this.children.forEach(child => {
                    if (child.is(MemberFlags.Property)) {
                        str += child.stringify() + ',';
                    }
                });
                str += space + '}\n'
            } else {
                str += ';\n';
            }
        } else {
            str += ': ' + type + ';\n';
        }

        return str;
    }
}


/* *
 *
 *  Options JSON Interface
 * 
 * */

interface OptionsTree {
    [key: string]: OptionsNode;
}

// Level 1

interface OptionsNode {
    children: utils.Dictionary<OptionsNode>;
    doclet: OptionsDoclet;
    meta: OptionsMeta;
}

// Level 2

interface OptionsDoclet {
    products: Array<OptionsProducts>
    type: OptionsType;
    defaultByProduct?: OptionsDefaultByProduct;
    defaultvalue?: string;
    description?: string;
    sample?: OptionsSample;
    samples?: Array<OptionsSample>;
    see?: Array<string>;
    since?: string;
    undocumented?: boolean;
}

interface OptionsMeta {
    column?: number;
    filename?: string;
    fullname?: string;
    line?: number;
    lineEnd?: number;
    name?: string;
}

// Level 3

interface OptionsDefaultByProduct {
    highcharts: string;
    highmaps: string;
    highstock: string;
}

type OptionsProducts = ('highcharts' | 'highmaps' | 'highstock');

interface OptionsSample {
    products: Array<OptionsProducts>;
    value: string;
    name?: string;
}

interface OptionsType {
    names: Array<string>
}
