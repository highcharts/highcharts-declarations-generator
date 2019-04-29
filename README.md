# Highcharts Declarations Generator

Takes recent meta dumps of options and namespaces doclets, and generates
declaration files (`*.d.ts`) for TypeScript.

**Note:**
This is temporary solution to migrate the Highcharts project to TypeScript.

## How To Use

You can configure the output of the generator by creating a `dtsconfig.json` in
you project root.

The generator gets normally called via Gulp:
```js
Gulp.task('dts', require('highcharts-declarations-generator').task);
```
