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
const signale_1 = require("signale");
const figures_1 = __importDefault(require("figures"));
const child_process_1 = require("child_process");
const misc_1 = require("./misc");
const signale = new signale_1.Signale({
    types: {
        process: {
            badge: figures_1.default.tick,
            color: 'green',
            label: 'process',
            logLevel: 'info',
        },
        command: {
            badge: '  ',
            color: 'white',
            label: '        ',
            logLevel: 'info',
        },
        info: {
            color: 'cyan',
        },
    },
});
const getParams = () => {
    const workDir = path_1.default.resolve(misc_1.getWorkspace(), '.work');
    const buildDir = path_1.default.resolve(workDir, 'build');
    const pushDir = path_1.default.resolve(workDir, 'push');
    const branchName = misc_1.getBranchName();
    return { workDir, buildDir, pushDir, branchName };
};
exports.replaceDirectory = (message) => {
    const { workDir, buildDir, pushDir } = getParams();
    return message.replace(buildDir, '<Build Directory>').replace(pushDir, '<Push Directory>').replace(workDir, '<Working Directory>');
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const output = (type, message, ...args) => {
    signale[type](exports.replaceDirectory(message), ...args.map(arg => exports.replaceDirectory(arg)));
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const info = (message, ...args) => output('info', message, ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const note = (message, ...args) => output('process', `[${message}]`, ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayCommand = (message, ...args) => output('command', `  > ${message}`, ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayStdout = (message) => message.replace(/\r?\n$/, '').split(/\r?\n/).forEach(line => output('command', `   >> ${line}`));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayStderr = (message) => message.replace(/\r?\n$/, '').split(/\r?\n/).forEach(line => output('warn', `   >> ${line}`));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const startProcess = (message, ...args) => {
    signale.log();
    note(message, ...args);
};
exports.getCommand = (command, quiet, suppressError) => command + (quiet ? ' > /dev/null 2>&1' : '') + (suppressError ? ' || :' : '');
exports.getRejectedErrorMessage = (command, altCommand, quiet, error) => {
    if ('string' === typeof altCommand) {
        if (!quiet) {
            return `command [${altCommand}] exited with code ${error.code}. message: ${error.message}`;
        }
        else {
            return `command [${altCommand}] exited with code ${error.code}.`;
        }
    }
    else if (!quiet) {
        return `command [${command}] exited with code ${error.code}. message: ${error.message}`;
    }
    return `command exited with code ${error.code}.`;
};
exports.execCallback = (command, altCommand, quiet, suppressOutput, resolve, reject) => (error, stdout, stderr) => {
    if (error) {
        reject(exports.getRejectedErrorMessage(command, altCommand, quiet, error));
    }
    else {
        if (!quiet && !suppressOutput) {
            if (stdout) {
                displayStdout(stdout);
            }
            if (stderr) {
                displayStderr(stderr);
            }
        }
        resolve(stdout);
    }
};
exports.execAsync = (args) => new Promise((resolve, reject) => {
    const { command, cwd, altCommand, quiet = false, suppressError = false, suppressOutput = false } = args;
    if ('string' === typeof altCommand) {
        displayCommand(altCommand);
    }
    else if (!quiet) {
        displayCommand(command);
    }
    if (typeof cwd === 'undefined') {
        child_process_1.exec(exports.getCommand(command, quiet, suppressError), exports.execCallback(command, altCommand, quiet, suppressOutput, resolve, reject));
    }
    else {
        child_process_1.exec(exports.getCommand(command, quiet, suppressError), { cwd }, exports.execCallback(command, altCommand, quiet, suppressOutput, resolve, reject));
    }
});
const cloneForBuild = (context) => __awaiter(void 0, void 0, void 0, function* () {
    startProcess('Cloning the working commit from the remote repo for build');
    const { buildDir } = getParams();
    const url = misc_1.getGitUrl(context);
    const depth = misc_1.getFetchDepth();
    yield exports.execAsync({ command: `git -C ${buildDir} clone --depth=${depth} ${url} .`, quiet: true, altCommand: `git clone --depth=${depth}` });
    yield exports.execAsync({ command: `git -C ${buildDir} fetch "${url}" ${context.ref}`, quiet: true, altCommand: `git fetch origin ${context.ref}` });
    yield exports.execAsync({ command: `git -C ${buildDir} checkout -qf ${context.sha}` });
});
const runBuild = (buildDir) => __awaiter(void 0, void 0, void 0, function* () {
    startProcess('Running build for release');
    for (const command of misc_1.getBuildCommands(buildDir)) {
        yield exports.execAsync({ command, cwd: buildDir });
    }
});
exports.prepareFiles = (context) => __awaiter(void 0, void 0, void 0, function* () {
    startProcess('Preparing files for release');
    const { buildDir } = getParams();
    fs_1.default.mkdirSync(buildDir, { recursive: true });
    yield cloneForBuild(context);
    yield runBuild(buildDir);
});
exports.createBuildInfoFile = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const filename = misc_1.getOutputBuildInfoFilename();
    if (!filename) {
        return;
    }
    const { buildDir, branchName } = getParams();
    const tagName = misc_1.getTagName(context);
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
    const { pushDir } = getParams();
    if (!fs_1.default.existsSync(path_1.default.resolve(pushDir, '.git'))) {
        return '';
    }
    return (yield exports.execAsync({ command: `git -C ${pushDir} branch -a | grep -E '^\\*' | cut -b 3-` })).trim();
});
const gitInit = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = getParams();
    startProcess('Initializing local git repo');
    yield exports.execAsync({ command: `git -C ${pushDir} init .` });
});
const gitCheckout = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = getParams();
    startProcess('Checking out orphan branch %s', branchName);
    yield exports.execAsync({ command: `git -C ${pushDir} checkout --orphan "${branchName}"` });
});
exports.cloneForBranch = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = getParams();
    startProcess('Cloning the branch %s from the remote repo', branchName);
    const url = misc_1.getGitUrl(context);
    const depth = misc_1.getFetchDepth();
    yield exports.execAsync({
        command: `git -C ${pushDir} clone --branch=${branchName} --depth=${depth} ${url} .`,
        quiet: true,
        altCommand: `git clone --branch=${branchName} --depth=${depth}`,
        suppressError: true,
    });
});
exports.checkBranch = (clonedBranch) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = getParams();
    if (branchName !== clonedBranch) {
        info('remote branch %s not found.', branchName);
        info('now branch: %s', clonedBranch);
        yield exports.execAsync({ command: `rm -rdf ${pushDir}` });
        fs_1.default.mkdirSync(pushDir, { recursive: true });
        yield gitInit();
        yield gitCheckout();
    }
});
exports.config = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = getParams();
    const name = misc_1.getCommitName();
    const email = misc_1.getCommitEmail();
    startProcess('Configuring git committer to be %s <%s>', name, email);
    yield exports.execAsync({ command: `git -C ${pushDir} config user.name "${name}"` });
    yield exports.execAsync({ command: `git -C ${pushDir} config user.email "${email}"` });
});
const checkDiff = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = getParams();
    return !!(yield exports.execAsync({
        command: `git -C ${pushDir} status --short -uno`,
        quiet: false,
        suppressOutput: true,
    })).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).length;
});
exports.commit = () => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir } = getParams();
    const message = misc_1.getCommitMessage();
    yield exports.execAsync({ command: `git -C ${pushDir} add --all --force` });
    if (!(yield checkDiff())) {
        info('There is no diff.');
        return false;
    }
    yield exports.execAsync({ command: `git -C ${pushDir} commit -qm "${message}"` });
    yield exports.execAsync({ command: `git -C ${pushDir} show --stat-count=10 HEAD` });
    return true;
});
exports.push = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { pushDir, branchName } = getParams();
    const tagName = misc_1.getTagName(context);
    startProcess('Pushing to %s@%s (tag: %s)', misc_1.getRepository(context), branchName, tagName);
    const url = misc_1.getGitUrl(context);
    const prefix = misc_1.getOriginalTagPrefix();
    if (prefix) {
        yield exports.execAsync({ command: `git -C ${pushDir} fetch "${url}" --tags`, quiet: true, altCommand: 'git fetch origin --tags' });
        yield exports.execAsync({ command: `git -C ${pushDir} tag ${prefix}${tagName} ${tagName}` });
        yield exports.execAsync({
            command: `git -C ${pushDir} push "${url}" "refs/tags/${prefix}${tagName}"`,
            quiet: true,
            altCommand: `git push "refs/tags/${prefix}${tagName}"`,
        });
    }
    const tagNames = misc_1.getCreateTags(tagName);
    for (const tagName of tagNames) {
        yield exports.execAsync({
            command: `git -C ${pushDir} push --delete "${url}" tag ${tagName}`,
            quiet: true,
            altCommand: `git push --delete origin tag ${tagName}`,
            suppressError: true,
        });
    }
    yield exports.execAsync({ command: `git -C ${pushDir} tag -l | xargs git -C ${pushDir} tag -d` });
    yield exports.execAsync({ command: `git -C ${pushDir} fetch "${url}" --tags`, quiet: true, altCommand: 'git fetch origin --tags' });
    for (const tagName of tagNames) {
        yield exports.execAsync({ command: `git -C ${pushDir} tag ${tagName}` });
    }
    yield exports.execAsync({
        command: `git -C ${pushDir} push --tags "${url}" "${branchName}":"refs/heads/${branchName}"`,
        quiet: true,
        altCommand: `git push --tags "${branchName}":"refs/heads/${branchName}"`,
    });
});
const findRelease = (octokit, context) => __awaiter(void 0, void 0, void 0, function* () {
    const tagName = misc_1.getTagName(context);
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
    const { buildDir, pushDir } = getParams();
    startProcess('Copying %s contents to %s', buildDir, pushDir);
    yield exports.execAsync({ command: `rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}` });
});
exports.prepareCommit = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const { workDir, pushDir } = getParams();
    yield exports.execAsync({ command: `rm -rdf ${workDir}` });
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
    const { branchName } = getParams();
    startProcess('Deploying branch %s to %s', branchName, misc_1.getRepository(context));
    const release = yield findRelease(octokit, context);
    yield exports.prepareCommit(context);
    yield executeCommit(release, octokit, context);
});
