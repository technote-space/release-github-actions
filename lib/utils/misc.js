"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const core_1 = require("@actions/core");
const constant_1 = require("../constant");
exports.isTargetEvent = (context) => constant_1.TARGET_EVENT_NAME === context.eventName && constant_1.TARGET_EVENT_ACTION === context.payload.action;
exports.parseConfig = (content) => js_yaml_1.default.safeLoad(Buffer.from(content, 'base64').toString()) || {};
exports.getRepository = (context) => `${context.repo.owner}/${context.repo.repo}`;
exports.getGitUrl = (context) => {
    const token = exports.getAccessToken();
    return `https://${token}@github.com/${context.repo.owner}/${context.repo.repo}.git`;
};
exports.getBuildCommands = () => {
    const command = core_1.getInput('BUILD_COMMAND');
    if ('' === command)
        return [];
    return command.split('&&').map(str => str.trim().replace(/\s{2,}/g, ' '));
};
exports.getAccessToken = () => core_1.getInput('ACCESS_TOKEN', { required: true });
exports.getCommitMessage = () => core_1.getInput('COMMIT_MESSAGE') || constant_1.DEFAULT_COMMIT_MESSAGE;
exports.getCommitName = () => core_1.getInput('COMMIT_NAME') || constant_1.DEFAULT_COMMIT_NAME;
exports.getCommitEmail = () => core_1.getInput('COMMIT_EMAIL') || constant_1.DEFAULT_COMMIT_EMAIL;
exports.getWorkspace = () => process.env.GITHUB_WORKSPACE || '';
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
    for (const target of constant_1.SEARCH_BUILD_COMMAND_TARGETS) {
        if (target in scripts)
            return scripts[target].trim().replace(/\s{2,}/g, ' ');
    }
    return false;
};
