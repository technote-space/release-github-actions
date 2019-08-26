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
const child_process_1 = require("child_process");
const misc_1 = require("./misc");
exports.deploy = (branch, context) => __awaiter(this, void 0, void 0, function* () {
    const workDir = path_1.default.resolve(misc_1.getWorkspace(), '.work');
    const buildDir = path_1.default.resolve(workDir, 'build');
    const pushDir = path_1.default.resolve(workDir, 'build');
    signale_1.default.info(`Deploying branch %s to %s`, branch, misc_1.getRepository(context));
    fs_1.default.mkdirSync(pushDir, { recursive: true });
    yield exports.prepareFiles(buildDir, pushDir, context);
    yield cloneForBranch(pushDir, branch, context);
    yield copyFiles(buildDir, pushDir);
    yield config(pushDir);
    yield commit(pushDir);
    yield push(pushDir, branch, context);
});
exports.prepareFiles = (buildDir, pushDir, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Preparing files for release');
    fs_1.default.mkdirSync(buildDir, { recursive: true });
    yield cloneForBuild(buildDir, context);
    yield runBuild(buildDir);
});
const cloneForBranch = (pushDir, branch, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info(`Cloning the branch %s from the remote repo`, branch);
    const url = misc_1.getGitUrl(context);
    yield execAsync(`git -C ${pushDir} clone --quiet --branch=${branch} --depth=1 ${url} .`, true, 'git clone', true);
});
const config = (pushDir) => __awaiter(this, void 0, void 0, function* () {
    const name = misc_1.getCommitName();
    const email = misc_1.getCommitEmail();
    signale_1.default.info('Configuring git committer to be %s <%s>', name, email);
    yield execAsync(`git -C ${pushDir} config user.name "${name}"`);
    yield execAsync(`git -C ${pushDir} config user.email "${email}"`);
});
const commit = (pushDir) => __awaiter(this, void 0, void 0, function* () {
    const message = misc_1.getCommitMessage();
    yield execAsync(`git -C ${pushDir} add --all --force`);
    yield execAsync(`git -C ${pushDir} commit -qm "${message}"`);
    yield execAsync(`git -C ${pushDir} show --stat-count=10 HEAD`);
});
const push = (pushDir, branch, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Pushing to %s@%s', misc_1.getRepository(context), branch);
    const url = misc_1.getGitUrl(context);
    yield execAsync(`git -C ${pushDir} push --quiet "${url}" "${branch}":"${branch}"`, true, 'git push');
});
const cloneForBuild = (buildDir, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('Cloning the working commit from the remote repo for build');
    const url = misc_1.getGitUrl(context);
    yield execAsync(`git -C ${buildDir} clone --depth=1 ${url} .`, true, 'git clone');
    yield execAsync(`git -C ${buildDir} fetch origin ${context.ref}`);
    yield execAsync(`git -C ${buildDir} checkout -qf ${context.sha}`);
});
const runBuild = (buildDir) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('=== Running build for release ===');
    let commands = misc_1.getBuildCommands();
    const buildCommand = misc_1.detectBuildCommand(buildDir);
    const hasInstallCommand = commands.filter(command => command.includes('npm run install') || command.includes('yarn install')).length > 0;
    if (!hasInstallCommand) {
        commands.push('yarn install');
    }
    if (typeof buildCommand === 'string') {
        commands = commands.filter(command => !buildCommand.startsWith(`npm run ${command}`) && !buildCommand.startsWith(`yarn ${command}`));
        commands.push(`yarn ${buildCommand}`);
    }
    if (!hasInstallCommand) {
        commands.push('yarn install --production');
    }
    const current = process.cwd();
    for (const command of commands) {
        yield execAsync(`cd ${buildDir} && ${command}`);
    }
    yield execAsync(`cd ${current}`);
});
const copyFiles = (buildDir, pushDir) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info('=== Copying %s contents to %s ===', buildDir, pushDir);
    yield execAsync(`rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`);
});
const execAsync = (command, quiet = false, altCommand = null, suppressError = false) => new Promise((resolve, reject) => {
    if (quiet && 'string' === typeof altCommand)
        signale_1.default.info(`Run command: ${altCommand}`);
    if (!quiet)
        signale_1.default.info(`Run command: ${command}`);
    child_process_1.exec(command + (quiet ? ' > /dev/null 2>&1' : '') + (suppressError ? ' || :' : ''), (error, stdout) => {
        if (error) {
            if (quiet) {
                if ('string' === typeof altCommand)
                    reject(new Error(`command [${altCommand}] exited with code ${error.code}.`));
                else
                    reject(new Error(`command exited with code ${error.code}.`));
            }
            else
                reject(new Error(`command [${command}] exited with code ${error.code}.`));
        }
        else {
            if (!quiet)
                console.log(stdout);
            resolve(stdout);
        }
    });
});
