import path from 'path';
import { isTargetEvent } from '@technote-space/filter-github-action';
import { Test } from '@technote-space/github-action-helper';
import {
	getCommitMessage,
	getCommitName,
	getCommitEmail,
	getBranchName,
	getFetchDepth,
	isTestTag,
	getTestTag,
	getBuildCommands,
	detectBuildCommand,
	isValidTagName,
	getMajorTag,
	getMinorTag,
	isCreateMajorVersionTag,
	isCreateMinorVersionTag,
	getOutputBuildInfoFilename,
	getCreateTags,
} from '../../src/utils/misc';
import {
	DEFAULT_COMMIT_MESSAGE,
	DEFAULT_COMMIT_NAME,
	DEFAULT_COMMIT_EMAIL,
	DEFAULT_BRANCH_NAME,
	DEFAULT_FETCH_DEPTH,
	TARGET_EVENTS,
} from '../../src/constant';

const {testEnv, getContext} = Test;

describe('isTargetEvent', () => {
	it('should return true 1', () => {
		expect(isTargetEvent(TARGET_EVENTS, getContext({
			eventName: 'push',
			ref: 'refs/tags/test',
		}))).toBeTruthy();
	});

	it('should return true 2', () => {
		expect(isTargetEvent(TARGET_EVENTS, getContext({
			payload: {
				action: 'rerequested',
			},
			eventName: 'push',
		}))).toBeTruthy();
	});

	it('should return true 3', () => {
		expect(isTargetEvent(TARGET_EVENTS, getContext({
			payload: {
				action: 'published',
			},
			eventName: 'release',
		}))).toBeTruthy();
	});

	it('should return false 1', () => {
		expect(isTargetEvent(TARGET_EVENTS, getContext({
			eventName: 'push',
			ref: 'refs/heads/test',
		}))).toBeFalsy();
	});

	it('should return false 2', () => {
		expect(isTargetEvent(TARGET_EVENTS, getContext({
			payload: {
				action: 'created',
			},
			eventName: 'release',
		}))).toBeFalsy();
	});
});

describe('getCommitMessage', () => {
	testEnv();

	it('should get commit message', () => {
		process.env.INPUT_COMMIT_MESSAGE = 'test';
		expect(getCommitMessage()).toBe('test');
	});

	it('should get default commit message', () => {
		expect(getCommitMessage()).toBe(DEFAULT_COMMIT_MESSAGE);
	});
});

describe('getCommitName', () => {
	testEnv();

	it('should get commit name', () => {
		process.env.INPUT_COMMIT_NAME = 'test';
		expect(getCommitName()).toBe('test');
	});

	it('should get default commit name', () => {
		expect(getCommitName()).toBe(DEFAULT_COMMIT_NAME);
	});
});

describe('getCommitEmail', () => {
	testEnv();

	it('should get commit email', () => {
		process.env.INPUT_COMMIT_EMAIL = 'test';
		expect(getCommitEmail()).toBe('test');
	});

	it('should get default commit email', () => {
		expect(getCommitEmail()).toBe(DEFAULT_COMMIT_EMAIL);
	});
});

describe('getBranchName', () => {
	testEnv();

	it('should get branch name', () => {
		process.env.INPUT_BRANCH_NAME = 'test';
		expect(getBranchName()).toBe('test');
	});

	it('should get default branch name', () => {
		expect(getBranchName()).toBe(DEFAULT_BRANCH_NAME);
	});
});

describe('getFetchDepth', () => {
	testEnv();

	it('should get fetch depth', () => {
		process.env.INPUT_FETCH_DEPTH = '10';
		expect(getFetchDepth()).toBe('10');
	});

	it('should get default fetch depth 1', () => {
		expect(getFetchDepth()).toBe(DEFAULT_FETCH_DEPTH);
	});

	it('should get default fetch depth 2', () => {
		process.env.INPUT_FETCH_DEPTH = 'test';
		expect(getFetchDepth()).toBe(DEFAULT_FETCH_DEPTH);
	});
});

describe('isTestTag', () => {
	testEnv();

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
	testEnv();

	it('should get test tag', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(getTestTag('test/v1.2.3')).toBe('v1.2.3');
	});
});

