import test from 'ava';
import lib from './';

test('sortByVersion', t => {
	const releases = [
		{version: '1.0.1'},
		{version: '88.0.1'},
		{version: '0.0.1'},
		{version: '1.0.0'},
		{version: '1.10.0'},
		{version: '1.2.0'}
	];

	t.deepEqual(releases.sort(lib.sortByVersion), [
		{version: '0.0.1'},
		{version: '1.0.0'},
		{version: '1.0.1'},
		{version: '1.2.0'},
		{version: '1.10.0'},
		{version: '88.0.1'}
	]);
});

test('getVersions should sort releases and prepend with a "older than" release', t => {
	const releases = [
		{version: '1.0.1'},
		{version: '88.0.1'},
		{version: '0.0.1'},
		{version: '1.0.0'},
		{version: '1.10.0'},
		{version: '1.2.0'}
	];

	t.deepEqual(lib.getVersions(releases), [{
		name: 'older than 0.0.1',
		value: '0.0.0'
	}, {
		name: '0.0.1',
		value: '0.0.1'
	}, {
		name: '1.0.0',
		value: '1.0.0'
	}, {
		name: '1.0.1',
		value: '1.0.1'
	}, {
		name: '1.2.0',
		value: '1.2.0'
	}, {
		name: '1.10.0',
		value: '1.10.0'
	}, {
		name: '88.0.1 (latest)',
		value: '88.0.1'
	}]);
});

test('getVersions should work with a single release', t => {
	const releases = [
		{version: '1.0.0'}
	];

	t.deepEqual(lib.getVersions(releases), [{
		name: 'older than 1.0.0',
		value: '0.0.0'
	},
	{
		name: '1.0.0 (latest)',
		value: '1.0.0'
	}]);
});

test('indexOfVersion', t => {
	const versions = [
		{
			name: 'older than 0.0.1',
			value: '0.0.0'
		}, {
			name: '0.0.1',
			value: '0.0.1'
		}, {
			name: '1.0.0',
			value: '1.0.0'
		}, {
			name: '1.0.1',
			value: '1.0.1'
		}, {
			name: '1.2.0',
			value: '1.2.0'
		}, {
			name: '1.10.0',
			value: '1.10.0'
		}, {
			name: '88.0.1 (latest)',
			value: '88.0.1'
		}
	];

	t.is(lib.indexOfVersion(versions, '0.0.0'), 0);
	t.is(lib.indexOfVersion(versions, '0.0.1'), 1);
	t.is(lib.indexOfVersion(versions, '1.0.0'), 2);
	t.is(lib.indexOfVersion(versions, '1.0.1'), 3);
	t.is(lib.indexOfVersion(versions, '1.2.0'), 4);
	t.is(lib.indexOfVersion(versions, '1.10.0'), 5);
	t.is(lib.indexOfVersion(versions, '88.0.1'), 6);
	t.is(lib.indexOfVersion(versions, '76.876.321'), -1);
});

test('takeVersionsAfter', t => {
	const versions = [
		{
			name: 'older than 0.0.1',
			value: '0.0.0'
		}, {
			name: '0.0.1',
			value: '0.0.1'
		}, {
			name: '1.0.0',
			value: '1.0.0'
		}, {
			name: '1.0.1',
			value: '1.0.1'
		}, {
			name: '1.2.0',
			value: '1.2.0'
		}, {
			name: '1.10.0',
			value: '1.10.0'
		}, {
			name: '88.0.1 (latest)',
			value: '88.0.1'
		}
	];

	t.deepEqual(lib.takeVersionsAfter(versions, '1.0.0'), [
		{
			name: '1.0.1',
			value: '1.0.1'
		}, {
			name: '1.2.0',
			value: '1.2.0'
		}, {
			name: '1.10.0',
			value: '1.10.0'
		}, {
			name: '88.0.1 (latest)',
			value: '88.0.1'
		}
	]);

	t.deepEqual(lib.takeVersionsAfter(versions, '0.0.0'), [
		{
			name: '0.0.1',
			value: '0.0.1'
		}, {
			name: '1.0.0',
			value: '1.0.0'
		}, {
			name: '1.0.1',
			value: '1.0.1'
		}, {
			name: '1.2.0',
			value: '1.2.0'
		}, {
			name: '1.10.0',
			value: '1.10.0'
		}, {
			name: '88.0.1 (latest)',
			value: '88.0.1'
		}
	]);
});

test('selectTransforms', t => {
	const releases = [{
		version: '0.14.0',
		transforms: [
			'lib/ok-to-truthy.js',
			'lib/same-to-deep-equal.js'
		]
	}, {
		version: '0.15.0',
		transforms: [
			'lib/script-0.15.0.js'
		]
	}, {
		version: '1.0.0',
		transforms: [
			'lib/script-1.0.0.js'
		]
	}, {
		version: '2.0.0',
		transforms: [
			'lib/script-2.0.0.js'
		]
	}];

	t.deepEqual(lib.selectTransforms(releases, '0.14.0', '0.14.0'), []);

	t.deepEqual(lib.selectTransforms(releases, '0.14.0', '1.0.0'), [
		'lib/script-0.15.0.js',
		'lib/script-1.0.0.js'
	]);

	t.deepEqual(lib.selectTransforms(releases, '0.0.0', '0.15.0'), [
		'lib/ok-to-truthy.js',
		'lib/same-to-deep-equal.js',
		'lib/script-0.15.0.js'
	]);

	t.deepEqual(lib.selectTransforms(releases, '0.0.0', '9999.9999.9999'), [
		'lib/ok-to-truthy.js',
		'lib/same-to-deep-equal.js',
		'lib/script-0.15.0.js',
		'lib/script-1.0.0.js',
		'lib/script-2.0.0.js'
	]);

	t.deepEqual(lib.selectTransforms(releases, '9999.9999.9999', '0.0.0'), []);
});

test('resolvePath', t => {
	const path = 'lib/ok-to-truthy.js';
	const dirname = '/some/path';

	t.is(lib.resolvePath(dirname)(path), '/some/path/lib/ok-to-truthy.js');
});

test('listUpgrades', t => {
	const releases = [
		{version: '0.10.0'},
		{version: '0.12.0'},
		{version: '0.13.0'},
		{version: '1.0.0'},
		{version: '2.0.0'},
		{version: '4.0.0'}
	];

	t.deepEqual(lib.listUpgrades(releases), [
		'  - [] → 0.10.0',
		'  - 0.10.0 → 0.12.0',
		'  - 0.12.0 → 0.13.0',
		'  - 0.13.0 → 1.0.0',
		'  - 1.0.0 → 2.0.0',
		'  - 2.0.0 → 4.0.0'
	]);
});
