import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import memize from 'memize';
import { Context } from '@actions/github/lib/context';
import { Utils, ContextHelper } from '@technote-space/github-action-helper';
import { getInput } from '@actions/core' ;
import { DEFAULT_FETCH_DEPTH } from '../constant';

type CommandType = string | {
	command: string;
	args?: Array<string> | undefined;
	quiet?: boolean | undefined;
	altCommand?: string | undefined;
	suppressError?: boolean | undefined;
	suppressOutput?: boolean | undefined;
	stderrToStdout?: boolean | undefined;
};

const getCleanTargets = (): Array<string> => Utils.getArrayInput('CLEAN_TARGETS')
	.map(target => target.replace(/[\x00-\x1f\x80-\x9f]/, '').trim()) // eslint-disable-line no-control-regex
	.filter(target => target && !target.startsWith('/') && !target.includes('..'));

export const getSearchBuildCommandTargets = (): Array<string> => Utils.getArrayInput('BUILD_COMMAND_TARGET', true);

export const detectBuildCommand = (dir: string): boolean | string => {
	const packageFile = resolve(dir, 'package.json');
	if (!existsSync(packageFile)) {
		return false;
	}

	const parsed = JSON.parse(readFileSync(packageFile, 'utf8'));
	if (!('scripts' in parsed)) {
		return false;
	}

	const scripts = parsed['scripts'];
	for (const target of getSearchBuildCommandTargets()) {
		if (target in scripts) {
			return target;
		}
	}

	return false;
};

export const getBackupCommands = (buildDir: string, pushDir: string): Array<CommandType> => [
	{
		command: 'mv',
		args: ['-f', resolve(buildDir, 'action.yaml'), resolve(pushDir, 'action.yml')],
		suppressError: true,
		quiet: true,
	},
	{
		command: 'mv',
		args: ['-f', resolve(buildDir, 'action.yml'), resolve(pushDir, 'action.yml')],
		suppressError: true,
		quiet: true,
	},
];

export const getRestoreBackupCommands = (buildDir: string, pushDir: string): Array<CommandType> => [
	{
		command: 'mv',
		args: ['-f', resolve(pushDir, 'action.yml'), resolve(buildDir, 'action.yml')],
		suppressError: true,
		quiet: true,
	},
];

export const getClearFilesCommands = (targets: Array<string>): Array<CommandType> => {
	const commands: Array<CommandType> = [];
	const searchValues                 = '?<>:|"\'@#$%^& ;';
	const replaceValue                 = '$1\\$2';
	const escapeFunc                   = (item: string): string => searchValues.split('').reduce((acc, val) => acc.replace(new RegExp('([^\\\\])(' + Utils.escapeRegExp(val) + ')'), replaceValue), item);
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
	let commands: Array<CommandType> = Utils.getArrayInput('BUILD_COMMAND', false, '&&');

	const pkgManager        = Utils.useNpm(buildDir, getInput('PACKAGE_MANAGER')) ? 'npm' : 'yarn';
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

export const getCommitMessage = (): string => getInput('COMMIT_MESSAGE', {required: true});

export const getCommitName = (): string => getInput('COMMIT_NAME', {required: true});

export const getCommitEmail = (): string => getInput('COMMIT_EMAIL', {required: true});

export const getBranchName = (): string => getInput('BRANCH_NAME', {required: true});

export const getFetchDepth = (): number => {
	const depth = getInput('FETCH_DEPTH');
	if (depth && /^\d+$/.test(depth)) {
		return parseInt(depth, 10);
	}

	return DEFAULT_FETCH_DEPTH;
};

export const getTestTagPrefix = (): string => getInput('TEST_TAG_PREFIX');

const getTestTagPrefixRegExp = (): RegExp => Utils.getPrefixRegExp(getTestTagPrefix());

export const isTestTag = (tagName: string): boolean => !!getTestTagPrefix() && getTestTagPrefixRegExp().test(tagName);

export const getTestTag = (tagName: string): string => tagName.replace(getTestTagPrefixRegExp(), '');

export const getOriginalTagPrefix = (): string => getInput('ORIGINAL_TAG_PREFIX');

export const isCreateMajorVersionTag = (): boolean => Utils.getBoolValue(getInput('CREATE_MAJOR_VERSION_TAG') || 'true');

export const isCreateMinorVersionTag = (): boolean => Utils.getBoolValue(getInput('CREATE_MINOR_VERSION_TAG') || 'true');

export const isCreatePatchVersionTag = (): boolean => Utils.getBoolValue(getInput('CREATE_PATCH_VERSION_TAG') || 'true');

export const isEnabledCleanTestTag = (): boolean => Utils.getBoolValue(getInput('CLEAN_TEST_TAG'));

export const getOutputBuildInfoFilename = (): string => {
	const filename = getInput('OUTPUT_BUILD_INFO_FILENAME');
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

export const isValidTagName = (tagName: string): boolean => Utils.isSemanticVersioningTagName(tagName) || (isTestTag(tagName) && Utils.isSemanticVersioningTagName(getTestTag(tagName)));

export const getCreateTags = (tagName: string): Array<string> => {
	const settings  = [
		{condition: isCreateMajorVersionTag, createTag: getMajorTag},
		{condition: isCreateMinorVersionTag, createTag: getMinorTag},
		{condition: isCreatePatchVersionTag, createTag: getPatchTag},
	];
	const createTag = isTestTag(tagName) ? (create: createTagType): string => getTestTagPrefix() + create(getTestTag(tagName)) : (create: createTagType): string => create(tagName);

	return Utils.uniqueArray(settings.filter(setting => setting.condition()).map(setting => createTag(setting.createTag)).concat(tagName)).sort().reverse();
};

const params = (context: Context): { workDir: string; buildDir: string; pushDir: string; branchName: string; tagName: string } => {
	const workDir    = resolve(Utils.getWorkspace(), '.work');
	const buildDir   = resolve(workDir, 'build');
	const pushDir    = resolve(workDir, 'push');
	const tagName    = ContextHelper.getTagName(context);
	const branchName = getBranchName();
	return {workDir, buildDir, pushDir, branchName, tagName};
};

export const getParams = memize(params);

export const getReplaceDirectory = (context: Context): object => {
	const {workDir, buildDir, pushDir} = getParams(context);
	return {
		[buildDir]: '<Build Directory>',
		[pushDir]: '<Push Directory>',
		[workDir]: '<Working Directory>',
	};
};

export const isValidContext = (context: Context): boolean => isValidTagName(getParams(context).tagName);
