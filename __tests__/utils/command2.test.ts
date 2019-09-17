/* eslint-disable no-magic-numbers */
import global from '../global';
import nock from 'nock';
import { GitHub } from '@actions/github' ;
import {
	updateRelease,
	deploy,
} from '../../src/utils/command';

import { getContext, testEnv, disableNetConnect, getApiFixture } from '../util';

const common = async(callback: Function, isExist: boolean, method: (string, GitHub, Context) => Promise<void>): Promise<void> => {
	const execMock = jest.spyOn(global.mockChildProcess, 'exec');
	const fn1 = jest.fn();
	const fn2 = jest.fn();
	nock('https://api.github.com')
		.get('/repos/Hello/World/releases')
		.reply(200, () => {
			fn1();
			return getApiFixture(isExist ? 'repos.listReleases2' : 'repos.listReleases1');
		})
		.patch('/repos/Hello/World/releases/1', body => {
			expect(body).toHaveProperty('draft');
			expect(body.draft).toBeFalsy();
			return body;
		})
		.reply(200, () => {
			fn2();
			return getApiFixture('repos.updateRelease');
		});

	await method('v1.2.3', new GitHub(''), getContext({
		repo: {
			owner: 'Hello',
			repo: 'World',
		},
		ref: 'refs/heads/test',
		sha: 'test-sha',
	}));

	callback(fn1, fn2, execMock);
};

describe('updateRelease', () => {
	disableNetConnect(nock);

	it('should do nothing', async() => {
		await common((fn1, fn2) => {
			expect(fn1).toBeCalledTimes(1);
			expect(fn2).not.toBeCalled();
		}, false, updateRelease);
	});

	it('should update release', async() => {
		await common((fn1, fn2) => {
			expect(fn1).toBeCalledTimes(1);
			expect(fn2).toBeCalledTimes(1);
		}, true, updateRelease);
	});
});

describe('deploy', () => {
	disableNetConnect(nock);
	testEnv();

	beforeAll(() => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const fs = require('fs');
		jest.spyOn(fs, 'writeFileSync').mockImplementation(jest.fn());
		jest.spyOn(fs, 'mkdirSync').mockImplementation(jest.fn());
		jest.spyOn(fs, 'existsSync').mockImplementation(() => false);
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	afterEach(() => {
		global.mockChildProcess.stdout = 'stdout';
	});

	it('should not commit', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		global.mockChildProcess.stdout = '';

		await common((fn1, fn2, execMock) => {
			expect(execMock).toBeCalled();
			expect(fn1).toBeCalledTimes(0);
			expect(fn2).toBeCalledTimes(0);
		}, true, deploy);
	});

	it('should commit', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		global.mockChildProcess.stdout = 'A test.txt';

		await common((fn1, fn2, execMock) => {
			expect(execMock).toBeCalled();
			expect(fn1).toBeCalledTimes(1);
			expect(fn2).toBeCalledTimes(1);
		}, true, deploy);
	});
});
