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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // if (!isTargetEvent(context)) {
            //     signale.info('This is not target event.');
            //     signale.info(`Event: ${context.eventName}  Action: ${context.action}`);
            //     return;
            // }
            // const octokit = new GitHub(getInput('GITHUB_TOKEN', {required: true}));
            yield command_1.clone(github_1.context);
            yield command_1.runBuild();
            const files = yield command_1.getDiffFiles();
            signale_1.default.info(`Diff files count: ${files.length}`);
            if (!files.length)
                return;
            // const blobs = await filesToBlobs(files, octokit, context);
            // const tree = await createTree(blobs, octokit, context);
            // const commit = await createCommit(tree, octokit, context);
            // await updateRef(commit, context.payload.release.tag_name, octokit, context);
        }
        catch (error) {
            core_1.setFailed(error.message);
        }
    });
}
run();
