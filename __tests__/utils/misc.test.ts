import nock from 'nock';
import tmp from 'tmp';
import {encodeContent} from '../util';
import {isTargetEvent, parseConfig, getWorkspace, getCommitMessage, getBuildCommands, isGitCloned, getGitUrl} from '../../src/utils/misc';
import {DEFAULT_COMMIT_MESSAGE} from '../../src/constant';

const fs = require('fs');
const path = require('path');

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

    it('should return workspace', () => {
        process.env.INPUT_GITHUB_WORKSPACE = 'test';
        expect(getWorkspace()).toBe('test');
    });

    it('should throw error', () => {
        const fn = jest.fn();
        try {
            expect(getWorkspace()).toBe('test');
        } catch (error) {
            fn();
            expect(error.message).toBe('Input required and not supplied: GITHUB_WORKSPACE');
        }
        expect(fn).toBeCalled();
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
        process.env.INPUT_GITHUB_WORKSPACE = dir.name;
        expect(isGitCloned()).toBeTruthy();
    });

    it('should return false', () => {
        process.env.INPUT_GITHUB_WORKSPACE = dir.name;
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
