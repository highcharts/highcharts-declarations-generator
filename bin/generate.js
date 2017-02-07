#!/usr/env node

/******************************************************************************

Copyright (c) 2017, Highsoft

Original author: Christer Vasseng

All rights reserved.

******************************************************************************/

const gen = require('./../lib/index.js');

console.log();
console.log('Highcharts Suite TypeScript Declaration Generator'.green.bold);
console.log();
console.log('Fetches API dumps from api.highcharts.com, and builds TypeScript .d files.');
console.log('Note that API dumps are cached - delete the cache folder to force a refetch.');
console.log();
console.log('Declaration files ends up in dist/');
console.log();

gen(
    {
        debugging: true
    }, 
    function (err, result) {
        console.log('All done!'.green.bold);
        console.log();
        console.log('Look in dist/ to find what you did.');
        console.log();
    }
);
