"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const path_1 = __importDefault(require("path"));
const github_action_helper_1 = require("@technote-space/github-action-helper");
const misc_1 = require("./misc");
const { getRepository, getTagName } = github_action_helper_1.ContextHelper;
const { replaceAll } = github_action_helper_1.Utils;
exports.replaceDirectory = (message) => {
    const directories = misc_1.getReplaceDirectory();
    return Object.keys(directories).reduce((value, directory) => replaceAll(replaceAll(value, ` -C ${directory}`, ''), directory, directories[directory]), message);
};
const logger = new github_action_helper_1.Logger(exports.replaceDirectory);
const command = new github_action_helper_1.Command(logger);
const helper = new github_action_helper_1.GitHelper(logger, { depth: misc_1.getFetchDepth() });
const { startProcess, info } = logger;
exports.prepareFiles = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { buildDir } = misc_1.getParams();
    fs_1.default.mkdirSync(buildDir, { recursive: true });
    startProcess('Cloning the remote repo for build...');
    yield helper.checkout(buildDir, context);
    startProcess('Running build for release...');
    yield helper.runCommand(buildDir, misc_1.getBuildCommands(buildDir));
});
exports.createBuildInfoFile = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const filename = misc_1.getOutputBuildInfoFilename();
    if (!filename) {
        return;
    }
    const { buildDir, branchName } = misc_1.getParams();
    const tagName = getTagName(context);
    startProcess('Creating build info file...');
    const filepath = path_1.default.resolve(buildDir, filename);
    const dir = path_1.default.dirname(filepath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    fs_1.default.writeFileSync(filepath, JSON.stringify({
        owner: context.repo.owner,
        repo: context.repo.repo,
        sha: context.sha,
        ref: context.ref,
        tagName: tagName,
        branch: branchName,
        tags: misc_1.getCreateTags(tagName),
        'updated_at': moment_1.default().toISOString(),
    }));
});
exports.cloneForBranch = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    startProcess('Cloning the branch [%s]...', branchName);
    yield helper.cloneBranch(pushDir, branchName, context);
});
exports.checkBranch = (clonedBranch) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    if (branchName !== clonedBranch) {
        info('remote branch %s not found.', branchName);
        info('now branch: %s', clonedBranch);
        startProcess('Initializing local git repo [%s]...', branchName);
        yield helper.gitInit(pushDir, branchName);
    }
});
exports.config = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams();
    const name = misc_1.getCommitName();
    const email = misc_1.getCommitEmail();
    startProcess('Configuring git committer to be %s <%s>...', name, email);
    yield helper.config(pushDir, name, email);
});
exports.commit = () => __awaiter(void 0, void 0, void 0, function* () { return helper.commit(misc_1.getParams().pushDir, misc_1.getCommitMessage()); });
exports.push = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    const tagName = getTagName(context);
    startProcess('Pushing to %s@%s (tag: %s)...', getRepository(context), branchName, tagName);
    const prefix = misc_1.getOriginalTagPrefix();
    if (prefix) {
        const originalTag = prefix + tagName;
        yield helper.fetchTags(pushDir, context);
        yield helper.copyTag(pushDir, originalTag, tagName, context);
    }
    const tagNames = misc_1.getCreateTags(tagName);
    yield helper.deleteTag(pushDir, tagNames, context);
    yield helper.fetchTags(pushDir, context);
    yield helper.addLocalTag(pushDir, tagNames);
    yield helper.push(pushDir, branchName, true, context);
});
const findRelease = (octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    const tagName = getTagName(context);
    const releases = yield octokit.repos.listReleases({
        owner: context.repo.owner,
        repo: context.repo.repo,
    });
    return releases.data.find(release => release.tag_name === tagName);
});
exports.updateRelease = (release, octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    if (!release || release.draft) {
        return;
    }
    startProcess('Re-publishing release...');
    yield octokit.repos.updateRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        'release_id': release.id,
        draft: false,
    });
});
exports.copyFiles = () => __awaiter(void 0, void 0, void 0, function* () {
    const { buildDir, pushDir } = misc_1.getParams();
    startProcess('Copying %s contents to %s...', buildDir, pushDir);
    yield command.execAsync({
        command: 'rsync',
        args: ['-rl', '--exclude', '.git', '--delete', `${buildDir}/`, pushDir],
    });
});
const initDirectory = () => __awaiter(void 0, void 0, void 0, function* () {
    const { workDir, pushDir } = misc_1.getParams();
    yield command.execAsync({
        command: 'rm',
        args: ['-rdf', workDir],
    });
    fs_1.default.mkdirSync(pushDir, { recursive: true });
});
exports.prepareCommit = (context) => __awaiter(void 0, void 0, void 0, function* () {
    yield initDirectory();
    yield exports.cloneForBranch(context);
    yield exports.checkBranch(yield helper.getCurrentBranchName(misc_1.getParams().pushDir));
    yield exports.prepareFiles(context);
    yield exports.createBuildInfoFile(context);
    yield exports.copyFiles();
});
const executeCommit = (release, octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.config();
    if (!(yield exports.commit())) {
        return false;
    }
    yield exports.push(context);
    yield exports.updateRelease(release, octokit, context);
    return true;
});
exports.deploy = (octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { branchName } = misc_1.getParams();
    startProcess('Deploying branch %s to %s...', branchName, getRepository(context));
    const release = yield findRelease(octokit, context);
    yield exports.prepareCommit(context);
    yield executeCommit(release, octokit, context);
});
