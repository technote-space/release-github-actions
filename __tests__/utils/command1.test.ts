/* eslint-disable no-magic-numbers */
import { resolve } from 'path';
import { Logger, GitHelper } from '@technote-space/github-action-helper';
import {
	getContext,
	testEnv,
	testFs,
	spyOnExec,
	execCalledWith,
	testChildProcess,
	setChildProcessParams,
	spyOnStdout,
	stdoutCalledWith,
} from '@technote-space/github-action-test-helper';
import { getParams } from '../../src/utils/misc';
import {
	replaceDirectory,
	clone,
	checkBranch,
	prepareFiles,
	createBuildInfoFile,
	copyFiles,
	config,
	getDeleteTestTag,
	deleteTestTags,
	push,
} from '../../src/utils/command';

const setExists = testFs();
const rootDir   = resolve(__dirname, '..', '..');
const logger    = new Logger();
const helper    = new GitHelper(logger, {token: 'test-token'});

beforeEach(() => {
	getParams.clear();
});

describe('replaceDirectory', () => {
	testEnv(rootDir);

	const workDir  = resolve('test-dir/.work');
	const buildDir = resolve('test-dir/.work/build');
	const pushDir  = resolve('test-dir/.work/push');

	it('should replace build directory', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';

		expect(replaceDirectory(`git -C ${buildDir} fetch`)).toBe('git fetch');
	});

	it('should replace build directory', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';

		expect(replaceDirectory(`git -C ${pushDir} fetch`)).toBe('git fetch');
	});

	it('should replace working directory', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';

		expect(replaceDirectory(`git -C ${workDir} fetch`)).toBe('git fetch');
	});

	it('should replace directories', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';

		expect(replaceDirectory(`abc ${buildDir} && pqr ${workDir}/xyz ${pushDir}/123`)).toBe('abc <Build Directory> && pqr <Working Directory>/xyz <Push Directory>/123');
	});
});

describe('clone', () => {
	testEnv(rootDir);

	it('should run clone command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME  = 'test-branch';
		process.env.GITHUB_WORKSPACE   = 'test-dir';
		const mockExec                 = spyOnExec();

		await clone(helper, getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git init \'.\'',
			'git remote add origin \'https://octocat:test-token@github.com/Hello/World.git\' > /dev/null 2>&1 || :',
			'git fetch --no-tags origin \'refs/heads/test-branch:refs/remotes/origin/test-branch\' || :',
			'git checkout -b test-branch origin/test-branch || :',
		]);
	});
});

describe('checkBranch', () => {
	testEnv(rootDir);

	it('should do nothing', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME  = 'test-branch';
		process.env.GITHUB_WORKSPACE   = 'test-dir';
		const mockExec                 = spyOnExec();

		await checkBranch('test-branch', helper);

		expect(mockExec).not.toBeCalled();
	});

	it('should run git init command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME  = 'test-branch';
		process.env.GITHUB_WORKSPACE   = 'test-dir';
		const mockExec                 = spyOnExec();

		await checkBranch('test-branch2', helper);

		execCalledWith(mockExec, [
			'git init \'.\'',
			'git checkout --orphan test-branch',
		]);
	});
});

