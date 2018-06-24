/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as request from 'request';

const FILTER_NORMALIZE_BREAK: RegExp = /<br>/gm;
const FILTER_NORMALIZE_PARAGRAPH: RegExp = /\s{2,}/gm;
const FILTER_NORMALIZE_SPACE: RegExp = /\s+/gm;

const FILTER_PAD_SPACE: RegExp = /\s/gm;

const FILTER_TYPE_GENERIC: RegExp = /^(\w+)<(.+)>$/gm;
const FILTER_TYPE_MAP: Dictionary<string> = {
    '*': 'any',
    'Array': 'Array<any>',
    'Boolean': 'boolean',
    'Number': 'number',
    'Object': 'object',
    'String': 'string'
};

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
                json(body).then(resolve);
            }
        });
    });
}

export function capitalize (str: string): string {
    if (str === '') {
        return str;
    } else {
        return (str[0].toUpperCase() + str.substr(1));
    }
}

export function convertType(types: Array<string>): string {
    return types.map(filterType).join('|');
}

export function filterType(type: string): string {

    if (FILTER_TYPE_GENERIC.test(type)) {
        return type.replace(
            FILTER_TYPE_GENERIC,
            function (match, generic, type) {
                return generic + '<' + type + '>';
            }
        );
    }

    if (type.indexOf('|') > -1) {
        return type.split('|')
            .map(type => filterType(type.trim()))
            .join('|');
    }

    if (FILTER_TYPE_MAP[type]) {
        return FILTER_TYPE_MAP[type];
    }

    return type;
}

export function getDeclarationFilePath (filePath: string): string {

    let fileExtension = path.extname(filePath);

    if (fileExtension) {

        if (fileExtension === '.ts' &&
            filePath.lastIndexOf('.d.ts') === (filePath.length - 6)
        ) {
            fileExtension = '.d.ts';
        }

        filePath = filePath.substr(0, (filePath.length - fileExtension.length));
    }

    return (filePath + '.d.ts');
}

export function json (json: any[] | object | string ): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            if (typeof json === 'string') {
                resolve(JSON.parse(json));
            } else {
                resolve(JSON.stringify(json));
            }
        } catch (err) {
            reject(err);
        }
    });
}

export function load (filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {

        filePath = path.resolve(process.cwd(), filePath);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                json(data.toString()).then(resolve);
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

export function normalize (
    str: string,
    preserveParagraphs: boolean = false
): string {

    if (!preserveParagraphs) {
        return str.replace(FILTER_NORMALIZE_SPACE, ' ');
    } else {
        return str
            .replace(FILTER_NORMALIZE_PARAGRAPH, '<br>')
            .replace(FILTER_NORMALIZE_SPACE, ' ')
            .replace(FILTER_NORMALIZE_BREAK, '\n\n');
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

    let words = str.split(FILTER_PAD_SPACE),
        line = linePrefix + (words.shift() || ''),
        paddedStr = '';

    words.forEach(word => {
        if (word === '') {
            paddedStr += line.trimRight() + '\n\n';
            line = linePrefix + word;
        } else if (line.length + word.length + 1 > wrap) {
            paddedStr += line.trimRight() + '\n';
            line = linePrefix + word;
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
