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
const getSearchBuildCommandTargets = () => github_action_helper_1.Utils.getArrayInput('BUILD_COMMAND_TARGET', true);
exports.getSearchBuildCommandTargets = getSearchBuildCommandTargets;
const detectBuildCommands = (dir, runCommand, commands) => {
    const packageFile = (0, path_1.resolve)(dir, 'package.json');
    if (!(0, fs_1.existsSync)(packageFile)) {
        return [];
    }
    const parsed = JSON.parse((0, fs_1.readFileSync)(packageFile, 'utf8'));
    if (!('scripts' in parsed)) {
        return [];
    }
    const scripts = parsed['scripts'];
    const targets = Array();
    for (const target of (0, exports.getSearchBuildCommandTargets)()) {
        if (target in scripts && !commands.includes(`${runCommand}${target}`)) {
            targets.push(target);
        }
    }
    // eslint-disable-next-line no-magic-numbers
    return github_action_helper_1.Utils.getBoolValue((0, core_1.getInput)('ALLOW_MULTIPLE_BUILD_COMMANDS')) ? targets : targets.slice(0, 1);
};
exports.detectBuildCommands = detectBuildCommands;
const getBackupCommands = (buildDir, pushDir) => [
    {
        command: 'mv',
        args: ['-f', (0, path_1.resolve)(buildDir, 'action.yaml'), (0, path_1.resolve)(pushDir, 'action.yml')],
        suppressError: true,
        quiet: true,
    },
    {
        command: 'mv',
        args: ['-f', (0, path_1.resolve)(buildDir, 'action.yml'), (0, path_1.resolve)(pushDir, 'action.yml')],
        suppressError: true,
        quiet: true,
    },
];
exports.getBackupCommands = getBackupCommands;
const getRestoreBackupCommands = (buildDir, pushDir) => [
    {
        command: 'mv',
        args: ['-f', (0, path_1.resolve)(pushDir, 'action.yml'), (0, path_1.resolve)(buildDir, 'action.yml')],
        suppressError: true,
        quiet: true,
    },
];
exports.getRestoreBackupCommands = getRestoreBackupCommands;
const getClearFilesCommands = (targets) => {
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
exports.getClearFilesCommands = getClearFilesCommands;
const getBuildCommands = (buildDir, pushDir) => {
    const commands = github_action_helper_1.Utils.getArrayInput('BUILD_COMMAND', false, '&&').map(command => command.replace(/\s{2,}/g, ' '));
    const pkgManager = github_action_helper_1.Utils.useNpm(buildDir, (0, core_1.getInput)('PACKAGE_MANAGER')) ? 'npm' : 'yarn';
    const runSubCommand = pkgManager === 'npm' ? ' run ' : ' ';
    const runCommand = [pkgManager, runSubCommand].join('');
    const hasInstallCommand = !!commands.filter(command => command.includes(`${runCommand}install`)).length;
    const buildCommands = (0, exports.detectBuildCommands)(buildDir, runCommand, commands);
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
        ...(0, exports.getBackupCommands)(buildDir, pushDir),
        ...(0, exports.getClearFilesCommands)(getCleanTargets()),
        ...(0, exports.getRestoreBackupCommands)(buildDir, pushDir),
    ];
};
exports.getBuildCommands = getBuildCommands;
const getCommitMessage = () => (0, core_1.getInput)('COMMIT_MESSAGE', { required: true });
exports.getCommitMessage = getCommitMessage;
const getCommitName = () => (0, core_1.getInput)('COMMIT_NAME', { required: true });
exports.getCommitName = getCommitName;
const getCommitEmail = () => (0, core_1.getInput)('COMMIT_EMAIL', { required: true });
exports.getCommitEmail = getCommitEmail;
const getBranchNames = () => github_action_helper_1.Utils.getArrayInput('BRANCH_NAME', true);
exports.getBranchNames = getBranchNames;
const getFetchDepth = () => {
    const depth = (0, core_1.getInput)('FETCH_DEPTH');
    if (depth && /^\d+$/.test(depth)) {
        return parseInt(depth, 10);
    }
    return constant_1.DEFAULT_FETCH_DEPTH;
};
exports.getFetchDepth = getFetchDepth;
const getTestTagPrefix = () => (0, core_1.getInput)('TEST_TAG_PREFIX');
exports.getTestTagPrefix = getTestTagPrefix;
const getTestTagPrefixRegExp = () => github_action_helper_1.Utils.getPrefixRegExp((0, exports.getTestTagPrefix)());
const isTestTag = (tagName) => !!(0, exports.getTestTagPrefix)() && getTestTagPrefixRegExp().test(tagName);
exports.isTestTag = isTestTag;
const getTestTag = (tagName) => tagName.replace(getTestTagPrefixRegExp(), '');
exports.getTestTag = getTestTag;
const getOriginalTagPrefix = () => (0, core_1.getInput)('ORIGINAL_TAG_PREFIX');
exports.getOriginalTagPrefix = getOriginalTagPrefix;
const isCreateMajorVersionTag = () => github_action_helper_1.Utils.getBoolValue((0, core_1.getInput)('CREATE_MAJOR_VERSION_TAG'));
exports.isCreateMajorVersionTag = isCreateMajorVersionTag;
const isCreateMinorVersionTag = () => github_action_helper_1.Utils.getBoolValue((0, core_1.getInput)('CREATE_MINOR_VERSION_TAG'));
exports.isCreateMinorVersionTag = isCreateMinorVersionTag;
const isCreatePatchVersionTag = () => github_action_helper_1.Utils.getBoolValue((0, core_1.getInput)('CREATE_PATCH_VERSION_TAG'));
exports.isCreatePatchVersionTag = isCreatePatchVersionTag;
const isEnabledCleanTestTag = () => github_action_helper_1.Utils.getBoolValue((0, core_1.getInput)('CLEAN_TEST_TAG'));
exports.isEnabledCleanTestTag = isEnabledCleanTestTag;
const getOutputBuildInfoFilename = () => {
    const filename = (0, core_1.getInput)('OUTPUT_BUILD_INFO_FILENAME');
    if (filename.startsWith('/') || filename.includes('..')) {
        return '';
    }
    return filename;
};
exports.getOutputBuildInfoFilename = getOutputBuildInfoFilename;
// eslint-disable-next-line no-magic-numbers
const getMajorTag = (tagName) => 'v' + github_action_helper_1.Utils.normalizeVersion(tagName, { slice: 1 });
exports.getMajorTag = getMajorTag;
// eslint-disable-next-line no-magic-numbers
const getMinorTag = (tagName) => 'v' + github_action_helper_1.Utils.normalizeVersion(tagName, { slice: 2 });
exports.getMinorTag = getMinorTag;
// eslint-disable-next-line no-magic-numbers
const getPatchTag = (tagName) => 'v' + github_action_helper_1.Utils.normalizeVersion(tagName, { slice: 3 });
exports.getPatchTag = getPatchTag;
const isValidTagName = (tagName) => github_action_helper_1.Utils.isValidSemanticVersioning(tagName) || ((0, exports.isTestTag)(tagName) && github_action_helper_1.Utils.isValidSemanticVersioning((0, exports.getTestTag)(tagName)));
exports.isValidTagName = isValidTagName;
const getCreateTags = (tagName) => {
    const settings = [
        { condition: exports.isCreateMajorVersionTag, createTag: exports.getMajorTag },
        { condition: exports.isCreateMinorVersionTag, createTag: exports.getMinorTag },
        { condition: exports.isCreatePatchVersionTag, createTag: exports.getPatchTag },
    ];
    const createTag = (0, exports.isTestTag)(tagName) ? (create) => (0, exports.getTestTagPrefix)() + create((0, exports.getTestTag)(tagName)) : (create) => create(tagName);
    return github_action_helper_1.Utils.uniqueArray(settings.filter(setting => setting.condition()).map(setting => createTag(setting.createTag)).concat(tagName)).sort().reverse();
};
exports.getCreateTags = getCreateTags;
const params = (context) => {
    const workDir = (0, path_1.resolve)(github_action_helper_1.Utils.getWorkspace(), '.work');
    const buildDir = (0, path_1.resolve)(workDir, 'build');
    const pushDir = (0, path_1.resolve)(workDir, 'push');
    const tagName = github_action_helper_1.ContextHelper.getTagName(context);
    const normalized = (0, exports.isTestTag)(tagName) ? (0, exports.getTestTag)(tagName) : tagName;
    const rawBranchNames = (0, exports.getBranchNames)();
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
exports.getParams = (0, memize_1.default)(params);
const getReplaceDirectory = (context) => {
    const { workDir, buildDir, pushDir } = (0, exports.getParams)(context);
    return {
        [buildDir]: '<Build Directory>',
        [pushDir]: '<Push Directory>',
        [workDir]: '<Working Directory>',
    };
};
exports.getReplaceDirectory = getReplaceDirectory;
const isValidContext = (context) => (0, exports.isValidTagName)((0, exports.getParams)(context).tagName);
exports.isValidContext = isValidContext;
