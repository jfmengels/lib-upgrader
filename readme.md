# lib-upgrader [![Build Status](https://travis-ci.org/jfmengels/lib-upgrader.svg?branch=master)](https://travis-ci.org/jfmengels/lib-upgrader)

<img src="screenshot.gif" width="440" align="right">

Codemods, or [`jscodeshift`](https://github.com/facebook/jscodeshift) transforms, are small programs that help automate changes in a codebase. Think of them as search and replace on steroids. This tool helps you to create a simple CLI to apply the codemods that you wrote, so that users can easily upgrade their code between various releases of your library.

## Install

```
$ npm install --save lib-upgrader
```


## Usage

Create a `cli.js` file at the root of your project that will serve as your "upgrader" executable, and add this sample code ([sample available here](sample/cli.js)):

```js
#!/usr/bin/env node
'use strict';

var upgrader = require('lib-upgrader');
var releases = require('./releases.json');

upgrader({
	libraryName: 'Your library name',
	toolName: 'the name of your executable',
	releases: releases,
	dirname: __dirname
});
```

and create a `releases.json` file next to `cli.js`, which looks like the following ([sample available here](sample/releases.json)):

```json
[{
	"version": "0.14.0",
	"transforms": [
		"path/to/transorm/a.js",
		"path/to/transorm/b.js"
	]
}, {
	"version": "0.15.0",
	"transforms": [
		"path/to/transorm/c.js",
		"path/to/transorm/d.js"
	]
}, {
	"version": "1.0.0",
	"transforms": [
		"path/to/transorm/e.js",
		"path/to/transorm/f.js"
	]
}, {
	"version": "2.0.0",
	"transforms": [
		"path/to/transorm/g.js",
		"path/to/transorm/h.js"
	]
}]
```

Give execution access to your script
```
chmod +x script
```
and you should now be able to run the cli using
```
./cli.js
```

Unless you committed your changes and your directory is clean, the program will exit and ask you to do that or stash your changes. You can force through it by adding `--force` to the command line.

## License

MIT © [Jeroen Engels](http://github.com/jfmengels)
