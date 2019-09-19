import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getInput } from '@actions/core' ;
import { Context } from '@actions/github/lib/context';
import {
	TARGET_EVENTS,
	DEFAULT_COMMIT_MESSAGE,
	DEFAULT_COMMIT_NAME,
	DEFAULT_COMMIT_EMAIL,
	SEARCH_BUILD_COMMAND_TARGETS,
	DEFAULT_BRANCH_NAME,
	DEFAULT_CLEAN_TARGETS,
	DEFAULT_OUTPUT_BUILD_INFO_FILENAME,
	DEFAULT_FETCH_DEPTH,
	DEFAULT_TEST_TAG_PREFIX,
	DEFAULT_ORIGINAL_TAG_PREFIX,
} from '../constant';

export const isTargetEventName = (events: object, context: Context): boolean => context.eventName in events;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isTargetEventAction = (action: string | any[] | Function, context: Context): boolean => {
	if (Array.isArray(action)) {
		return action.some(item => isTargetEventAction(item, context));
	}
	if (typeof action === 'function') {
		return action(context);
	}
	return '*' === action || context.payload.action === action;
};

export const isTargetEvent = (context: Context): boolean => isTargetEventName(TARGET_EVENTS, context) && isTargetEventAction(TARGET_EVENTS[context.eventName], context);

export const isRelease = (context: Context): boolean => 'release' === context.eventName;

export const parseConfig = (content: string): object => yaml.safeLoad(Buffer.from(content, 'base64').toString()) || {};

export const getRepository = (context: Context): string => `${context.repo.owner}/${context.repo.repo}`;

export const getAccessToken = (): string => getInput('ACCESS_TOKEN', {required: true});

export const getGitUrl = (context: Context): string => {
	const token = getAccessToken();
	return `https://${token}@github.com/${context.repo.owner}/${context.repo.repo}.git`;
};

const getCleanTargets = (): string[] => [...new Set<string>((getInput('CLEAN_TARGETS') || DEFAULT_CLEAN_TARGETS).split(',').map(target => target.trim()).filter(target => target && !target.startsWith('/') && !target.includes('..')))];

const normalizeCommand = (command: string): string => command.trim().replace(/\s{2,}/g, ' ');

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
		if (target in scripts) {
			return normalizeCommand(target);
		}
	}

	return false;
};

export const getBuildCommands = (dir: string): readonly string[] => {
	const command = getInput('BUILD_COMMAND');
	let commands = '' === command ? [] : command.split('&&').map(normalizeCommand);

	const buildCommand = detectBuildCommand(dir);
	// eslint-disable-next-line no-magic-numbers
	const hasInstallCommand = commands.filter(command => command.includes('npm run install') || command.includes('yarn install')).length > 0;

	if (typeof buildCommand === 'string') {
		commands = commands.filter(command => !command.startsWith(`npm run ${buildCommand}`) && !command.startsWith(`yarn ${buildCommand}`));
		commands.push(`yarn ${buildCommand}`);
	}

	// eslint-disable-next-line no-magic-numbers
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

export const getCommitMessage = (): string => getInput('COMMIT_MESSAGE') || DEFAULT_COMMIT_MESSAGE;

export const getCommitName = (): string => getInput('COMMIT_NAME') || DEFAULT_COMMIT_NAME;

export const getCommitEmail = (): string => getInput('COMMIT_EMAIL') || DEFAULT_COMMIT_EMAIL;

export const getBranchName = (): string => getInput('BRANCH_NAME') || DEFAULT_BRANCH_NAME;

export const getFetchDepth = (): string => {
	const depth = getInput('FETCH_DEPTH');
	if (depth && /^\d+$/.test(depth)) {
		return depth;
	}
	return DEFAULT_FETCH_DEPTH;
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getTestTagPrefix = (): string => getInput('TEST_TAG_PREFIX') || DEFAULT_TEST_TAG_PREFIX;

const getTestTagPrefixRegExp = (): RegExp => new RegExp('^' + escapeRegExp(getTestTagPrefix()));

export const isTestTag = (tagName: string): boolean => !!getTestTagPrefix() && getTestTagPrefixRegExp().test(tagName);

export const getTestTag = (tagName: string): string => tagName.replace(getTestTagPrefixRegExp(), '');

export const getOriginalTagPrefix = (): string => getInput('ORIGINAL_TAG_PREFIX') || DEFAULT_ORIGINAL_TAG_PREFIX;

const getBoolValue = (input: string): boolean => !['false', '0'].includes(input.trim().toLowerCase());

export const isCreateMajorVersionTag = (): boolean => getBoolValue(getInput('CREATE_MAJOR_VERSION_TAG') || 'true');

export const isCreateMinorVersionTag = (): boolean => getBoolValue(getInput('CREATE_MINOR_VERSION_TAG') || 'true');

export const getOutputBuildInfoFilename = (): string => {
	const filename = (getInput('OUTPUT_BUILD_INFO_FILENAME') || DEFAULT_OUTPUT_BUILD_INFO_FILENAME).trim();
	if (filename.startsWith('/') || filename.includes('..')) {
		return '';
	}
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

export const uniqueArray = <T>(array: T[]): T[] => [...new Set<T>(array)];

const getVersionFragments = (tagName: string): string[] => tagName.trim().replace(/^v?/gi, '').split('.');

// eslint-disable-next-line no-magic-numbers
export const getMajorTag = (tagName: string): string => 'v' + getVersionFragments(tagName).slice(0, 1).join('.');

// eslint-disable-next-line no-magic-numbers
export const getMinorTag = (tagName: string): string => 'v' + getVersionFragments(tagName).concat(['0']).slice(0, 2).join('.');

export const isSemanticVersioningTagName = (tagName: string): boolean => /^v?\d+(\.\d+)*$/i.test(tagName);

export const isValidTagName = (tagName: string): boolean => isSemanticVersioningTagName(tagName) || (isTestTag(tagName) && isSemanticVersioningTagName(getTestTag(tagName)));

export const getCreateTags = (tagName: string): string[] => {
	const tagNames = [tagName];
	if (isTestTag(tagName)) {
		if (isCreateMajorVersionTag()) {
			tagNames.push(getTestTagPrefix() + getMajorTag(getTestTag(tagName)));
		}
		if (isCreateMinorVersionTag()) {
			tagNames.push(getTestTagPrefix() + getMinorTag(getTestTag(tagName)));
		}
	} else {
		if (isCreateMajorVersionTag()) {
			tagNames.push(getMajorTag(tagName));
		}
		if (isCreateMinorVersionTag()) {
			tagNames.push(getMinorTag(tagName));
		}
	}
	return uniqueArray(tagNames);
};

export const getWorkspace = (): string => process.env.GITHUB_WORKSPACE || '';

export const getTagName = (context: Context): string => isRelease(context) ? context.payload.release.tag_name : context.ref.replace(/^refs\/tags\//, '');
