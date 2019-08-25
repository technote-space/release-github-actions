import fs from 'fs';
import path from 'path';
import nock from 'nock';
import tmp from 'tmp';
import {encodeContent} from '../util';
import {isTargetEvent, parseConfig, getCommitMessage, getCommitName, getCommitEmail, getCloneDepth, getWorkspace, getBuildCommands, isGitCloned, getGitUrl} from '../../src/utils/misc';
import {DEFAULT_COMMIT_MESSAGE, DEFAULT_COMMIT_NAME, DEFAULT_COMMIT_EMAIL, DEFAULT_CLONE_DEPTH} from '../../src/constant';

nock.disableNetConnect();

describe('isTargetEvent', () => {
    it('should return true', () => {
        expect(isTargetEvent({
            payload: {
                action: 'published',
            },
            eventName: 'release',
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
        })).toBeTruthy();
    });

    it('should return false', () => {
        expect(isTargetEvent({
            payload: {
                action: 'published',
            },
            eventName: 'push',
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
        })).toBeFalsy();
    });

    it('should return false', () => {
        expect(isTargetEvent({
            payload: {
                action: 'created',
            },
            eventName: 'release',
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
        })).toBeFalsy();
    });
});

describe('parseConfig', () => {
    it('should parse config', async () => {
        expect(parseConfig(encodeContent(''))).toEqual({});
        expect(parseConfig(encodeContent('a: b'))).toEqual({a: 'b'});
        expect(parseConfig(encodeContent('a:\n  - b\n  - c'))).toEqual({a: ['b', 'c']});
    });
});

describe('getCommitMessage', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV};
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    it('should get commit message', () => {
        process.env.INPUT_COMMIT_MESSAGE = 'test';
        expect(getCommitMessage()).toBe('test');
    });

    it('should get commit default message', () => {
        expect(getCommitMessage()).toBe(DEFAULT_COMMIT_MESSAGE);
    });
});

describe('getCommitName', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV};
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    it('should get commit name', () => {
        process.env.INPUT_COMMIT_NAME = 'test';
        expect(getCommitName()).toBe('test');
    });

    it('should get commit default name', () => {
        expect(getCommitName()).toBe(DEFAULT_COMMIT_NAME);
    });
});

describe('getCommitEmail', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV};
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    it('should get commit email', () => {
        process.env.INPUT_COMMIT_EMAIL = 'test';
        expect(getCommitEmail()).toBe('test');
    });

    it('should get commit default email', () => {
        expect(getCommitEmail()).toBe(DEFAULT_COMMIT_EMAIL);
    });
});

describe('getCloneDepth', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV};
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    it('should get clone depth', () => {
        process.env.INPUT_CLONE_DEPTH = '3';
        expect(getCloneDepth()).toBe('3');
    });

    it('should get default clone depth', () => {
        expect(getCloneDepth()).toBe(DEFAULT_CLONE_DEPTH);
    });
});

describe('getWorkspace', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV};
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    it('should get workspace', () => {
        process.env.GITHUB_WORKSPACE = 'test';
        expect(getWorkspace()).toBe('test');
    });

    it('should not get workspace', () => {
        process.env.GITHUB_WORKSPACE = undefined;
        expect(getWorkspace()).toBe('');
    });
});

describe('getBuildCommands', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV};
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = OLD_ENV;
    });

    it('should get build commands', () => {
        process.env.INPUT_BUILD_COMMAND = 'test';
        expect(getBuildCommands()).toEqual([
            'test',
        ]);
    });

    it('should get empty', () => {
        expect(getBuildCommands()).toEqual([]);
    });
});

describe('isGitCloned', () => {
    const OLD_ENV = process.env;
    let dir;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...OLD_ENV};
        delete process.env.NODE_ENV;
        dir = tmp.dirSync();
    });

    afterEach(() => {
        process.env = OLD_ENV;
        dir.removeCallback();
    });

    it('should return true', () => {
        fs.mkdirSync(path.resolve(dir.name, '.git'));
        process.env.GITHUB_WORKSPACE = dir.name;
        expect(isGitCloned()).toBeTruthy();
    });

    it('should return false', () => {
        process.env.GITHUB_WORKSPACE = dir.name;
        expect(isGitCloned()).toBeFalsy();
    });
});

describe('getGitUrl', () => {
    it('should return git url', () => {
        expect(getGitUrl({
            payload: {
                action: '',
            },
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
                owner: 'Hello',
                repo: 'World',
            },
        })).toBe('https://github.com/Hello/World.git');
    });
});
