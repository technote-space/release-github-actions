/* eslint-disable no-magic-numbers */
import path from 'path';
import { isTargetEvent } from '@technote-space/filter-github-action';
import { testEnv, generateContext } from '@technote-space/github-action-test-helper';
import {
	getSearchBuildCommandTargets,
	getCommitMessage,
	getCommitName,
	getCommitEmail,
	getBranchName,
	getFetchDepth,
	isTestTag,
	getTestTag,
	getClearFilesCommands,
	getBuildCommands,
	detectBuildCommand,
	isValidTagName,
	getMajorTag,
	getMinorTag,
	getPatchTag,
	isCreateMajorVersionTag,
	isCreateMinorVersionTag,
	isCreatePatchVersionTag,
	isEnabledCleanTestTag,
	getOutputBuildInfoFilename,
	getCreateTags,
} from '../../src/utils/misc';
import {
	DEFAULT_SEARCH_BUILD_COMMAND_TARGETS,
	DEFAULT_COMMIT_MESSAGE,
	DEFAULT_COMMIT_NAME,
	DEFAULT_COMMIT_EMAIL,
	DEFAULT_BRANCH_NAME,
	DEFAULT_FETCH_DEPTH,
	TARGET_EVENTS,
} from '../../src/constant';

const rootDir = path.resolve(__dirname, '..', '..');

describe('isTargetEvent', () => {
	it('should return true 1', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'push',
			ref: 'tags/v1.2.3',
		}))).toBe(true);
	});

	it('should return true 2', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'release',
			action: 'published',
		}, {
			payload: {
				release: {
					'tag_name': 'v1.2.3',
				},
			},
		}))).toBe(true);
	});

	it('should return true 3', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'release',
			action: 'rerequested',
		}, {
			payload: {
				release: {
					'tag_name': 'v1.2.3',
				},
			},
		}))).toBe(true);
	});

	it('should return true 4', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'create',
			ref: 'tags/v1.2.3',
		}))).toBe(true);
	});

	it('should return false 1', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'pull_request',
			ref: 'tags/test',
		}))).toBe(false);
	});

	it('should return false 2', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'push',
			ref: 'tags/test',
		}))).toBe(false);
	});

	it('should return false 3', () => {
		process.env.INPUT_BRANCH_PREFIX = 'release';
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'push',
			ref: 'heads/release/v1.2.3',
		}))).toBe(false);
	});

	it('should return false 4', () => {
		process.env.INPUT_BRANCH_PREFIX = 'release';
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'push',
			ref: 'heads/release/v1.2.3',
		}))).toBe(false);
	});

	it('should return false 5', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'release',
			action: 'published',
		}, {
			payload: {
				release: {
					'tag_name': 'abc',
				},
			},
		}))).toBe(false);
	});

	it('should return false 6', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'release',
			action: 'created',
			ref: 'tags/v1.2.3',
		}, {
			payload: {
				release: {
					'tag_name': 'v1.2.3',
				},
			},
		}))).toBe(false);
	});

	it('should return false 7', () => {
		expect(isTargetEvent(TARGET_EVENTS, generateContext({
			event: 'create',
			ref: 'heads/v1.2.3',
		}))).toBe(false);
	});
});

describe('getSearchBuildCommandTargets', () => {
	testEnv(rootDir);

	it('should get targets', () => {
		process.env.INPUT_BUILD_COMMAND_TARGET = 'test1,test2\ntest3';
		expect(getSearchBuildCommandTargets()).toEqual(['test1', 'test2', 'test3']);
	});

	it('should get default targets', () => {
		expect(getSearchBuildCommandTargets()).toEqual(DEFAULT_SEARCH_BUILD_COMMAND_TARGETS);
	});
});

describe('getCommitMessage', () => {
	testEnv(rootDir);

	it('should get commit message', () => {
		process.env.INPUT_COMMIT_MESSAGE = 'test';
		expect(getCommitMessage()).toBe('test');
	});

	it('should get default commit message', () => {
		process.env.INPUT_COMMIT_MESSAGE = '';
		expect(getCommitMessage()).toBe(DEFAULT_COMMIT_MESSAGE);
	});
});

describe('getCommitName', () => {
	testEnv(rootDir);

	it('should get commit name', () => {
		process.env.INPUT_COMMIT_NAME = 'test';
		expect(getCommitName()).toBe('test');
	});

	it('should get default commit name', () => {
		process.env.INPUT_COMMIT_NAME = '';
		expect(getCommitName()).toBe(DEFAULT_COMMIT_NAME);
	});
});

