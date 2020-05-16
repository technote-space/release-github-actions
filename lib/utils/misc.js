"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidContext = exports.getReplaceDirectory = exports.getParams = exports.getCreateTags = exports.isValidTagName = exports.getPatchTag = exports.getMinorTag = exports.getMajorTag = exports.getOutputBuildInfoFilename = exports.isEnabledCleanTestTag = exports.isCreatePatchVersionTag = exports.isCreateMinorVersionTag = exports.isCreateMajorVersionTag = exports.getOriginalTagPrefix = exports.getTestTag = exports.isTestTag = exports.getTestTagPrefix = exports.getFetchDepth = exports.getBranchNames = exports.getCommitEmail = exports.getCommitName = exports.getCommitMessage = exports.getBuildCommands = exports.getClearFilesCommands = exports.getRestoreBackupCommands = exports.getBackupCommands = exports.detectBuildCommands = exports.getSearchBuildCommandTargets = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const memize_1 = __importDefault(require("memize"));
const github_action_helper_1 = require("@technote-space/github-action-helper");
const core_1 = require("@actions/core");
const constant_1 = require("../constant");
const getCleanTargets = () => github_action_helper_1.Utils.getArrayInput('CLEAN_TARGETS')
    .map(target => target.replace(/[\x00-\x1f\x80-\x9f]/, '').trim()) // eslint-disable-line no-control-regex
    .filter(target => target && !target.startsWith('/') && !target.includes('..'));
