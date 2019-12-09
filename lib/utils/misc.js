"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const github_action_helper_1 = require("@technote-space/github-action-helper");
const core_1 = require("@actions/core");
const constant_1 = require("../constant");
const { getWorkspace, getPrefixRegExp, getBoolValue, getArrayInput, uniqueArray, isSemanticVersioningTagName, useNpm, escapeRegExp } = github_action_helper_1.Utils;
const getCleanTargets = () => getArrayInput('CLEAN_TARGETS')
    .map(target => target.replace(/[\x00-\x1f\x80-\x9f]/, '').trim()) // eslint-disable-line no-control-regex
    .filter(target => target && !target.startsWith('/') && !target.includes('..'));
const normalizeCommand = (command) => command.trim().replace(/\s{2,}/g, ' ');
exports.getSearchBuildCommandTargets = () => {
    const command = getArrayInput('BUILD_COMMAND_TARGET');
    if (command.length) {
        return command;
    }
    return constant_1.DEFAULT_SEARCH_BUILD_COMMAND_TARGETS;
};
exports.detectBuildCommand = (dir) => {
    const packageFile = path_1.default.resolve(dir, 'package.json');
    if (!fs_1.default.existsSync(packageFile)) {
        return false;
    }
    const parsed = JSON.parse(fs_1.default.readFileSync(packageFile, 'utf8'));
    if (!('scripts' in parsed)) {
        return false;
    }
    const scripts = parsed['scripts'];
    for (const target of exports.getSearchBuildCommandTargets()) {
        if (target in scripts) {
            return normalizeCommand(target);
        }
    }
    return false;
};
exports.getClearFilesCommands = (targets) => {
    const commands = [];
    const searchValues = '?<>:|"\'@#$%^& ;';
    const replaceValue = '$1\\$2';
    const escapeFunc = (item) => searchValues.split('').reduce((acc, val) => acc.replace(new RegExp('([^\\\\])(' + escapeRegExp(val) + ')'), replaceValue), item);
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
exports.getBuildCommands = (dir) => {
    let commands = getArrayInput('BUILD_COMMAND', false, '&&').map(normalizeCommand);
    const pkgManager = useNpm(dir, core_1.getInput('PACKAGE_MANAGER')) ? 'npm' : 'yarn';
    const buildCommand = exports.detectBuildCommand(dir);
    const runSubCommand = pkgManager === 'npm' ? ' run ' : ' ';
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
    commands.push(...exports.getClearFilesCommands(getCleanTargets()));
    return commands;
};
exports.getCommitMessage = () => core_1.getInput('COMMIT_MESSAGE') || constant_1.DEFAULT_COMMIT_MESSAGE;
exports.getCommitName = () => core_1.getInput('COMMIT_NAME') || constant_1.DEFAULT_COMMIT_NAME;
exports.getCommitEmail = () => core_1.getInput('COMMIT_EMAIL') || constant_1.DEFAULT_COMMIT_EMAIL;
exports.getBranchName = () => core_1.getInput('BRANCH_NAME') || constant_1.DEFAULT_BRANCH_NAME;
exports.getFetchDepth = () => {
    const depth = core_1.getInput('FETCH_DEPTH');
    if (depth && /^\d+$/.test(depth)) {
        return parseInt(depth, 10);
    }
    return constant_1.DEFAULT_FETCH_DEPTH;
};
exports.getTestTagPrefix = () => core_1.getInput('TEST_TAG_PREFIX') || constant_1.DEFAULT_TEST_TAG_PREFIX;
const getTestTagPrefixRegExp = () => getPrefixRegExp(exports.getTestTagPrefix());
exports.isTestTag = (tagName) => !!exports.getTestTagPrefix() && getTestTagPrefixRegExp().test(tagName);
exports.getTestTag = (tagName) => tagName.replace(getTestTagPrefixRegExp(), '');
exports.getOriginalTagPrefix = () => core_1.getInput('ORIGINAL_TAG_PREFIX') || constant_1.DEFAULT_ORIGINAL_TAG_PREFIX;
exports.isCreateMajorVersionTag = () => getBoolValue(core_1.getInput('CREATE_MAJOR_VERSION_TAG') || 'true');
exports.isCreateMinorVersionTag = () => getBoolValue(core_1.getInput('CREATE_MINOR_VERSION_TAG') || 'true');
exports.isCreatePatchVersionTag = () => getBoolValue(core_1.getInput('CREATE_PATCH_VERSION_TAG') || 'true');
exports.isEnabledCleanTestTag = () => getBoolValue(core_1.getInput('CLEAN_TEST_TAG'));
exports.getOutputBuildInfoFilename = () => {
    const filename = (core_1.getInput('OUTPUT_BUILD_INFO_FILENAME') || constant_1.DEFAULT_OUTPUT_BUILD_INFO_FILENAME).trim();
    if (filename.startsWith('/') || filename.includes('..')) {
        return '';
    }
    return filename;
};
const getVersionFragments = (tagName) => tagName.trim().replace(/^v?/gi, '').split('.');
// eslint-disable-next-line no-magic-numbers
exports.getMajorTag = (tagName) => 'v' + getVersionFragments(tagName).slice(0, 1).join('.');
// eslint-disable-next-line no-magic-numbers
exports.getMinorTag = (tagName) => 'v' + getVersionFragments(tagName).concat(['0']).slice(0, 2).join('.');
// eslint-disable-next-line no-magic-numbers
exports.getPatchTag = (tagName) => 'v' + getVersionFragments(tagName).concat(['0', '0']).slice(0, 3).join('.');
exports.isValidTagName = (tagName) => isSemanticVersioningTagName(tagName) || (exports.isTestTag(tagName) && isSemanticVersioningTagName(exports.getTestTag(tagName)));
exports.getCreateTags = (tagName) => {
    const settings = [
        { condition: exports.isCreateMajorVersionTag, createTag: exports.getMajorTag },
        { condition: exports.isCreateMinorVersionTag, createTag: exports.getMinorTag },
        { condition: exports.isCreatePatchVersionTag, createTag: exports.getPatchTag },
    ];
    const createTag = exports.isTestTag(tagName) ? (create) => exports.getTestTagPrefix() + create(exports.getTestTag(tagName)) : (create) => create(tagName);
    return uniqueArray(settings.filter(setting => setting.condition()).map(setting => createTag(setting.createTag)).concat(tagName));
};
exports.getParams = () => {
    const workDir = path_1.default.resolve(getWorkspace(), '.work');
    const buildDir = path_1.default.resolve(workDir, 'build');
    const pushDir = path_1.default.resolve(workDir, 'push');
    const branchName = exports.getBranchName();
    return { workDir, buildDir, pushDir, branchName };
};
exports.getReplaceDirectory = () => {
    const { workDir, buildDir, pushDir } = exports.getParams();
    return {
        [buildDir]: '<Build Directory>',
        [pushDir]: '<Push Directory>',
        [workDir]: '<Working Directory>',
    };
};
exports.isValidContext = (context) => exports.isValidTagName(github_action_helper_1.ContextHelper.getTagName(context));
