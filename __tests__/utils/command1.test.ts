/* eslint-disable no-magic-numbers */
import global from '../global';
import {
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
		const consoleLogMock = jest.spyOn(console, 'log');
		const consoleErrorMock = jest.spyOn(console, 'error');

		const callback = execCallback('test', 'alt', false, false, resolve, reject);
		callback(null, 'stdout', '');
		expect(resolve).toBeCalledWith('stdout');
		expect(reject).not.toBeCalled();
		expect(consoleLogMock).toBeCalledWith('stdout');
		expect(consoleErrorMock).not.toBeCalled();
	});

	it('should output error', () => {
		const resolve = jest.fn();
		const reject = jest.fn();
		const consoleLogMock = jest.spyOn(console, 'log');
		const consoleErrorMock = jest.spyOn(console, 'error');

		const callback = execCallback('test', 'alt', false, false, resolve, reject);
		callback(null, 'stdout', 'stderr');
		expect(resolve).toBeCalledWith('stdout');
		expect(reject).not.toBeCalled();
		expect(consoleLogMock).toBeCalledWith('stdout');
		expect(consoleErrorMock).toBeCalledWith('stderr');
	});
});

describe('execAsync', () => {
	it('should show run command', async() => {
		const infoCount = global.mockSignale.info.mock.calls.length;
		await execAsync({command: 'test'});
		expect(global.mockSignale.info.mock.calls.length).toBe(infoCount + 1);
	});

	it('should show run alt command', async() => {
		const infoCount = global.mockSignale.info.mock.calls.length;
		await execAsync({command: 'test', altCommand: 'alt'});
		expect(global.mockSignale.info.mock.calls.length).toBe(infoCount + 1);
	});

	it('should not show run command', async() => {
		const infoCount = global.mockSignale.info.mock.calls.length;
		await execAsync({command: 'test', quiet: true});
		expect(global.mockSignale.info.mock.calls.length).toBe(infoCount);
	});
});

describe('cloneForBranch', () => {
	testEnv();

	it('should run clone command', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await cloneForBranch('test-dir', 'test-branch', getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		expect(execMock).toBeCalledTimes(1);
		expect(execMock.mock.calls[0][0]).toBe('git -C test-dir clone --quiet --branch=test-branch --depth=3 https://test-token@github.com/Hello/World.git . > /dev/null 2>&1 || :');
	});
});

describe('checkBranch', () => {
	testEnv();

	it('should do nothing', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await checkBranch('test-dir', 'test-branch', 'test-branch');

		expect(execMock).not.toBeCalled();
	});

	it('should run git init command', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await checkBranch('test-dir', 'test-branch', 'test-branch2');

		expect(execMock).toBeCalledTimes(3);
		expect(execMock.mock.calls[0][0]).toBe('rm -rdf test-dir');
		expect(execMock.mock.calls[1][0]).toBe('git -C test-dir init .');
		expect(execMock.mock.calls[2][0]).toBe('git -C test-dir checkout --orphan "test-branch"');
	});
});

