# Highcharts TypeScript Declaration Generator

Takes recent meta dumps for options + methods, and generates a `.d.ts` file.

## Running
       
    npm install 
    node bin/generate.js

..puts the dictionary in `dist/`.

## Patches

Some things are hot patched. These are things that make sense in the regular API, 
but not so much in TypeScript.

The patches are located in `patches/patches.json`.

## Templates

Handlebars is used for generating the TypeScript code.

See `templates/`.

## Notes

There are some issues with the API meta, namely that 
the chart options in `H.Chart` needs to be of the type `ChartOptions` rather than `Object` for things to work.

The series options array should also link to series.

There are also some lacking/wrong properties in the API, see [apibugs.txt](apibugs.txt).
