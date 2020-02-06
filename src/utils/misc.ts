import fs from 'fs';
import path from 'path';
import { Context } from '@actions/github/lib/context';
import { Utils, ContextHelper } from '@technote-space/github-action-helper';
import { getInput } from '@actions/core' ;
import {
	DEFAULT_COMMIT_MESSAGE,
	DEFAULT_COMMIT_NAME,
	DEFAULT_COMMIT_EMAIL,
	DEFAULT_SEARCH_BUILD_COMMAND_TARGETS,
	DEFAULT_BRANCH_NAME,
	DEFAULT_OUTPUT_BUILD_INFO_FILENAME,
	DEFAULT_FETCH_DEPTH,
	DEFAULT_TEST_TAG_PREFIX,
	DEFAULT_ORIGINAL_TAG_PREFIX,
} from '../constant';

type CommandType = string | {
	command: string;
	args?: Array<string> | undefined;
	quiet?: boolean | undefined;
	altCommand?: string | undefined;
	suppressError?: boolean | undefined;
	suppressOutput?: boolean | undefined;
	stderrToStdout?: boolean | undefined;
};

const {getWorkspace, getPrefixRegExp, getBoolValue, getArrayInput, uniqueArray, isSemanticVersioningTagName, useNpm, escapeRegExp} = Utils;

const getCleanTargets = (): Array<string> => getArrayInput('CLEAN_TARGETS')
	.map(target => target.replace(/[\x00-\x1f\x80-\x9f]/, '').trim()) // eslint-disable-line no-control-regex
	.filter(target => target && !target.startsWith('/') && !target.includes('..'));

const normalizeCommand = (command: string): string => command.trim().replace(/\s{2,}/g, ' ');

export const getSearchBuildCommandTargets = (): Array<string> => {
	const command = getArrayInput('BUILD_COMMAND_TARGET');
	if (command.length) {
		return command;
	}

	return DEFAULT_SEARCH_BUILD_COMMAND_TARGETS;
};

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
	for (const target of getSearchBuildCommandTargets()) {
		if (target in scripts) {
			return normalizeCommand(target);
		}
	}

	return false;
};

export const getBackupCommands = (buildDir: string, pushDir: string): Array<CommandType> => [
	{
		command: 'mv',
		args: ['-f', path.resolve(buildDir, 'action.yaml'), path.resolve(pushDir, 'action.yml')],
		suppressError: true,
		quiet: true,
	},
	{
		command: 'mv',
		args: ['-f', path.resolve(buildDir, 'action.yml'), path.resolve(pushDir, 'action.yml')],
		suppressError: true,
		quiet: true,
	},
];

export const getRestoreBackupCommands = (buildDir: string, pushDir: string): Array<CommandType> => [
	{
		command: 'mv',
		args: ['-f', path.resolve(pushDir, 'action.yml'), path.resolve(buildDir, 'action.yml')],
		suppressError: true,
		quiet: true,
	},
];

export const getClearFilesCommands = (targets: Array<string>): Array<CommandType> => {
	const commands: Array<CommandType> = [];
	const searchValues                 = '?<>:|"\'@#$%^& ;';
	const replaceValue                 = '$1\\$2';
	const escapeFunc                   = (item: string): string => searchValues.split('').reduce((acc, val) => acc.replace(new RegExp('([^\\\\])(' + escapeRegExp(val) + ')'), replaceValue), item);
	const beginWithDash                = targets.filter(item => item.startsWith('-')).map(escapeFunc);
	const withWildcard                 = targets.filter(item => !item.startsWith('-') && item.includes('*')).map(escapeFunc);
	const withoutWildcard              = targets.filter(item => !item.startsWith('-') && !item.includes('*'));

	if (beginWithDash.length) {
		commands.push(...beginWithDash.map(target => `rm -rdf -- ${target}`));
	}

	if (withWildcard.length) {
		commands.push(...withWildcard.map(target => `rm -rdf ${target}`));
	}

	if (withoutWildcard.length) {
		commands.push({command: 'rm', args: ['-rdf', ...withoutWildcard]});
	}

	return commands;
};

export const getBuildCommands = (buildDir: string, pushDir: string): Array<CommandType> => {
	let commands: Array<CommandType> = getArrayInput('BUILD_COMMAND', false, '&&').map(normalizeCommand);

	const pkgManager        = useNpm(buildDir, getInput('PACKAGE_MANAGER')) ? 'npm' : 'yarn';
	const buildCommand      = detectBuildCommand(buildDir);
	const runSubCommand     = pkgManager === 'npm' ? ' run ' : ' ';
	const hasInstallCommand = !!commands.filter(command => typeof command === 'string' && (command.includes('npm run install') || command.includes(`${pkgManager} install`))).length;

	if (typeof buildCommand === 'string') {
		commands = commands.filter(command => typeof command !== 'string' || !command.startsWith(`npm run ${buildCommand}`) && !command.startsWith(`yarn ${buildCommand}`));
		commands.push([pkgManager, runSubCommand, buildCommand].join(''));
	}

	if (!hasInstallCommand && commands.length) {
		commands.unshift(`${pkgManager} install`);
	}

	if (!hasInstallCommand) {
		if ('npm' === pkgManager) {
			commands.push('rm -rdf node_modules');
		}
		commands.push(`${pkgManager} install --production`);
	}

	commands.push(...getBackupCommands(buildDir, pushDir));
	commands.push(...getClearFilesCommands(getCleanTargets()));
	commands.push(...getRestoreBackupCommands(buildDir, pushDir));

	return commands;
};

