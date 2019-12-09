/* eslint-disable no-magic-numbers */
import path from 'path';
import {
	getContext,
	testEnv,
	testFs,
	spyOnExec,
	execCalledWith,
	testChildProcess,
	setChildProcessParams,
} from '@technote-space/github-action-test-helper';
import {
	replaceDirectory,
	cloneForBranch,
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
const rootDir   = path.resolve(__dirname, '..', '..');

describe('replaceDirectory', () => {
	testEnv(rootDir);

	const workDir  = path.resolve('test-dir/.work');
	const buildDir = path.resolve('test-dir/.work/build');
	const pushDir  = path.resolve('test-dir/.work/push');

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

describe('cloneForBranch', () => {
	testEnv(rootDir);

	it('should run clone command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME  = 'test-branch';
		process.env.GITHUB_WORKSPACE   = 'test-dir';
		const mockExec                 = spyOnExec();

		await cloneForBranch(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git clone \'--branch=test-branch\' \'--depth=3\' \'https://octocat:test-token@github.com/Hello/World.git\' \'.\' > /dev/null 2>&1 || :',
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

		await checkBranch('test-branch');

		expect(mockExec).not.toBeCalled();
	});

	it('should run git init command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME  = 'test-branch';
		process.env.GITHUB_WORKSPACE   = 'test-dir';
		const mockExec                 = spyOnExec();

		await checkBranch('test-branch2');

		const dir = path.resolve('test-dir/.work/push');
		execCalledWith(mockExec, [
			`rm -rdf '${dir}'`,
			'git init \'.\'',
			'git checkout --orphan test-branch',
		]);
	});
});

describe('prepareFiles', () => {
	testEnv(rootDir);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const commonCheck = (dir: string): (string | any[])[] => {
		return [
			['yarn install --production', {cwd: dir}],
			['rm -rdf .[!.]*', {cwd: dir}],
			['rm -rdf *.js', {cwd: dir}],
			['rm -rdf *.ts', {cwd: dir}],
			['rm -rdf *.json', {cwd: dir}],
			['rm -rdf *.lock', {cwd: dir}],
			['rm -rdf __tests__ src \'_config.yml\'', {cwd: dir}],
		];
	};

	it('should run commands', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		const mockExec                    = spyOnExec();

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
			sha: 'test-sha',
		}));

		const dir = path.resolve('test-dir/.work/build');
		execCalledWith(mockExec, ([
			'git clone \'--depth=3\' \'https://octocat:test-token@github.com/Hello/World.git\' \'.\' > /dev/null 2>&1',
			'git fetch \'https://octocat:test-token@github.com/Hello/World.git\' refs/heads/test > /dev/null 2>&1',
			'git checkout -qf test-sha',
		] as any[]).concat(commonCheck(dir))); // eslint-disable-line @typescript-eslint/no-explicit-any
	});

	it('should checkout branch', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		const mockExec                    = spyOnExec();

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
		}));

		const dir = path.resolve('test-dir/.work/build');
		execCalledWith(mockExec, ([
			'git clone \'https://octocat:test-token@github.com/Hello/World.git\' \'.\' > /dev/null 2>&1',
			'git checkout -qf test',
		] as any[]).concat(commonCheck(dir))); // eslint-disable-line @typescript-eslint/no-explicit-any
	});

	it('should checkout tag', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		const mockExec                    = spyOnExec();

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/tags/test',
		}));

		const dir = path.resolve('test-dir/.work/build');
		execCalledWith(mockExec, ([
			'git clone \'https://octocat:test-token@github.com/Hello/World.git\' \'.\' > /dev/null 2>&1',
			'git checkout -qf refs/tags/test',
		] as any[]).concat(commonCheck(dir))); // eslint-disable-line @typescript-eslint/no-explicit-any
	});

	it('should clean specified targets 1', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		process.env.INPUT_CLEAN_TARGETS   = 'test1,-test2,test3 test4,-test5 , test6;test7, test8/*.txt, *.test9';
		const mockExec                    = spyOnExec();

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/tags/test',
		}));

		const dir = path.resolve('test-dir/.work/build');
		execCalledWith(mockExec, ([
			'git clone \'https://octocat:test-token@github.com/Hello/World.git\' \'.\' > /dev/null 2>&1',
			'git checkout -qf refs/tags/test',
			['yarn install --production', {cwd: dir}],
			['rm -rdf -- -test2', {cwd: dir}],
			['rm -rdf -- -test5', {cwd: dir}],
			['rm -rdf test8/*.txt', {cwd: dir}],
			['rm -rdf *.test9', {cwd: dir}],
			['rm -rdf test1 \'test3 test4\' \'test6;test7\'', {cwd: dir}],
		]));
	});

	it('should clean specified targets 2', async() => {
		process.env.INPUT_PACKAGE_MANAGER = 'yarn';
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.GITHUB_WORKSPACE      = 'test-dir';
		process.env.INPUT_CLEAN_TARGETS   = '-test1, -test2/?<>:|"\'@#$%^& ;.*.test3 , ?<>:|"\'@#$%^& ;/test4 test5/*.txt,;?<>:|"\'@#$%^& ;.txt,rm -rf /';
		const mockExec                    = spyOnExec();

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/tags/test',
		}));

		const dir = path.resolve('test-dir/.work/build');
		execCalledWith(mockExec, ([
			'git clone \'https://octocat:test-token@github.com/Hello/World.git\' \'.\' > /dev/null 2>&1',
			'git checkout -qf refs/tags/test',
			['yarn install --production', {cwd: dir}],
			['rm -rdf -- -test1', {cwd: dir}],
			['rm -rdf -- -test2/\\?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;.*.test3', {cwd: dir}],
			['rm -rdf ?\\<\\>\\:\\|\\"\\\'\\@\\#\\$\\%\\^\\&\\ \\;/test4 test5/*.txt', {cwd: dir}],
			['rm -rdf \';?<>:|"\'\\\'\'@#$%^& ;.txt\' \'rm -rf /\'', {cwd: dir}],
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
	it('should run rsync command', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const mockExec               = spyOnExec();

		await copyFiles();

		const buildDir = path.resolve('test-dir/.work/build');
		const pushDir  = path.resolve('test-dir/.work/push');
		execCalledWith(mockExec, [
			`rsync -rl --exclude '.git' --delete '${buildDir}/' '${pushDir}'`,
		]);
	});
});

