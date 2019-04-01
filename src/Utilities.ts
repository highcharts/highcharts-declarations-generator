/*!*
 * 
 *  Copyright (c) Highsoft AS. All rights reserved.
 * 
 *!*/



import * as FS from 'fs';
import * as MkDirP from 'mkdirp';
import * as Path from 'path';
import * as Request from 'request';



const JSON_ESCAPE: RegExp = /([\[,]\s?)"?(undefined)"?(\s?[,\]])/;
const JSON_QUOTE: RegExp = /['`]/;
const JSON_UNESCAPE: RegExp = /^\[(undefined)\]$/;

const REMOVE_EXAMPLE_HTML = /<(\w+)[^\>]*>([\S\s]*?)<\/\1>/;
const REMOVE_EXAMPLE_JSDOC = /@example[^@]*/;
const REMOVE_EXAMPLE_MARKDOWN = /\s*```[^`]*?```/;
const REMOVE_EXAMPLE_REPLACEMENT = '(see online documentation for example)';

const REMOVE_LINK_JSDOC = /\{@link\s+([^\}\|]+)(?:\|([^\}]+))?\}/;
const REMOVE_LINK_MARKDOWN = /\[([^\]]+)\]\(([^\)]+)\)/;
const REMOVE_LINK_MIX = /\[([^\]]+)\]\{@link\s+([^\}]+)\}/;
const REMOVE_LINK_SPACE = /\s/;

const TRANSFORM_LISTS = /\n\s*([\-\+\*]|\d+\.)\s+/;

const URL_WEB = /[\w\-\+]+\:\S+[\w\/]/;



export interface TypeTree extends Array<TypeTree> {
    kind: ('array'|'generic'|'list');
    name: string;
}



/**
 * Generic dictionary
 */
export class Dictionary<T> {

    /* *
     *
     *  Static Functions
     *
     * */

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
        Request(url, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(json(body));
            }
        });
    });
}



export function base (filePath: string): string {
    let slashIndex = filePath.lastIndexOf(Path.sep),
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
        (typeof obj !== 'object' &&
        isBasicType(typeof obj))
    ) {
        return obj;
    }

    let nextMaxDepth = (maxDepth - 1);

    if (obj instanceof Array) {

        let duplicatedArray = [];

        if (filterFn) {
            duplicatedArray = obj
                .filter((item, index) => filterFn(item, index, obj))
                .slice();
        } else {
            duplicatedArray = obj.slice();
        }

        if (nextMaxDepth >= 0) {
            duplicatedArray = duplicatedArray.map(item => clone(item, nextMaxDepth, filterFn));
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

    if (nextMaxDepth < 0) {
        keys.forEach(key => {
            duplicatedObj[key] = originalObj[key];
        });
    } else {
        keys.forEach(key => {
            duplicatedObj[key] = clone(
                originalObj[key], nextMaxDepth, filterFn
            );
        });
    }

    return duplicatedObj;
}



export function copy (
    sourceFilePath: string, targetFilePath: string
): Promise<string> {

    return new Promise((resolve, reject) => {
        MkDirP(Path.dirname(targetFilePath), error => {

            if (error) {
                reject(error);
                return;
            }

            FS.copyFile(sourceFilePath, targetFilePath, error => {
                if (error) {
                    reject(error);
                } else {
                    resolve(targetFilePath);
                }
            });

        });
    });
}



export function copyAll (
    sourceFolderPath: string, targetPath: string
): Promise<Array<string>> {

    return files(sourceFolderPath)
        .then(files => Promise.all(
            files.map(
                file => copy(
                    file,
                    path(targetPath, relative(sourceFolderPath, file))
                )
            )
        ));
}

export function extract (text: string, filter: RegExp): string {

    return (text.match(filter) || [''])[0];
}

/**
 * Return of all files in a given folder and subfolders.
 *
 * @param folder
 *        Folder name
 */
export function files (folder: string): Promise<Array<string>> {

    return new Promise((resolve, reject) => {

        try {
            FS
                .readdir(folder, (error, entries) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    entries = entries.map(entry => path(folder, entry));

                    const filesPromises = entries
                        .filter(entry =>
                            FS.statSync(entry).isDirectory()
                        )
                        .map(entry =>
                            files(entry)
                        );

                    const promisedFiles = entries.filter(entry =>
                        FS.statSync(entry).isFile()
                    );

                    Promise
                        .all(filesPromises)
                        .then(results => {

                            results.forEach(
                                result => promisedFiles.push(...result)
                            );

                            return promisedFiles;
                        })
                        .then(resolve);
                });
        } catch (error) {
            reject(error);
        }
    });
}

export function isBasicType (name: string): boolean {

    switch (name) {
        case 'any':
        case 'boolean':
        case 'function':
        case 'number':
        case 'object':
        case 'string':
        case 'symbol':
        case 'undefined':
        case 'void':
            return true;
    }

    return false;
}



export function isCoreType (name: string): boolean {

    if (isBasicType(name)) {
        return true;
    }

    if (name.startsWith('global.') ||
        name.startsWith('window.')
    ) {
        name = name.substr(7);
    }

    switch (name) {
        case 'Array':
        case 'Boolean':
        case 'false':
        case 'true':
        case 'Date':
        case 'Error':
        case 'Event':
        case 'Function':
        case 'Global':
        case 'global':
        case 'Number':
        case 'NaN':
        case 'Object':
        case 'RegExp':
        case 'String':
        case 'Symbol':
        case 'Window':
        case 'window':
            return true;
    }

    if (name.startsWith('Array<')) {
        return true;
    }

    if (name.length > 1) {

        let firstCharacter = name[0],
            lastCharacter = name[name.length-1];

        switch (firstCharacter + lastCharacter) {
            case '[]':
            case '\'\'':
            case '""':
                return true;
        }
    }

    if (!isNaN(parseFloat(name)) ||
        !isNaN(parseInt(name))
    ) {
        return true;
    }

    return false;
}



export function isDeepEqual (objectA: any, objectB: any): boolean {

    switch (typeof objectA) {
        case 'boolean':
        case 'function':
        case 'number':
        case 'undefined':
        case 'string':
        case 'symbol':
            return (objectA === objectB);
    }

    switch (typeof objectB) {
        case 'boolean':
        case 'function':
        case 'number':
        case 'undefined':
        case 'string':
        case 'symbol':
            return (objectA === objectB);
    }

    if (objectA === null ||
        objectB === null ||
        typeof objectA !== 'object' ||
        typeof objectB !== 'object'
    ) {
        return (objectA === objectB);
    }

    if (objectA instanceof Array &&
        objectB instanceof Array
    ) {
        if (objectA.length >= objectB.length) {
            return objectA.every(
                (item, index) => isDeepEqual(item, objectB[index])
            );
        }
        else {
            return objectB.every(
                (item, index) => isDeepEqual(item, objectA[index])
            );
        }
    }
    else {
        let keysA = Object.keys(objectA),
            keysB = Object.keys(objectB);

        return (
            keysA.length === keysB.length &&
            keysA.every(key => isDeepEqual(objectA[key], objectB[key]))
        );
    }
}



export function json (
    json: string,
    allowQuirks: boolean = false
): (Array<any> | Dictionary<any>) {

    if (!allowQuirks) {
        return JSON.parse(json);
    }

    let results = JSON.parse(json
        .replace(new RegExp(JSON_QUOTE, 'gm'), '"')
        .replace(new RegExp(JSON_ESCAPE, 'gm'), '$1"$2"$3')
    );

    if (typeof results.map === 'function') {
        results.map((result: any) => (
            typeof result === 'string' ?
            result.replace(new RegExp(JSON_UNESCAPE, 'gm'), '$1') :
            result
        ));
    }

    return results;
}



export function load (
    filePath: string
): Promise<(Array<any> | Dictionary<any>)> {
    return new Promise((resolve, reject) => {
        filePath = Path.resolve(process.cwd(), filePath);
        FS.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(
                    json(data.toString())
                );
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



export function parent (childPath: string): string {
    return Path.dirname(childPath);
}



export function path (...pathes: Array<string>): string {
    return Path.join(...pathes);
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

    if (moduleMode || Path.extname(fromPath)) {
        fromDirectory = Path.dirname(fromDirectory);
        isFromFile = true;
    }

    if (moduleMode || Path.extname(toPath)) {
        toDirectory = Path.dirname(toDirectory);
        isToFile = true;
    }

    let relativePath = Path.relative(
        fromDirectory, toDirectory
    );

    if (moduleMode &&
       relativePath[0] !== '.'
    ) {
        if (relativePath[0] !== Path.sep) {
            relativePath = Path.sep + relativePath;
        }
        relativePath = '.' + relativePath;
    }

    if (isToFile) {
        if (relativePath &&
            relativePath[relativePath.length-1] !== Path.sep
        ) {
            relativePath += Path.sep;
        }
        return relativePath + Path.basename(toPath);
    } else {
        if (relativePath &&
            relativePath[relativePath.length-1] === Path.sep
        ) {
            relativePath = relativePath.substr(0, (relativePath.length - 1));
        }
        return relativePath;
    }
}



export function removeExamples (text: string): string {
    return text
        .replace(new RegExp(REMOVE_EXAMPLE_HTML, 'gm'), REMOVE_EXAMPLE_REPLACEMENT)
        .replace(new RegExp(REMOVE_EXAMPLE_JSDOC, 'gm'), REMOVE_EXAMPLE_REPLACEMENT)
        .replace(new RegExp(REMOVE_EXAMPLE_MARKDOWN, 'gm'), REMOVE_EXAMPLE_REPLACEMENT);
}



export function removeLinks(
    text: string, removedLinks?: Array<string>
): string {

    let linkUrl;

    function replaceLink (match: string, title: string, link: string) {
        if (removedLinks) {
            linkUrl = url(link.replace(new RegExp(REMOVE_LINK_SPACE, 'gm'), ''));
            if (linkUrl) {
                removedLinks.push(linkUrl);
            }
        }
        if (title) {
            return title.replace('#', '.');
        } else {
            return link;
        }
    }

    return text
        .replace(new RegExp(REMOVE_LINK_MIX, 'gm'), replaceLink)
        .replace(new RegExp(REMOVE_LINK_MARKDOWN, 'gm'), replaceLink)
        .replace(
            new RegExp(REMOVE_LINK_JSDOC, 'gm'),
            (match: string, link: string, title: string) =>
            replaceLink(match, title, link)
        );
}



export function save (filePath: string, fileContent: string): Promise<string> {
    return new Promise((resolve, reject) => {

        filePath = Path.resolve(process.cwd(), filePath);

        MkDirP(Path.dirname(filePath), err => {
            if (err) {
                reject(err);
                return;
            }
            FS.writeFile(filePath, fileContent, err => {
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

    return text.replace(new RegExp(TRANSFORM_LISTS, 'gm'), '\n\n$1 ');
}



export function uniqueArray<T>(
    ...sources: Array<Array<T>>
): Array<T> {

    let target = [] as Array<T>;

    sources.forEach(
        source => source.forEach(
            item => {
                if (target.indexOf(item) === -1) {
                    target.push(item);
                }
            }
        )
    );

    return target;
}



export function url (text: string): (string|null) {

    let match = text.match(new RegExp(URL_WEB, 'g'));

    if (match) {
        return match[0];
    } else {
        return null;
    }
}



export function urls (text: string): Array<string> {

    let matches = text.match(new RegExp(URL_WEB, 'g'));

    if (matches) {
        return new Array(...matches);
    } else {
        return [];
    }
}
