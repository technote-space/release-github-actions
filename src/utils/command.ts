import fs from 'fs';
import path from 'path';
import signale from 'signale';
import {exec} from 'child_process';
import {GitHub} from '@actions/github/lib/github';
import {Context} from '@actions/github/lib/context';
import {
    getGitUrl,
    getRepository,
    getBuildCommands,
    getWorkspace,
    getCommitMessage,
    getCommitName,
    getCommitEmail,
    getBranchName,
    getMajorTag,
    getMinorTag,
    uniqueArray,
} from './misc';

export const deploy = async (tagName: string, octokit: GitHub, context: Context) => {
    const workDir = path.resolve(getWorkspace(), '.work');
    const buildDir = path.resolve(workDir, 'build');
    const pushDir = path.resolve(workDir, 'push');
    const branchName = getBranchName();
    signale.info('Deploying branch %s to %s', branchName, getRepository(context));

    fs.mkdirSync(pushDir, {recursive: true});
    if (!await cloneForBranch(pushDir, branchName, context)) return;
    if (!await prepareFiles(buildDir, pushDir, context)) return;
    if (!await copyFiles(buildDir, pushDir)) return;
    if (!await config(pushDir)) return;
    if (!await commit(pushDir)) return;
    if (!await push(pushDir, tagName, branchName, context)) return;
    await updateRelease(tagName, octokit, context);
};

export const prepareFiles = async (buildDir: string, pushDir: string, context: Context): Promise<boolean> => {
    signale.info('Preparing files for release');

    fs.mkdirSync(buildDir, {recursive: true});
    await cloneForBuild(buildDir, context);
    await runBuild(buildDir);
    return true;
};

const cloneForBranch = async (pushDir: string, branchName: string, context: Context): Promise<boolean> => {
    signale.info('Cloning the branch %s from the remote repo', branchName);

    const url = getGitUrl(context);
    await execAsync(`git -C ${pushDir} clone --quiet --branch=${branchName} --depth=1 ${url} .`, true, 'git clone', true);

    const clonedBranch = await getCurrentBranchName(pushDir);
    if (branchName !== clonedBranch) {
        signale.info('remote branch %s not found.', branchName);
        signale.info('now branch: %s', clonedBranch);

        await execAsync(`rm -rdf ${pushDir}`);
        fs.mkdirSync(pushDir, {recursive: true});
        await gitInit(pushDir);
        await gitCheckout(pushDir, branchName);
    }
    return true;
};

const getCurrentBranchName = async (pushDir: string): Promise<string> => {
    if (!fs.existsSync(path.resolve(pushDir, '.git'))) {
        return '';
    }
    return (await execAsync(`git -C ${pushDir} branch -a | grep -E '^\\*' | cut -b 3-`)).trim();
};

const gitInit = async (pushDir: string) => {
    signale.info('Initializing local git repo');

    await execAsync(`git -C ${pushDir} init .`);
};

const gitCheckout = async (pushDir: string, branchName: string) => {
    signale.info('Checking out orphan branch %s', branchName);

    await execAsync(`git -C ${pushDir} checkout --orphan "${branchName}"`);
};

const config = async (pushDir: string): Promise<boolean> => {
    const name = getCommitName();
    const email = getCommitEmail();
    signale.info('Configuring git committer to be %s <%s>', name, email);

    await execAsync(`git -C ${pushDir} config user.name "${name}"`);
    await execAsync(`git -C ${pushDir} config user.email "${email}"`);
    return true;
};

const commit = async (pushDir: string): Promise<boolean> => {
    const message = getCommitMessage();
    await execAsync(`git -C ${pushDir} add --all --force`);
    if (!await checkDiff(pushDir)) {
        signale.info('There is no diff.');
        return false;
    }
    await execAsync(`git -C ${pushDir} commit -qm "${message}"`);
    await execAsync(`git -C ${pushDir} show --stat-count=10 HEAD`);
    return true;
};

const push = async (pushDir: string, tagName: string, branchName: string, context: Context): Promise<boolean> => {
    signale.info('Pushing to %s@%s (tag: %s)', getRepository(context), branchName, tagName);

    const url = getGitUrl(context);
    const tagNames = uniqueArray([tagName, getMajorTag(tagName), getMinorTag(tagName)]);
    for (const tagName of tagNames) {
        await execAsync(`git -C ${pushDir} push --delete "${url}" tag ${tagName}`, true, 'git push --delete origin tag', true);
    }
    await execAsync(`git -C ${pushDir} tag -l | xargs git -C ${pushDir} tag -d`);
    await execAsync(`git -C ${pushDir} fetch "${url}" --tags`, true, 'git fetch origin --tags');
    for (const tagName of tagNames) {
        await execAsync(`git -C ${pushDir} tag ${tagName}`);
    }
    await execAsync(`git -C ${pushDir} push --quiet --tags "${url}" "${branchName}":"refs/heads/${branchName}"`, true, `git push --tags "${branchName}":"refs/heads/${branchName}"`);
    return true;
};

const updateRelease = async (tagName: string, octokit: GitHub, context: Context): Promise<boolean> => {
    const releases = await octokit.repos.listReleases({
        owner: context.repo.owner,
        repo: context.repo.repo,
    });
    const release = releases.data.find(release => release.tag_name === tagName);
    if (!release) {
        signale.warn('There is no release that has tag name: %s', tagName);
        return false;
    }

    await octokit.repos.updateRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: release.id,
        draft: false,
    });
    return true;
};

const cloneForBuild = async (buildDir: string, context: Context) => {
    signale.info('Cloning the working commit from the remote repo for build');

    const url = getGitUrl(context);
    await execAsync(`git -C ${buildDir} clone --depth=1 ${url} .`, true, 'git clone --depth=1');
    await execAsync(`git -C ${buildDir} fetch "${url}" ${context.ref}`, true, `git fetch origin ${context.ref}`);
    await execAsync(`git -C ${buildDir} checkout -qf ${context.sha}`);
};

const runBuild = async (buildDir: string) => {
    signale.info('=== Running build for release ===');

    const current = process.cwd();
    for (const command of getBuildCommands(buildDir)) {
        await execAsync(`cd ${buildDir} && ${command}`);
    }
    await execAsync(`cd ${current}`);
};

const copyFiles = async (buildDir: string, pushDir: string): Promise<boolean> => {
    signale.info('=== Copying %s contents to %s ===', buildDir, pushDir);

    await execAsync(`rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`);
    return true;
};

const checkDiff = async (pushDir: string): Promise<boolean> => {
    return (await execAsync(`git -C ${pushDir} status --short -uno`)).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).length > 0;
};

const execAsync = (command: string, quiet: boolean = false, altCommand: string | null = null, suppressError: boolean = false) => new Promise<string>((resolve, reject) => {
    if ('string' === typeof altCommand) signale.info('Run command: %s', altCommand);
    else if (!quiet) signale.info('Run command: %s', command);
    exec(command + (quiet ? ' > /dev/null 2>&1' : '') + (suppressError ? ' || :' : ''), (error, stdout) => {
        if (error) {
            if ('string' === typeof altCommand && !quiet) reject(new Error(`command [${altCommand}] exited with code ${error.code}. message: ${error.message}`));
            else if ('string' === typeof altCommand) reject(new Error(`command [${altCommand}] exited with code ${error.code}.`));
            else if (!quiet) reject(new Error(`command [${command}] exited with code ${error.code}. message: ${error.message}`));
            else reject(new Error(`command exited with code ${error.code}.`));
        } else {
            if (!quiet) console.log(stdout);
            resolve(stdout);
        }
    });
});
