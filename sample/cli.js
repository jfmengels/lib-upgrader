#!/usr/bin/env node
'use strict';

var upgrader = require('lib-upgrader');
var pkg = require('./package.json');
var releases = require('./releases.json');

var settings = {
	libraryName: 'Lodash',
	releases: releases,
	pkg: pkg,
	dirname: __dirname
};

upgrader.handleCliArgs(settings)
	.then(upgrader.checkForUpdates)
	.then(upgrader.checkGitIsClean)
	.then(upgrader.prompt)
	.then(upgrader.applyCodemods)
	.then(upgrader.printTip)
	.catch(function (err) {
		console.error(err.message);
		process.exit(1);
	});
