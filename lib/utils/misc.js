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
exports.getWorkspace = () => core_1.getInput('GITHUB_WORKSPACE', { required: true });
exports.isGitCloned = () => fs_1.default.existsSync(path_1.default.resolve(exports.getWorkspace(), '.git'));
exports.getGitUrl = (context) => `https://github.com/${context.repo.owner}/${context.repo.repo}.git`;
exports.getBuildCommands = () => {
    const command = core_1.getInput('BUILD_COMMAND');
    if ('' === command)
        return [];
    return [command];
};
exports.getCommitMessage = () => core_1.getInput('COMMIT_MESSAGE') || constant_1.DEFAULT_COMMIT_MESSAGE;
