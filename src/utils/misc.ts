import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {getInput} from '@actions/core' ;
import {Context} from '@actions/github/lib/context';
import {TARGET_EVENT_NAME, TARGET_EVENT_ACTION, DEFAULT_COMMIT_MESSAGE, DEFAULT_CLONE_DEPTH} from '../constant';

export const isTargetEvent = (context: Context) => TARGET_EVENT_NAME === context.eventName && TARGET_EVENT_ACTION === context.payload.action;

export const parseConfig = (content: string) => yaml.safeLoad(Buffer.from(content, 'base64').toString()) || {};

export const isGitCloned = () => fs.existsSync(path.resolve(getWorkspace(), '.git'));

export const getGitUrl = (context: Context) => `https://github.com/${context.repo.owner}/${context.repo.repo}.git`;

export const getBuildCommands = () => {
    const command = getInput('BUILD_COMMAND');
    if ('' === command) return [];
    return [command];
};

export const getCommitMessage = () => getInput('COMMIT_MESSAGE') || DEFAULT_COMMIT_MESSAGE;

export const getCloneDepth = () => getInput('CLONE_DEPTH') || DEFAULT_CLONE_DEPTH;

export const getWorkspace = () => process.env.GITHUB_WORKSPACE || '';
