import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {getInput} from '@actions/core' ;
import {Context} from '@actions/github/lib/context';
import {TARGET_EVENT_NAME, TARGET_EVENT_ACTION, DEFAULT_COMMIT_MESSAGE, DEFAULT_COMMIT_NAME, DEFAULT_COMMIT_EMAIL, SEARCH_BUILD_COMMAND_TARGETS} from '../constant';

export const isTargetEvent = (context: Context): boolean => TARGET_EVENT_NAME === context.eventName && TARGET_EVENT_ACTION === context.payload.action;

export const parseConfig = (content: string): object => yaml.safeLoad(Buffer.from(content, 'base64').toString()) || {};

export const getRepository = (context: Context): string => `${context.repo.owner}/${context.repo.repo}`;

export const getGitUrl = (context: Context): string => {
    const token = getAccessToken();
    return `https://${token}@github.com/${context.repo.owner}/${context.repo.repo}.git`;
};

export const getBuildCommands = (dir: string): string[] => {
    const command = getInput('BUILD_COMMAND');
    let commands = '' === command ? [] : command.split('&&').map(normalizeCommand);

    const buildCommand = detectBuildCommand(dir);
    const hasInstallCommand = commands.filter(command => command.includes('npm run install') || command.includes('yarn install')).length > 0;

    if (typeof buildCommand === 'string') {
        commands = commands.filter(command => !command.startsWith(`npm run ${buildCommand}`) && !command.startsWith(`yarn ${buildCommand}`));
        commands.push(`yarn ${buildCommand}`);
    }

    if (!hasInstallCommand && commands.length > 0) {
        commands.unshift('yarn install');
    }

    if (!hasInstallCommand) {
        commands.push('yarn install --production');
    }

    if ('' === command) {
        commands.push('rm -rdf .github');
    }

    return commands;
};

export const getAccessToken = (): string => getInput('ACCESS_TOKEN', {required: true});

export const getCommitMessage = (): string => getInput('COMMIT_MESSAGE') || DEFAULT_COMMIT_MESSAGE;

export const getCommitName = (): string => getInput('COMMIT_NAME') || DEFAULT_COMMIT_NAME;

export const getCommitEmail = (): string => getInput('COMMIT_EMAIL') || DEFAULT_COMMIT_EMAIL;

export const getWorkspace = (): string => process.env.GITHUB_WORKSPACE || '';

export const detectBuildCommand = (dir: string): boolean | string => {
    const packageFile = path.resolve(dir, 'package.json');
    if (!fs.existsSync(packageFile)) {
        return false;
    }

    const parsed = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    if (!('scripts' in parsed)) {
        return false;
    }

    const scripts = parsed['scripts'];
    for (const target of SEARCH_BUILD_COMMAND_TARGETS) {
        if (target in scripts) return normalizeCommand(target);
    }

    return false;
};

const normalizeCommand = (command: string): string => command.trim().replace(/\s{2,}/g, ' ');
