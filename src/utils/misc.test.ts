/* eslint-disable no-magic-numbers */
import { resolve } from 'path';
import { isTargetEvent } from '@technote-space/filter-github-action';
import { testEnv, generateContext } from '@technote-space/github-action-test-helper';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FETCH_DEPTH, TARGET_EVENTS } from '../constant';
import {
  getParams,
  getSearchBuildCommandTargets,
  getCommitMessage,
  getCommitName,
  getCommitEmail,
  getBranchNames,
  getFetchDepth,
  isTestTag,
  getTestTag,
  getClearFilesCommands,
  getBuildCommands,
  detectBuildCommands,
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
} from './misc';

const rootDir = resolve(__dirname, '../..');

beforeEach(() => {
  getParams.clear();
});

describe('isTargetEvent', () => {
  testEnv(rootDir);

  it('should return true 1', () => {
    expect(isTargetEvent(TARGET_EVENTS, generateContext({
      event: 'push',
      ref: 'refs/tags/v1.2.3',
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
      event: 'create',
      ref: 'refs/tags/v1.2.3',
    }))).toBe(true);
  });

  it('should return false 1', () => {
    expect(isTargetEvent(TARGET_EVENTS, generateContext({
      event: 'pull_request',
      ref: 'refs/tags/test',
    }))).toBe(false);
  });

  it('should return false 2', () => {
    expect(isTargetEvent(TARGET_EVENTS, generateContext({
      event: 'push',
      ref: 'refs/tags/test',
    }))).toBe(false);
  });

  it('should return false 3', () => {
    process.env.INPUT_BRANCH_PREFIX = 'release';
    expect(isTargetEvent(TARGET_EVENTS, generateContext({
      event: 'push',
      ref: 'refs/heads/release/v1.2.3',
    }))).toBe(false);
  });

  it('should return false 4', () => {
    process.env.INPUT_BRANCH_PREFIX = 'release';
    expect(isTargetEvent(TARGET_EVENTS, generateContext({
      event: 'push',
      ref: 'refs/heads/release/v1.2.3',
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
      ref: 'refs/tags/v1.2.3',
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
      ref: 'refs/heads/v1.2.3',
    }))).toBe(false);
  });
});

describe('getParams', () => {
  testEnv(rootDir);

  it('should get params 1', () => {
    const params = getParams(generateContext({ ref: 'refs/tags/v1.2.3' }));
    expect(params).toHaveProperty('workDir');
    expect(params).toHaveProperty('buildDir');
    expect(params).toHaveProperty('pushDir');
    expect(params).toHaveProperty('tagName');
    expect(params).toHaveProperty('branchName');
    expect(params.tagName).toBe('v1.2.3');
    expect(params.branchName).toBe('gh-actions');
  });

  it('should get params 2', () => {
    process.env.INPUT_TEST_TAG_PREFIX = 'test/';

    const params = getParams(generateContext({ ref: 'refs/tags/test/v2.3.4' }));
    expect(params.tagName).toBe('test/v2.3.4');
    expect(params.branchName).toBe('gh-actions');
  });

  it('should get params 3', () => {
    process.env.INPUT_BRANCH_NAME = 'gh-actions';

    const params = getParams(generateContext({ ref: 'refs/tags/v1.2.3' }));
    expect(params.tagName).toBe('v1.2.3');
    expect(params.branchName).toBe('gh-actions');
  });

  it('should get params 4', () => {
    process.env.INPUT_BRANCH_NAME = 'releases/${MAJOR}/${MINOR}/${PATCH}';

    const params = getParams(generateContext({ ref: 'refs/tags/v2.3.4' }));
    expect(params.tagName).toBe('v2.3.4');
    expect(params.branchName).toBe('releases/v2/v2.3/v2.3.4');
  });
});

describe('getSearchBuildCommandTargets', () => {
  testEnv(rootDir);

  it('should get targets', () => {
    process.env.INPUT_BUILD_COMMAND_TARGET = 'test1,test2\ntest3';
    expect(getSearchBuildCommandTargets()).toEqual(['test1', 'test2', 'test3']);
  });

  it('should throw error', () => {
    process.env.INPUT_BUILD_COMMAND_TARGET = '';
    expect(() => getSearchBuildCommandTargets()).toThrow();
  });
});

describe('getCommitMessage', () => {
  testEnv(rootDir);

  it('should get commit message', () => {
    process.env.INPUT_COMMIT_MESSAGE = 'test';
    expect(getCommitMessage()).toBe('test');
  });

  it('should throw error', () => {
    process.env.INPUT_COMMIT_MESSAGE = '';
    expect(() => getCommitMessage()).toThrow();
  });
});

