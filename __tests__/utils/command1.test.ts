/* eslint-disable no-magic-numbers */
import path from 'path';
import global from '../global';
import {
	replaceDirectory,
	getCommand,
	getRejectedErrorMessage,
	execCallback,
	execAsync,
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
import { getContext, testEnv } from '../util';

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

describe('getCommand', () => {
	it('should get command', () => {
		expect(getCommand('test', false, false)).toBe('test');
		expect(getCommand('test', false, true)).toBe('test || :');
		expect(getCommand('test', true, false)).toBe('test > /dev/null 2>&1');
		expect(getCommand('test', true, true)).toBe('test > /dev/null 2>&1 || :');
	});
});

describe('getRejectedErrorMessage', () => {
	it('should get message', () => {
		expect(getRejectedErrorMessage('test', undefined, false, {
			name: 'test error',
			message: 'test error message',
			code: 123,
		})).toBe('command [test] exited with code 123. message: test error message');
	});

	it('should get alt message', () => {
		expect(getRejectedErrorMessage('test', 'alt', false, {
			name: 'test error',
			message: 'test error message',
			code: 123,
		})).toBe('command [alt] exited with code 123. message: test error message');
	});

	it('should get quiet message', () => {
		expect(getRejectedErrorMessage('test', undefined, true, {
			name: 'test error',
			message: 'test error message',
			code: 123,
		})).toBe('command exited with code 123.');
	});

	it('should get quiet alt message', () => {
		expect(getRejectedErrorMessage('test', 'alt', true, {
			name: 'test error',
			message: 'test error message',
			code: 123,
		})).toBe('command [alt] exited with code 123.');
	});
});

describe('execCallback', () => {
	it('should return function', () => {
		expect(typeof execCallback('', undefined, false, false, () => {
		}, () => {
		})).toBe('function');
	});

	it('should call resolve', () => {
		const resolve = jest.fn();
		const reject = jest.fn();
		const callback = execCallback('test', 'alt', true, false, resolve, reject);
		callback(null, 'stdout', 'stderr');
		expect(resolve).toBeCalledWith('stdout');
		expect(reject).not.toBeCalled();
	});

	it('should call reject', () => {
		const resolve = jest.fn();
		const reject = jest.fn();
		const callback = execCallback('test', 'alt', false, false, resolve, reject);
		callback({
			name: 'test error',
			message: 'test error message',
			code: 123,
		}, 'stdout', 'stderr');
		expect(resolve).not.toBeCalled();
		expect(reject).toBeCalledWith('command [alt] exited with code 123. message: test error message');
	});

	it('should output', () => {
		const resolve = jest.fn();
		const reject = jest.fn();
		const commandMock = jest.spyOn(global.mockSignale, 'command');
		const warnMock = jest.spyOn(global.mockSignale, 'warn');

		const callback = execCallback('test', 'alt', false, false, resolve, reject);
		callback(null, 'stdout', '');
		expect(resolve).toBeCalledWith('stdout');
		expect(reject).not.toBeCalled();
		expect(commandMock).toBeCalledWith('    >> stdout');
		expect(warnMock).not.toBeCalled();
	});

	it('should output error', () => {
		const resolve = jest.fn();
		const reject = jest.fn();
		const commandMock = jest.spyOn(global.mockSignale, 'command');
		const warnMock = jest.spyOn(global.mockSignale, 'warn');

		const callback = execCallback('test', 'alt', false, false, resolve, reject);
		callback(null, 'stdout', 'stderr');
		expect(resolve).toBeCalledWith('stdout');
		expect(reject).not.toBeCalled();
		expect(commandMock).toBeCalledWith('    >> stdout');
		expect(warnMock).toBeCalledWith('    >> stderr');
	});
});

describe('execAsync', () => {
	it('should show run command', async() => {
		const commandMock = jest.spyOn(global.mockSignale, 'command');
		await execAsync({command: 'test'});
		expect(commandMock).toBeCalledTimes(2);
		expect(commandMock.mock.calls[0][0]).toBe('  > test');
		expect(commandMock.mock.calls[1][0]).toBe('    >> stdout');
	});

	it('should show run alt command', async() => {
		const commandMock = jest.spyOn(global.mockSignale, 'command');
		await execAsync({command: 'test', altCommand: 'alt'});
		expect(commandMock).toBeCalledTimes(2);
		expect(commandMock.mock.calls[0][0]).toBe('  > alt');
		expect(commandMock.mock.calls[1][0]).toBe('    >> stdout');
	});

	it('should not show run command', async() => {
		const commandMock = jest.spyOn(global.mockSignale, 'command');
		await execAsync({command: 'test', quiet: true});
		expect(commandMock).not.toBeCalled();
	});
});

describe('cloneForBranch', () => {
	testEnv();

	it('should run clone command', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
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
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} clone --branch=test-branch --depth=3 https://test-token@github.com/Hello/World.git . > /dev/null 2>&1 || :`);
	});
});