describe('prepareFiles', () => {
	testEnv(rootDir);

	const buildDir = resolve('test-dir/.work/build');
	const pushDir  = resolve('test-dir/.work/push');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const commonCheck = (): (string | any[])[] => {
		return [
			['yarn install --production', {cwd: buildDir}],
			[`mv -f '${resolve(buildDir, 'action.yaml')}' '${resolve(pushDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
			[`mv -f '${resolve(buildDir, 'action.yml')}' '${resolve(pushDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
			['rm -rdf .[!.]*', {cwd: buildDir}],
			['rm -rdf *.js', {cwd: buildDir}],
			['rm -rdf *.ts', {cwd: buildDir}],
			['rm -rdf *.json', {cwd: buildDir}],
			['rm -rdf *.lock', {cwd: buildDir}],
			['rm -rdf *.yml', {cwd: buildDir}],
			['rm -rdf *.yaml', {cwd: buildDir}],
			['rm -rdf __tests__ src', {cwd: buildDir}],
			[`mv -f '${resolve(pushDir, 'action.yml')}' '${resolve(buildDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
		];
	};

	it('should checkout branch', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		const mockExec                    = spyOnExec();

		await prepareFiles(helper, getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
			sha: 'test-sha',
		}));

		execCalledWith(mockExec, ([
			'git init \'.\'',
			'git remote add origin \'https://octocat:test-token@github.com/Hello/World.git\' > /dev/null 2>&1 || :',
			'git fetch --no-tags origin \'refs/heads/test:refs/remotes/origin/test\' || :',
			'git checkout -qf test-sha',
		] as any[]).concat(commonCheck())); // eslint-disable-line @typescript-eslint/no-explicit-any
	});

	it('should checkout tag', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		const mockExec                    = spyOnExec();

		await prepareFiles(helper, getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/tags/test',
			sha: 'test-sha',
		}));

		execCalledWith(mockExec, ([
			'git init \'.\'',
			'git remote add origin \'https://octocat:test-token@github.com/Hello/World.git\' > /dev/null 2>&1 || :',
			'git fetch --no-tags origin \'refs/tags/test:refs/tags/test\' || :',
			'git checkout -qf test-sha',
		] as any[]).concat(commonCheck())); // eslint-disable-line @typescript-eslint/no-explicit-any
	});

	it('should clean specified targets 1', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		process.env.INPUT_CLEAN_TARGETS   = 'test1,-test2,test3 test4,-test5 , test6;test7, test8/*.txt, *.test9';
		const mockExec                    = spyOnExec();

		await prepareFiles(helper, getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/tags/test',
			sha: 'test-sha',
		}));

		execCalledWith(mockExec, ([
			'git init \'.\'',
			'git remote add origin \'https://octocat:test-token@github.com/Hello/World.git\' > /dev/null 2>&1 || :',
			'git fetch --no-tags origin \'refs/tags/test:refs/tags/test\' || :',
			'git checkout -qf test-sha',
			['yarn install --production', {cwd: buildDir}],
			[`mv -f '${resolve(buildDir, 'action.yaml')}' '${resolve(pushDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
			[`mv -f '${resolve(buildDir, 'action.yml')}' '${resolve(pushDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
			['rm -rdf -- -test2', {cwd: buildDir}],
			['rm -rdf -- -test5', {cwd: buildDir}],
			['rm -rdf test8/*.txt', {cwd: buildDir}],
			['rm -rdf *.test9', {cwd: buildDir}],
			['rm -rdf test1 \'test3 test4\' \'test6;test7\'', {cwd: buildDir}],
			[`mv -f '${resolve(pushDir, 'action.yml')}' '${resolve(buildDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
		]));
	});

	it('should clean specified targets 2', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		process.env.INPUT_CLEAN_TARGETS   = '-test1, -test2/?<>:|"\'@#$%^& ;.*.test3 , ?<>:|"\'@#$%^& ;/test4 test5/*.txt,;?<>:|"\'@#$%^& ;.txt,rm -rf /';
		const mockExec                    = spyOnExec();

		await prepareFiles(helper, getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/tags/test',
			sha: 'test-sha',
		}));

		execCalledWith(mockExec, ([
			'git init \'.\'',
			'git remote add origin \'https://octocat:test-token@github.com/Hello/World.git\' > /dev/null 2>&1 || :',
			'git fetch --no-tags origin \'refs/tags/test:refs/tags/test\' || :',
			'git checkout -qf test-sha',
			['yarn install --production', {cwd: buildDir}],
			[`mv -f '${resolve(buildDir, 'action.yaml')}' '${resolve(pushDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
			[`mv -f '${resolve(buildDir, 'action.yml')}' '${resolve(pushDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
			['rm -rdf -- -test1', {cwd: buildDir}],
			['rm -rdf -- -test2/\\?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;.*.test3', {cwd: buildDir}],
			['rm -rdf ?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;/test4 test5/*.txt', {cwd: buildDir}],
			['rm -rdf \';?<>:|"\'\\\'\'@#$%^& ;.txt\' \'rm -rf /\'', {cwd: buildDir}],
			[`mv -f '${resolve(pushDir, 'action.yml')}' '${resolve(buildDir, 'action.yml')}' > /dev/null 2>&1 || :`, {cwd: buildDir}],
		]));
	});
});

