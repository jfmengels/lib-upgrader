'use strict';

var meow = require('meow');
var globby = require('globby');
var Promise = require('bluebird');
var inquirer = require('inquirer');
var assign = require('lodash.assign');
var isGitClean = require('is-git-clean');
var updateNotifier = require('update-notifier');
var Runner = require('jscodeshift/dist/Runner.js');
var lib = require('./lib');

function runTransforms(options, transforms, files) {
	return Promise.mapSeries(transforms, function (transform) {
		return Runner.run(transform, files, {silent: options.silent});
	});
}

function cliArgs(options, releases) {
	var upgrades = lib.listUpgrades(releases);
	var description = [
		'Usage',
		'  $ ' + options.pkg.name + ' [<file|glob> ...]',
		'',
		'Options',
		'  --from <version> Specify the version of ' + options.libraryName + ' currently used',
		'  --to <version>   Specify the version of ' + options.libraryName + ' to move to',
		'  --force, -f      Bypass safety checks and forcibly run codemods',
		'  --silent, -S     Disable log output',
		'',
		'Available upgrades'
	].concat(upgrades);

	return meow(description, {
		boolean: ['force', 'silent'],
		string: ['_'],
		alias: {
			f: 'force',
			S: 'silent',
			h: 'help'
		}
	});
}

function versionsAfter(versions, versionIndex, answers) {
	var version = answers.from;
	if (versionIndex !== -1) {
		version = versions[versionIndex].value;
	}
	return lib.takeVersionsAfter(versions, version);
}

function getQuestions(options, versions) {
	function truthy(v) {
		return v;
	}
	var name = options.libraryName;
	var from = lib.indexOfVersion(versions, options.from);
	var to = lib.indexOfVersion(versions, options.to);

	return [{
		type: 'list',
		name: 'from',
		message: 'What version of ' + name + ' are you currently using?',
		choices: versions.slice(0, -1),
		default: (from !== -1 && from) || undefined,
		when: from === -1
	}, {
		type: 'list',
		name: 'to',
		message: 'What version of ' + name + ' are you moving to?',
		choices: (to !== -1 && to) || function (answers) {
			return versionsAfter(versions, from, answers);
		},
		default: function (answers) {
			return versionsAfter(versions, from, answers).length - 1;
		},
		when: to === -1
	}, {
		type: 'input',
		name: 'files',
		message: 'On which files should the codemods be applied?',
		default: options.files,
		when: !options.files || options.files.length === 0,
		filter: function (files) {
			return files.trim().split(/\s+/).filter(truthy);
		}
	}];
}

function checkAndRunTransform(options, transforms, files) {
	if (transforms.length === 0) {
		console.log('No transforms to apply');
		return Promise.resolve();
	}

	var foundFiles = globby.sync(files);
	if (foundFiles.length === 0) {
		console.log('No files to transform');
		return Promise.resolve();
	}

	return runTransforms(options, transforms, foundFiles);
}

function printTip(options) {
	console.log('\nFor similar projects, you may want to run the following command:');
	console.log(
		'    ' + options.pkg.name +
		' --from ' + options.from +
		' --to ' + options.to +
		' ' + options.files.map(JSON.stringify).join(' ')
	);
	return Promise.resolve(options);
}

function applyCodemods(options) {
	if (!options.files || options.files.length === 0) {
		return Promise.resolve(options);
	}

	var releases = options.releases.slice().sort(lib.sortByVersion);
	var transforms = lib.selectTransforms(releases, options.from, options.to)
		.map(lib.resolvePath(options.dirname));

	return checkAndRunTransform(options, transforms, options.files)
	.tap(function () {
		return printTip(options);
	});
}

function checkGitIsClean(settings) {
	var clean = false;
	var errorMessage = 'Unable to determine if git directory is clean';
	try {
		clean = isGitClean.sync();
		errorMessage = 'Git directory is not clean';
	} catch (e) {
	}

	var ENSURE_BACKUP_MESSAGE = 'Ensure you have a backup of your tests or commit the latest changes before continuing.';

	if (!clean) {
		if (settings.force) {
			console.log('WARNING: ' + errorMessage + '. Forcibly continuing.');
			console.log(ENSURE_BACKUP_MESSAGE);
		} else {
			console.log('ERROR: ' + errorMessage + '. Refusing to continue.');
			console.log(ENSURE_BACKUP_MESSAGE);
			console.log('You may use the --force flag to override this safety check.');
			return Promise.reject(new Error(errorMessage));
		}
	}
	return Promise.resolve(settings);
}

function prompt(settings) {
	var releases = settings.releases.slice().sort(lib.sortByVersion);

	var versions = lib.getVersions(releases);
	var questions = getQuestions(settings, versions);

	return inquirer.prompt(questions)
	.then(function (answers) {
		return assign({},
			settings,
			answers
		);
	});
}

function handleCliArgs(settings) {
	var releases = settings.releases.slice().sort(lib.sortByVersion);
	var args = cliArgs(settings, releases);
	var newSettings = assign({files: args.input}, settings, args.flags);
	return Promise.resolve(newSettings);
}

function checkForUpdates(settings) {
	updateNotifier({pkg: settings.pkg}).notify();
	return Promise.resolve(settings);
}

module.exports = {
	applyCodemods: applyCodemods,
	checkForUpdates: checkForUpdates,
	checkGitIsClean: checkGitIsClean,
	handleCliArgs: handleCliArgs,
	prompt: prompt
};
