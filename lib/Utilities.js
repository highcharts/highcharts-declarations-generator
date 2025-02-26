"use strict";
/*!*
 *
 *  Copyright (c) Highsoft AS. All rights reserved.
 *
 *!*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dictionary = void 0;
exports.base = base;
exports.capitalize = capitalize;
exports.clone = clone;
exports.copy = copy;
exports.copyAll = copyAll;
exports.extract = extract;
exports.files = files;
exports.isBasicType = isBasicType;
exports.isCoreType = isCoreType;
exports.isDeepEqual = isDeepEqual;
exports.json = json;
exports.load = load;
exports.log = log;
exports.parent = parent;
exports.path = path;
exports.pluralize = pluralize;
exports.relative = relative;
exports.removeExamples = removeExamples;
exports.removeLinks = removeLinks;
exports.save = save;
exports.transformLists = transformLists;
exports.uniqueArray = uniqueArray;
exports.url = url;
exports.urls = urls;
const fs_1 = require("fs");
const path_1 = require("path");
const CWD = process.cwd().split(path_1.sep).join(path_1.posix.sep);
const JSON_ESCAPE = /([\[,]\s?)"?(undefined)"?(\s?[,\]])/;
const JSON_QUOTE = /['`]/;
const JSON_UNESCAPE = /^\[(undefined)\]$/;
const REMOVE_EXAMPLE_HTML = /<(\w+)[^\>]*>([\S\s]*?)<\/\1>/;
const REMOVE_EXAMPLE_JSDOC = /@example[^@]*/;
const REMOVE_EXAMPLE_MARKDOWN = /\s*```[^`]*?```/;
const REMOVE_EXAMPLE_REPLACEMENT = ' (see online documentation for example)';
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
function base(filePath) {
    let slashIndex = filePath.lastIndexOf(path_1.posix.sep), pointIndex = filePath.indexOf('.', slashIndex);
    if (pointIndex > slashIndex + 1) {
        return filePath.substring(0, pointIndex);
    }
    else {
        return filePath;
    }
}
function capitalize(str) {
    if (str === '') {
        return str;
    }
    else {
        return (str[0].toUpperCase() + str.substr(1));
    }
}
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
function copy(sourceFilePath, targetFilePath) {
    return fs_1.promises
        .mkdir(path_1.posix.dirname(targetFilePath), { recursive: true })
        .then(() => fs_1.promises.copyFile(sourceFilePath, targetFilePath))
        .then(() => targetFilePath);
}
function copyAll(sourceFolderPath, targetPath) {
    return files(sourceFolderPath)
        .then(files => Promise.all(files.map(file => copy(file, path(targetPath, relative(sourceFolderPath, file))))));
}
function extract(text, filter) {
    return (text.match(filter) || [''])[0];
}
/**
 * Return of all files in a given folder and subfolders.
 *
 * @param folder
 *        Folder name
 */
function files(folder) {
    return fs_1.promises
        .readdir(folder, { withFileTypes: true })
        .then(entries => {
        const subPromises = entries
            .filter(entry => entry.isDirectory())
            .map(entry => files(path(folder, entry.name)));
        const promisedFiles = entries
            .filter(entry => entry.isFile())
            .map(entry => path(folder, entry.name));
        return Promise
            .all(subPromises)
            .then(results => {
            results.forEach(result => promisedFiles.push(...result));
            return promisedFiles;
        });
    });
}
function isBasicType(name) {
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
function isCoreType(name) {
    if (isBasicType(name)) {
        return true;
    }
    if (name.startsWith('global.') ||
        name.startsWith('window.')) {
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
        let firstCharacter = name[0], lastCharacter = name[name.length - 1];
        switch (firstCharacter + lastCharacter) {
            case '[]':
            case '\'\'':
            case '""':
                return true;
        }
    }
    if (!isNaN(parseFloat(name)) ||
        !isNaN(parseInt(name))) {
        return true;
    }
    return false;
}
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
function json(json, allowQuirks = false) {
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
function load(filePath) {
    filePath = path_1.posix.join(CWD, filePath);
    return fs_1.promises
        .readFile(filePath)
        .then(data => json(data.toString()));
}
async function log(obj) {
    console.log(obj);
    return obj;
}
function parent(childPath) {
    return path_1.posix.dirname(childPath);
}
function path(...pathes) {
    return path_1.posix.join(...pathes);
}
function pluralize(value, singular, plural) {
    return (value.toString() + (value === 1 ? singular : plural));
}
function relative(fromPath, toPath, moduleMode = false) {
    let fromDirectory = fromPath, toDirectory = toPath, isFromFile = false, isToFile = false;
    if (moduleMode || path_1.posix.extname(fromPath)) {
        fromDirectory = path_1.posix.dirname(fromDirectory);
        isFromFile = true;
    }
    if (moduleMode || path_1.posix.extname(toPath)) {
        toDirectory = path_1.posix.dirname(toDirectory);
        isToFile = true;
    }
    let relativePath = path_1.posix.relative(fromDirectory, toDirectory);
    if (moduleMode &&
        relativePath[0] !== '.') {
        if (relativePath[0] !== path_1.posix.sep) {
            relativePath = path_1.posix.sep + relativePath;
        }
        relativePath = '.' + relativePath;
    }
    if (isToFile) {
        if (relativePath &&
            relativePath[relativePath.length - 1] !== path_1.posix.sep) {
            relativePath += path_1.posix.sep;
        }
        return relativePath + path_1.posix.basename(toPath);
    }
    else {
        if (relativePath &&
            relativePath[relativePath.length - 1] === path_1.posix.sep) {
            relativePath = relativePath.substr(0, (relativePath.length - 1));
        }
        return relativePath;
    }
}
function removeExamples(text) {
    return text
        .replace(new RegExp(REMOVE_EXAMPLE_HTML, 'gm'), REMOVE_EXAMPLE_REPLACEMENT)
        .replace(new RegExp(REMOVE_EXAMPLE_JSDOC, 'gm'), REMOVE_EXAMPLE_REPLACEMENT)
        .replace(new RegExp(REMOVE_EXAMPLE_MARKDOWN, 'gm'), REMOVE_EXAMPLE_REPLACEMENT);
}
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
function save(filePath, fileContent) {
    filePath = path_1.posix.join(CWD, filePath);
    return fs_1.promises
        .mkdir(path_1.posix.dirname(filePath), { recursive: true })
        .then(() => fs_1.promises.writeFile(filePath, fileContent))
        .then(() => filePath);
}
function transformLists(text) {
    return text.replace(new RegExp(TRANSFORM_LISTS, 'gm'), '\n\n$1 ');
}
function uniqueArray(...sources) {
    let target = [];
    sources.forEach(source => source.forEach(item => {
        if (target.indexOf(item) === -1) {
            target.push(item);
        }
    }));
    return target;
}
function url(text) {
    let match = text.match(new RegExp(URL_WEB, 'g'));
    if (match) {
        return match[0];
    }
    else {
        return null;
    }
}
function urls(text) {
    let matches = text.match(new RegExp(URL_WEB, 'g'));
    if (matches) {
        return new Array(...matches);
    }
    else {
        return [];
    }
}
//# sourceMappingURL=Utilities.js.map