describe('createBuildInfoFile', () => {
	testEnv(rootDir);

	it('should do nothing', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = '/';
		process.env.INPUT_BRANCH_NAME                = 'test-branch';
		process.env.GITHUB_WORKSPACE                 = 'test-dir';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock                              = jest.spyOn(require('fs'), 'writeFileSync');

		await createBuildInfoFile(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
		}));

		expect(writeMock).not.toBeCalled();
	});

	it('should write file', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = 'info.json';
		process.env.INPUT_BRANCH_NAME                = 'test-branch';
		process.env.GITHUB_WORKSPACE                 = 'test-dir';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mkdirMock                              = jest.spyOn(require('fs'), 'mkdirSync');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock                              = jest.spyOn(require('fs'), 'writeFileSync');

		await createBuildInfoFile(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
		}));

		expect(mkdirMock).toBeCalledTimes(1);
		expect(writeMock).toBeCalledTimes(1);
	});

	it('should not create dir', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = 'info.json';
		process.env.INPUT_BRANCH_NAME                = 'test-branch';
		process.env.GITHUB_WORKSPACE                 = 'test-dir';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mkdirMock                              = jest.spyOn(require('fs'), 'mkdirSync');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock                              = jest.spyOn(require('fs'), 'writeFileSync');
		setExists(true);

		await createBuildInfoFile(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
		}));

		expect(mkdirMock).toBeCalledTimes(0);
		expect(writeMock).toBeCalledTimes(1);
	});
});

describe('copyFiles', () => {
	testEnv(rootDir);

	it('should run rsync command', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const mockExec               = spyOnExec();

		await copyFiles();

		const buildDir = resolve('test-dir/.work/build');
		const pushDir  = resolve('test-dir/.work/push');
		execCalledWith(mockExec, [
			`rsync -rl --exclude '.git' --delete '${buildDir}/' '${pushDir}'`,
		]);
	});
});

describe('config', () => {
	testEnv(rootDir);

	it('should run git config command', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const mockExec               = spyOnExec();

		await config(helper);

		execCalledWith(mockExec, [
			'git config \'user.name\' \'github-actions[bot]\'',
			'git config \'user.email\' \'41898282+github-actions[bot]@users.noreply.github.com\'',
		]);
	});
});

describe('getDeleteTestTag', () => {
	testEnv(rootDir);
	testChildProcess();

	it('should return empty', async() => {
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag')) {
					return '';
				}
				return '';
			},
		});

		expect(await getDeleteTestTag('v1.2.3', 'test/', helper)).toEqual([]);
	});

	it('should get delete test tag', async() => {
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag')) {
					return 'v1\nv1.2\nv1.2.2\ntest/v0\ntest/v1\ntest/v1.1\ntest/v1.2\ntest/v1.2.2\ntest/v1.2.3\ntest/v1.2.3.1';
				}
				return '';
			},
		});

		expect(await getDeleteTestTag('v1.2.3', 'test/', helper)).toEqual([
			'test/v0',
			'test/v1.1',
			'test/v1.2.2',
		]);
	});

	it('should get delete original test tag', async() => {
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag')) {
					return 'v1\noriginal/v1.2\nv1.2.2\ntest/v0\noriginal/test/v1\ntest/v1.1\ntest/v1.2\noriginal/test/v1.2.2\noriginal/test/v1.2.3\ntest/v1.2.3.1';
				}
				return '';
			},
		});

		expect(await getDeleteTestTag('v1.2.3', 'original/test/', helper)).toEqual([
			'original/test/v1.2.2',
		]);
	});
});

