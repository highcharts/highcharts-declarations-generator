/*******************************************************************************

Copyright (c) 2017, Highsoft

Original author: Christer Vasseng

All rights reserved.

*******************************************************************************/

require('colors');

const request = require('request');
const fs = require('fs');
const async = require('async');
const mkdir = require('mkdirp');

const templates = require('./templates.js');
const utils = require('./utils.js');
const processing = require('./process.js');

const pad = utils.pad;
const processMethods = processing.processMethods;
const processOptions = processing.processOptions;

const cachePath = __dirname + '/../cache/';

const targets = [
    // Highcharts
    {
        name: 'highcharts',
        optionsURL: 'http://api.highcharts.com/highcharts/option/dump.json',
        methodsURL: 'http://api.highcharts.com/highcharts/object/dump.json'
    },
    // Highstock
    {
        name: 'highstock',
        optionsURL: 'http://api.highcharts.com/highstock/option/dump.json',
        methodsURL: 'http://api.highcharts.com/highstock/object/dump.json'
    },
    // Highmaps
    {
        name: 'highmaps',
        optionsURL: 'http://api.highcharts.com/highmaps/option/dump.json',
        methodsURL: 'http://api.highcharts.com/highmaps/object/dump.json'
    }
];

const ops = {
    version: '1.0.0',
    output: __dirname + '/../dist/',
    forceRefetch: false,
    debugging: false
};

////////////////////////////////////////////////////////////////////////////////

function log() {
    if (ops.debugging) {
        console.log(Array.prototype.slice.call(arguments).join(' '));        
    }
}

function dump(target, methods, options, done) {
    fs.writeFile(
        ops.output + target.name + '.d.ts', 
        templates.compile('api', {
            date: new Date(),
            version: ops.version,
            api: methods,
            options: options,
            productName: target.name[0].toUpperCase() + target.name.substr(1)
        }), 
        function (err) {
            if (done) {
                done(err);
            }
        }
    );   
}

function createHBCopier(name, outname, data) {
    return function (next) {
        fs.writeFile(
            ops.output + outname,
            templates.compile(name, data),
            function (err) {
                next(err);
            }
        );
    };
}

function fetchAndProcess(cache, url, name, type, process) {
    log(pad(name + ' ' + type).green, 'Generating declarations'.gray);

    function fetchRemote() {
        log(pad(name + ' ' + type).green, 'Fetching from remote...'.gray);

        request(url, function (error, response, body) {
            var api;

            log(pad(name + ' ' + type).green, 'Fetched, transforming...'.gray);
            
            if (error) {
                log(pad(name + ' ' + type).green, '[error]'.red, error);
            } else {
                try {
                    api = JSON.parse(body);

                    fs.writeFile(cache, body, function () {});

                    process(api);
                } catch (e) {
                    log(pad(name + ' ' + type).green, '[error]'.red, e);
                }
            }
        });        
    }

    if (ops.forceRefetch) {
        return fetchRemote();
    }

    fs.readFile(cache, 'utf8', function (err, data) {
        if (err) {            
            fetchRemote();
        } else {
            log(pad(name + ' ' + type).green, 'Using cached API definition'.gray);
            api = JSON.parse(data);
            process(api);
        }
    });
}

////////////////////////////////////////////////////////////////////////////////

module.exports = function (options, fn) {
    options = options || {};
    ops.version = options.version || ops.version;
    ops.output = options.output || ops.output;
    ops.forceRefetch = options.forceRefetch || ops.forceRefetch;
    ops.debugging = typeof options.debugging !== 'undefined' ? options.debugging : ops.debugging;

    if (ops.output[ops.output.length - 1] !== '/') {
        ops.output += '/';
    }

    mkdir(ops.output, function () {
        mkdir(cachePath, function () {
            templates.load(function (err) {            
                var funs = [];

                if (err) return console.log('Error:', err);

                targets.forEach(function (target) {
                    var options, 
                        methods
                    ;
                   
                    funs.push(function (next) {
                        fetchAndProcess(
                            cachePath + target.name + '.methods.cache.json', 
                            target.methodsURL, 
                            target.name, 
                            'methods',
                            function (api) {
                                methods = processMethods(api);
                                next(false);
                            }
                        );
                    });

                    funs.push(function (next) {
                        fetchAndProcess(
                            cachePath + target.name + '.options.cache.json', 
                            target.optionsURL, 
                            target.name, 
                            'options',
                            function (api) {
                                options = processOptions(api);
                                next(false);
                            }
                        );
                    });

                    funs.push(function (next) {
                       // console.log( ('target "' + target.name + '" generated!').yellow);
                        console.log();
                        dump(target, methods, options, next);                        
                    });
                });

                funs.push(function (next) {
                     fs.writeFile(
                        ops.output + 'package.json',
                        JSON.stringify({
                            name: 'highcharts-typescript',
                            author: 'Higsoft',
                            version: '1.0.0',
                            types: 'highcharts.d.ts'
                        }, undefined, '  '),
                        function (err) {
                            next(err);
                        }
                    );
                 });

                funs.push(createHBCopier('tsconfig', 'tsconfig.json', {
                    version: ops.version,
                    date: new Date()
                }));

                funs.push(createHBCopier('readme', 'README.md', {
                    version: ops.version,
                    date: new Date()
                }));

                funs.push(function (next) {
                    fs.writeFile(
                        ops.output + 'test.ts',
                        templates.compile('test', {}),
                        function (err) {
                            next(err);
                        }
                    );
                });

                async.waterfall(funs, function () {
                    if (fn) {
                        fn({
                            output: ops.output
                        });
                    }
                });
            });
        });
    });
};
