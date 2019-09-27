"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@technote-space/github-action-helper/dist/utils");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const github_action_helper_1 = require("@technote-space/github-action-helper");
const core_1 = require("@actions/core");
const constant_1 = require("../constant");
const { getWorkspace, escapeRegExp, getBoolValue, uniqueArray, isSemanticVersioningTagName, } = github_action_helper_1.Utils;
const getCleanTargets = () => [...new Set((core_1.getInput('CLEAN_TARGETS') || constant_1.DEFAULT_CLEAN_TARGETS).split(',').map(target => target.trim()).filter(target => target && !target.startsWith('/') && !target.includes('..')))];
const normalizeCommand = (command) => command.trim().replace(/\s{2,}/g, ' ');
exports.getSearchBuildCommandTargets = () => {
    const command = core_1.getInput('BUILD_COMMAND_TARGET');
    if (command) {
        return [command];
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
exports.getBuildCommands = (dir) => {
    let commands = utils_1.getArrayInput('BUILD_COMMAND', false, '&&').map(normalizeCommand);
    const addRemove = !commands.length;
    const buildCommand = exports.detectBuildCommand(dir);
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
    if (addRemove) {
        commands.push(...getCleanTargets().map(target => `rm -rdf ${target}`));
    }
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
const getTestTagPrefixRegExp = () => new RegExp('^' + escapeRegExp(exports.getTestTagPrefix()));
exports.isTestTag = (tagName) => !!exports.getTestTagPrefix() && getTestTagPrefixRegExp().test(tagName);
exports.getTestTag = (tagName) => tagName.replace(getTestTagPrefixRegExp(), '');
exports.getOriginalTagPrefix = () => core_1.getInput('ORIGINAL_TAG_PREFIX') || constant_1.DEFAULT_ORIGINAL_TAG_PREFIX;
exports.isCreateMajorVersionTag = () => getBoolValue(core_1.getInput('CREATE_MAJOR_VERSION_TAG') || 'true');
exports.isCreateMinorVersionTag = () => getBoolValue(core_1.getInput('CREATE_MINOR_VERSION_TAG') || 'true');
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
exports.isValidTagName = (tagName) => isSemanticVersioningTagName(tagName) || (exports.isTestTag(tagName) && isSemanticVersioningTagName(exports.getTestTag(tagName)));
exports.getCreateTags = (tagName) => {
    const tagNames = [tagName];
    if (exports.isTestTag(tagName)) {
        if (exports.isCreateMajorVersionTag()) {
            tagNames.push(exports.getTestTagPrefix() + exports.getMajorTag(exports.getTestTag(tagName)));
        }
        if (exports.isCreateMinorVersionTag()) {
            tagNames.push(exports.getTestTagPrefix() + exports.getMinorTag(exports.getTestTag(tagName)));
        }
    }
    else {
        if (exports.isCreateMajorVersionTag()) {
            tagNames.push(exports.getMajorTag(tagName));
        }
        if (exports.isCreateMinorVersionTag()) {
            tagNames.push(exports.getMinorTag(tagName));
        }
    }
    return uniqueArray(tagNames);
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
exports.isValidContext = (context) => exports.isValidTagName(github_action_helper_1.Utils.getTagName(context));
