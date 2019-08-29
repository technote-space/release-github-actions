import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {getInput} from '@actions/core' ;
import {Context} from '@actions/github/lib/context';
import {
    TARGET_EVENTS,
    DEFAULT_COMMIT_MESSAGE,
    DEFAULT_COMMIT_NAME,
    DEFAULT_COMMIT_EMAIL,
    SEARCH_BUILD_COMMAND_TARGETS,
    DEFAULT_BRANCH_NAME,
    DEFAULT_CLEAN_TARGETS,
    DEFAULT_OUTPUT_BUILD_INFO_FILENAME,
} from '../constant';

export const isTargetEvent = (context: Context): boolean => 'string' === typeof context.payload.action && context.eventName in TARGET_EVENTS && TARGET_EVENTS[context.eventName] === context.payload.action;

export const parseConfig = (content: string): object => yaml.safeLoad(Buffer.from(content, 'base64').toString()) || {};

export const getRepository = (context: Context): string => `${context.repo.owner}/${context.repo.repo}`;

export const getGitUrl = (context: Context): string => {
    const token = getAccessToken();
    return `https://${token}@github.com/${context.repo.owner}/${context.repo.repo}.git`;
};

export const getBuildCommands = (dir: string): readonly string[] => {
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
        commands.push(...getCleanTargets().map(target => `rm -rdf ${target}`));
    }

    return commands;
};

export const getAccessToken = (): string => getInput('ACCESS_TOKEN', {required: true});

export const getCommitMessage = (): string => getInput('COMMIT_MESSAGE') || DEFAULT_COMMIT_MESSAGE;

export const getCommitName = (): string => getInput('COMMIT_NAME') || DEFAULT_COMMIT_NAME;

export const getCommitEmail = (): string => getInput('COMMIT_EMAIL') || DEFAULT_COMMIT_EMAIL;

export const getBranchName = (): string => getInput('BRANCH_NAME') || DEFAULT_BRANCH_NAME;

export const isCreateMajorVersionTag = (): boolean => getBoolValue(getInput('CREATE_MAJOR_VERSION_TAG') || 'true');

export const isCreateMinorVersionTag = (): boolean => getBoolValue(getInput('CREATE_MINOR_VERSION_TAG') || 'true');

export const getOutputBuildInfoFilename = (): string => {
    const filename = (getInput('OUTPUT_BUILD_INFO_FILENAME') || DEFAULT_OUTPUT_BUILD_INFO_FILENAME).trim();
    if (filename.startsWith('/') || filename.includes('..')) return '';
    return filename;
};

export const getBuildVersion = (filepath: string): string | boolean => {
    if (!fs.existsSync(filepath)) {
        return false;
    }

    const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    if (json && 'tagName' in json) {
        return json['tagName'];
    }

    return false;
};

export const getCreateTags = (tagName: string): string[] => {
    const tagNames = [tagName];
    if (isCreateMajorVersionTag()) {
        tagNames.push(getMajorTag(tagName));
    }
    if (isCreateMinorVersionTag()) {
        tagNames.push(getMinorTag(tagName));
    }
    return uniqueArray(tagNames);
};

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

export const uniqueArray = <T>(array: T[]): T[] => [...new Set<T>(array)];

export const isValidTagName = (tagName: string): boolean => /^v?\d+(\.\d+)*$/i.test(tagName);

export const getMajorTag = (tagName: string): string => 'v' + getVersionFragments(tagName).slice(0, 1).join('.');

export const getMinorTag = (tagName: string): string => 'v' + getVersionFragments(tagName).concat(['0']).slice(0, 2).join('.');

const getVersionFragments = (tagName: string): string[] => tagName.trim().replace(/^v?/gi, '').split('.');

const normalizeCommand = (command: string): string => command.trim().replace(/\s{2,}/g, ' ');

const getCleanTargets = (): string[] => [...new Set<string>((getInput('CLEAN_TARGETS') || DEFAULT_CLEAN_TARGETS).split(',').map(target => target.trim()).filter(target => target && !target.startsWith('/') && !target.includes('..')))];

const getBoolValue = (input: string): boolean => !['false', '0'].includes(input.trim().toLowerCase());
