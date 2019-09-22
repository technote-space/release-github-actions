/* eslint-disable no-magic-numbers */
import path from 'path';
import { EOL } from 'os';
import { getContext, testEnv } from '@technote-space/github-action-test-helper';
import global from '../global';
import {
	replaceDirectory,
	cloneForBranch,
	checkBranch,
	prepareFiles,
	createBuildInfoFile,
	getCurrentBranchName,
	copyFiles,
	config,
	commit,
	push,
} from '../../src/utils/command';

let exists = false;
beforeAll(() => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const fs = require('fs');
	jest.spyOn(fs, 'writeFileSync').mockImplementation(jest.fn());
	jest.spyOn(fs, 'mkdirSync').mockImplementation(jest.fn());
	jest.spyOn(fs, 'existsSync').mockImplementation(() => exists);
});

afterAll(() => {
	jest.restoreAllMocks();
});

describe('replaceDirectory', () => {
	testEnv();

	it('should replace build directory', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const buildDir = path.resolve('test-dir/.work/build');

		expect(replaceDirectory(`git -C ${buildDir} fetch`)).toBe('git fetch');
	});

	it('should replace build directory', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const pushDir = path.resolve('test-dir/.work/push');

		expect(replaceDirectory(`git -C ${pushDir} fetch`)).toBe('git fetch');
	});

	it('should replace working directory', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const workDir = path.resolve('test-dir/.work');

		expect(replaceDirectory(`git -C ${workDir} fetch`)).toBe('git fetch');
	});

	it('should replace directories', () => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const workDir = path.resolve('test-dir/.work');
		const buildDir = path.resolve('test-dir/.work/build');
		const pushDir = path.resolve('test-dir/.work/push');

		expect(replaceDirectory(`abc ${buildDir} && pqr ${workDir}/xyz ${pushDir}/123`)).toBe('abc <Build Directory> && pqr <Working Directory>/xyz <Push Directory>/123');
	});
});

describe('cloneForBranch', () => {
	testEnv();

	it('should run clone command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await cloneForBranch(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(1);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} clone --branch=test-branch --depth=3 https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1 || :`);
	});
});

describe('checkBranch', () => {
	testEnv();

	it('should do nothing', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await checkBranch('test-branch');

		expect(execMock).not.toBeCalled();
	});

	it('should run git init command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await checkBranch('test-branch2');

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(3);
		expect(execMock.mock.calls[0][0]).toBe(`rm -rdf ${dir}`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} init .`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} checkout --orphan "test-branch"`);
	});
});

