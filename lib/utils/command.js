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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const signale_1 = __importDefault(require("signale"));
const moment_1 = __importDefault(require("moment"));
const child_process_1 = require("child_process");
const misc_1 = require("./misc");
exports.deploy = (tagName, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    const workDir = path_1.default.resolve(misc_1.getWorkspace(), '.work');
    const buildDir = path_1.default.resolve(workDir, 'build');
    const pushDir = path_1.default.resolve(workDir, 'push');
    const branchName = misc_1.getBranchName();
    signale_1.default.info('Deploying branch %s to %s', branchName, misc_1.getRepository(context));
    fs_1.default.mkdirSync(pushDir, { recursive: true });
    if (!(yield cloneForBranch(pushDir, branchName, context)))
        return;
    if (!(yield exports.prepareFiles(buildDir, pushDir, tagName, context)))
        return;
    if (!(yield createBuildInfoFile(buildDir, tagName, branchName)))
        return;
    if (!(yield copyFiles(buildDir, pushDir)))
        return;
    if (!(yield config(pushDir)))
        return;
    if (!(yield commit(pushDir)))
        return;
    if (!(yield push(pushDir, tagName, branchName, context)))
        return;
    yield updateRelease(tagName, octokit, context);
});
exports.prepareFiles = (buildDir, pushDir, tagName, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Preparing files for release');
    fs_1.default.mkdirSync(buildDir, { recursive: true });
    yield cloneForBuild(buildDir, context);
    yield runBuild(buildDir);
    return true;
});
const createBuildInfoFile = (buildDir, tagName, branchName) => __awaiter(this, void 0, void 0, function* () {
    const filename = misc_1.getOutputBuildInfoFilename();
    if (!filename)
        return true;
    signale_1.default.info('Creating build info file');
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
    return true;
});
const cloneForBranch = (pushDir, branchName, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Cloning the branch %s from the remote repo', branchName);
    const url = misc_1.getGitUrl(context);
    yield execAsync(`git -C ${pushDir} clone --quiet --branch=${branchName} --depth=1 ${url} .`, true, 'git clone', true);
    const clonedBranch = yield getCurrentBranchName(pushDir);
    if (branchName !== clonedBranch) {
        signale_1.default.info('remote branch %s not found.', branchName);
        signale_1.default.info('now branch: %s', clonedBranch);
        yield execAsync(`rm -rdf ${pushDir}`);
        fs_1.default.mkdirSync(pushDir, { recursive: true });
        yield gitInit(pushDir);
        yield gitCheckout(pushDir, branchName);
    }
    return true;
});
const getCurrentBranchName = (pushDir) => __awaiter(this, void 0, void 0, function* () {
    if (!fs_1.default.existsSync(path_1.default.resolve(pushDir, '.git'))) {
        return '';
    }
    return (yield execAsync(`git -C ${pushDir} branch -a | grep -E '^\\*' | cut -b 3-`)).trim();
});
const gitInit = (pushDir) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Initializing local git repo');
    yield execAsync(`git -C ${pushDir} init .`);
});
const gitCheckout = (pushDir, branchName) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Checking out orphan branch %s', branchName);
    yield execAsync(`git -C ${pushDir} checkout --orphan "${branchName}"`);
});
const config = (pushDir) => __awaiter(this, void 0, void 0, function* () {
    const name = misc_1.getCommitName();
    const email = misc_1.getCommitEmail();
    signale_1.default.info('Configuring git committer to be %s <%s>', name, email);
    yield execAsync(`git -C ${pushDir} config user.name "${name}"`);
    yield execAsync(`git -C ${pushDir} config user.email "${email}"`);
    return true;
});
const commit = (pushDir) => __awaiter(this, void 0, void 0, function* () {
    const message = misc_1.getCommitMessage();
    yield execAsync(`git -C ${pushDir} add --all --force`);
    if (!(yield checkDiff(pushDir))) {
        signale_1.default.info('There is no diff.');
        return false;
    }
    yield execAsync(`git -C ${pushDir} commit -qm "${message}"`);
    yield execAsync(`git -C ${pushDir} show --stat-count=10 HEAD`);
    return true;
});
const push = (pushDir, tagName, branchName, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Pushing to %s@%s (tag: %s)', misc_1.getRepository(context), branchName, tagName);
    const url = misc_1.getGitUrl(context);
    const tagNames = misc_1.getCreateTags(tagName);
    for (const tagName of tagNames) {
        yield execAsync(`git -C ${pushDir} push --delete "${url}" tag ${tagName}`, true, `git push --delete origin tag ${tagName}`, true);
    }
    yield execAsync(`git -C ${pushDir} tag -l | xargs git -C ${pushDir} tag -d`);
    yield execAsync(`git -C ${pushDir} fetch "${url}" --tags`, true, 'git fetch origin --tags');
    for (const tagName of tagNames) {
        yield execAsync(`git -C ${pushDir} tag ${tagName}`);
    }
    yield execAsync(`git -C ${pushDir} push --quiet --tags "${url}" "${branchName}":"refs/heads/${branchName}"`, true, `git push --tags "${branchName}":"refs/heads/${branchName}"`);
    return true;
});
const updateRelease = (tagName, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    const releases = yield octokit.repos.listReleases({
        owner: context.repo.owner,
        repo: context.repo.repo,
    });
    const release = releases.data.find(release => release.tag_name === tagName);
    if (!release) {
        signale_1.default.warn('There is no release that has tag name: %s', tagName);
        return false;
    }
    yield octokit.repos.updateRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: release.id,
        draft: false,
    });
    return true;
});
const cloneForBuild = (buildDir, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Cloning the working commit from the remote repo for build');
    const url = misc_1.getGitUrl(context);
    yield execAsync(`git -C ${buildDir} clone --depth=1 ${url} .`, true, 'git clone --depth=1');
    yield execAsync(`git -C ${buildDir} fetch "${url}" ${context.ref}`, true, `git fetch origin ${context.ref}`);
    yield execAsync(`git -C ${buildDir} checkout -qf ${context.sha}`);
});
const runBuild = (buildDir) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('=== Running build for release ===');
    const current = process.cwd();
    for (const command of misc_1.getBuildCommands(buildDir)) {
        yield execAsync(`cd ${buildDir} && ${command}`);
    }
    yield execAsync(`cd ${current}`);
});
const copyFiles = (buildDir, pushDir) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('=== Copying %s contents to %s ===', buildDir, pushDir);
    yield execAsync(`rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`);
    return true;
});
const checkDiff = (pushDir) => __awaiter(this, void 0, void 0, function* () {
    return (yield execAsync(`git -C ${pushDir} status --short -uno`, false, null, false, true)).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).length > 0;
});
const execAsync = (command, quiet = false, altCommand = null, suppressError = false, suppressOutput = false) => new Promise((resolve, reject) => {
    if ('string' === typeof altCommand)
        signale_1.default.info('Run command: %s', altCommand);
    else if (!quiet)
        signale_1.default.info('Run command: %s', command);
    child_process_1.exec(command + (quiet ? ' > /dev/null 2>&1' : '') + (suppressError ? ' || :' : ''), (error, stdout) => {
        if (error) {
            if ('string' === typeof altCommand && !quiet)
                reject(new Error(`command [${altCommand}] exited with code ${error.code}. message: ${error.message}`));
            else if ('string' === typeof altCommand)
                reject(new Error(`command [${altCommand}] exited with code ${error.code}.`));
            else if (!quiet)
                reject(new Error(`command [${command}] exited with code ${error.code}. message: ${error.message}`));
            else
                reject(new Error(`command exited with code ${error.code}.`));
        }
        else {
            if (!quiet && !suppressOutput)
                console.log(stdout);
            resolve(stdout);
        }
    });
});