describe('checkBranch', () => {
	testEnv();

	it('should do nothing', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		process.env.INPUT_BRANCH_NAME = 'test-branch';
		process.env.GITHUB_WORKSPACE = 'test-dir';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await checkBranch('test-branch');

		expect(execMock).not.toBeCalled();
	});

	it('should run git init command', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
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

	const commonCheck = (dir: string, execMock): void => {
		expect(execMock.mock.calls[3][0]).toBe('yarn install --production');
		expect(execMock.mock.calls[3][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[4][0]).toBe('rm -rdf .[!.]*');
		expect(execMock.mock.calls[4][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[5][0]).toBe('rm -rdf __tests__');
		expect(execMock.mock.calls[5][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[6][0]).toBe('rm -rdf src');
		expect(execMock.mock.calls[6][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[7][0]).toBe('rm -rdf *.js');
		expect(execMock.mock.calls[7][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[8][0]).toBe('rm -rdf *.ts');
		expect(execMock.mock.calls[8][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[9][0]).toBe('rm -rdf *.json');
		expect(execMock.mock.calls[9][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[10][0]).toBe('rm -rdf *.lock');
		expect(execMock.mock.calls[10][1]).toEqual({cwd: dir});
		expect(execMock.mock.calls[11][0]).toBe('rm -rdf _config.yml');
		expect(execMock.mock.calls[11][1]).toEqual({cwd: dir});
	};

	it('should run commands', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
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
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} clone --depth=3 https://test-token@github.com/Hello/World.git . > /dev/null 2>&1`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} fetch "https://test-token@github.com/Hello/World.git" refs/heads/test > /dev/null 2>&1`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} checkout -qf test-sha`);

		commonCheck(dir, execMock);
	});

	it('should skip checkout command', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
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
		expect(execMock).toBeCalledTimes(12);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} clone --depth=3 https://test-token@github.com/Hello/World.git . > /dev/null 2>&1`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} fetch "https://test-token@github.com/Hello/World.git" refs/heads/test > /dev/null 2>&1`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} checkout -qf refs/heads/test`);

		commonCheck(dir, execMock);
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
		const commandMock = jest.spyOn(global.mockSignale, 'command');

		expect(await commit()).toBeFalsy();

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(2);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} add --all --force`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} status --short -uno`);
		expect(commandMock).toBeCalledTimes(2);
		expect(commandMock.mock.calls[0][0]).toBe('  > git add --all --force');
		expect(commandMock.mock.calls[1][0]).toBe('  > git status --short -uno');
	});

	it('should return true', async() => {
		process.env.GITHUB_WORKSPACE = 'test-dir';
		global.mockChildProcess.stdout = 'A test.txt';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');
		const commandMock = jest.spyOn(global.mockSignale, 'command');

		expect(await commit()).toBeTruthy();

		const dir = path.resolve('test-dir/.work/push');
		expect(execMock).toBeCalledTimes(4);
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} add --all --force`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} status --short -uno`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} commit -qm "feat: Build for release"`);
		expect(execMock.mock.calls[3][0]).toBe(`git -C ${dir} show --stat-count=10 HEAD`);
		expect(commandMock).toBeCalledTimes(7);
		expect(commandMock.mock.calls[0][0]).toBe('  > git add --all --force');
		expect(commandMock.mock.calls[1][0]).toBe('    >> A test.txt');
		expect(commandMock.mock.calls[2][0]).toBe('  > git status --short -uno');
		expect(commandMock.mock.calls[3][0]).toBe('  > git commit -qm "feat: Build for release"');
		expect(commandMock.mock.calls[4][0]).toBe('    >> A test.txt');
		expect(commandMock.mock.calls[5][0]).toBe('  > git show --stat-count=10 HEAD');
		expect(commandMock.mock.calls[6][0]).toBe('    >> A test.txt');
	});
});

describe('push', () => {
	testEnv();

	it('should run git push command', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
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
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} push --delete "https://test-token@github.com/Hello/World.git" tag v1.2.3 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} push --delete "https://test-token@github.com/Hello/World.git" tag v1 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} push --delete "https://test-token@github.com/Hello/World.git" tag v1.2 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[3][0]).toBe(`git -C ${dir} tag -l | xargs git -C ${dir} tag -d`);
		expect(execMock.mock.calls[4][0]).toBe(`git -C ${dir} fetch "https://test-token@github.com/Hello/World.git" --tags > /dev/null 2>&1`);
		expect(execMock.mock.calls[5][0]).toBe(`git -C ${dir} tag v1.2.3`);
		expect(execMock.mock.calls[6][0]).toBe(`git -C ${dir} tag v1`);
		expect(execMock.mock.calls[7][0]).toBe(`git -C ${dir} tag v1.2`);
		expect(execMock.mock.calls[8][0]).toBe(`git -C ${dir} push --tags "https://test-token@github.com/Hello/World.git" "test-branch":"refs/heads/test-branch" > /dev/null 2>&1`);
	});

	it('should run git push command with pushing original tag', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
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
		expect(execMock.mock.calls[0][0]).toBe(`git -C ${dir} fetch "https://test-token@github.com/Hello/World.git" --tags > /dev/null 2>&1`);
		expect(execMock.mock.calls[1][0]).toBe(`git -C ${dir} tag original/v1.2.3 v1.2.3`);
		expect(execMock.mock.calls[2][0]).toBe(`git -C ${dir} push "https://test-token@github.com/Hello/World.git" "refs/tags/original/v1.2.3" > /dev/null 2>&1`);
		expect(execMock.mock.calls[3][0]).toBe(`git -C ${dir} push --delete "https://test-token@github.com/Hello/World.git" tag v1.2.3 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[4][0]).toBe(`git -C ${dir} push --delete "https://test-token@github.com/Hello/World.git" tag v1 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[5][0]).toBe(`git -C ${dir} push --delete "https://test-token@github.com/Hello/World.git" tag v1.2 > /dev/null 2>&1 || :`);
		expect(execMock.mock.calls[6][0]).toBe(`git -C ${dir} tag -l | xargs git -C ${dir} tag -d`);
		expect(execMock.mock.calls[7][0]).toBe(`git -C ${dir} fetch "https://test-token@github.com/Hello/World.git" --tags > /dev/null 2>&1`);
		expect(execMock.mock.calls[8][0]).toBe(`git -C ${dir} tag v1.2.3`);
		expect(execMock.mock.calls[9][0]).toBe(`git -C ${dir} tag v1`);
		expect(execMock.mock.calls[10][0]).toBe(`git -C ${dir} tag v1.2`);
		expect(execMock.mock.calls[11][0]).toBe(`git -C ${dir} push --tags "https://test-token@github.com/Hello/World.git" "test-branch":"refs/heads/test-branch" > /dev/null 2>&1`);
	});
});