describe('prepareFiles', () => {
	testEnv();

	const commonCheck = (start: number, dir: string, execMock): void => {
		expect(execMock.mock.calls[start][0]).toBe('yarn install --production');
		expect(execMock.mock.calls[start][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 1][0]).toBe('rm -rdf .[!.]*');
		expect(execMock.mock.calls[start + 1][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 2][0]).toBe('rm -rdf __tests__');
		expect(execMock.mock.calls[start + 2][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 3][0]).toBe('rm -rdf src');
		expect(execMock.mock.calls[start + 3][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 4][0]).toBe('rm -rdf *.js');
		expect(execMock.mock.calls[start + 4][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 5][0]).toBe('rm -rdf *.ts');
		expect(execMock.mock.calls[start + 5][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 6][0]).toBe('rm -rdf *.json');
		expect(execMock.mock.calls[start + 6][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 7][0]).toBe('rm -rdf *.lock');
		expect(execMock.mock.calls[start + 7][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[start + 8][0]).toBe('rm -rdf _config.yml');
		expect(execMock.mock.calls[start + 8][1]).toEqual({cwd: dir});
	};

	it('should run commands', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
			sha: 'test-sha',
		}));

		const dir = path.resolve('test-dir/.work/build');
		expect(execMock).toBeCalledTimes(12);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} clone --depth=3 https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} fetch https://octocat:test-token@github.com/Hello/World.git refs/heads/test > /dev/null 2>&1`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} checkout -qf test-sha`);

		commonCheck(3, dir, execMock);
	});

	it('should checkout branch', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
		}));

		const dir = path.resolve('test-dir/.work/build');
		expect(execMock).toBeCalledTimes(11);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} clone https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} checkout -qf test`);

		commonCheck(2, dir, execMock);
	});

	it('should checkout tag', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await prepareFiles(getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/tags/test',
		}));

		const dir = path.resolve('test-dir/.work/build');
		expect(execMock).toBeCalledTimes(11);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} clone https://octocat:test-token@github.com/Hello/World.git . > /dev/null 2>&1`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} checkout -qf refs/tags/test`);

		commonCheck(2, dir, execMock);
	});
});

describe('createBuildInfoFile', () => {
	testEnv();

	it('should do nothing', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = '/';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock = jest.spyOn(require('fs'), 'writeFileSync');

		await createBuildInfoFile(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
		}));

		expect(writeMock).not.toBeCalled();
	});

	it('should write file', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = 'info.json';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mkdirMock = jest.spyOn(require('fs'), 'mkdirSync');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock = jest.spyOn(require('fs'), 'writeFileSync');

		await createBuildInfoFile(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
		}));

		expect(mkdirMock).toBeCalledTimes(1);
		expect(writeMock).toBeCalledTimes(1);
	});

	it('should not create dir', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = 'info.json';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mkdirMock = jest.spyOn(require('fs'), 'mkdirSync');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock = jest.spyOn(require('fs'), 'writeFileSync');
		exists = true;

		await createBuildInfoFile(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
		}));

		expect(mkdirMock).toBeCalledTimes(0);
		expect(writeMock).toBeCalledTimes(1);

		exists = false;
	});
});

describe('getCurrentBranchName', () => {
	afterEach(() => {
		global.mockChildProcess.stdout = 'stdout';
	});

	it('should return empty', async() => {
		exists = false;

		expect(await getCurrentBranchName()).toBe('');
	});

	it('should return branch name', async() => {
		global.mockChildProcess.stdout = 'test-branch';
		exists = true;

		expect(await getCurrentBranchName()).toBe('test-branch');
	});
});

describe('copyFiles', () => {
	it('should run rsync command', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await copyFiles();

		const buildDir = path.resolve('test-dir/.work/build');
		const pushDir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(1);
		expect(execMock.mock.calls[0][0]).toBe(`rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`);
	});
});

describe('config', () => {
	it('should run git config command', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await config();

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(2);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} config user.name "GitHub Actions"`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} config user.email "example@example.com"`);
	});
});

describe('commit', () => {
	afterEach(() => {
		global.mockChildProcess.stdout = 'stdout';
	});

	it('should return false if there is no diff', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		global.mockChildProcess.stdout = '';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');
		const stdoutMock = jest.spyOn(global.mockStdout, 'write');

		expect(await commit()).toBeFalsy();

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(2);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} add --all --force`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} status --short -uno`);
		expect(stdoutMock).toBeCalledTimes(3);
		expect(stdoutMock.mock.calls[0][0]).toBe('[command]git add --all --force' + EOL);
		expect(stdoutMock.mock.calls[1][0]).toBe('[command]git status --short -uno' + EOL);
		expect(stdoutMock.mock.calls[2][0]).toBe('> There is no diff.' + EOL);
	});

	it('should return true', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		global.mockChildProcess.stdout = 'A test.txt';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');
		const stdoutMock = jest.spyOn(global.mockStdout, 'write');

		expect(await commit()).toBeTruthy();

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(4);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} add --all --force`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} status --short -uno`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} commit -qm "feat: Build for release"`);
		expect(execMock.mock.calls[3][0]).toBe(`git -C ${dir} show --stat-count=10 HEAD`);
		expect(stdoutMock).toBeCalledTimes(7);
		expect(stdoutMock.mock.calls[0][0]).toBe('[command]git add --all --force' + EOL);
		expect(stdoutMock.mock.calls[1][0]).toBe('  >> A test.txt' + EOL);
		expect(stdoutMock.mock.calls[2][0]).toBe('[command]git status --short -uno' + EOL);
		expect(stdoutMock.mock.calls[3][0]).toBe('[command]git commit -qm "feat: Build for release"' + EOL);
		expect(stdoutMock.mock.calls[4][0]).toBe('  >> A test.txt' + EOL);
		expect(stdoutMock.mock.calls[5][0]).toBe('[command]git show --stat-count=10 HEAD' + EOL);
		expect(stdoutMock.mock.calls[6][0]).toBe('  >> A test.txt' + EOL);
	});
});

