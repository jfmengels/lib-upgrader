'use strict';
var path = require('path');
var semver = require('semver');
var flatten = require('lodash.flatten');
var findIndex = require('lodash.findindex');

function sortByVersion(a, b) {
	if (a.version === b.version) {
		return 0;
	}
	return semver.lt(a.version, b.version) ? -1 : +1;
}

function getVersions(releases) {
	var releaseVersions = releases
		.sort(sortByVersion)
		.map(function (release) {
			return release.version;
		});

	var firstVersion = {
		name: 'older than ' + releaseVersions[0],
		value: '0.0.0'
	};
	var lastVersionValue = releaseVersions[releaseVersions.length - 1];
	var lastVersion = {
		name: lastVersionValue + ' (latest)',
		value: lastVersionValue
	};

	return [firstVersion]
		.concat(releaseVersions
			.slice(0, -1)
			.map(function (version) {
				return {name: version, value: version};
			})
		)
		.concat(lastVersion);
}

function indexOfVersion(versions, version) {
	return findIndex(versions, function (v) {
		return v.value === version;
	});
}

function takeVersionsAfter(versions, chosen) {
	return versions.slice(indexOfVersion(versions, chosen) + 1);
}

function selectTransforms(releases, currentVersion, nextVersion) {
	var semverToRespect = '>' + currentVersion + ' <=' + nextVersion;

	var transforms = releases.filter(function (release) {
		return semver.satisfies(release.version, semverToRespect);
	}).map(function (release) {
		return release.transforms;
	});

	return flatten(transforms);
}

function resolvePath(dirname) {
	return function (filePath) {
		return path.resolve(dirname, filePath);
	};
}

function listUpgrades(releases) {
	var current = '[]';
	return releases.map(function (release) {
		var res = '  - ' + current + ' → ' + release.version;
		current = release.version;
		return res;
	});
}

module.exports = {
	sortByVersion: sortByVersion,
	getVersions: getVersions,
	indexOfVersion: indexOfVersion,
	takeVersionsAfter: takeVersionsAfter,
	selectTransforms: selectTransforms,
	resolvePath: resolvePath,
	listUpgrades: listUpgrades
};