describe('getCommitEmail', () => {
	testEnv(rootDir);

	it('should get commit email', () => {
		process.env.INPUT_COMMIT_EMAIL = 'test';
		expect(getCommitEmail()).toBe('test');
	});

	it('should get default commit email', () => {
		process.env.INPUT_COMMIT_EMAIL = '';
		expect(getCommitEmail()).toBe(DEFAULT_COMMIT_EMAIL);
	});
});

describe('getBranchName', () => {
	testEnv(rootDir);

	it('should get branch name', () => {
		process.env.INPUT_BRANCH_NAME = 'test';
		expect(getBranchName()).toBe('test');
	});

	it('should get default branch name', () => {
		process.env.INPUT_BRANCH_NAME = '';
		expect(getBranchName()).toBe(DEFAULT_BRANCH_NAME);
	});
});

describe('getFetchDepth', () => {
	testEnv(rootDir);

	it('should get fetch depth', () => {
		process.env.INPUT_FETCH_DEPTH = '10';
		expect(getFetchDepth()).toBe(10);
	});

	it('should get default fetch depth 1', () => {
		process.env.INPUT_FETCH_DEPTH = '';
		expect(getFetchDepth()).toBe(DEFAULT_FETCH_DEPTH);
	});

	it('should get default fetch depth 2', () => {
		process.env.INPUT_FETCH_DEPTH = 'test';
		expect(getFetchDepth()).toBe(DEFAULT_FETCH_DEPTH);
	});
});

describe('isTestTag', () => {
	testEnv(rootDir);

	it('should return true', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(isTestTag('test/v1.2.3')).toBe(true);
	});

	it('should return false', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(isTestTag('v1.2.3')).toBe(false);
	});
});

describe('getTestTag', () => {
	testEnv(rootDir);

	it('should get test tag', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(getTestTag('test/v1.2.3')).toBe('v1.2.3');
	});
});

describe('getClearFilesCommands', () => {
	testEnv(rootDir);

	it('should get clear files commands', () => {
		expect(getClearFilesCommands([])).toEqual([]);
		expect(getClearFilesCommands(['.[!.]*', '__tests__', 'src', '*.js', '*.ts', '*.json', '*.lock', '_config.yml'])).toEqual([
			'rm -rdf .[!.]*',
			'rm -rdf *.js',
			'rm -rdf *.ts',
			'rm -rdf *.json',
			'rm -rdf *.lock',
			{command: 'rm', args: ['-rdf', '__tests__', 'src', '_config.yml']},
		]);
		expect(getClearFilesCommands(['?<>:|"\'@#$%^& ;/?<>:|"\'@#$%^& ;.*', '-?<>:|"\'@#$%^& ;', '*.?<>:|"\'@#$%^& ;'])).toEqual([
			'rm -rdf -- -\\?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;',
			'rm -rdf ?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;/\\?<>:|"\'@#$%^& ;.*',
			'rm -rdf *.\\?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;',
		]);
		expect(getClearFilesCommands(['test/?>; abc.txt', '-test1 test2.txt', ';rm -rf /', '-test1 test2/*.txt'])).toEqual([
			'rm -rdf -- -test1\\ test2.txt',
			'rm -rdf -- -test1\\ test2/*.txt',
			{command: 'rm', args: ['-rdf', 'test/?>; abc.txt', ';rm -rf /']},
		]);
	});
});

describe('getBuildCommands', () => {
	testEnv(rootDir);
	const rm = [
		'rm -rdf .[!.]*',
		'rm -rdf *.js',
		'rm -rdf *.ts',
		'rm -rdf *.json',
		'rm -rdf *.lock',
		{command: 'rm', args: ['-rdf', '__tests__', 'src', '_config.yml']},
	];

	it('should get build commands 1', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_BUILD_COMMAND   = 'test';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'test',
			'yarn build',
			'yarn install --production',
			...rm,
		]);
	});

	it('should get build commands 2', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'yarn build',
			'yarn install --production',
			...rm,
		]);
	});

	it('should get build commands 3', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_BUILD_COMMAND   = 'yarn build';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'yarn build',
			'yarn install --production',
			...rm,
		]);
	});

	it('should get build commands 4', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_BUILD_COMMAND   = 'yarn install && yarn build';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'yarn build',
			...rm,
		]);
	});

	it('should get build commands 5', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_BUILD_COMMAND   = 'test';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toEqual([
			'yarn install',
			'test',
			'yarn install --production',
			...rm,
		]);
	});

	it('should get build commands 6', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toEqual([
			'yarn install --production',
			...rm,
		]);
	});

	it('should get build commands 7', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_CLEAN_TARGETS   = 'test1,-test2,test3 test4,-test5 , test6;test7';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toEqual([
			'yarn install --production',
			'rm -rdf -- -test2',
			'rm -rdf -- -test5',
			{command: 'rm', args: ['-rdf', 'test1', 'test3 test4', 'test6;test7']},
		]);
	});

	it('should get build commands 8', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'invalid-pkg-mgr';
		process.env.INPUT_BUILD_COMMAND   = 'test';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'npm install',
			'test',
			'npm run build',
			'rm -rdf node_modules',
			'npm install --production',
			...rm,
		]);
	});

	it('should get build commands 9', () => {
		process.env.INPUT_BUILD_COMMAND = 'test';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'npm install',
			'test',
			'npm run build',
			'rm -rdf node_modules',
			'npm install --production',
			...rm,
		]);
	});

	it('should get build commands 10', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'npm';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'npm install',
			'npm run build',
			'rm -rdf node_modules',
			'npm install --production',
			...rm,
		]);
	});

	it('should get build commands 11', () => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_CLEAN_TARGETS   = '';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'yarn build',
			'yarn install --production',
		]);
	});
});