describe('getBuildCommands', () => {
	testEnv();

	it('should get build commands 1', () => {
		process.env.INPUT_BUILD_COMMAND = 'test';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'test',
			'yarn build', // build command of package.json
			'yarn install --production',
		]);
	});

	it('should get build commands 2', () => {
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'yarn build', // build command of package.json
			'yarn install --production',
			'rm -rdf .[!.]*',
			'rm -rdf __tests__',
			'rm -rdf src',
			'rm -rdf *.js',
			'rm -rdf *.ts',
			'rm -rdf *.json',
			'rm -rdf *.lock',
			'rm -rdf _config.yml',
		]);
	});

	it('should get build commands 3', () => {
		process.env.INPUT_BUILD_COMMAND = 'yarn build';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'yarn build',
			'yarn install --production',
		]);
	});

	it('should get build commands 4', () => {
		process.env.INPUT_BUILD_COMMAND = 'yarn install && yarn build';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toEqual([
			'yarn install',
			'yarn build',
		]);
	});

	it('should get build commands 5', () => {
		process.env.INPUT_BUILD_COMMAND = 'test';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toEqual([
			'yarn install',
			'test',
			'yarn install --production',
		]);
	});

	it('should get build commands 6', () => {
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toEqual([
			'yarn install --production',
			'rm -rdf .[!.]*',
			'rm -rdf __tests__',
			'rm -rdf src',
			'rm -rdf *.js',
			'rm -rdf *.ts',
			'rm -rdf *.json',
			'rm -rdf *.lock',
			'rm -rdf _config.yml',
		]);
	});

	it('should get build commands 7', () => {
		process.env.INPUT_CLEAN_TARGETS = 'test';
		expect(getBuildCommands(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toEqual([
			'yarn install --production',
			'rm -rdf test',
		]);
	});
});

describe('detectBuildCommand', () => {
	it('should return false 1', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test1'))).toBeFalsy();
	});

	it('should return false 2', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test2'))).toBeFalsy();
	});

	it('should return false 2', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test3'))).toBeFalsy();
	});

	it('should detect build command 1', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test4'))).toBe('build');
	});

	it('should detect build command 1', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test5'))).toBe('production');
	});

	it('should detect build command 1', () => {
		expect(detectBuildCommand(path.resolve(__dirname, '..', 'fixtures', 'test6'))).toBe('prod');
	});
});

describe('isValidTagName', () => {
	testEnv();

	it('should return true 1', () => {
		expect(isValidTagName('0')).toBeTruthy();
		expect(isValidTagName('v12')).toBeTruthy();
		expect(isValidTagName('1.2')).toBeTruthy();
		expect(isValidTagName('V1.2.3')).toBeTruthy();
		expect(isValidTagName('v12.23.34.45')).toBeTruthy();
	});

	it('should return true 2', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(isValidTagName('test/v12')).toBeTruthy();
		expect(isValidTagName('test/1.2')).toBeTruthy();
	});

	it('should return false 1', () => {
		expect(isValidTagName('')).toBeFalsy();
		expect(isValidTagName('abc')).toBeFalsy();
		expect(isValidTagName('v1.')).toBeFalsy();
		expect(isValidTagName('v.9')).toBeFalsy();
	});

	it('should return false 2', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(isValidTagName('test/')).toBeFalsy();
		expect(isValidTagName('test/abc')).toBeFalsy();
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

describe('isCreateMajorVersionTag', () => {
	testEnv();

	it('should return true 1', () => {
		expect(isCreateMajorVersionTag()).toBeTruthy();
	});
	it('should return true 2', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = '1';
		expect(isCreateMajorVersionTag()).toBeTruthy();
	});
	it('should return true 3', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'abc';
		expect(isCreateMajorVersionTag()).toBeTruthy();
	});

	it('should return false 1', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'false';
		expect(isCreateMajorVersionTag()).toBeFalsy();
	});

	it('should return false 2', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = '0';
		expect(isCreateMajorVersionTag()).toBeFalsy();
	});
});

describe('isCreateMinorVersionTag', () => {
	testEnv();

	it('should return true 1', () => {
		expect(isCreateMinorVersionTag()).toBeTruthy();
	});
	it('should return true 2', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = '1';
		expect(isCreateMinorVersionTag()).toBeTruthy();
	});
	it('should return true 3', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'abc';
		expect(isCreateMinorVersionTag()).toBeTruthy();
	});

	it('should return false 1', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'false';
		expect(isCreateMinorVersionTag()).toBeFalsy();
	});

	it('should return false 2', () => {
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = '0';
		expect(isCreateMinorVersionTag()).toBeFalsy();
	});
});

describe('getOutputBuildInfoFilename', () => {
	testEnv();

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
	testEnv();

	it('should get create tags 1', () => {
		expect(getCreateTags('v1.2.3')).toEqual(['v1.2.3', 'v1', 'v1.2']);
	});

	it('should get create tags 2', () => {
		expect(getCreateTags('v1')).toEqual(['v1', 'v1.0']);
	});

	it('should get create tags 3', () => {
		expect(getCreateTags('v1.2')).toEqual(['v1.2', 'v1']);
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
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'false';
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'false';
		expect(getCreateTags('v1.2.3')).toEqual(['v1.2.3']);
	});

	it('should get create tags 7', () => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(getCreateTags('test/v1.2.3')).toEqual(['test/v1.2.3', 'test/v1', 'test/v1.2']);
	});

	it('should get create tags 8', () => {
		process.env.INPUT_CREATE_MAJOR_VERSION_TAG = 'false';
		process.env.INPUT_CREATE_MINOR_VERSION_TAG = 'false';
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		expect(getCreateTags('test/v1.2.3')).toEqual(['test/v1.2.3']);
	});
});