describe('config', () => {
	it('should run git config command', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const mockExec               = spyOnExec();

		await config();

		execCalledWith(mockExec, [
			'git config \'user.name\' \'github-actions[bot]\'',
			'git config \'user.email\' \'41898282+github-actions[bot]@users.noreply.github.com\'',
		]);
	});
});

describe('getDeleteTestTag', () => {
	testChildProcess();

	it('should return empty', async() => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag -l')) {
					return '';
				}
				return '';
			},
		});

		expect(await getDeleteTestTag('v1.2.3')).toEqual([]);
	});

	it('should get delete test tag', async() => {
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag -l')) {
					return 'v1\nv1.2\nv1.2.2\ntest/v0\ntest/v1\ntest/v1.1\ntest/v1.2\ntest/v1.2.2\ntest/v1.2.3\ntest/v1.2.3.1';
				}
				return '';
			},
		});

		expect(await getDeleteTestTag('v1.2.3')).toEqual([
			'test/v0',
			'test/v1.1',
			'test/v1.2.2',
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

		await deleteTestTags(context);

		execCalledWith(mockExec, []);
	});

	it('should do nothing 2', async() => {
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		process.env.INPUT_CLEAN_TEST_TAG  = '';
		const mockExec                    = spyOnExec();

		await deleteTestTags(context);

		execCalledWith(mockExec, []);
	});

	it('should delete test tags', async() => {
		process.env.INPUT_GITHUB_TOKEN    = 'test-token';
		process.env.INPUT_TEST_TAG_PREFIX = 'test/';
		process.env.INPUT_CLEAN_TEST_TAG  = '1';
		const mockExec                    = spyOnExec();
		setChildProcessParams({
			stdout: (command: string): string => {
				if (command.endsWith('git tag -l')) {
					return tags;
				}
				return '';
			},
		});

		await deleteTestTags(context);

		execCalledWith(mockExec, [
			'git tag -l',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/test/v0 \'tags/test/v1.1\' \'tags/test/v1.2.2\' > /dev/null 2>&1 || :',
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
				if (command.endsWith('git tag -l')) {
					return tags;
				}
				return '';
			},
		});

		await deleteTestTags(context);

		execCalledWith(mockExec, [
			'git tag -l',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/test/v0 \'tags/test/v1.1\' \'tags/test/v1.2.2\' > /dev/null 2>&1 || :',
			'git tag -l',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/original/test/v0 \'tags/original/test/v1.1\' \'tags/original/test/v1.2.2\' > /dev/null 2>&1 || :',
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

		await push(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/v1 \'tags/v1.2\' \'tags/v1.2.3\' > /dev/null 2>&1 || :',
			'git tag -l',
			'git tag -d stdout',
			'git fetch \'https://octocat:test-token@github.com/Hello/World.git\' --tags > /dev/null 2>&1',
			'git tag v1',
			'git tag \'v1.2\'',
			'git tag \'v1.2.3\'',
			'git push --tags \'https://octocat:test-token@github.com/Hello/World.git\' \'test-branch:refs/heads/test-branch\' > /dev/null 2>&1',
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

		await push(getContext({
			eventName: 'push',
			ref: 'refs/tags/test/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git tag -l',
			'git tag -d stdout',
			'git fetch \'https://octocat:test-token@github.com/Hello/World.git\' --tags > /dev/null 2>&1',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete \'tags/original/test/v1.2.3\' > /dev/null 2>&1 || :',
			'git tag \'original/test/v1.2.3\' \'test/v1.2.3\'',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' \'refs/tags/original/test/v1.2.3\' > /dev/null 2>&1',
			'git push \'https://octocat:test-token@github.com/Hello/World.git\' --delete tags/test/v1 \'tags/test/v1.2\' \'tags/test/v1.2.3\' > /dev/null 2>&1 || :',
			'git tag -l',
			'git tag -d stdout',
			'git fetch \'https://octocat:test-token@github.com/Hello/World.git\' --tags > /dev/null 2>&1',
			'git tag test/v1',
			'git tag \'test/v1.2\'',
			'git tag \'test/v1.2.3\'',
			'git push --tags \'https://octocat:test-token@github.com/Hello/World.git\' \'test-branch:refs/heads/test-branch\' > /dev/null 2>&1',
		]);
	});
});