describe('getCommitName', () => {
  testEnv(rootDir);

  it('should get commit name', () => {
    process.env.INPUT_COMMIT_NAME = 'test';
    expect(getCommitName()).toBe('test');
  });

  it('should throw error', () => {
    process.env.INPUT_COMMIT_NAME = '';
    expect(() => getCommitName()).toThrow();
  });
});

describe('getCommitEmail', () => {
  testEnv(rootDir);

  it('should get commit email', () => {
    process.env.INPUT_COMMIT_EMAIL = 'test';
    expect(getCommitEmail()).toBe('test');
  });

  it('should throw error', () => {
    process.env.INPUT_COMMIT_EMAIL = '';
    expect(() => getCommitEmail()).toThrow();
  });
});

describe('getBranchNames', () => {
  testEnv(rootDir);

  it('should get branch name', () => {
    process.env.INPUT_BRANCH_NAME = 'test';
    expect(getBranchNames()).toEqual(['test']);
  });

  it('should throw error', () => {
    process.env.INPUT_BRANCH_NAME = '';
    expect(() => getBranchNames()).toThrow();
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
    expect(getClearFilesCommands(['.[!.]*', '__tests__', 'src', '*.js', '*.ts', '*.json', '*.lock', '*.yml', '*.yaml'])).toEqual([
      'rm -rdf .[!.]*',
      'rm -rdf *.js',
      'rm -rdf *.ts',
      'rm -rdf *.json',
      'rm -rdf *.lock',
      'rm -rdf *.yml',
      'rm -rdf *.yaml',
      { command: 'rm', args: ['-rdf', '__tests__', 'src'] },
    ]);
    expect(getClearFilesCommands(['?<>:|"\'@#$%^& ;/?<>:|"\'@#$%^& ;.*', '-?<>:|"\'@#$%^& ;', '*.?<>:|"\'@#$%^& ;'])).toEqual([
      'rm -rdf -- -\\?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;',
      'rm -rdf ?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;/\\?<>:|"\'@#$%^& ;.*',
      'rm -rdf *.\\?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;',
    ]);
    expect(getClearFilesCommands(['test/?>; abc.txt', '-test1 test2.txt', ';rm -rf /', '-test1 test2/*.txt'])).toEqual([
      'rm -rdf -- -test1\\ test2.txt',
      'rm -rdf -- -test1\\ test2/*.txt',
      { command: 'rm', args: ['-rdf', 'test/?>; abc.txt', ';rm -rf /'] },
    ]);
  });
});

