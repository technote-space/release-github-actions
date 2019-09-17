import { Context } from '@actions/github/lib/context';
import fs from 'fs';
import path from 'path';

export const encodeContent = (content: string): string => Buffer.from(content).toString('base64');

export const testEnv = (): void => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = {...OLD_ENV};
		delete process.env.NODE_ENV;
	});

	afterEach(() => {
		process.env = OLD_ENV;
	});
};

export const getContext = (override: object): Context => Object.assign({
	payload: {},
	eventName: '',
	sha: '',
	ref: '',
	workflow: '',
	action: '',
	actor: '',
	issue: {
		owner: '',
		repo: '',
		number: 1,
	},
	repo: {
		owner: '',
		repo: '',
	},
}, override);

export const getApiFixture = (name: string): object => JSON.parse(fs.readFileSync(path.resolve(__dirname, `./fixtures/${name}.json`)).toString());

export const disableNetConnect = (nock): void => {
	beforeEach(() => {
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});
};
