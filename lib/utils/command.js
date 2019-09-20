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
const { getGitUrl, getRepository, getTagName, } = github_action_helper_1.Utils;
exports.replaceDirectory = (message) => {
    const directories = misc_1.getReplaceDirectory();
    return Object.keys(directories).reduce((value, directory) => value.replace(` -C ${directory}`, '').replace(directory, directories[directory]), message);
};
const logger = new github_action_helper_1.Logger(exports.replaceDirectory);
const command = new github_action_helper_1.Command(logger);
const { startProcess, info } = logger;
const { execAsync } = command;
const cloneForBuild = (context) => __awaiter(void 0, void 0, void 0, function* () {
    startProcess('Cloning the working commit from the remote repo for build');
    const { buildDir } = misc_1.getParams();
    const url = getGitUrl(context);
    const depth = misc_1.getFetchDepth();
    if (depth && context.sha) {
        yield execAsync({ command: `git -C ${buildDir} clone --depth=${depth} ${url} .`, quiet: true, altCommand: `git clone --depth=${depth}` });
        yield execAsync({ command: `git -C ${buildDir} fetch ${url} ${context.ref}`, quiet: true, altCommand: `git fetch origin ${context.ref}` });
        yield execAsync({ command: `git -C ${buildDir} checkout -qf ${context.sha}` });
    }
    else {
        const checkout = context.sha || context.ref.replace(/^refs\/heads\//, '');
        yield execAsync({ command: `git -C ${buildDir} clone ${url} .`, quiet: true, altCommand: 'git clone' });
        yield execAsync({ command: `git -C ${buildDir} checkout -qf ${checkout}` });
    }
});
const runBuild = (buildDir) => __awaiter(void 0, void 0, void 0, function* () {
    startProcess('Running build for release');
    for (const command of misc_1.getBuildCommands(buildDir)) {
        yield execAsync({ command, cwd: buildDir });
    }
});
exports.prepareFiles = (context) => __awaiter(void 0, void 0, void 0, function* () {
    startProcess('Preparing files for release');
    const { buildDir } = misc_1.getParams();
    fs_1.default.mkdirSync(buildDir, { recursive: true });
    yield cloneForBuild(context);
    yield runBuild(buildDir);
});
exports.createBuildInfoFile = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const filename = misc_1.getOutputBuildInfoFilename();
    if (!filename) {
        return;
    }
    const { buildDir, branchName } = misc_1.getParams();
    const tagName = getTagName(context);
    startProcess('Creating build info file');
    const filepath = path_1.default.resolve(buildDir, filename);
    const dir = path_1.default.dirname(filepath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    fs_1.default.writeFileSync(filepath, JSON.stringify({
        'tagName': tagName,
        'branch': branchName,
        'tags': misc_1.getCreateTags(tagName),
        'updated_at': moment_1.default().toISOString(),
    }));
});
exports.getCurrentBranchName = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams();
    if (!fs_1.default.existsSync(path_1.default.resolve(pushDir, '.git'))) {
        return '';
    }
    return (yield execAsync({ command: `git -C ${pushDir} branch -a | grep -E '^\\*' | cut -b 3-` })).trim();
});
const gitInit = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams();
    startProcess('Initializing local git repo');
    yield execAsync({ command: `git -C ${pushDir} init .` });
});
const gitCheckout = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    startProcess('Checking out orphan branch %s', branchName);
    yield execAsync({ command: `git -C ${pushDir} checkout --orphan "${branchName}"` });
});
exports.cloneForBranch = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    startProcess('Cloning the branch %s from the remote repo', branchName);
    const url = getGitUrl(context);
    const depth = misc_1.getFetchDepth();
    yield execAsync({
        command: `git -C ${pushDir} clone --branch=${branchName} --depth=${depth} ${url} .`,
        quiet: true,
        altCommand: `git clone --branch=${branchName} --depth=${depth}`,
        suppressError: true,
    });
});
exports.checkBranch = (clonedBranch) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    if (branchName !== clonedBranch) {
        info('remote branch %s not found.', branchName);
        info('now branch: %s', clonedBranch);
        yield execAsync({ command: `rm -rdf ${pushDir}` });
        fs_1.default.mkdirSync(pushDir, { recursive: true });
        yield gitInit();
        yield gitCheckout();
    }
});
exports.config = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams();
    const name = misc_1.getCommitName();
    const email = misc_1.getCommitEmail();
    startProcess('Configuring git committer to be %s <%s>', name, email);
    yield execAsync({ command: `git -C ${pushDir} config user.name "${name}"` });
    yield execAsync({ command: `git -C ${pushDir} config user.email "${email}"` });
});
const checkDiff = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams();
    return !!(yield execAsync({
        command: `git -C ${pushDir} status --short -uno`,
        quiet: false,
        suppressOutput: true,
    })).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).length;
});
exports.commit = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = misc_1.getParams();
    const message = misc_1.getCommitMessage();
    yield execAsync({ command: `git -C ${pushDir} add --all --force` });
    if (!(yield checkDiff())) {
        info('There is no diff.');
        return false;
    }
    yield execAsync({ command: `git -C ${pushDir} commit -qm "${message}"` });
    yield execAsync({ command: `git -C ${pushDir} show --stat-count=10 HEAD` });
    return true;
});
exports.push = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = misc_1.getParams();
    const tagName = getTagName(context);
    startProcess('Pushing to %s@%s (tag: %s)', getRepository(context), branchName, tagName);
    const url = getGitUrl(context);
    const prefix = misc_1.getOriginalTagPrefix();
    if (prefix) {
        yield execAsync({ command: `git -C ${pushDir} fetch "${url}" --tags`, quiet: true, altCommand: 'git fetch origin --tags' });
        yield execAsync({ command: `git -C ${pushDir} tag ${prefix}${tagName} ${tagName}` });
        yield execAsync({
            command: `git -C ${pushDir} push "${url}" "refs/tags/${prefix}${tagName}"`,
            quiet: true,
            altCommand: `git push "refs/tags/${prefix}${tagName}"`,
        });
    }
    const tagNames = misc_1.getCreateTags(tagName);
    for (const tagName of tagNames) {
        yield execAsync({
            command: `git -C ${pushDir} push --delete "${url}" tag ${tagName}`,
            quiet: true,
            altCommand: `git push --delete origin tag ${tagName}`,
            suppressError: true,
        });
    }
    yield execAsync({ command: `git -C ${pushDir} tag -l | xargs git -C ${pushDir} tag -d` });
    yield execAsync({ command: `git -C ${pushDir} fetch "${url}" --tags`, quiet: true, altCommand: 'git fetch origin --tags' });
    for (const tagName of tagNames) {
        yield execAsync({ command: `git -C ${pushDir} tag ${tagName}` });
    }
    yield execAsync({
        command: `git -C ${pushDir} push --tags "${url}" "${branchName}":"refs/heads/${branchName}"`,
        quiet: true,
        altCommand: `git push --tags "${branchName}":"refs/heads/${branchName}"`,
    });
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
    startProcess('Re-publishing release');
    yield octokit.repos.updateRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        'release_id': release.id,
        draft: false,
    });
});
exports.copyFiles = () => __awaiter(void 0, void 0, void 0, function* () {
    const { buildDir, pushDir } = misc_1.getParams();
    startProcess('Copying %s contents to %s', buildDir, pushDir);
    yield execAsync({ command: `rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}` });
});
exports.prepareCommit = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { workDir, pushDir } = misc_1.getParams();
    yield execAsync({ command: `rm -rdf ${workDir}` });
    fs_1.default.mkdirSync(pushDir, { recursive: true });
    yield exports.cloneForBranch(context);
    yield exports.checkBranch(yield exports.getCurrentBranchName());
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
    startProcess('Deploying branch %s to %s', branchName, getRepository(context));
    const release = yield findRelease(octokit, context);
    yield exports.prepareCommit(context);
    yield executeCommit(release, octokit, context);
});