describe('getBuildCommands', () => {
  testEnv(rootDir);
  const pushDir   = resolve(__dirname, '../fixtures/.push');
  const buildDir1 = resolve(__dirname, '../fixtures/test1');
  const buildDir7 = resolve(__dirname, '../fixtures/test7');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mv1       = (buildDir: string): Array<{ [key: string]: any }> => [
    {
      command: 'mv',
      args: ['-f', resolve(buildDir, 'action.yaml'), resolve(pushDir, 'action.yml')],
      suppressError: true,
      quiet: true,
    },
    {
      command: 'mv',
      args: ['-f', resolve(buildDir, 'action.yml'), resolve(pushDir, 'action.yml')],
      suppressError: true,
      quiet: true,
    },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mv2       = (buildDir: string): Array<{ [key: string]: any }> => [
    {
      command: 'mv',
      args: ['-f', resolve(pushDir, 'action.yml'), resolve(buildDir, 'action.yml')],
      suppressError: true,
      quiet: true,
    },
  ];
  const rm        = [
    'rm -rdf .[!.]*',
    'rm -rdf *.[jt]s',
    'rm -rdf *.[mc][jt]s',
    'rm -rdf *.json',
    'rm -rdf *.lock',
    'rm -rdf *.yml',
    'rm -rdf *.yaml',
    { command: 'rm', args: ['-rdf', '__tests__', 'docs', 'src'] },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clean     = (buildDir: string): Array<string | { [key: string]: any }> => [
    ...mv1(buildDir),
    ...rm,
    ...mv2(buildDir),
  ];

  it('should get build commands 1', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    process.env.INPUT_BUILD_COMMAND   = 'test';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'yarn install',
      'test',
      'yarn package',
      'yarn install --production',
      ...clean(buildDir7),
    ]);
  });

  it('should get build commands 2', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'yarn install',
      'yarn package',
      'yarn install --production',
      ...clean(buildDir7),
    ]);
  });

  it('should get build commands 3', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    process.env.INPUT_BUILD_COMMAND   = 'yarn package';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'yarn install',
      'yarn package',
      'yarn install --production',
      ...clean(buildDir7),
    ]);
  });

  it('should get build commands 4', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    process.env.INPUT_BUILD_COMMAND   = 'yarn   install && yarn package';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'yarn install',
      'yarn package',
      ...clean(buildDir7),
    ]);
  });

  it('should get build commands 5', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    process.env.INPUT_BUILD_COMMAND   = 'test';
    expect(getBuildCommands(buildDir1, pushDir)).toEqual([
      'yarn install',
      'test',
      'yarn install --production',
      ...clean(buildDir1),
    ]);
  });

  it('should get build commands 6', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    expect(getBuildCommands(buildDir1, pushDir)).toEqual([
      'yarn install --production',
      ...clean(buildDir1),
    ]);
  });

  it('should get build commands 7', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    process.env.INPUT_CLEAN_TARGETS   = 'test1,-test2,test3 test4,-test5 , test6;test7';
    expect(getBuildCommands(buildDir1, pushDir)).toEqual([
      'yarn install --production',
      ...mv1(buildDir1),
      'rm -rdf -- -test2',
      'rm -rdf -- -test5',
      { command: 'rm', args: ['-rdf', 'test1', 'test3 test4', 'test6;test7'] },
      ...mv2(buildDir1),
    ]);
  });

  it('should get build commands 8', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'invalid-pkg-mgr';
    process.env.INPUT_BUILD_COMMAND   = 'test';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'npm install',
      'test',
      'npm run package',
      'rm -rdf node_modules',
      'npm install --production',
      ...clean(buildDir7),
    ]);
  });

  it('should get build commands 9', () => {
    process.env.INPUT_BUILD_COMMAND = 'test';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'npm install',
      'test',
      'npm run package',
      'rm -rdf node_modules',
      'npm install --production',
      ...clean(buildDir7),
    ]);
  });

  it('should get build commands 10', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'npm';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'npm install',
      'npm run package',
      'rm -rdf node_modules',
      'npm install --production',
      ...clean(buildDir7),
    ]);
  });

  it('should get build commands 11', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'yarn';
    process.env.INPUT_CLEAN_TARGETS   = '';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'yarn install',
      'yarn package',
      'yarn install --production',
      ...mv1(buildDir7),
      ...mv2(buildDir7),
    ]);
  });

  it('should get build commands 12', () => {
    process.env.INPUT_PACKAGE_MANAGER     = 'yarn';
    process.env.INPUT_DELETE_NODE_MODULES = 'true';
    process.env.INPUT_BUILD_COMMAND       = 'tsc && yarn ncc build lib/main.js && rm -rf lib';
    expect(getBuildCommands(buildDir1, pushDir)).toEqual([
      'yarn install',
      'tsc',
      'yarn ncc build lib/main.js',
      'rm -rf lib',
      'rm -rdf node_modules',
      ...clean(buildDir1),
    ]);
  });

  it('should get build commands 13', () => {
    process.env.INPUT_PACKAGE_MANAGER = 'npm';
    process.env.INPUT_BUILD_COMMAND   = 'npm ci && npm run package';
    expect(getBuildCommands(buildDir7, pushDir)).toEqual([
      'npm ci',
      'npm run package',
      ...clean(buildDir7),
    ]);
  });
});

describe('detectBuildCommands', () => {
  testEnv(rootDir);

  it('should return false 1', () => {
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test1'), 'yarn ', [])).toEqual([]);
  });

  it('should return false 2', () => {
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test2'), 'yarn ', [])).toEqual([]);
  });

  it('should return false 3', () => {
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test3'), 'yarn ', [])).toEqual([]);
  });

  it('should detect build command 1', () => {
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test4'), 'yarn ', [])).toEqual(['prepare', 'build', 'production', 'prod', 'package']);
  });

  it('should detect build command 2', () => {
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test5'), 'yarn ', ['yarn prod'])).toEqual(['production', 'package']);
  });

  it('should detect build command 3', () => {
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test6'), 'npm run ', ['npm run prod', 'yarn package'])).toEqual(['package']);
  });

  it('should detect build command 4', () => {
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test7'), 'yarn ', ['yarn prod'])).toEqual(['package']);
  });

  it('should detect build command 5', () => {
    process.env.INPUT_ALLOW_MULTIPLE_BUILD_COMMANDS = 'false';
    expect(detectBuildCommands(resolve(__dirname, '../fixtures/test4'), 'yarn ', [])).toEqual(['prepare']);
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
    expect(isValidTagName('v1.0-beta+exp.sha.5114f85')).toBe(true);
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
