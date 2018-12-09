"use strict";
/* *
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 * */
Object.defineProperty(exports, "__esModule", { value: true });
const FS = require("fs");
const MkDirP = require("mkdirp");
const Path = require("path");
const Request = require("request");
const JSON_ESCAPE = /([\[,]\s?)"?(undefined)"?(\s?[,\]])/;
const JSON_QUOTE = /['`]/;
const JSON_UNESCAPE = /^\[(undefined)\]$/;
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
/**
 * Generic dictionary
 */
class Dictionary {
    /* *
     *
     *  Static Functions
     *
     * */
    static values(dictionary) {
        return Object
            .keys(dictionary)
            .map(key => dictionary[key]);
    }
}
exports.Dictionary = Dictionary;
function ajax(url) {
    return new Promise((resolve, reject) => {
        Request(url, (err, response, body) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(json(body));
            }
        });
    });
}
exports.ajax = ajax;
function base(filePath) {
    let slashIndex = filePath.lastIndexOf(Path.sep), pointIndex = filePath.indexOf('.', slashIndex);
    if (pointIndex > slashIndex + 1) {
        return filePath.substring(0, pointIndex);
    }
    else {
        return filePath;
    }
}
exports.base = base;
function capitalize(str) {
    if (str === '') {
        return str;
    }
    else {
        return (str[0].toUpperCase() + str.substr(1));
    }
}
exports.capitalize = capitalize;
function clone(obj, maxDepth = 3, filterFn) {
    if (obj === null ||
        obj === undefined ||
        (typeof obj !== 'object' &&
            isBasicType(typeof obj))) {
        return obj;
    }
    let nextMaxDepth = (maxDepth - 1);
    if (obj instanceof Array) {
        let duplicatedArray = [];
        if (filterFn) {
            duplicatedArray = obj
                .filter((item, index) => filterFn(item, index, obj))
                .slice();
        }
        else {
            duplicatedArray = obj.slice();
        }
        if (nextMaxDepth >= 0) {
            duplicatedArray = duplicatedArray.map(item => clone(item, nextMaxDepth, filterFn));
        }
        return duplicatedArray;
    }
    if (obj.constructor.prototype !== Object.prototype) {
        return obj;
    }
    let originalObj = obj, duplicatedObj = {}, keys = Object.keys(originalObj);
    if (filterFn) {
        keys = keys.filter(key => filterFn(originalObj[key], key, obj));
    }
    if (nextMaxDepth < 0) {
        keys.forEach(key => {
            duplicatedObj[key] = originalObj[key];
        });
    }
    else {
        keys.forEach(key => {
            duplicatedObj[key] = clone(originalObj[key], nextMaxDepth, filterFn);
        });
    }
    return duplicatedObj;
}
exports.clone = clone;
function copy(sourceFilePath, targetFilePath) {
    if (sourceFilePath[0] !== Path.sep) {
        sourceFilePath = Path.resolve(process.cwd(), sourceFilePath);
    }
    if (targetFilePath[0] !== Path.sep) {
        targetFilePath = Path.resolve(process.cwd(), targetFilePath);
    }
    return new Promise((resolve, reject) => {
        MkDirP(Path.dirname(targetFilePath), err => {
            if (err) {
                reject(err);
                return;
            }
            FS.copyFile(sourceFilePath, targetFilePath, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(targetFilePath);
                }
            });
        });
    });
}
exports.copy = copy;
function copyAll(sourcePath, targetPath, recursive = false) {
    if (sourcePath[0] !== Path.sep) {
        sourcePath = Path.resolve(process.cwd(), sourcePath);
    }
    if (targetPath[0] !== Path.sep) {
        targetPath = Path.resolve(process.cwd(), targetPath);
    }
    return new Promise((resolve, reject) => {
        FS.readdir(sourcePath, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            const copyPromises = [];
            files.forEach(file => {
                const source = Path.join(sourcePath, file);
                const target = Path.join(targetPath, file);
                const stat = FS.statSync(source);
                if (stat.isFile()) {
                    copyPromises.push(copy(source, target));
                }
                else if (recursive && stat.isDirectory()) {
                    copyPromises.push(copyAll(source, target));
                }
            });
            Promise.all(copyPromises).then(results => {
                const copiedFiles = [];
                results.forEach(result => {
                    if (result instanceof Array) {
                        copiedFiles.push(...result);
                    }
                    else {
                        copiedFiles.push(result);
                    }
                });
                resolve(copiedFiles);
            });
        });
    });
}
exports.copyAll = copyAll;
function isBasicType(typeName) {
    switch (typeName) {
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
exports.isBasicType = isBasicType;
function isCoreType(typeName) {
    if (isBasicType(typeName)) {
        return true;
    }
    if (typeName.startsWith('global.') ||
        typeName.startsWith('window.')) {
        typeName = typeName.substr(7);
    }
    switch (typeName) {
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
    if (typeName.startsWith('Array<')) {
        return true;
    }
    if (typeName.length > 1) {
        let firstCharacter = typeName[0], lastCharacter = typeName[typeName.length - 1];
        switch (firstCharacter + lastCharacter) {
            case '[]':
            case '\'\'':
            case '""':
                return true;
        }
    }
    if (!isNaN(parseFloat(typeName)) ||
        !isNaN(parseInt(typeName))) {
        return true;
    }
    return false;
}
exports.isCoreType = isCoreType;
function isDeepEqual(objectA, objectB) {
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
        typeof objectB !== 'object') {
        return (objectA === objectB);
    }
    if (objectA instanceof Array &&
        objectB instanceof Array) {
        if (objectA.length >= objectB.length) {
            return objectA.every((item, index) => isDeepEqual(item, objectB[index]));
        }
        else {
            return objectB.every((item, index) => isDeepEqual(item, objectA[index]));
        }
    }
    else {
        let keysA = Object.keys(objectA), keysB = Object.keys(objectB);
        return (keysA.length === keysB.length &&
            keysA.every(key => isDeepEqual(objectA[key], objectB[key])));
    }
}
exports.isDeepEqual = isDeepEqual;
function json(json, allowQuirks = false) {
    if (typeof json !== 'string') {
        return JSON.stringify(json);
    }
    if (!allowQuirks) {
        return JSON.parse(json);
    }
    let results = JSON.parse(json
        .replace(new RegExp(JSON_QUOTE, 'gm'), '"')
        .replace(new RegExp(JSON_ESCAPE, 'gm'), '$1"$2"$3'));
    if (typeof results.map === 'function') {
        results.map((result) => (typeof result === 'string' ?
            result.replace(new RegExp(JSON_UNESCAPE, 'gm'), '$1') :
            result));
    }
    return results;
}
exports.json = json;
function load(filePath) {
    return new Promise((resolve, reject) => {
        filePath = Path.resolve(process.cwd(), filePath);
        FS.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(json(data.toString()));
            }
        });
    });
}
exports.load = load;
function log(obj) {
    return new Promise((resolve, reject) => {
        console.log(obj);
        resolve(obj);
    });
}
exports.log = log;
function parent(childPath) {
    return Path.dirname(childPath);
}
exports.parent = parent;
function path(...pathes) {
    return Path.join(...pathes);
}
exports.path = path;
function pluralize(value, singular, plural) {
    return (value.toString() + (value === 1 ? singular : plural));
}
exports.pluralize = pluralize;
function relative(fromPath, toPath, moduleMode = false) {
    let fromDirectory = fromPath, toDirectory = toPath, isFromFile = false, isToFile = false;
    if (moduleMode || Path.extname(fromPath)) {
        fromDirectory = Path.dirname(fromDirectory);
        isFromFile = true;
    }
    if (moduleMode || Path.extname(toPath)) {
        toDirectory = Path.dirname(toDirectory);
        isToFile = true;
    }
    let relativePath = Path.relative(fromDirectory, toDirectory);
    if (moduleMode &&
        relativePath[0] !== '.') {
        if (relativePath[0] !== Path.sep) {
            relativePath = Path.sep + relativePath;
        }
        relativePath = '.' + relativePath;
    }
    if (isToFile) {
        if (relativePath &&
            relativePath[relativePath.length - 1] !== Path.sep) {
            relativePath += Path.sep;
        }
        return relativePath + Path.basename(toPath);
    }
    else {
        if (relativePath &&
            relativePath[relativePath.length - 1] === Path.sep) {
            relativePath = relativePath.substr(0, (relativePath.length - 1));
        }
        return relativePath;
    }
}
exports.relative = relative;
function removeExamples(text) {
    return text
        .replace(new RegExp(REMOVE_EXAMPLE_HTML, 'gm'), REMOVE_EXAMPLE_REPLACEMENT)
        .replace(new RegExp(REMOVE_EXAMPLE_JSDOC, 'gm'), REMOVE_EXAMPLE_REPLACEMENT)
        .replace(new RegExp(REMOVE_EXAMPLE_MARKDOWN, 'gm'), REMOVE_EXAMPLE_REPLACEMENT);
}
exports.removeExamples = removeExamples;
function removeLinks(text, removedLinks) {
    let linkUrl;
    function replaceLink(match, title, link) {
        if (removedLinks) {
            linkUrl = url(link.replace(new RegExp(REMOVE_LINK_SPACE, 'gm'), ''));
            if (linkUrl) {
                removedLinks.push(linkUrl);
            }
        }
        if (title) {
            return title.replace('#', '.');
        }
        else {
            return link;
        }
    }
    return text
        .replace(new RegExp(REMOVE_LINK_MIX, 'gm'), replaceLink)
        .replace(new RegExp(REMOVE_LINK_MARKDOWN, 'gm'), replaceLink)
        .replace(new RegExp(REMOVE_LINK_JSDOC, 'gm'), (match, link, title) => replaceLink(match, title, link));
}
exports.removeLinks = removeLinks;
function save(filePath, str) {
    return new Promise((resolve, reject) => {
        filePath = Path.resolve(process.cwd(), filePath);
        MkDirP(Path.dirname(filePath), err => {
            if (err) {
                reject(err);
                return;
            }
            FS.writeFile(filePath, str, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(filePath);
                }
            });
        });
    });
}
exports.save = save;
function transformLists(text) {
    return text.replace(new RegExp(TRANSFORM_LISTS, 'gm'), '\n\n$1 ');
}
exports.transformLists = transformLists;
function uniqueArray(...sources) {
    let target = [];
    sources.forEach(source => target.push(...source.filter(item => target.indexOf(item) === -1)));
    return target;
}
exports.uniqueArray = uniqueArray;
function url(text) {
    let match = text.match(new RegExp(URL_WEB, 'g'));
    if (match) {
        return match[0];
    }
    else {
        return null;
    }
}
exports.url = url;
function urls(text) {
    let matches = text.match(new RegExp(URL_WEB, 'g'));
    if (matches) {
        return new Array(...matches);
    }
    else {
        return [];
    }
}
exports.urls = urls;
//# sourceMappingURL=Utilities.js.map