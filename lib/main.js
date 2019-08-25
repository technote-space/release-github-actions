"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const signale_1 = __importDefault(require("signale"));
const command_1 = require("./utils/command");
const github_2 = require("./utils/github");
const misc_1 = require("./utils/misc");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!misc_1.isTargetEvent(github_1.context)) {
                signale_1.default.info('This is not target event.');
                signale_1.default.info(`Event: ${github_1.context.eventName}  Action: ${github_1.context.action}`);
                return;
            }
            const octokit = new github_1.GitHub(core_1.getInput('GITHUB_TOKEN', { required: true }));
            yield command_1.clone(github_1.context);
            yield command_1.runBuild();
            const files = yield command_1.getDiffFiles();
            signale_1.default.info(`Diff files count: ${files.length}`);
            if (!files.length)
                return;
            const blobs = yield github_2.filesToBlobs(files, octokit, github_1.context);
            const tree = yield github_2.createTree(blobs, octokit, github_1.context);
            const commit = yield github_2.createCommit(tree, octokit, github_1.context);
            yield github_2.updateRef(commit, github_1.context.payload.release.tag_name, octokit, github_1.context);
        }
        catch (error) {
            core_1.setFailed(error.message);
        }
    });
}
run();
