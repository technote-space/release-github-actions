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
const { replaceAll, versionCompare, getPrefixRegExp } = github_action_helper_1.Utils;
exports.replaceDirectory = (message) => {
    const directories = misc_1.getReplaceDirectory();
    return Object.keys(directories).reduce((value, directory) => replaceAll(replaceAll(value, ` -C ${directory}`, ''), directory, directories[directory]), message);
};
const logger = new github_action_helper_1.Logger(exports.replaceDirectory);
const command = new github_action_helper_1.Command(logger);
const { startProcess, info } = logger;
exports.prepareFiles = (helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { buildDir, pushDir } = misc_1.getParams();
    fs_1.default.mkdirSync(buildDir, { recursive: true });
    startProcess('Cloning the remote repo for build...');
    yield helper.checkout(buildDir, context);
    startProcess('Running build for release...');
    yield helper.runCommand(buildDir, misc_1.getBuildCommands(buildDir, pushDir));
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
exports.clone = (helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    startProcess('Fetching...');
    yield helper.fetchOrigin(pushDir, context, ['--no-tags'], [`refs/heads/${branchName}:refs/remotes/origin/${branchName}`]);
    startProcess('Switching branch to [%s]...', branchName);
    yield helper.switchBranch(pushDir, branchName);
});
exports.checkBranch = (clonedBranch, helper) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    if (branchName !== clonedBranch) {
        info('remote branch %s not found.', branchName);
        info('now branch: %s', clonedBranch);
        startProcess('Initializing local git repo [%s]...', branchName);
        yield helper.gitInit(pushDir, branchName);
    }
});
exports.config = (helper) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams();
    const name = misc_1.getCommitName();
    const email = misc_1.getCommitEmail();
    startProcess('Configuring git committer to be %s <%s>...', name, email);
    yield helper.config(pushDir, name, email);
});
exports.commit = (helper) => __awaiter(void 0, void 0, void 0, function* () { return helper.commit(misc_1.getParams().pushDir, misc_1.getCommitMessage(), { allowEmpty: true }); });
exports.getDeleteTestTag = (tagName, prefix, helper) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield helper.getTags(misc_1.getParams().pushDir, { quiet: true }))
        .filter(tag => getPrefixRegExp(prefix).test(tag))
        .map(tag => tag.replace(getPrefixRegExp(prefix), ''))
        .filter(tag => versionCompare(tag, tagName, false) < 0) // eslint-disable-line no-magic-numbers
        .map(tag => `${prefix}${tag}`);
});
exports.deleteTestTags = (helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const tagName = getTagName(context);
    const { pushDir } = misc_1.getParams();
    if (!misc_1.isTestTag(tagName) && misc_1.isEnabledCleanTestTag()) {
        const prefixForTestTag = misc_1.getTestTagPrefix();
        if (prefixForTestTag) {
            yield helper.deleteTag(pushDir, yield exports.getDeleteTestTag(tagName, prefixForTestTag, helper), context);
            const prefixForOriginalTag = misc_1.getOriginalTagPrefix();
            if (prefixForOriginalTag) {
                yield helper.deleteTag(pushDir, yield exports.getDeleteTestTag(tagName, prefixForOriginalTag + prefixForTestTag, helper), context);
            }
        }
    }
});
exports.push = (helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    const tagName = getTagName(context);
    startProcess('Pushing to %s@%s (tag: %s)...', getRepository(context), branchName, tagName);
    const prefixForOriginalTag = misc_1.getOriginalTagPrefix();
    if (prefixForOriginalTag) {
        const originalTag = prefixForOriginalTag + tagName;
        yield helper.fetchTags(pushDir, context);
        yield helper.copyTag(pushDir, originalTag, tagName, context);
    }
    const tagNames = misc_1.getCreateTags(tagName);
    yield helper.fetchTags(pushDir, context);
    yield exports.deleteTestTags(helper, context);
    // eslint-disable-next-line no-magic-numbers
    yield helper.deleteTag(pushDir, tagNames, context, 1);
    yield helper.addLocalTag(pushDir, tagNames);
    yield helper.push(pushDir, branchName, context, { withTag: true });
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
exports.prepareCommit = (helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.clone(helper, context);
    yield exports.checkBranch(yield helper.getCurrentBranchName(misc_1.getParams().pushDir), helper);
    yield exports.prepareFiles(helper, context);
    yield exports.createBuildInfoFile(context);
    yield exports.copyFiles();
});
const executeCommit = (release, helper, octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.config(helper);
    yield exports.commit(helper);
    yield exports.push(helper, context);
    yield exports.updateRelease(release, octokit, context);
    return true;
});
exports.deploy = (octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { branchName } = misc_1.getParams();
    startProcess('Deploying branch %s to %s...', branchName, getRepository(context));
    const helper = new github_action_helper_1.GitHelper(logger, { depth: misc_1.getFetchDepth() });
    const release = yield findRelease(octokit, context);
    yield exports.prepareCommit(helper, context);
    yield executeCommit(release, helper, octokit, context);
});