describe('detectBuildCommand', () => {
	it('should return false 1', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toBe(false);
	});

	it('should return false 2', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test2'))).toBe(false);
	});

	it('should return false 3', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test3'))).toBe(false);
	});

	it('should detect build command 1', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toBe('build');
	});

	it('should detect build command 2', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test5'))).toBe('production');
	});

	it('should detect build command 3', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test6'))).toBe('prod');
	});

	it('should detect build command 4', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test7'))).toBe('package');
	});
});

describe('isValidTagName', () => {
	testEnv(rootDir);

	it('should return true 1', () => {
		expect(isValidTagName('0')).toBe(true);
		expect(isValidTagName('v12')).toBe(true);
		expect(isValidTagName('1.2')).toBe(true);
		expect(isValidTagName('V1.2.3')).toBe(true);
		expect(isValidTagName('v12.23.34.45')).toBe(true);
	});

	it('should return true 2', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(isValidTagName('test/v12')).toBe(true);
		expect(isValidTagName('test/1.2')).toBe(true);
	});

	it('should return false 1', () => {
		expect(isValidTagName('')).toBe(false);
		expect(isValidTagName('abc')).toBe(false);
		expect(isValidTagName('v1.')).toBe(false);
		expect(isValidTagName('v.9')).toBe(false);
	});

	it('should return false 2', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(isValidTagName('test/')).toBe(false);
		expect(isValidTagName('test/abc')).toBe(false);
	});
});

describe('getMajorTag', () => {
	it('should get major tag', () => {
		expect(getMajorTag('0')).toBe('v0');
		expect(getMajorTag('v12')).toBe('v12');
		expect(getMajorTag('1.2')).toBe('v1');
		expect(getMajorTag('V1.2.3')).toBe('v1');
		expect(getMajorTag('v12.23.34.45')).toBe('v12');
	});
});

describe('getMinorTag', () => {
	it('should get minor tag', () => {
		expect(getMinorTag('0')).toBe('v0.0');
		expect(getMinorTag('v12')).toBe('v12.0');
		expect(getMinorTag('1.2')).toBe('v1.2');
		expect(getMinorTag('V1.2.3')).toBe('v1.2');
		expect(getMinorTag('v12.23.34.45')).toBe('v12.23');
	});
});

describe('getPatchTag', () => {
	it('should get patch tag', () => {
		expect(getPatchTag('0')).toBe('v0.0.0');
		expect(getPatchTag('v12')).toBe('v12.0.0');
		expect(getPatchTag('1.2')).toBe('v1.2.0');
		expect(getPatchTag('V1.2.3')).toBe('v1.2.3');
		expect(getPatchTag('v12.23.34.45')).toBe('v12.23.34');
	});
});

describe('isCreateMajorVersionTag', () => {
	testEnv(rootDir);

	it('should return true 1', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = '';
		expect(isCreateMajorVersionTag()).toBe(true);
	});
	it('should return true 2', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = '1';
		expect(isCreateMajorVersionTag()).toBe(true);
	});
	it('should return true 3', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'abc';
		expect(isCreateMajorVersionTag()).toBe(true);
	});

	it('should return false 1', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'false';
		expect(isCreateMajorVersionTag()).toBe(false);
	});

	it('should return false 2', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = '0';
		expect(isCreateMajorVersionTag()).toBe(false);
	});
});

