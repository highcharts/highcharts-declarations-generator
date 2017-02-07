/*******************************************************************************

Copyright (c) 2017, Highsoft

Original author: Christer Vasseng

All rights reserved.

*******************************************************************************/

const strip = require('striptags');
const utils = require('./utils.js');

const typeMap = {
    'Boolean': 'Boolean',
    'String': 'String',
    'Number': 'Number',
    'Array': 'Array<String|Number|Object>',
    'Object': '{}',
    'object': '{}'
};

const patches = utils.patchFix(require(__dirname + '/../patches/patches.json'));

function parseArgs(a, d, entry) {
    var args = [],
        s,

        descriptions = {}
    ;

    // Parse the description
    if (d) {
        d = d.split('||');
        d.forEach(function (c) {
            c = c.trim();

            var nameIndex = c.indexOf(':'),
                name = c.substr(0, nameIndex),
                desc = c.substr(nameIndex + 1).trim()
            ;

            desc = strip('{' + desc.replace('<br>', '} - ')).replace(/\n/g, '\n   *    ');

            descriptions[name] = desc;
        });
    }

    if (a && a.length > 2 && a[0] === '(' && a[a.length - 1] === ')') {
        a = a.substr(1, a.length - 2);


        s = a.split(',');

        s.forEach(function (arg) {
            var pair,
                opt = false,
                name, 
                patch,
                apatch,
                type
            ;

           arg = arg.trim();
            
            if (arg[0] === '[' && arg[arg.length - 1] === ']') {
                //Optional
                arg = arg.substr(1, arg.length - 2);
                opt = true;
            }

            pair = arg.split(' ');
            name = pair[1].trim();
            type = typeMap[pair[0].trim()] || pair[0].trim();

            patch = patches[entry.fullname];
            
            if (patch && patch.args) {
                apatch = patch.args[name];
             
                if (apatch) {
                    console.log(('Patching ' + entry.fullname + ':' + name).gray);

                    opt = typeof apatch.optional !== 'undefined' ? apatch.optional : opt;
                    name = typeof apatch.name !== 'undefined' ? apatch.name : name;
                    type = typeof apatch.type !== 'undefined' ? apatch.type : type;
                }
            }

            args.push({
                optional: opt,
                description: descriptions[pair[1].trim()] || '',
                name: name,
                type: type
            });
        });
    }

    return args;
}

module.exports = {

    /* Process methods - returns a transformed tree */
    processMethods: function (api) {
        var transformed = {Highcharts: {children: {}}};

        // Transform the API to an "instanced" format
        api.forEach(function (entry) {

            if (patches[entry.fullname] && patches[entry.fullname].ignore) {
                return;
            }
           
            entry.includeHeader = entry.name !== 'Highcharts';
            entry.type = entry.name === 'Highcharts' ? 'namespace' : 'class';
            entry.decorator = entry.name.indexOf('Highcharts') === 0 ? 'export function' : 'public';
            entry.args = parseArgs(entry.params, entry.paramsDescription, entry);
            entry.return = (typeMap[entry.returnType] || entry.returnType) || 'void';
            entry.pname = entry.name.substr(entry.name.lastIndexOf('--') + 2);
            entry.comment = utils.snapTo80(entry.description); 

            if (patches[entry.fullname] && patches[entry.fullname].constructor && entry.args.length === 0) {  
                //console.log(('Patching ' + entry.fullname + ': adding constructor').gray); 
                
                entry.args = (patches[entry.fullname].constructor.args || []).map(function (a) {
                    return {
                        name: a.name,
                        type: a.type,
                        description: a.description.join(' ')
                    }
                });
            }

            utils.set(entry, transformed);                    
        });   

        return transformed;
    },

    /* Process options - returns a transformed tree */
    processOptions: function(api) {
        var transformed = {};

        api.forEach(function (entry) {
            if (entry.name.indexOf('<') > 0) return;

            entry.returnType = (typeMap[entry.returnType] || entry.returnType) || false;
            
            if (entry.returnType === 'plotOptions.series.states') {
                entry.returnType = 'PlotOptionsSeriesStates';
            }
            
            entry.comment = utils.snapTo80(entry.description);  
            utils.set(entry, transformed);

        });  

        return transformed;
    }
};