describe('push', () => {
	testEnv();

	it('should run git push command', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await push(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(9);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} push --delete "https://octocat:test-token@github.com/Hello/World.git" tag v1.2.3 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} push --delete "https://octocat:test-token@github.com/Hello/World.git" tag v1 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} push --delete "https://octocat:test-token@github.com/Hello/World.git" tag v1.2 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[3][0]).toBe(`git -C ${dir} tag -l | xargs git -C ${dir} tag -d`);
		expect(execMock.mock.calls[4][0]).toBe(`git -C ${dir} fetch "https://octocat:test-token@github.com/Hello/World.git" --tags > /dev/null 2>&1`);
		expect(execMock.mock.calls[5][0]).toBe(`git -C ${dir} tag v1.2.3`);
		expect(execMock.mock.calls[6][0]).toBe(`git -C ${dir} tag v1`);
		expect(execMock.mock.calls[7][0]).toBe(`git -C ${dir} tag v1.2`);
		expect(execMock.mock.calls[8][0]).toBe(`git -C ${dir} push --tags "https://octocat:test-token@github.com/Hello/World.git" "test-branch":"refs/heads/test-branch" > /dev/null 2>&1`);
	});

	it('should run git push command with pushing original tag', async() => {
		process.env.INPUT_GITHUB_TOKEN = 'test-token';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.INPUT_ORIGINAL_TAG_PREFIX = 'original/';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await push(getContext({
			eventName: 'push',
			ref: 'refs/tags/v1.2.3',
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(12);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} fetch "https://octocat:test-token@github.com/Hello/World.git" --tags > /dev/null 2>&1`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} tag original/v1.2.3 v1.2.3`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} push "https://octocat:test-token@github.com/Hello/World.git" "refs/tags/original/v1.2.3" > /dev/null 2>&1`);
		expect(execMock.mock.calls[3][0]).toBe(`git -C ${dir} push --delete "https://octocat:test-token@github.com/Hello/World.git" tag v1.2.3 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[4][0]).toBe(`git -C ${dir} push --delete "https://octocat:test-token@github.com/Hello/World.git" tag v1 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[5][0]).toBe(`git -C ${dir} push --delete "https://octocat:test-token@github.com/Hello/World.git" tag v1.2 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[6][0]).toBe(`git -C ${dir} tag -l | xargs git -C ${dir} tag -d`);
		expect(execMock.mock.calls[7][0]).toBe(`git -C ${dir} fetch "https://octocat:test-token@github.com/Hello/World.git" --tags > /dev/null 2>&1`);
		expect(execMock.mock.calls[8][0]).toBe(`git -C ${dir} tag v1.2.3`);
		expect(execMock.mock.calls[9][0]).toBe(`git -C ${dir} tag v1`);
		expect(execMock.mock.calls[10][0]).toBe(`git -C ${dir} tag v1.2`);
		expect(execMock.mock.calls[11][0]).toBe(`git -C ${dir} push --tags "https://octocat:test-token@github.com/Hello/World.git" "test-branch":"refs/heads/test-branch" > /dev/null 2>&1`);
	});
});
