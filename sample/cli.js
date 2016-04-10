#!/usr/bin/env node
'use strict';

var upgrader = require('lib-upgrader');
var pkg = require('./package.json');
var releases = require('./releases.json');

upgrader({
	libraryName: 'Your library name',
	releases: releases,
	pkg: pkg,
	dirname: __dirname
});