describe('isCreateMinorVersionTag', () => {
	testEnv(rootDir);

	it('should return true 1', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = '';
		expect(isCreateMinorVersionTag()).toBe(true);
	});
	it('should return true 2', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = '1';
		expect(isCreateMinorVersionTag()).toBe(true);
	});
	it('should return true 3', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'abc';
		expect(isCreateMinorVersionTag()).toBe(true);
	});

	it('should return false 1', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'false';
		expect(isCreateMinorVersionTag()).toBe(false);
	});

	it('should return false 2', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = '0';
		expect(isCreateMinorVersionTag()).toBe(false);
	});
});

describe('isCreatePatchVersionTag', () => {
	testEnv(rootDir);

	it('should return true 1', () => {
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = '';
		expect(isCreatePatchVersionTag()).toBe(true);
	});
	it('should return true 2', () => {
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = '1';
		expect(isCreatePatchVersionTag()).toBe(true);
	});
	it('should return true 3', () => {
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = 'abc';
		expect(isCreatePatchVersionTag()).toBe(true);
	});

	it('should return false 1', () => {
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = 'false';
		expect(isCreatePatchVersionTag()).toBe(false);
	});

	it('should return false 2', () => {
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = '0';
		expect(isCreatePatchVersionTag()).toBe(false);
	});
});

describe('isEnabledCleanTestTag', () => {
	testEnv(rootDir);

	it('should return true 1', () => {
		process.env.INPUT_CLEAN_TEST_TAG = '1';
		expect(isEnabledCleanTestTag()).toBe(true);
	});

	it('should return true 2', () => {
		process.env.INPUT_CLEAN_TEST_TAG = 'true';
		expect(isEnabledCleanTestTag()).toBe(true);
	});

	it('should return false 1', () => {
		process.env.INPUT_CLEAN_TEST_TAG = '';
		expect(isEnabledCleanTestTag()).toBe(false);
	});

	it('should return false 2', () => {
		process.env.INPUT_CLEAN_TEST_TAG = 'false';
		expect(isEnabledCleanTestTag()).toBe(false);
	});
});

describe('getOutputBuildInfoFilename', () => {
	testEnv(rootDir);

	it('should get filename', () => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = 'test';
		expect(getOutputBuildInfoFilename()).toBe('test');
	});

	it('should get empty 1', () => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = '';
		expect(getOutputBuildInfoFilename()).toBe('');
	});

	it('should get empty 2', () => {
		expect(getOutputBuildInfoFilename()).toBe('');
	});

	it('should get empty 3', () => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = '/tmp/test.json';
		expect(getOutputBuildInfoFilename()).toBe('');
	});

	it('should get empty 4', () => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = '../test.json';
		expect(getOutputBuildInfoFilename()).toBe('');
	});
});

describe('getCreateTags', () => {
	testEnv(rootDir);

	it('should get create tags 1', () => {
		expect(getCreateTags('v1.2.3')).toEqual(['v1.2.3', 'v1.2', 'v1']);
	});

	it('should get create tags 2', () => {
		expect(getCreateTags('v1')).toEqual(['v1.0.0', 'v1.0', 'v1']);
	});

	it('should get create tags 3', () => {
		expect(getCreateTags('v1.2')).toEqual(['v1.2.0', 'v1.2', 'v1']);
	});

	it('should get create tags 4', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'false';
		expect(getCreateTags('v1.2.3')).toEqual(['v1.2.3', 'v1.2']);
	});

	it('should get create tags 5', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'false';
		expect(getCreateTags('v1.2.3')).toEqual(['v1.2.3', 'v1']);
	});

	it('should get create tags 6', () => {
		expect(getCreateTags('v1.2.3.4')).toEqual(['v1.2.3.4', 'v1.2.3', 'v1.2', 'v1']);
	});

	it('should get create tags 7', () => {
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = 'false';
		expect(getCreateTags('v1.2.3')).toEqual(['v1.2.3', 'v1.2', 'v1']);
	});

	it('should get create tags 8', () => {
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = 'false';
		expect(getCreateTags('v1.2.3.4')).toEqual(['v1.2.3.4', 'v1.2', 'v1']);
	});

	it('should get create tags 9', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'false';
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'false';
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = 'false';
		expect(getCreateTags('v1.2.3')).toEqual(['v1.2.3']);
	});

	it('should get create tags 10', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(getCreateTags('test/v1.2.3')).toEqual(['test/v1.2.3', 'test/v1.2', 'test/v1']);
	});

	it('should get create tags 11', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'false';
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'false';
		process.env.INPUT_CREATE_PATCH_VERSION_TAG = 'false';
		process.env.INPUT_TEST_TAG_PREFIX          = 'test/';
		expect(getCreateTags('test/v1.2.3')).toEqual(['test/v1.2.3']);
	});
});
