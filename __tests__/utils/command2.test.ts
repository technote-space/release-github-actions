/* eslint-disable no-magic-numbers */
import global from '../global';
import nock from 'nock';
import { GitHub } from '@actions/github' ;
import {
	updateRelease,
	deploy,
} from '../../src/utils/command';

import { getContext, testEnv, disableNetConnect, getApiFixture } from '../util';

describe('updateRelease', () => {
	disableNetConnect(nock);

	it('should do nothing', async() => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		nock('https://api.github.com')
			.get('/repos/Hello/World/releases')
			.reply(200, () => {
				fn1();
				return getApiFixture('repos.listReleases1');
			})
			.patch('/repos/Hello/World/releases/1')
			.reply(200, () => {
				fn2();
				return getApiFixture('repos.updateRelease');
			});

		await updateRelease('v1.2.3', new GitHub(''), getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		expect(fn1).toBeCalledTimes(1);
		expect(fn2).not.toBeCalled();
	});

	it('should update release', async() => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		nock('https://api.github.com')
			.get('/repos/Hello/World/releases')
			.reply(200, () => {
				fn1();
				return getApiFixture('repos.listReleases2');
			})
			.patch('/repos/Hello/World/releases/1', body => {
				console.log(body);
				return body;
			})
			.reply(200, () => {
				fn2();
				return getApiFixture('repos.updateRelease');
			});

		await updateRelease('v1.2.3', new GitHub(''), getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
		}));

		expect(fn1).toBeCalledTimes(1);
		expect(fn2).toBeCalledTimes(1);
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
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		nock('https://api.github.com')
			.get('/repos/Hello/World/releases')
			.reply(200, () => {
				fn1();
				return getApiFixture('repos.listReleases2');
			})
			.patch('/repos/Hello/World/releases/1', body => {
				console.log(body);
				return body;
			})
			.reply(200, () => {
				fn2();
				return getApiFixture('repos.updateRelease');
			});

		await deploy('v1.2.3', new GitHub(''), getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
			sha: 'test-sha',
		}));

		expect(execMock).toBeCalled();
		expect(fn1).toBeCalledTimes(0);
		expect(fn2).toBeCalledTimes(0);
	});

	it('should commit', async() => {
		process.env.INPUT_ACCESS_TOKEN = 'test-token';
		global.mockChildProcess.stdout = 'A test.txt';
		const execMock = jest.spyOn(global.mockChildProcess, 'exec');
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		nock('https://api.github.com')
			.get('/repos/Hello/World/releases')
			.reply(200, () => {
				fn1();
				return getApiFixture('repos.listReleases2');
			})
			.patch('/repos/Hello/World/releases/1', body => {
				console.log(body);
				return body;
			})
			.reply(200, () => {
				fn2();
				return getApiFixture('repos.updateRelease');
			});

		await deploy('v1.2.3', new GitHub(''), getContext({
			repo: {
				owner: 'Hello',
				repo: 'World',
			},
			ref: 'refs/heads/test',
			sha: 'test-sha',
		}));

		expect(execMock).toBeCalled();
		expect(fn1).toBeCalledTimes(1);
		expect(fn2).toBeCalledTimes(1);
	});
});