export const getCommitMessage = (): string => getInput('COMMIT_MESSAGE') || DEFAULT_COMMIT_MESSAGE;

export const getCommitName = (): string => getInput('COMMIT_NAME') || DEFAULT_COMMIT_NAME;

export const getCommitEmail = (): string => getInput('COMMIT_EMAIL') || DEFAULT_COMMIT_EMAIL;

export const getBranchName = (): string => getInput('BRANCH_NAME') || DEFAULT_BRANCH_NAME;

export const getFetchDepth = (): number => {
	const depth = getInput('FETCH_DEPTH');
	if (depth && /^\d+$/.test(depth)) {
		return parseInt(depth, 10);
	}

	return DEFAULT_FETCH_DEPTH;
};

export const getTestTagPrefix = (): string => getInput('TEST_TAG_PREFIX') || DEFAULT_TEST_TAG_PREFIX;

const getTestTagPrefixRegExp = (): RegExp => getPrefixRegExp(getTestTagPrefix());

export const isTestTag = (tagName: string): boolean => !!getTestTagPrefix() && getTestTagPrefixRegExp().test(tagName);

export const getTestTag = (tagName: string): string => tagName.replace(getTestTagPrefixRegExp(), '');

export const getOriginalTagPrefix = (): string => getInput('ORIGINAL_TAG_PREFIX') || DEFAULT_ORIGINAL_TAG_PREFIX;

export const isCreateMajorVersionTag = (): boolean => getBoolValue(getInput('CREATE_MAJOR_VERSION_TAG') || 'true');

export const isCreateMinorVersionTag = (): boolean => getBoolValue(getInput('CREATE_MINOR_VERSION_TAG') || 'true');

export const isCreatePatchVersionTag = (): boolean => getBoolValue(getInput('CREATE_PATCH_VERSION_TAG') || 'true');

export const isEnabledCleanTestTag = (): boolean => getBoolValue(getInput('CLEAN_TEST_TAG'));

export const getOutputBuildInfoFilename = (): string => {
	const filename = (getInput('OUTPUT_BUILD_INFO_FILENAME') || DEFAULT_OUTPUT_BUILD_INFO_FILENAME).trim();
	if (filename.startsWith('/') || filename.includes('..')) {
		return '';
	}

	return filename;
};

const getVersionFragments = (tagName: string): Array<string> => tagName.trim().replace(/^v?/gi, '').split('.');

type createTagType = (tagName: string) => string;

// eslint-disable-next-line no-magic-numbers
export const getMajorTag = (tagName: string): string => 'v' + getVersionFragments(tagName).slice(0, 1).join('.');

// eslint-disable-next-line no-magic-numbers
export const getMinorTag = (tagName: string): string => 'v' + getVersionFragments(tagName).concat(['0']).slice(0, 2).join('.');

// eslint-disable-next-line no-magic-numbers
export const getPatchTag = (tagName: string): string => 'v' + getVersionFragments(tagName).concat(['0', '0']).slice(0, 3).join('.');

export const isValidTagName = (tagName: string): boolean => isSemanticVersioningTagName(tagName) || (isTestTag(tagName) && isSemanticVersioningTagName(getTestTag(tagName)));

export const getCreateTags = (tagName: string): Array<string> => {
	const settings  = [
		{condition: isCreateMajorVersionTag, createTag: getMajorTag},
		{condition: isCreateMinorVersionTag, createTag: getMinorTag},
		{condition: isCreatePatchVersionTag, createTag: getPatchTag},
	];
	const createTag = isTestTag(tagName) ? (create: createTagType): string => getTestTagPrefix() + create(getTestTag(tagName)) : (create: createTagType): string => create(tagName);

	return uniqueArray(settings.filter(setting => setting.condition()).map(setting => createTag(setting.createTag)).concat(tagName)).sort().reverse();
};

export const getParams = (): { workDir: string; buildDir: string; pushDir: string; branchName: string } => {
	const workDir    = path.resolve(getWorkspace(), '.work');
	const buildDir   = path.resolve(workDir, 'build');
	const pushDir    = path.resolve(workDir, 'push');
	const branchName = getBranchName();
	return {workDir, buildDir, pushDir, branchName};
};

export const getReplaceDirectory = (): object => {
	const {workDir, buildDir, pushDir} = getParams();
	return {
		[buildDir]: '<Build Directory>',
		[pushDir]: '<Push Directory>',
		[workDir]: '<Working Directory>',
	};
};

export const isValidContext = (context: Context): boolean => isValidTagName(ContextHelper.getTagName(context));
