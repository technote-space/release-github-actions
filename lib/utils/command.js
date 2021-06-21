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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = exports.prepareCommit = exports.copyFiles = exports.updateRelease = exports.push = exports.deleteTestTags = exports.getDeleteTestTag = exports.commit = exports.config = exports.checkBranch = exports.clone = exports.createBuildInfoFile = exports.prepareFiles = exports.replaceDirectory = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const github_action_helper_1 = require("@technote-space/github-action-helper");
const github_action_log_helper_1 = require("@technote-space/github-action-log-helper");
const misc_1 = require("./misc");
const replaceDirectory = (context) => (message) => {
    const directories = misc_1.getReplaceDirectory(context);
    return Object.keys(directories).reduce((value, directory) => github_action_helper_1.Utils.replaceAll(github_action_helper_1.Utils.replaceAll(value, ` -C ${directory}`, ''), directory, directories[directory]), message);
};
exports.replaceDirectory = replaceDirectory;
const prepareFiles = (logger, helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { buildDir, pushDir } = misc_1.getParams(context);
    fs_1.mkdirSync(buildDir, { recursive: true });
    logger.startProcess('Cloning the remote repo for build...');
    yield helper.checkout(buildDir, context);
    logger.startProcess('Running build for release...');
    yield helper.runCommand(buildDir, misc_1.getBuildCommands(buildDir, pushDir));
});
exports.prepareFiles = prepareFiles;
const createBuildInfoFile = (logger, context) => __awaiter(void 0, void 0, void 0, function* () {
    const filename = misc_1.getOutputBuildInfoFilename();
    if (!filename) {
        return;
    }
    const { buildDir, branchName, tagName } = misc_1.getParams(context);
    logger.startProcess('Creating build info file...');
    const filepath = path_1.resolve(buildDir, filename);
    const dir = path_1.dirname(filepath);
    if (!fs_1.existsSync(dir)) {
        fs_1.mkdirSync(dir, { recursive: true });
    }
    fs_1.writeFileSync(filepath, JSON.stringify({
        owner: context.repo.owner,
        repo: context.repo.repo,
        sha: context.sha,
        ref: context.ref,
        tagName: tagName,
        branch: branchName,
        tags: misc_1.getCreateTags(tagName),
        'updated_at': (new Date).toISOString(),
    }));
});
exports.createBuildInfoFile = createBuildInfoFile;
const clone = (logger, helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams(context);
    logger.startProcess('Fetching...');
    yield helper.fetchOrigin(pushDir, context, ['--no-tags'], [github_action_helper_1.Utils.getRefspec(branchName)]);
    logger.startProcess('Switching branch to [%s]...', branchName);
    yield helper.switchBranch(pushDir, branchName);
});
exports.clone = clone;
const checkBranch = (clonedBranch, logger, helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams(context);
    if (branchName !== clonedBranch) {
        logger.info('remote branch %s not found.', branchName);
        logger.info('now branch: %s', clonedBranch);
        logger.startProcess('Initializing local git repo [%s]...', branchName);
        yield helper.gitInit(pushDir, branchName);
    }
});
exports.checkBranch = checkBranch;
const config = (logger, helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams(context);
    const name = misc_1.getCommitName();
    const email = misc_1.getCommitEmail();
    logger.startProcess('Configuring git committer to be %s <%s>...', name, email);
    yield helper.config(pushDir, { name, email });
});
exports.config = config;
const commit = (helper, context) => __awaiter(void 0, void 0, void 0, function* () { return helper.commit(misc_1.getParams(context).pushDir, misc_1.getCommitMessage(), { allowEmpty: true }); });
exports.commit = commit;
const getDeleteTestTag = (tagName, prefix, helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield helper.getTags(misc_1.getParams(context).pushDir, { quiet: true }))
        .filter(tag => github_action_helper_1.Utils.getPrefixRegExp(prefix).test(tag))
        .map(tag => tag.replace(github_action_helper_1.Utils.getPrefixRegExp(prefix), ''))
        .filter(tag => github_action_helper_1.Utils.versionCompare(tag, tagName, false) < 0) // eslint-disable-line no-magic-numbers
        .map(tag => `${prefix}${tag}`);
});
exports.getDeleteTestTag = getDeleteTestTag;
const deleteTestTags = (helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, tagName } = misc_1.getParams(context);
    if (!misc_1.isTestTag(tagName) && misc_1.isEnabledCleanTestTag()) {
        const prefixForTestTag = misc_1.getTestTagPrefix();
        if (prefixForTestTag) {
            yield helper.deleteTag(pushDir, yield exports.getDeleteTestTag(tagName, prefixForTestTag, helper, context), context);
            const prefixForOriginalTag = misc_1.getOriginalTagPrefix();
            if (prefixForOriginalTag) {
                yield helper.deleteTag(pushDir, yield exports.getDeleteTestTag(tagName, prefixForOriginalTag + prefixForTestTag, helper, context), context);
            }
        }
    }
});
exports.deleteTestTags = deleteTestTags;
const push = (logger, helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName, tagName, branchNames } = misc_1.getParams(context);
    logger.startProcess('Pushing to %s@%s (tag: %s)...', github_action_helper_1.ContextHelper.getRepository(context), branchName, tagName);
    const prefixForOriginalTag = misc_1.getOriginalTagPrefix();
    if (prefixForOriginalTag) {
        const originalTag = prefixForOriginalTag + tagName;
        yield helper.fetchTags(pushDir, context);
        yield helper.copyTag(pushDir, originalTag, tagName, context);
    }
    const tagNames = misc_1.getCreateTags(tagName);
    yield helper.fetchTags(pushDir, context);
    yield exports.deleteTestTags(helper, context);
    yield helper.deleteLocalTag(pushDir, tagNames);
    yield helper.addLocalTag(pushDir, tagNames);
    yield helper.push(pushDir, branchName, context, { withTag: true, force: true });
    yield branchNames.reduce((prev, branch) => __awaiter(void 0, void 0, void 0, function* () {
        yield prev;
        yield helper.createBranch(pushDir, branch);
        yield helper.forcePush(pushDir, branch, context);
    }), Promise.resolve());
});
exports.push = push;
const findRelease = (octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { tagName } = misc_1.getParams(context);
    const releases = yield octokit.rest.repos.listReleases({
        owner: context.repo.owner,
        repo: context.repo.repo,
    });
    return releases.data.find(release => release.tag_name === tagName);
});
const updateRelease = (release, logger, octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    if (!release || release.draft) {
        return;
    }
    logger.startProcess('Re-publishing release...');
    yield octokit.rest.repos.updateRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        'release_id': release.id,
        draft: false,
    });
});
exports.updateRelease = updateRelease;
const copyFiles = (logger, command, context) => __awaiter(void 0, void 0, void 0, function* () {
    const { buildDir, pushDir } = misc_1.getParams(context);
    logger.startProcess('Copying %s contents to %s...', buildDir, pushDir);
    yield command.execAsync({
        command: 'rsync',
        args: ['-rl', '--exclude', '.git', '--delete', `${buildDir}/`, pushDir],
    });
});
exports.copyFiles = copyFiles;
const prepareCommit = (logger, command, helper, context) => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.clone(logger, helper, context);
    yield exports.checkBranch(yield helper.getCurrentBranchName(misc_1.getParams(context).pushDir), logger, helper, context);
    yield exports.prepareFiles(logger, helper, context);
    yield exports.createBuildInfoFile(logger, context);
    yield exports.copyFiles(logger, command, context);
});
exports.prepareCommit = prepareCommit;
const executeCommit = (release, logger, helper, octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.config(logger, helper, context);
    yield exports.commit(helper, context);
    yield exports.push(logger, helper, context);
    yield exports.updateRelease(release, logger, octokit, context);
    return true;
});
const deploy = (octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    const logger = new github_action_log_helper_1.Logger(exports.replaceDirectory(context));
    const command = new github_action_helper_1.Command(logger);
    const { branchName } = misc_1.getParams(context);
    logger.startProcess('Deploying branch %s to %s...', branchName, github_action_helper_1.ContextHelper.getRepository(context));
    const helper = new github_action_helper_1.GitHelper(logger, { depth: misc_1.getFetchDepth() });
    const release = yield findRelease(octokit, context);
    yield exports.prepareCommit(logger, command, helper, context);
    yield executeCommit(release, logger, helper, octokit, context);
});
exports.deploy = deploy;