exports.getSearchBuildCommandTargets = () => github_action_helper_1.Utils.getArrayInput('BUILD_COMMAND_TARGET', true);
exports.detectBuildCommands = (dir, runCommand, commands) => {
    const packageFile = path_1.resolve(dir, 'package.json');
    if (!fs_1.existsSync(packageFile)) {
        return [];
    }
    const parsed = JSON.parse(fs_1.readFileSync(packageFile, 'utf8'));
    if (!('scripts' in parsed)) {
        return [];
    }
    const scripts = parsed['scripts'];
    const targets = Array();
    for (const target of exports.getSearchBuildCommandTargets()) {
        if (target in scripts && !commands.includes(`${runCommand}${target}`)) {
            targets.push(target);
        }
    }
    // eslint-disable-next-line no-magic-numbers
    return github_action_helper_1.Utils.getBoolValue(core_1.getInput('ALLOW_MULTIPLE_BUILD_COMMANDS')) ? targets : targets.slice(0, 1);
};
exports.getBackupCommands = (buildDir, pushDir) => [
    {
        command: 'mv',
        args: ['-f', path_1.resolve(buildDir, 'action.yaml'), path_1.resolve(pushDir, 'action.yml')],
        suppressError: true,
        quiet: true,
    },
    {
        command: 'mv',
        args: ['-f', path_1.resolve(buildDir, 'action.yml'), path_1.resolve(pushDir, 'action.yml')],
        suppressError: true,
        quiet: true,
    },
];
exports.getRestoreBackupCommands = (buildDir, pushDir) => [
    {
        command: 'mv',
        args: ['-f', path_1.resolve(pushDir, 'action.yml'), path_1.resolve(buildDir, 'action.yml')],
        suppressError: true,
        quiet: true,
    },
];
exports.getClearFilesCommands = (targets) => {
    const commands = [];
    const searchValues = '?<>:|"\'@#$%^& ;';
    const replaceValue = '$1\\$2';
    const escapeFunc = (item) => searchValues.split('').reduce((acc, val) => acc.replace(new RegExp('([^\\\\])(' + github_action_helper_1.Utils.escapeRegExp(val) + ')'), replaceValue), item);
    const beginWithDash = targets.filter(item => item.startsWith('-')).map(escapeFunc);
    const withWildcard = targets.filter(item => !item.startsWith('-') && item.includes('*')).map(escapeFunc);
    const withoutWildcard = targets.filter(item => !item.startsWith('-') && !item.includes('*'));
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
exports.getBuildCommands = (buildDir, pushDir) => {
    const commands = github_action_helper_1.Utils.getArrayInput('BUILD_COMMAND', false, '&&').map(command => command.replace(/\s{2,}/g, ' '));
    const pkgManager = github_action_helper_1.Utils.useNpm(buildDir, core_1.getInput('PACKAGE_MANAGER')) ? 'npm' : 'yarn';
    const runSubCommand = pkgManager === 'npm' ? ' run ' : ' ';
    const runCommand = [pkgManager, runSubCommand].join('');
    const hasInstallCommand = !!commands.filter(command => command.includes(`${runCommand}install`)).length;
    const buildCommands = exports.detectBuildCommands(buildDir, runCommand, commands);
    if (buildCommands.length) {
        commands.push(...buildCommands.map(command => `${runCommand}${command}`));
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
    return [
        ...commands,
        ...exports.getBackupCommands(buildDir, pushDir),
        ...exports.getClearFilesCommands(getCleanTargets()),
        ...exports.getRestoreBackupCommands(buildDir, pushDir),
    ];
};
exports.getCommitMessage = () => core_1.getInput('COMMIT_MESSAGE', { required: true });
exports.getCommitName = () => core_1.getInput('COMMIT_NAME', { required: true });
exports.getCommitEmail = () => core_1.getInput('COMMIT_EMAIL', { required: true });
exports.getBranchNames = () => github_action_helper_1.Utils.getArrayInput('BRANCH_NAME', true);
exports.getFetchDepth = () => {
    const depth = core_1.getInput('FETCH_DEPTH');
    if (depth && /^\d+$/.test(depth)) {
        return parseInt(depth, 10);
    }
    return constant_1.DEFAULT_FETCH_DEPTH;
};
exports.getTestTagPrefix = () => core_1.getInput('TEST_TAG_PREFIX');
const getTestTagPrefixRegExp = () => github_action_helper_1.Utils.getPrefixRegExp(exports.getTestTagPrefix());
exports.isTestTag = (tagName) => !!exports.getTestTagPrefix() && getTestTagPrefixRegExp().test(tagName);
exports.getTestTag = (tagName) => tagName.replace(getTestTagPrefixRegExp(), '');
exports.getOriginalTagPrefix = () => core_1.getInput('ORIGINAL_TAG_PREFIX');
exports.isCreateMajorVersionTag = () => github_action_helper_1.Utils.getBoolValue(core_1.getInput('CREATE_MAJOR_VERSION_TAG'));
exports.isCreateMinorVersionTag = () => github_action_helper_1.Utils.getBoolValue(core_1.getInput('CREATE_MINOR_VERSION_TAG'));
exports.isCreatePatchVersionTag = () => github_action_helper_1.Utils.getBoolValue(core_1.getInput('CREATE_PATCH_VERSION_TAG'));
exports.isEnabledCleanTestTag = () => github_action_helper_1.Utils.getBoolValue(core_1.getInput('CLEAN_TEST_TAG'));
exports.getOutputBuildInfoFilename = () => {
    const filename = core_1.getInput('OUTPUT_BUILD_INFO_FILENAME');
    if (filename.startsWith('/') || filename.includes('..')) {
        return '';
    }
    return filename;
};
const getVersionFragments = (tagName) => tagName.trim().replace(/^v?/gi, '').split('.');
// eslint-disable-next-line no-magic-numbers
exports.getMajorTag = (tagName) => 'v' + getVersionFragments(tagName).slice(0, 1);
// eslint-disable-next-line no-magic-numbers
exports.getMinorTag = (tagName) => 'v' + getVersionFragments(tagName).concat(['0']).slice(0, 2).join('.');
// eslint-disable-next-line no-magic-numbers
exports.getPatchTag = (tagName) => 'v' + getVersionFragments(tagName).concat(['0', '0']).slice(0, 3).join('.');
exports.isValidTagName = (tagName) => github_action_helper_1.Utils.isSemanticVersioningTagName(tagName) || (exports.isTestTag(tagName) && github_action_helper_1.Utils.isSemanticVersioningTagName(exports.getTestTag(tagName)));
exports.getCreateTags = (tagName) => {
    const settings = [
        { condition: exports.isCreateMajorVersionTag, createTag: exports.getMajorTag },
        { condition: exports.isCreateMinorVersionTag, createTag: exports.getMinorTag },
        { condition: exports.isCreatePatchVersionTag, createTag: exports.getPatchTag },
    ];
    const createTag = exports.isTestTag(tagName) ? (create) => exports.getTestTagPrefix() + create(exports.getTestTag(tagName)) : (create) => create(tagName);
    return github_action_helper_1.Utils.uniqueArray(settings.filter(setting => setting.condition()).map(setting => createTag(setting.createTag)).concat(tagName)).sort().reverse();
};
const params = (context) => {
    const workDir = path_1.resolve(github_action_helper_1.Utils.getWorkspace(), '.work');
    const buildDir = path_1.resolve(workDir, 'build');
    const pushDir = path_1.resolve(workDir, 'push');
    const tagName = github_action_helper_1.ContextHelper.getTagName(context);
    const normalized = exports.isTestTag(tagName) ? exports.getTestTag(tagName) : tagName;
    const rawBranchNames = exports.getBranchNames();
    const getBranch = (branch) => [
        { key: 'MAJOR', func: exports.getMajorTag },
        { key: 'MINOR', func: exports.getMinorTag },
        { key: 'PATCH', func: exports.getPatchTag },
    ].reduce((acc, item) => github_action_helper_1.Utils.replaceAll(acc, `\${${item.key}}`, item.func(normalized)), branch);
    const branchNames = rawBranchNames.map(getBranch);
    const branchName = branchNames[0];
    // eslint-disable-next-line no-magic-numbers
    return { workDir, buildDir, pushDir, branchName, branchNames: branchNames.slice(1), tagName };
};
exports.getParams = memize_1.default(params);
exports.getReplaceDirectory = (context) => {
    const { workDir, buildDir, pushDir } = exports.getParams(context);
    return {
        [buildDir]: '<Build Directory>',
        [pushDir]: '<Push Directory>',
        [workDir]: '<Working Directory>',
    };
};
exports.isValidContext = (context) => exports.isValidTagName(exports.getParams(context).tagName);
