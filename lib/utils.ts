/* *
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 * */

import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as request from 'request';

const SPACE_FILTER: RegExp = new RegExp('\\s+', 'g');

export function ajax (url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            request(url, (err, response, body) => {
                if (err) {
                    reject(err);
                } else {
                    json(body).then(resolve);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

export function capitalize (str: string): string {
    if (str === '') {
        return str;
    } else {
        return (str[0].toUpperCase() + str.substr(1));
    }
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
        try {
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    json(data.toString()).then(resolve);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

export function log<T> (obj: T): Promise<T> {
    return new Promise((resolve, reject) => {
        try {
            console.log(obj);
            resolve(obj);
        } catch (err) {
            reject(err);
        }
    });
}

export function normalize (str: string): string {
    return str.replace(SPACE_FILTER, ' ');
}

export function pad (
    str: string,
    linePrefix: string = '',
    indent: number = 0,
    wrap: number = 80
): string {
    let words = normalize(str).split(' '),
        space = (new Array(indent + 1)).join(' '),
        line = space + linePrefix + (words.shift() || 0),
        paddedStr = '';

    words.forEach(word => {
        if (line.length + word.length + 1 > wrap) {
            paddedStr += line + '\n';
            line = space + linePrefix + word;
        } else {
            line += ' ' + word;
        }
    });

    return paddedStr + line;
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

export interface Dictionary<T> {

    [key: string]: T;

}
