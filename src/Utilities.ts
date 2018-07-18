/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */



import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as request from 'request';



const JSON_ESCAPE: RegExp = /([\[,]\s?)"?(undefined)"?(\s?[,\]])/gm;
const JSON_UNESCAPE: RegExp = /^\[(undefined)\]$/gm;
const JSON_QUOTE: RegExp = /['`]/gm;

const REMOVE_EXAMPLE_HTML = /<(\w+)[^\>]*>([\S\s]*?)<\/\1>/gm;
const REMOVE_EXAMPLE_JSDOC = /@example[^@]*/gm;
const REMOVE_EXAMPLE_MARKDOWN = /```[^`]*?```/gm;
const REMOVE_EXAMPLE_REPLACEMENT = '(see online documentation for example)';

const REMOVE_LINK_JSDOC = /\{@link\W+([^\}\|\s]+)(?:\|([^\}]+))?\s*\}/gm;
const REMOVE_LINK_MARKDOWN = /\[([^\]]+)\]\(([^\)\s]+)\)/gm;

const TRANSFORM_LISTS = /\n\s*([\-\+\*]|\d\.)\s+/gm;

const URL_WEB = /[\w\-\+]+\:\S+[\w\/]/g;



/**
 * 
 */
export class Dictionary<T> {

    /* *
     *
     *  Static Functions
     *
     * */

    /**
     * 
     * @param {Dictionary} dictionary 
     */
    public static values<T> (dictionary: Dictionary<T>): Array<T> {
        return Object
            .keys(dictionary)
            .map(key => dictionary[key]);
    }

    /* *
     *
     *  Static Properties
     *
     * */
    [key: string]: T;
}



export function ajax (url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        request(url, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(json(body));
            }
        });
    });
}



export function base (filePath: string): string {
    let slashIndex = filePath.lastIndexOf(path.sep),
        pointIndex = filePath.indexOf('.', slashIndex);
    if (pointIndex > slashIndex + 1) {
        return filePath.substring(0, pointIndex);
    } else {
        return filePath;
    }
}



export function capitalize (str: string): string {
    if (str === '') {
        return str;
    } else {
        return (str[0].toUpperCase() + str.substr(1));
    }
}



export function clone<T> (
    obj: T,
    maxDepth: number = 3,
    filterFn?: (value: any, key: (number|string), obj: T) => boolean
): T {

    if (obj === null ||
        obj === undefined ||
        isBasicType(typeof obj)
    ) {
        return obj;
    }

    let nextDepth = (maxDepth - 1);

    if (obj instanceof Array) {

        let duplicatedArray = [];

        if (filterFn) {
            duplicatedArray = obj
                .filter((item, index) => filterFn(item, index, obj))
                .slice();
        } else {
            duplicatedArray = obj.slice();
        }

        if (maxDepth > 0) {
            duplicatedArray.map(
                item => clone(item, nextDepth, filterFn)
            );
        }

        return duplicatedArray as any;
    }

    if (obj.constructor.prototype !== Object.prototype) {
        return obj;
    }

    let originalObj = obj as any,
        duplicatedObj = {} as any,
        keys = Object.keys(originalObj);

    if (filterFn) {
        keys = keys.filter(key => filterFn(originalObj[key], key, obj));
    }

    if (maxDepth === 0) {
        keys.forEach(key => {
            duplicatedObj[key] = originalObj[key];
        });
    } else {
        keys.forEach(key => {
            duplicatedObj[key] = clone(
                originalObj[key], nextDepth, filterFn
            );
        });
    }

    return duplicatedObj;
}



export function copy (sourceFilePath: string, targetFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        sourceFilePath = path.resolve(process.cwd(), sourceFilePath);
        targetFilePath = path.resolve(process.cwd(), targetFilePath);
        fs.copyFile(sourceFilePath, targetFilePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(targetFilePath);
            }
        });
    });
}



export function isBasicType (typeName: string): boolean {

    switch (typeName) {
        default:
            return false;
        case 'boolean':
        case 'function':
        case 'number':
        case 'string':
        case 'symbol':
        case 'undefined':
            return true;
    }
}



export function isCoreType (typeName: string): boolean {

    if (typeName.indexOf('Array') === 0) {
        return true;
    } else {
        return isBasicType(typeName);
    }
}



export function json (
    json: (object | string | Array<any>),
    allowQuirks: boolean = false
): (object | string | Array<any>) {

    if (typeof json !== 'string') {
        return JSON.stringify(json);
    }

    if (!allowQuirks) {
        return JSON.parse(json);
    }

    let results = JSON.parse(json
        .replace(JSON_QUOTE, '"')
        .replace(JSON_ESCAPE, '$1"$2"$3')
    );

    if (typeof results.map === 'function') {
        results.map((result: any) => (
            typeof result === 'string' ?
            result.replace(JSON_UNESCAPE, '$1') :
            result
        ));
    }

    return results;
}



export function load (filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        filePath = path.resolve(process.cwd(), filePath);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(json(data.toString()));
            }
        });
    });
}



export function log<T> (obj: T): Promise<T> {
    return new Promise((resolve, reject) => {
        console.log(obj);
        resolve(obj);
    });
}



export function mergeArrays<T>(
    ...sources: Array<Array<T>>
): Array<T> {

    let firstSource = sources.shift();

    if (!firstSource) {
        return [];
    }

    let target = firstSource.slice();

    sources.forEach(source => source.forEach(item => {

        if (target.indexOf(item) === -1) {
            target.push(item);
        }
    }));

    return target;
}



export function pluralize (
    value: number,
    singular: string,
    plural: string
): string {
    return (value.toString() + (value === 1 ? singular : plural));
}



export function relative (
    fromPath: string, toPath: string, moduleMode: boolean = false
): string {

    let fromDirectory = fromPath,
        toDirectory = toPath,
        isFromFile = false,
        isToFile = false;

    if (moduleMode || path.extname(fromPath)) {
        fromDirectory = path.dirname(fromDirectory);
        isFromFile = true;
    }

    if (moduleMode || path.extname(toPath)) {
        toDirectory = path.dirname(toDirectory);
        isToFile = true;
    }

    let relativePath = path.relative(
        fromDirectory, toDirectory
    );

    if (moduleMode &&
        relativePath[0] !== '.'
    ) {
        if (relativePath[0] !== path.sep) {
            relativePath = path.sep + relativePath;
        }
        relativePath = '.' + relativePath;
    }

    if (isToFile) {
        if (relativePath &&
            relativePath[relativePath.length-1] !== path.sep
        ) {
            relativePath += path.sep;
        }
        return relativePath + path.basename(toPath);
    } else {
        return relativePath;
    }
}



export function removeExamples (text: string): string {
    return text
        .replace(REMOVE_EXAMPLE_HTML, REMOVE_EXAMPLE_REPLACEMENT)
        .replace(REMOVE_EXAMPLE_JSDOC, REMOVE_EXAMPLE_REPLACEMENT)
        .replace(REMOVE_EXAMPLE_MARKDOWN, REMOVE_EXAMPLE_REPLACEMENT);
}



export function removeLinks(
    text: string, removedLinks?: Array<string>
): string {

    return text
        .replace(REMOVE_LINK_JSDOC, (match, link, title) => {
            if (removedLinks) {
                removedLinks.push(link);
            }
            return (title || link);
        })
        .replace(REMOVE_LINK_MARKDOWN, (match, title, link) => {
            if (removedLinks) {
                removedLinks.push(link);
            }
            return (title || link);
        });
}



export function save (filePath: string, str: string): Promise<string> {
    return new Promise((resolve, reject) => {

        filePath = path.resolve(process.cwd(), filePath);

        mkdirp(path.dirname(filePath), err => {
            if (err) {
                reject(err);
                return;
            }
            fs.writeFile(filePath, str, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(filePath);
                }
            });
        });
    });
}



export function transformLists (text: string): string {

    return text.replace(TRANSFORM_LISTS, '\n\n$1 ');
}



export function url (text: string): (string|null) {

    let match = text.match(URL_WEB);

    if (match) {
        return match[0];
    } else {
        return null;
    }
}



export function urls (text: string): Array<string> {

    let matches = text.match(URL_WEB);

    if (matches) {
        return new Array(...matches);
    } else {
        return [];
    }
}
