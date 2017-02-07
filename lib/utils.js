/*******************************************************************************

Copyright (c) 2017, Highsoft

Original author: Christer Vasseng

All rights reserved.

*******************************************************************************/

const strip = require('striptags');

module.exports = {

    /* Trim long strings to fit (more or less) inside 80 columns */
    snapTo80: function (str, prefix) {
        var lines = [],
            c = '',
            count = 0,
            splits = {
                ' ': true,
                ',': true,
                '.': true,
                '-': true
            }
        ;

        str = strip(str).replace(/\n/g, ' ');

        prefix = prefix || '';    

        for (var i = 0; i < str.length; i++) {

            c += str[i];
            ++count;

            if (count >= (80 - prefix.length - 10) && splits[str[i]]) {
                lines.push(c.trim());
                c = '';
                count = 0;
            }
        }

        if (c.length > 0) {
            lines.push(c);        
        }

        return lines;
    },

    /* Left pad a string */
    pad: function (str) {
        if (str >= 20) return str;
        str += Array(20 - str.length).join(' ');
        return str;
    },

    /* Fix Patches - makes it possible to use | notation */
    patchFix: function (patches) {        
        Object.keys(patches).forEach(function (key) {
            if (key.indexOf('|') > 0) {
                key.split('|').forEach(function (sub) {
                    patches[sub] = patches[key];
                });
            } 
        });

        return patches;
    },

    /* Set an object property based on an entry */
    set: function (entry, target) {
        var p = (entry.fullname || '').split('.'),
            current = target
        ;

        entry.children = entry.children || {};

        if (p.length === 1) {
            if (typeof target[p[0]] === 'undefined') {
                target[p[0]] = entry;            
            } else {
                entry.children = target[p[0]].children;
                target[p[0]] = entry;
            }
            return;
        }

        p.forEach(function (v, i) {

            if (typeof current[v] === "undefined") {
                current[v] = {
                    children: {}
                };
            }
            
            if (i === p.length - 1) {
               // current.children = current.children || {};
                entry.children = entry.children || {};
                current[v] = entry;
                return;
            }        

            current = current[v].children;   
        });
    }
}