describe('deleteTestTags', () => {
	testEnv(rootDir);
	testChildProcess();
	const context = getContext({
		eventName: 'push',
		ref: 'refs/tags/v1.2.3',
		repo: {
			owner: 'Hello',
			repo: 'World',
		},
	});
	const tags    = 'v1\nv1.2\nv1.2.2\ntest/v0\noriginal/test/v0\ntest/v1\noriginal/test/v1\ntest/v1.1\noriginal/test/v1.1\ntest/v1.2\noriginal/test/v1.2\ntest/v1.2.2\noriginal/test/v1.2.2\ntest/v1.2.3\noriginal/test/v1.2.3';

	it('should do nothing 1', async() => {
		process.env.INPUT_GITHUB_TOKEN        = 'test-token';
		process.env.INPUT_ORIGINAL_TAG_PREFIX = 'original/';
		process.env.INPUT_CLEAN_TEST_TAG      = '1';
		const mockExec                        = spyOnExec();

		await deleteTestTags(helper, context);

		execCalledWith(mockExec, []);
	});

	it('should do nothing 2', async() => {
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		process.env.INPUT_CLEAN_TEST_TAG  = '';
		const mockExec                    = spyOnExec();

		await deleteTestTags(helper, context);

		execCalledWith(mockExec, []);
	});

	it('should delete test tags', async() => {
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		process.env.INPUT_CLEAN_TEST_TAG  = '1';
		const mockExec                    = spyOnExec();
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag')) {
					return tags;
				}
				return '';
			},
		});

		await deleteTestTags(helper, context);

		execCalledWith(mockExec, [
			'git tag',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/test/v0 \'tags/test/v1.1\' \'tags/test/v1.2.2\' > /dev/null 2>&1 || :',
			'git tag -d test/v0 \'test/v1.1\' \'test/v1.2.2\' || :',
		]);
	});

	it('should delete original test tags', async() => {
		process.env.INPUT_GITHUB_TOKEN        = 'test-token';
		process.env.INPUT_TEST_TAG_PREFIX     = 'test/';
		process.env.INPUT_ORIGINAL_TAG_PREFIX = 'original/';
		process.env.INPUT_CLEAN_TEST_TAG      = '1';
		const mockExec                        = spyOnExec();
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag')) {
					return tags;
				}
				return '';
			},
		});

		await deleteTestTags(helper, context);

		execCalledWith(mockExec, [
			'git tag',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/test/v0 \'tags/test/v1.1\' \'tags/test/v1.2.2\' > /dev/null 2>&1 || :',
			'git tag -d test/v0 \'test/v1.1\' \'test/v1.2.2\' || :',
			'git tag',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/original/test/v0 \'tags/original/test/v1.1\' \'tags/original/test/v1.2.2\' > /dev/null 2>&1 || :',
			'git tag -d original/test/v0 \'original/test/v1.1\' \'original/test/v1.2.2\' || :',
		]);
	});
});