describe('prepareFiles', () => {
	testEnv();

	it('should run commands', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await prepareFiles('test-build-dir', 'test-push-dir', 'v1.2.3', getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
			sha: 'test-sha',
		}));

		expect(execMock).toBeCalledTimes(12);
		expect(execMock.mock.calls[0][0]).toBe('git -C test-build-dir clone --depth=3 https://test-token@github.com/Hello/World.git . > /dev/null 2>&1');
		expect(execMock.mock.calls[1][0]).toBe('git -C test-build-dir fetch "https://test-token@github.com/Hello/World.git" refs/heads/test > /dev/null 2>&1');
		expect(execMock.mock.calls[2][0]).toBe('git -C test-build-dir checkout -qf test-sha');

		expect(execMock.mock.calls[3][0]).toBe('yarn install --production');
		expect(execMock.mock.calls[3][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[4][0]).toBe('rm -rdf .[!.]*');
		expect(execMock.mock.calls[4][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[5][0]).toBe('rm -rdf __tests__');
		expect(execMock.mock.calls[5][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[6][0]).toBe('rm -rdf src');
		expect(execMock.mock.calls[6][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[7][0]).toBe('rm -rdf *.js');
		expect(execMock.mock.calls[7][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[8][0]).toBe('rm -rdf *.ts');
		expect(execMock.mock.calls[8][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[9][0]).toBe('rm -rdf *.json');
		expect(execMock.mock.calls[9][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[10][0]).toBe('rm -rdf *.lock');
		expect(execMock.mock.calls[10][1]).toEqual({cwd: 'test-build-dir'});
		expect(execMock.mock.calls[11][0]).toBe('rm -rdf _config.yml');
		expect(execMock.mock.calls[11][1]).toEqual({cwd: 'test-build-dir'});
	});
});

describe('createBuildInfoFile', () => {
	testEnv();

	it('should do nothing', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = '/';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock = jest.spyOn(require('fs'), 'writeFileSync');

		await createBuildInfoFile('test-build-dir', 'v1.2.3', 'test-branch');

		expect(writeMock).not.toBeCalled();
	});

	it('should write file', async() => {
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = 'info.json';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mkdirMock = jest.spyOn(require('fs'), 'mkdirSync');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock = jest.spyOn(require('fs'), 'writeFileSync');

		await createBuildInfoFile('test-build-dir', 'v1.2.3', 'test-branch');

		expect(mkdirMock).toBeCalledTimes(1);
		expect(writeMock).toBeCalledTimes(1);
	});

	it('should not create dir', async() => {
		exists = true;
		process.env.INPUT_OUTPUT_BUILD_INFO_FILENAME = 'info.json';
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mkdirMock = jest.spyOn(require('fs'), 'mkdirSync');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const writeMock = jest.spyOn(require('fs'), 'writeFileSync');

		await createBuildInfoFile('test-build-dir', 'v1.2.3', 'test-branch');

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

		expect(await getCurrentBranchName('test-push-dir')).toBe('');
	});

	it('should return branch name', async() => {
		global.mockChildProcess.stdout = 'test-branch';
		exists = true;

		expect(await getCurrentBranchName('test-push-dir')).toBe('test-branch');
	});
});

describe('copyFiles', () => {
	it('should run rsync command', async() => {
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await copyFiles('test-build-dir', 'test-push-dir');

		expect(execMock).toBeCalledTimes(1);
		expect(execMock.mock.calls[0][0]).toBe('rsync -rl --exclude .git --delete "test-build-dir/" test-push-dir');
	});
});

describe('config', () => {
	it('should run git config command', async() => {
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await config('test-push-dir');

		expect(execMock).toBeCalledTimes(2);
		expect(execMock.mock.calls[0][0]).toBe('git -C test-push-dir config user.name "GitHub Actions"');
		expect(execMock.mock.calls[1][0]).toBe('git -C test-push-dir config user.email "example@example.com"');
	});
});

describe('commit', () => {
	afterEach(() => {
		global.mockChildProcess.stdout = 'stdout';
	});

	it('should return false if there is no diff', async() => {
		global.mockChildProcess.stdout = '';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');
		const consoleLogMock = jest.spyOn(console, 'log');

		await commit('test-push-dir');

		expect(execMock).toBeCalledTimes(2);
		expect(execMock.mock.calls[0][0]).toBe('git -C test-push-dir add --all --force');
		expect(execMock.mock.calls[1][0]).toBe('git -C test-push-dir status --short -uno');
		expect(consoleLogMock).toBeCalledTimes(1);
	});

	it('should return true', async() => {
		global.mockChildProcess.stdout = 'A test.txt';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');
		const consoleLogMock = jest.spyOn(console, 'log');

		await commit('test-push-dir');

		expect(execMock).toBeCalledTimes(4);
		expect(execMock.mock.calls[0][0]).toBe('git -C test-push-dir add --all --force');
		expect(execMock.mock.calls[1][0]).toBe('git -C test-push-dir status --short -uno');
		expect(execMock.mock.calls[2][0]).toBe('git -C test-push-dir commit -qm "feat: Build for release"');
		expect(execMock.mock.calls[3][0]).toBe('git -C test-push-dir show --stat-count=10 HEAD');
		expect(consoleLogMock).toBeCalledTimes(3);
	});
});

describe('push', () => {
	testEnv();

	it('should run git push command', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');

		await push('test-push-dir', 'v1.2.3', 'test-branch', getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		expect(execMock).toBeCalledTimes(9);
		expect(execMock.mock.calls[0][0]).toBe('git -C test-push-dir push --delete "https://test-token@github.com/Hello/World.git" tag v1.2.3 > /dev/null 2>&1 || :');
		expect(execMock.mock.calls[1][0]).toBe('git -C test-push-dir push --delete "https://test-token@github.com/Hello/World.git" tag v1 > /dev/null 2>&1 || :');
		expect(execMock.mock.calls[2][0]).toBe('git -C test-push-dir push --delete "https://test-token@github.com/Hello/World.git" tag v1.2 > /dev/null 2>&1 || :');
		expect(execMock.mock.calls[3][0]).toBe('git -C test-push-dir tag -l | xargs git -C test-push-dir tag -d');
		expect(execMock.mock.calls[4][0]).toBe('git -C test-push-dir fetch "https://test-token@github.com/Hello/World.git" --tags > /dev/null 2>&1');
		expect(execMock.mock.calls[5][0]).toBe('git -C test-push-dir tag v1.2.3');
		expect(execMock.mock.calls[6][0]).toBe('git -C test-push-dir tag v1');
		expect(execMock.mock.calls[7][0]).toBe('git -C test-push-dir tag v1.2');
		expect(execMock.mock.calls[8][0]).toBe('git -C test-push-dir push --quiet --tags "https://test-token@github.com/Hello/World.git" "test-branch":"refs/heads/test-branch" > /dev/null 2>&1');
	});
});
