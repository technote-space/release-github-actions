/* eslint-disable no-magic-numbers */
import path from 'path';
import {
	getContext,
	testEnv,
	testFs,
	spyOnExec,
	execCalledWith,
} from '@technote-space/github-action-test-helper';
import {
	replaceDirectory,
	cloneForBranch,
	checkBranch,
	prepareFiles,
	createBuildInfoFile,
	copyFiles,
	config,
	push,
} from '../../src/utils/command';

const setExists = testFs();

describe('replaceDirectory', () => {
	testEnv();

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
	testEnv();

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
			'git clone --branch=test-branch --depth=3 https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1 || :',
		]);
	});
});

describe('checkBranch', () => {
	testEnv();

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
			`rm -rdf ${dir}`,
			'git init .',
			'git checkout --orphan "test-branch"',
		]);
	});
});

describe('prepareFiles', () => {
	testEnv();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const commonCheck = (dir: string): (string | any[])[] => {
		return [
			['yarn install --production', {cwd: dir}],
			['rm -rdf .[!.]*', {cwd: dir}],
			['rm -rdf __tests__', {cwd: dir}],
			['rm -rdf src', {cwd: dir}],
			['rm -rdf *.js', {cwd: dir}],
			['rm -rdf *.ts', {cwd: dir}],
			['rm -rdf *.json', {cwd: dir}],
			['rm -rdf *.lock', {cwd: dir}],
			['rm -rdf _config.yml', {cwd: dir}],
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
			'git clone --depth=3 https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1',
			'git fetch https://octocat:test-token@github.com/Hello/World.git refs/heads/test > /dev/null 2>&1',
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
			'git clone https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1',
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
			'git clone https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1',
			'git checkout -qf refs/tags/test',
		] as any[]).concat(commonCheck(dir))); // eslint-disable-line @typescript-eslint/no-explicit-any
	});
});

describe('createBuildInfoFile', () => {
	testEnv();

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
			`rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`,
		]);
	});
});

describe('config', () => {
	it('should run git config command', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const mockExec               = spyOnExec();

		await config();

		execCalledWith(mockExec, [
			'git config user.name "GitHub Actions"',
			'git config user.email "example@example.com"',
		]);
	});
});

describe('push', () => {
	testEnv();

	it('should run git push command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.GITHUB_WORKSPACE   = 'test-dir';
		process.env.INPUT_BRANCH_NAME  = 'test-branch';
		const mockExec                 = spyOnExec();

		await push(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git push --delete https://octocat:test-token@github.com/Hello/World.git tag v1 > /dev/null 2>&1 || :',
			'git push --delete https://octocat:test-token@github.com/Hello/World.git tag v1.2 > /dev/null 2>&1 || :',
			'git push --delete https://octocat:test-token@github.com/Hello/World.git tag v1.2.3 > /dev/null 2>&1 || :',
			'git tag -l | xargs git tag -d',
			'git fetch https://octocat:test-token@github.com/Hello/World.git --tags > /dev/null 2>&1',
			'git tag v1',
			'git tag v1.2',
			'git tag v1.2.3',
			'git push --tags https://octocat:test-token@github.com/Hello/World.git "test-branch":"refs/heads/test-branch" > /dev/null 2>&1',
		]);
	});

	it('should run git push command with pushing original tag', async() => {
		process.env.INPUT_GITHUB_TOKEN        = 'test-token';
		process.env.GITHUB_WORKSPACE          = 'test-dir';
		process.env.INPUT_BRANCH_NAME         = 'test-branch';
		process.env.INPUT_ORIGINAL_TAG_PREFIX = 'original/';
		const mockExec                        = spyOnExec();

		await push(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		execCalledWith(mockExec, [
			'git tag -l | xargs git tag -d',
			'git fetch https://octocat:test-token@github.com/Hello/World.git --tags > /dev/null 2>&1',
			'git push --delete https://octocat:test-token@github.com/Hello/World.git tag original/v1.2.3 > /dev/null 2>&1 || :',
			'git tag original/v1.2.3 v1.2.3',
			'git push https://octocat:test-token@github.com/Hello/World.git "refs/tags/original/v1.2.3" > /dev/null 2>&1',
			'git push --delete https://octocat:test-token@github.com/Hello/World.git tag v1 > /dev/null 2>&1 || :',
			'git push --delete https://octocat:test-token@github.com/Hello/World.git tag v1.2 > /dev/null 2>&1 || :',
			'git push --delete https://octocat:test-token@github.com/Hello/World.git tag v1.2.3 > /dev/null 2>&1 || :',
			'git tag -l | xargs git tag -d',
			'git fetch https://octocat:test-token@github.com/Hello/World.git --tags > /dev/null 2>&1',
			'git tag v1',
			'git tag v1.2',
			'git tag v1.2.3',
			'git push --tags https://octocat:test-token@github.com/Hello/World.git "test-branch":"refs/heads/test-branch" > /dev/null 2>&1',
		]);
	});
});
