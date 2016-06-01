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
		return Runner.run(transform, files, {silent: options.flags.silent});
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

function isGitDirtyAndDoINeedToExit(cli) {
	var clean = false;
	var errorMessage = 'Unable to determine if git directory is clean';
	try {
		clean = isGitClean.sync();
		errorMessage = 'Git directory is not clean';
	} catch (e) {
	}

	var ENSURE_BACKUP_MESSAGE = 'Ensure you have a backup of your tests or commit the latest changes before continuing.';

	if (!clean) {
		if (cli.flags.force) {
			console.log('WARNING: ' + errorMessage + '. Forcibly continuing.');
			console.log(ENSURE_BACKUP_MESSAGE);
		} else {
			console.log('ERROR: ' + errorMessage + '. Refusing to continue.');
			console.log(ENSURE_BACKUP_MESSAGE);
			console.log('You may use the --force flag to override this safety check.');
			return new Error(errorMessage);
		}
	}
	return false;
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
	var from = lib.indexOfVersion(versions, options.flags.from);
	var to = lib.indexOfVersion(versions, options.flags.to);

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
		when: !options.input.length,
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

function printTip(options, answers, files) {
	console.log('\nFor similar projects, you may want to run the following command:');
	console.log(
		'    ' + options.pkg.name +
		' --from ' + answers.from +
		' --to ' + answers.to +
		' ' + files.map(JSON.stringify).join(' ')
	);
}

module.exports = function upgrader(passedOptions) {
	var releases = passedOptions.releases.slice().sort(lib.sortByVersion);

	var options = assign({}, passedOptions, cliArgs(passedOptions, releases));
	var gitError = isGitDirtyAndDoINeedToExit(options);
	if (gitError) {
		return Promise.reject(gitError);
	}

	updateNotifier({pkg: options.pkg}).notify();

	var versions = lib.getVersions(releases);
	var questions = getQuestions(options, versions);

	return inquirer.prompt(questions)
	.then(function (inquirerAnswers) {
		var answers = assign({}, {from: options.flags.from, to: options.flags.to}, inquirerAnswers);
		var files = answers.files || options.input;
		if (!files.length) {
			return;
		}

		var transforms = lib.selectTransforms(releases, answers.from, answers.to)
			.map(lib.resolvePath(options.dirname));

		return checkAndRunTransform(options, transforms, files)
		.tap(function () {
			printTip(options, answers, files);
		});
	});
};
