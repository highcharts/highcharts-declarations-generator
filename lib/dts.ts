/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as utils from './utils';

/**
 * Base class for TypeScript definitions.
 * 
 * @extends Object
 */
export abstract class IDefinition extends Object {

    /* *
    *
    *  Constructor
    * 
    * */

    /**
     * Initiate a new TypeScript definition.
     */
    public constructor (comment?: string) {
        super();
        this._comment = (comment || '');
    }

    /* *
    *
    *  Properties
    * 
    * */

    /**
     * The comment of this definition.
     */
    public get comment(): string {
        return this._comment;
    }
    public set comment(value: string) {
        this._comment = this.filterComment(value);
    }
    private _comment: string;

    /* *
    *
    *  Functions
    * 
    * */

    /**
     * Filters a comment for additonal information.
     * 
     * @param {string} comment
     * The comment to filter for additional information.
     * 
     * @return {string}
     * The filtered comment.
     */
    protected abstract filterComment(comment: string): string;

    /**
     * Generates the TypeScript definition.
     * 
     * @return {string}
     * The TypeScript definition.
     */
    public abstract toString(): string;

}


export class InterfaceProperty extends IDefinition {

    /* *
     *
     *  Constructor
     * 
     * */

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

    public filterComment(comment: string): string {
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
        str += space + ' */\n';

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
                str += TypeConverter.filter(this.type) + '|';
            }
            str += '{\n\n';
            this.children.forEach(child => {
                str += child.toString(indent + 4) + '\n';
            });
            str += space + '}\n';
        } else {
            str += TypeConverter.filter(this.type) + ';\n';
        }

        return str;
    }

}

export module TypeConverter {

    /* *
     *
     *  Constants
     * 
     * */

    const FILTER_GENERIC: RegExp = new RegExp('^(\\w+)<(.+)>$', 'g');

    const FILTER_MAP: utils.Dictionary<string> = {
        'Boolean': 'boolean',
        'Number': 'number',
        'Object': 'object',
        'String': 'string'
    };

    /* *
     *
     *  Static Functions
     * 
     * */

    export function convert(types: Array<string>): string {
        return types.map(filter).join('|');
    }

    export function filter(type: string): string {
        if (FILTER_MAP[type]) {
            return FILTER_MAP[type];
        }
        if (FILTER_GENERIC.test(type)) {
            return type.replace(
                FILTER_GENERIC,
                function (match, generic, type) {
                    return generic + '<' + type + '>';
                }
            );
        }
        return type;
    }

}
