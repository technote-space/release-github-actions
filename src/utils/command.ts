import fs from 'fs';
import path from 'path';
import signale from 'signale';
import {exec} from 'child_process';
import {Context} from '@actions/github/lib/context';
import {getGitUrl, getRepository, getBuildCommands, getWorkspace, getCommitMessage, getCommitName, getCommitEmail, detectBuildCommand} from './misc';

export const deploy = async (branch: string, context: Context) => {
    const workDir = path.resolve(getWorkspace(), '.work');
    const buildDir = path.resolve(workDir, 'build');
    const pushDir = path.resolve(workDir, 'push');
    signale.info(`Deploying branch %s to %s`, branch, getRepository(context));

    fs.mkdirSync(pushDir, {recursive: true});
    await prepareFiles(buildDir, pushDir, context);
    await cloneForBranch(pushDir, branch, context);
    await copyFiles(buildDir, pushDir);
    await config(pushDir);
    await commit(pushDir);
    await push(pushDir, branch, context);
};

export const prepareFiles = async (buildDir: string, pushDir: string, context: Context) => {
    signale.info('Preparing files for release');

    fs.mkdirSync(buildDir, {recursive: true});
    await cloneForBuild(buildDir, context);
    await runBuild(buildDir);
};

const cloneForBranch = async (pushDir: string, branch: string, context: Context) => {
    signale.info(`Cloning the branch %s from the remote repo`, branch);

    const url = getGitUrl(context);
    await execAsync(`git -C ${pushDir} clone --quiet --branch=${branch} --depth=1 ${url} .`, true, 'git clone', true);
    if (!fs.existsSync(path.resolve(pushDir, '.git'))) {
        await gitInit(pushDir);
        await gitCheckout(pushDir, branch);
    }
};

const gitInit = async (pushDir: string) => {
    signale.info('Initializing local git repo');

    await execAsync(`git -C ${pushDir} init .`);

};

const gitCheckout = async (pushDir: string, branch: string) => {
    signale.info('Checking out orphan branch %s', branch);

    await execAsync(`git -C ${pushDir} checkout --orphan "${branch}"`);
};

const config = async (pushDir: string) => {
    const name = getCommitName();
    const email = getCommitEmail();
    signale.info('Configuring git committer to be %s <%s>', name, email);

    await execAsync(`git -C ${pushDir} config user.name "${name}"`);
    await execAsync(`git -C ${pushDir} config user.email "${email}"`);
};

const commit = async (pushDir: string) => {
    const message = getCommitMessage();
    await execAsync(`git -C ${pushDir} add --all --force`);
    await execAsync(`git -C ${pushDir} commit -qm "${message}"`);
    await execAsync(`git -C ${pushDir} show --stat-count=10 HEAD`);
};

const push = async (pushDir: string, branch: string, context: Context) => {
    signale.info('Pushing to %s@%s', getRepository(context), branch);

    const url = getGitUrl(context);
    await execAsync(`git -C ${pushDir} push --quiet "${url}" "${branch}":"${branch}"`, true, 'git push');
};

const cloneForBuild = async (buildDir: string, context: Context) => {
    signale.info('Cloning the working commit from the remote repo for build');

    const url = getGitUrl(context);
    await execAsync(`git -C ${buildDir} clone --depth=1 ${url} .`, true, 'git clone');
    await execAsync(`git -C ${buildDir} fetch origin ${context.ref}`);
    await execAsync(`git -C ${buildDir} checkout -qf ${context.sha}`);
};

const runBuild = async (buildDir: string) => {
    signale.info('=== Running build for release ===');
    let commands = getBuildCommands();
    const buildCommand = detectBuildCommand(buildDir);
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
        await execAsync(`cd ${buildDir} && ${command}`);
    }
    await execAsync(`cd ${current}`);
};

const copyFiles = async (buildDir: string, pushDir: string) => {
    signale.info('=== Copying %s contents to %s ===', buildDir, pushDir);

    await execAsync(`rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`);
};

const execAsync = (command: string, quiet: boolean = false, altCommand: string | null = null, suppressError: boolean = false) => new Promise<string>((resolve, reject) => {
    if ('string' === typeof altCommand) signale.info(`Run command: ${altCommand}`);
    else if (!quiet) signale.info(`Run command: ${command}`);
    exec(command + (quiet ? ' > /dev/null 2>&1' : '') + (suppressError ? ' || :' : ''), (error, stdout) => {
        if (error) {
            if ('string' === typeof altCommand) reject(new Error(`command [${altCommand}] exited with code ${error.code}.`));
            else if (!quiet) reject(new Error(`command [${command}] exited with code ${error.code}.`));
            else reject(new Error(`command exited with code ${error.code}.`));
        } else {
            if (!quiet) console.log(stdout);
            resolve(stdout);
        }
    });
});
