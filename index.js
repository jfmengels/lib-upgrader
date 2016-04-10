'use strict';

var childProcess = require('child_process');
var meow = require('meow');
var globby = require('globby');
var inquirer = require('inquirer');
var assign = require('lodash.assign');
var npmRunPath = require('npm-run-path');
var isGitClean = require('is-git-clean');
var pinkiePromise = require('pinkie-promise');
var updateNotifier = require('update-notifier');
var lib = require('./lib');

function runTransforms(options, transforms, files) {
	var spawnOptions = {
		env: assign({}, process.env, {PATH: npmRunPath({cwd: options.dirname})}),
		stdio: 'inherit'
	};

	var result;
	transforms.forEach(function (transform) {
		var args = ['-t', transform].concat(files);
		result = childProcess.spawnSync('jscodeshift', args, spawnOptions);

		if (result.error) {
			throw result.error;
		}
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
		'',
		'Available upgrades'
	].concat(upgrades);

	return meow(description, {
		boolean: ['force'],
		string: ['_'],
		alias: {
			f: 'force',
			h: 'help'
		}
	});
}

function exitIfGitIsDirty(cli) {
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
			process.exit(1);
		}
	}
}

function versionsAfter(versions, versionIndex, answers) {
	var version = answers.from;
	if (versionIndex !== -1) {
		version = versions[versionIndex].value;
	}
	return lib.takeVersionsAfter(versions, version);
}

function getQuestions(options, cli, versions) {
	function truthy(v) {
		return v;
	}
	var name = options.libraryName;
	var from = lib.indexOfVersion(versions, cli.flags.from);
	var to = lib.indexOfVersion(versions, cli.flags.to);

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
		when: !cli.input.length,
		filter: function (files) {
			return files.trim().split(/\s+/).filter(truthy);
		}
	}];
}

function checkAndRunTransform(options, transforms, files) {
	if (transforms.length === 0) {
		console.log('No transforms to apply');
		return;
	}

	var foundFiles = globby.sync(files);
	if (foundFiles.length === 0) {
		console.log('No files to transform');
		return;
	}

	return runTransforms(options, transforms, foundFiles);
}

module.exports = function upgrader(options) {
	global.Promise = pinkiePromise;

	var releases = options.releases.slice().sort(lib.sortByVersion);

	var cli = cliArgs(options, releases);
	exitIfGitIsDirty(cli);
	updateNotifier({pkg: options.pkg}).notify();

	var versions = lib.getVersions(releases);
	var questions = getQuestions(options, cli, versions);

	inquirer.prompt(questions, function (inquirerAnswers) {
		var answers = assign({}, {from: cli.flags.from, to: cli.flags.to}, inquirerAnswers);
		var files = answers.files || cli.input;
		if (!files.length) {
			return;
		}

		var transforms = lib.selectTransforms(releases, answers.from, answers.to)
			.map(lib.resolvePath(options.dirname));

		checkAndRunTransform(options, transforms, files);
	});
};
