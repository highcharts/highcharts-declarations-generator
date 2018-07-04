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

const MAP_TYPE_DICTIONARY: Dictionary<string> = {
    '*': 'any',
    'Array': 'Array<any>',
    'Boolean': 'boolean',
    'Number': 'number',
    'Object': 'object',
    'String': 'string',
    'array': 'Array',
    'function': 'Function'
};
const MAP_TYPE_GENERIC: RegExp = /^(\w+)\.?<(.+)>$/gm;
const MAP_TYPE_LIST: RegExp = /^\((.+)\)$/gm;

const NORMALIZE_ESCAPE: RegExp = /\n\s*\n/gm;
const NORMALIZE_SPACE: RegExp = /\s+/gm;
const NORMALIZE_UNESCAPE: RegExp = /<br>/gm;

const PAD_SPACE: RegExp = /\s/gm;

const REMOVE_EXAMPLE_HTML = /<pre>([\S\s]*?)<\/pre>/gm;
const REMOVE_EXAMPLE_JSDOC = /@example[^@]*/gm;
const REMOVE_EXAMPLE_MARKDOWN = /```[^`]*?```/gm;
const REMOVE_EXAMPLE_REPLACEMENT = '(see online documentation for example)';

const REMOVE_LINK_JSDOC = /\{@link\W+([^\}\|\s]+)(?:\|([^\}]+))?\s*\}/gm;
const REMOVE_LINK_MARKDOWN = /\[([^\]]+)\]\(([^\)\s]+)\)/gm;

const TRANSFORM_LISTS = /\n\s*([\-\+\*]|\d\.)\s+/gm;

const URL_WEB = /[\w\-\+]+\:\S+[\w\/]/g;



export interface Dictionary<T> {
    [key: string]: T;
}



export class Dictionary<T> {
    public static values<T> (dictionary: Dictionary<T>): Array<T> {
        return Object
            .keys(dictionary)
            .map(key => dictionary[key]);
    }
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



export function convertType (types: Array<string>): string {
    return types.map(mapType).join('|');
}



export function copy (sourceFilePath: string, targetFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        sourceFilePath = path.resolve(process.cwd(), sourceFilePath);
        targetFilePath = path.resolve(process.cwd(), targetFilePath);
        fs.copyFile(sourceFilePath, targetFilePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}



export function duplicateObject (
    obj: any,
    maxDepth: number = 3,
    filterFn?: (value: any, key: (number|string), parent: any) => boolean
): any {

    if (obj === null) {
        return null;
    }

    switch (typeof obj) {
        case 'boolean':
        case 'function':
        case 'number':
        case 'string':
        case 'symbol':
        case 'undefined':
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
                item => duplicateObject(item, nextDepth, filterFn)
            );
        }

        return duplicatedArray;
    }

    let duplicatedObj = {} as any,
        objKeys = Object.keys(obj);

    if (filterFn) {
        objKeys = objKeys.filter(key => filterFn(obj[key], key, obj));
    }

    if (maxDepth === 0) {
        objKeys.forEach(key => {
            console.log('assign', key);
            duplicatedObj[key] = obj[key];
        });
    } else {
        objKeys.forEach(key => {
            console.log('duplicate', key);
            duplicatedObj[key] = duplicateObject(obj[key], nextDepth, filterFn);
        });
    }

    return duplicatedObj;
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



export function mapType(type: string): string {

    type = type.replace(MAP_TYPE_LIST, '$1');

    if (MAP_TYPE_GENERIC.test(type)) {
        return type.replace(
            MAP_TYPE_GENERIC,
            function (match, generic, type) {
                return generic + '<' + mapType(type.trim()) + '>';
            }
        );
    }

    if (type.indexOf('|') > -1) {
        return (
            '(' +
            type.split('|').map(type => mapType(type.trim())).join('|') +
            ')'
        );
    }

    if (MAP_TYPE_DICTIONARY[type]) {
        return MAP_TYPE_DICTIONARY[type];
    }

    return type;
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



export function normalize (
    str: string,
    preserveParagraphs: boolean = false
): string {

    if (!preserveParagraphs) {
        return str.replace(NORMALIZE_SPACE, ' ');
    } else {
        return str
            .replace(NORMALIZE_ESCAPE, '<br>')
            .replace(NORMALIZE_SPACE, ' ')
            .replace(NORMALIZE_UNESCAPE, '\n\n');
    }
}



/**
 * Returns a padded string, that fits into a specific width and spans over
 * several lines.
 * 
 * @param {string} str
 * The string to pad.
 * 
 * @param {string} linePrefix 
 * The prefix for each line.
 * 
 * @param wrap 
 * The maximum width of the padded string.
 */
export function pad (
    str: string,
    linePrefix: string = '',
    wrap: number = 80
): string {

    let newLine = true,
        line = '',
        paddedStr = '',
        words = str.split(PAD_SPACE);

    words.forEach(word => {

        if (word === '') {
            paddedStr += line.trimRight() + '\n' + linePrefix + '\n';
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
        } else {
            line += ' ' + word;
        }
    });

    return paddedStr + line.trimRight() + '\n';
}



export function pluralize (
    value: number,
    singular: string,
    plural: string
): string {
    return (value.toString() + (value === 1 ? singular : plural));
}



export function removeExamples(text: string): string {

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



export function save (filePath: string, str: string): Promise<void> {
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
                    resolve();
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
