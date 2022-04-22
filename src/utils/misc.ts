import type { Context } from '@actions/github/lib/context';
import fs from 'fs';
import { resolve } from 'path';
import { getInput } from '@actions/core' ;
import { Utils, ContextHelper } from '@technote-space/github-action-helper';
import memize from 'memize';
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

export const detectBuildCommands = (dir: string, runCommand: string, commands: Array<string>): Array<string> => {
  const packageFile = resolve(dir, 'package.json');
  if (!fs.existsSync(packageFile)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  if (!('scripts' in parsed)) {
    return [];
  }

  const scripts = parsed['scripts'];
  const targets = Array<string>();
  for (const target of getSearchBuildCommandTargets()) {
    if (target in scripts && !commands.includes(`${runCommand}${target}`)) {
      targets.push(target);
    }
  }

  // eslint-disable-next-line no-magic-numbers
  return Utils.getBoolValue(getInput('ALLOW_MULTIPLE_BUILD_COMMANDS')) ? targets : targets.slice(0, 1);
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
    commands.push({ command: 'rm', args: ['-rdf', ...withoutWildcard] });
  }

  return commands;
};

export const getBuildCommands = (buildDir: string, pushDir: string): Array<CommandType> => {
  const commands: Array<string> = Utils.getArrayInput('BUILD_COMMAND', false, '&&').map(command => command.replace(/\s{2,}/g, ' '));
  const pkgManager              = Utils.useNpm(buildDir, getInput('PACKAGE_MANAGER')) ? 'npm' : 'yarn';
  const runSubCommand           = pkgManager === 'npm' ? ' run ' : ' ';
  const runCommand              = [pkgManager, runSubCommand].join('');
  const hasInstallCommand       = !!commands.filter(command => command.includes(`${runCommand}install`)).length;
  const buildCommands           = detectBuildCommands(buildDir, runCommand, commands);
  const deleteNodeModules       = Utils.getBoolValue(getInput('DELETE_NODE_MODULES'));

  if (buildCommands.length) {
    commands.push(...buildCommands.map(command => `${runCommand}${command}`));
  }

  if (!hasInstallCommand && commands.length) {
    commands.unshift(`${pkgManager} install`);
  }

  if (deleteNodeModules) {
    commands.push('rm -rdf node_modules');
  } else if (!hasInstallCommand) {
    if ('npm' === pkgManager) {
      commands.push('rm -rdf node_modules');
    }
    commands.push(`${pkgManager} install --production`);
  }

  return [
    ...commands,
    ...getBackupCommands(buildDir, pushDir),
    ...getClearFilesCommands(getCleanTargets()),
    ...getRestoreBackupCommands(buildDir, pushDir),
  ];
};

export const getCommitMessage = (): string => getInput('COMMIT_MESSAGE', { required: true });

export const getCommitName = (): string => getInput('COMMIT_NAME', { required: true });

export const getCommitEmail = (): string => getInput('COMMIT_EMAIL', { required: true });

export const getBranchNames = (): Array<string> => Utils.getArrayInput('BRANCH_NAME', true);

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

export const isCreateMajorVersionTag = (): boolean => Utils.getBoolValue(getInput('CREATE_MAJOR_VERSION_TAG'));

export const isCreateMinorVersionTag = (): boolean => Utils.getBoolValue(getInput('CREATE_MINOR_VERSION_TAG'));

export const isCreatePatchVersionTag = (): boolean => Utils.getBoolValue(getInput('CREATE_PATCH_VERSION_TAG'));

export const isEnabledCleanTestTag = (): boolean => Utils.getBoolValue(getInput('CLEAN_TEST_TAG'));

export const getOutputBuildInfoFilename = (): string => {
  const filename = getInput('OUTPUT_BUILD_INFO_FILENAME');
  if (filename.startsWith('/') || filename.includes('..')) {
    return '';
  }

  return filename;
};

type createTagType = (tagName: string) => string;

// eslint-disable-next-line no-magic-numbers
export const getMajorTag = (tagName: string): string => 'v' + Utils.normalizeVersion(tagName, { slice: 1 });

// eslint-disable-next-line no-magic-numbers
export const getMinorTag = (tagName: string): string => 'v' + Utils.normalizeVersion(tagName, { slice: 2 });

// eslint-disable-next-line no-magic-numbers
export const getPatchTag = (tagName: string): string => 'v' + Utils.normalizeVersion(tagName, { slice: 3 });

export const isValidTagName = (tagName: string): boolean => Utils.isValidSemanticVersioning(tagName) || (isTestTag(tagName) && Utils.isValidSemanticVersioning(getTestTag(tagName)));

export const getCreateTags = (tagName: string): Array<string> => {
  const settings  = [
    { condition: isCreateMajorVersionTag, createTag: getMajorTag },
    { condition: isCreateMinorVersionTag, createTag: getMinorTag },
    { condition: isCreatePatchVersionTag, createTag: getPatchTag },
  ];
  const createTag = isTestTag(tagName) ? (create: createTagType): string => getTestTagPrefix() + create(getTestTag(tagName)) : (create: createTagType): string => create(tagName);

  return Utils.uniqueArray(settings.filter(setting => setting.condition()).map(setting => createTag(setting.createTag)).concat(tagName)).sort().reverse();
};

const params = (context: Context): { workDir: string; buildDir: string; pushDir: string; branchName: string; branchNames: Array<string>; tagName: string } => {
  const workDir        = resolve(Utils.getWorkspace(), '.work');
  const buildDir       = resolve(workDir, 'build');
  const pushDir        = resolve(workDir, 'push');
  const tagName        = ContextHelper.getTagName(context);
  const normalized     = isTestTag(tagName) ? getTestTag(tagName) : tagName;
  const rawBranchNames = getBranchNames();
  const getBranch      = (branch: string): string => [
    { key: 'MAJOR', func: getMajorTag },
    { key: 'MINOR', func: getMinorTag },
    { key: 'PATCH', func: getPatchTag },
  ].reduce((acc, item) => Utils.replaceAll(acc, `\${${item.key}}`, item.func(normalized)), branch);
  const branchNames    = rawBranchNames.map(getBranch);
  const branchName     = branchNames[0];
  // eslint-disable-next-line no-magic-numbers
  return { workDir, buildDir, pushDir, branchName, branchNames: branchNames.slice(1), tagName };
};

export const getParams = memize(params);

export const getReplaceDirectory = (context: Context): { [key: string]: string } => {
  const { workDir, buildDir, pushDir } = getParams(context);
  return {
    [buildDir]: '<Build Directory>',
    [pushDir]: '<Push Directory>',
    [workDir]: '<Working Directory>',
  };
};

export const isValidContext = (context: Context): boolean => isValidTagName(getParams(context).tagName);
