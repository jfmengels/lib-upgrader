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
