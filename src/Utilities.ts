/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as request from 'request';

const JSON_ESCAPE_FILTER: RegExp = /([\[,]\s?)"?(undefined)"?(\s?[,\]])/gm;
const JSON_UNESCAPE_FILTER: RegExp = /^\[(undefined)\]$/gm;
const JSON_QUOTE_FILTER: RegExp = /['`]/gm;

const NORMALIZE_BREAK_FILTER: RegExp = /<br>/gm;
const NORMALIZE_PARAGRAPH_FILTER: RegExp = /\s{2,}/gm;
const NORMALIZE_SPACE_FILTER: RegExp = /\s+/gm;

const PAD_SPACE_FILTER: RegExp = /\s/gm;

const TYPE_MAPPER_DICTIONARY: Dictionary<string> = {
    '*': 'any',
    'Array': 'Array<any>',
    'Boolean': 'boolean',
    'Number': 'number',
    'Object': 'object',
    'String': 'string',
    'array': 'Array',
    'function': 'Function'
};
const TYPE_MAPPER_GENERIC: RegExp = /^(\w+)\.?<(.+)>$/gm;
const TYPE_MAPPER_LIST: RegExp = /^\((.+)\)$/gm;

export interface Dictionary<T> {
    [key: string]: T;
}

export class Dictionary<T> {}

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
    return types.map(typeMapper).join('|');
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
        .replace(JSON_QUOTE_FILTER, '"')
        .replace(JSON_ESCAPE_FILTER, '$1"$2"$3')
    );

    if (typeof results.map === 'function') {
        results.map((result: any) => (
            typeof result === 'string' ?
            result.replace(JSON_UNESCAPE_FILTER, '$1') :
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

export function mergeArray<T>(target: Array<T>, ...sources: Array<Array<T>>): Array<T> {

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
        return str.replace(NORMALIZE_SPACE_FILTER, ' ');
    } else {
        return str
            .replace(NORMALIZE_PARAGRAPH_FILTER, '<br>')
            .replace(NORMALIZE_SPACE_FILTER, ' ')
            .replace(NORMALIZE_BREAK_FILTER, '\n\n');
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
        words = str.split(PAD_SPACE_FILTER);

    words.forEach(word => {

        if (word === '') {
            paddedStr += line.trimRight() + '\n' + linePrefix + '\n';
            newLine = true;
            return;
        }
        
        if (line.length + word.length + 1 > wrap) {
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

export function typeMapper(type: string): string {

    type = type.replace(TYPE_MAPPER_LIST, '$1');

    if (TYPE_MAPPER_GENERIC.test(type)) {
        return type.replace(
            TYPE_MAPPER_GENERIC,
            function (match, generic, type) {
                return generic + '<' + typeMapper(type.trim()) + '>';
            }
        );
    }

    if (type.indexOf('|') > -1) {
        return (
            '(' +
            type.split('|').map(type => typeMapper(type.trim())).join('|') +
            ')'
        );
    }

    if (TYPE_MAPPER_DICTIONARY[type]) {
        return TYPE_MAPPER_DICTIONARY[type];
    }

    return type;
}