describe('push', () => {
	testEnv(rootDir);
	testChildProcess();

	it('should run git push command', async() => {
		process.env.INPUT_GITHUB_TOKEN   = 'test-token';
		process.env.GITHUB_WORKSPACE     = 'test-dir';
		process.env.INPUT_BRANCH_NAME    = 'test-branch';
		process.env.INPUT_CLEAN_TEST_TAG = '1';
		const mockExec                   = spyOnExec();
		const mockStdout                 = spyOnStdout();

		await push(helper, getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git tag',
			'git tag -d stdout > /dev/null 2>&1',
			'git fetch \'https://octocat:test-token@github.com/Hello/World.git\' --tags > /dev/null 2>&1',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete \'tags/v1.2.3\' > /dev/null 2>&1 || :',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete \'tags/v1.2\' > /dev/null 2>&1 || :',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/v1 > /dev/null 2>&1 || :',
			'git tag -d \'v1.2.3\' || :',
			'git tag -d \'v1.2\' || :',
			'git tag -d v1 || :',
			'git tag \'v1.2.3\'',
			'git tag \'v1.2\'',
			'git tag v1',
			'git push --tags \'https://octocat:test-token@github.com/Hello/World.git\' \'test-branch:refs/heads/test-branch\' > /dev/null 2>&1 || :',
		]);
		stdoutCalledWith(mockStdout, [
			'::endgroup::',
			'::group::Pushing to Hello/World@test-branch (tag: v1.2.3)...',
			'[command]git fetch origin --tags',
			'[command]git push origin --delete tags/v1.2.3',
			'[command]git push origin --delete tags/v1.2',
			'[command]git push origin --delete tags/v1',
			'[command]git tag -d \'v1.2.3\'',
			'  >> stdout',
			'[command]git tag -d \'v1.2\'',
			'  >> stdout',
			'[command]git tag -d v1',
			'  >> stdout',
			'[command]git tag \'v1.2.3\'',
			'  >> stdout',
			'[command]git tag \'v1.2\'',
			'  >> stdout',
			'[command]git tag v1',
			'  >> stdout',
			'[command]git push --tags origin test-branch:refs/heads/test-branch',
		]);
	});

	it('should run git push command with pushing original tag', async() => {
		process.env.INPUT_GITHUB_TOKEN        = 'test-token';
		process.env.GITHUB_WORKSPACE          = 'test-dir';
		process.env.INPUT_BRANCH_NAME         = 'test-branch';
		process.env.INPUT_TEST_TAG_PREFIX     = 'test/';
		process.env.INPUT_ORIGINAL_TAG_PREFIX = 'original/';
		process.env.INPUT_CLEAN_TEST_TAG      = '1';
		const mockExec                        = spyOnExec();
		const mockStdout                      = spyOnStdout();

		await push(helper, getContext({
			eventName: 'push',
			ref: 'refs/tags/test/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git tag',
			'git tag -d stdout > /dev/null 2>&1',
			'git fetch \'https://octocat:test-token@github.com/Hello/World.git\' --tags > /dev/null 2>&1',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete \'tags/original/test/v1.2.3\' > /dev/null 2>&1 || :',
			'git tag -d \'original/test/v1.2.3\' || :',
			'git tag \'original/test/v1.2.3\' \'test/v1.2.3\'',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' \'refs/tags/original/test/v1.2.3\' > /dev/null 2>&1',
			'git tag',
			'git tag -d stdout > /dev/null 2>&1',
			'git fetch \'https://octocat:test-token@github.com/Hello/World.git\' --tags > /dev/null 2>&1',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete \'tags/test/v1.2.3\' > /dev/null 2>&1 || :',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete \'tags/test/v1.2\' > /dev/null 2>&1 || :',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/test/v1 > /dev/null 2>&1 || :',
			'git tag -d \'test/v1.2.3\' || :',
			'git tag -d \'test/v1.2\' || :',
			'git tag -d test/v1 || :',
			'git tag \'test/v1.2.3\'',
			'git tag \'test/v1.2\'',
			'git tag test/v1',
			'git push --tags \'https://octocat:test-token@github.com/Hello/World.git\' \'test-branch:refs/heads/test-branch\' > /dev/null 2>&1 || :',
		]);
		stdoutCalledWith(mockStdout, [
			'::endgroup::',
			'::group::Pushing to Hello/World@test-branch (tag: test/v1.2.3)...',
			'[command]git fetch origin --tags',
			'[command]git push origin --delete tags/original/test/v1.2.3',
			'[command]git tag -d \'original/test/v1.2.3\'',
			'  >> stdout',
			'[command]git tag \'original/test/v1.2.3\' \'test/v1.2.3\'',
			'  >> stdout',
			'[command]git push origin refs/tags/original/test/v1.2.3',
			'[command]git fetch origin --tags',
			'[command]git push origin --delete tags/test/v1.2.3',
			'[command]git push origin --delete tags/test/v1.2',
			'[command]git push origin --delete tags/test/v1',
			'[command]git tag -d \'test/v1.2.3\'',
			'  >> stdout',
			'[command]git tag -d \'test/v1.2\'',
			'  >> stdout',
			'[command]git tag -d test/v1',
			'  >> stdout',
			'[command]git tag \'test/v1.2.3\'',
			'  >> stdout',
			'[command]git tag \'test/v1.2\'',
			'  >> stdout',
			'[command]git tag test/v1',
			'  >> stdout',
			'[command]git push --tags origin test-branch:refs/heads/test-branch',
		]);
	});
});
