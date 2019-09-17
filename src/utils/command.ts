import fs from 'fs';
import moment from 'moment';
import path from 'path';
import signale from 'signale';
import { exec, ExecException } from 'child_process';
import { GitHub } from '@actions/github/lib/github';
import { Context } from '@actions/github/lib/context';
import {
	getGitUrl,
	getRepository,
	getBuildCommands,
	getWorkspace,
	getCommitMessage,
	getCommitName,
	getCommitEmail,
	getBranchName,
	getCreateTags,
	getOutputBuildInfoFilename,
	getFetchDepth,
	getTagName,
	isValidTagName,
} from './misc';

export const getCommand = (command: string, quiet: boolean, suppressError: boolean): string => command + (quiet ? ' > /dev/null 2>&1' : '') + (suppressError ? ' || :' : '');

export const getRejectedErrorMessage = (command: string, altCommand: string | undefined, quiet: boolean, error: ExecException): string => {
	if ('string' === typeof altCommand) {
		if (!quiet) {
			return `command [${altCommand}] exited with code ${error.code}. message: ${error.message}`;
		} else {
			return `command [${altCommand}] exited with code ${error.code}.`;
		}
	} else if (!quiet) {
		return `command [${command}] exited with code ${error.code}. message: ${error.message}`;
	}
	return `command exited with code ${error.code}.`;
};

export const execCallback = (
	command: string,
	altCommand: string | undefined,
	quiet: boolean,
	suppressOutput: boolean,
	resolve: Function,
	reject: Function,
): (error: ExecException | null, stdout: string, stderr: string) => void => (error: ExecException | null, stdout: string, stderr: string): void => {
	if (error) {
		reject(getRejectedErrorMessage(command, altCommand, quiet, error));
	} else {
		if (!quiet && !suppressOutput) {
			console.log(stdout);
			if (stderr) {
				console.error(stderr);
			}
		}
		resolve(stdout);
	}
};

export const execAsync = (args: {
	command: string;
	cwd?: string;
	quiet?: boolean;
	altCommand?: string;
	suppressError?: boolean;
	suppressOutput?: boolean;
}): Promise<string> => new Promise<string>((resolve, reject): void => {
	const {command, cwd, altCommand, quiet = false, suppressError = false, suppressOutput = false} = args;

	if ('string' === typeof altCommand) {
		signale.info('Run command: %s', altCommand);
	} else if (!quiet) {
		signale.info('Run command: %s', command);
	}

	if (typeof cwd === 'undefined') {
		exec(getCommand(command, quiet, suppressError), execCallback(command, altCommand, quiet, suppressOutput, resolve, reject));
	} else {
		exec(getCommand(command, quiet, suppressError), {cwd}, execCallback(command, altCommand, quiet, suppressOutput, resolve, reject));
	}
});

const cloneForBuild = async(buildDir: string, context: Context): Promise<void> => {
	signale.info('Cloning the working commit from the remote repo for build');

	const url = getGitUrl(context);
	const depth = getFetchDepth();
	await execAsync({command: `git -C ${buildDir} clone --depth=${depth} ${url} .`, quiet: true, altCommand: `git clone --depth=${depth}`});
	await execAsync({command: `git -C ${buildDir} fetch "${url}" ${context.ref}`, quiet: true, altCommand: `git fetch origin ${context.ref}`});
	await execAsync({command: `git -C ${buildDir} checkout -qf ${context.sha}`});
};

const runBuild = async(buildDir: string): Promise<void> => {
	signale.info('=== Running build for release ===');

	for (const command of getBuildCommands(buildDir)) {
		await execAsync({command, cwd: buildDir});
	}
};

export const prepareFiles = async(buildDir: string, pushDir: string, context: Context): Promise<void> => {
	signale.info('Preparing files for release');

	fs.mkdirSync(buildDir, {recursive: true});
	await cloneForBuild(buildDir, context);
	await runBuild(buildDir);
};

export const createBuildInfoFile = async(buildDir: string, tagName: string, branchName: string): Promise<void> => {
	const filename = getOutputBuildInfoFilename();
	if (!filename) {
		return;
	}

	signale.info('Creating build info file');
	const filepath = path.resolve(buildDir, filename);
	const dir = path.dirname(filepath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {recursive: true});
	}
	fs.writeFileSync(filepath, JSON.stringify({
		'tagName': tagName,
		'branch': branchName,
		'tags': getCreateTags(tagName),
		'updated_at': moment().toISOString(),
	}));
};

export const getCurrentBranchName = async(pushDir: string): Promise<string> => {
	if (!fs.existsSync(path.resolve(pushDir, '.git'))) {
		return '';
	}
	return (await execAsync({command: `git -C ${pushDir} branch -a | grep -E '^\\*' | cut -b 3-`})).trim();
};

const gitInit = async(pushDir: string): Promise<void> => {
	signale.info('Initializing local git repo');

	await execAsync({command: `git -C ${pushDir} init .`});
};

const gitCheckout = async(pushDir: string, branchName: string): Promise<void> => {
	signale.info('Checking out orphan branch %s', branchName);

	await execAsync({command: `git -C ${pushDir} checkout --orphan "${branchName}"`});
};

export const cloneForBranch = async(pushDir: string, branchName: string, context: Context): Promise<void> => {
	signale.info('Cloning the branch %s from the remote repo', branchName);

	const url = getGitUrl(context);
	const depth = getFetchDepth();
	await execAsync({
		command: `git -C ${pushDir} clone --branch=${branchName} --depth=${depth} ${url} .`,
		quiet: true,
		altCommand: `git clone --branch=${branchName} --depth=${depth}`,
		suppressError: true,
	});
};

export const checkBranch = async(pushDir: string, branchName: string, clonedBranch: string): Promise<void> => {
	if (branchName !== clonedBranch) {
		signale.info('remote branch %s not found.', branchName);
		signale.info('now branch: %s', clonedBranch);

		await execAsync({command: `rm -rdf ${pushDir}`});
		fs.mkdirSync(pushDir, {recursive: true});
		await gitInit(pushDir);
		await gitCheckout(pushDir, branchName);
	}
};

export const config = async(pushDir: string): Promise<void> => {
	const name = getCommitName();
	const email = getCommitEmail();
	signale.info('Configuring git committer to be %s <%s>', name, email);

	await execAsync({command: `git -C ${pushDir} config user.name "${name}"`});
	await execAsync({command: `git -C ${pushDir} config user.email "${email}"`});
};

const checkDiff = async(pushDir: string): Promise<boolean> => {
	return !!(await execAsync({
		command: `git -C ${pushDir} status --short -uno`,
		quiet: false,
		suppressOutput: true,
	})).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).length;
};

export const commit = async(pushDir: string): Promise<boolean> => {
	const message = getCommitMessage();
	await execAsync({command: `git -C ${pushDir} add --all --force`});
	if (!await checkDiff(pushDir)) {
		signale.info('There is no diff.');
		return false;
	}
	await execAsync({command: `git -C ${pushDir} commit -qm "${message}"`});
	await execAsync({command: `git -C ${pushDir} show --stat-count=10 HEAD`});
	return true;
};

export const push = async(pushDir: string, tagName: string, branchName: string, context: Context): Promise<void> => {
	signale.info('Pushing to %s@%s (tag: %s)', getRepository(context), branchName, tagName);

	const url = getGitUrl(context);
	const tagNames = getCreateTags(tagName);
	for (const tagName of tagNames) {
		await execAsync({
			command: `git -C ${pushDir} push --delete "${url}" tag ${tagName}`,
			quiet: true,
			altCommand: `git push --delete origin tag ${tagName}`,
			suppressError: true,
		});
	}
	await execAsync({command: `git -C ${pushDir} tag -l | xargs git -C ${pushDir} tag -d`});
	await execAsync({command: `git -C ${pushDir} fetch "${url}" --tags`, quiet: true, altCommand: 'git fetch origin --tags'});
	for (const tagName of tagNames) {
		await execAsync({command: `git -C ${pushDir} tag ${tagName}`});
	}
	await execAsync({
		command: `git -C ${pushDir} push --tags "${url}" "${branchName}":"refs/heads/${branchName}"`,
		quiet: true,
		altCommand: `git push --tags "${branchName}":"refs/heads/${branchName}"`,
	});
};

const getParams = (context: Context): { workDir: string; buildDir: string; pushDir: string; branchName: string; tagName: string } => {
	const workDir = path.resolve(getWorkspace(), '.work');
	const buildDir = path.resolve(workDir, 'build');
	const pushDir = path.resolve(workDir, 'push');
	const branchName = getBranchName();
	const tagName = getTagName(context);
	return {workDir, buildDir, pushDir, branchName, tagName};
};

export const updateRelease = async(octokit: GitHub, context: Context): Promise<void> => {
	const {tagName} = getParams(context);
	const releases = await octokit.repos.listReleases({
		owner: context.repo.owner,
		repo: context.repo.repo,
	});
	const release = releases.data.find(release => release.tag_name === tagName);
	if (!release) {
		signale.info('There is no release that has tag name: %s', tagName);
		return;
	}

	await octokit.repos.updateRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		'release_id': release.id,
	});
};

export const copyFiles = async(buildDir: string, pushDir: string): Promise<void> => {
	signale.info('=== Copying %s contents to %s ===', buildDir, pushDir);

	await execAsync({command: `rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`});
};

export const prepareCommit = async(tagName: string, context: Context): Promise<void> => {
	const {workDir, buildDir, pushDir, branchName} = getParams(context);
	await execAsync({command: `rm -rdf ${workDir}`});
	fs.mkdirSync(pushDir, {recursive: true});
	await cloneForBranch(pushDir, branchName, context);
	await checkBranch(pushDir, branchName, await getCurrentBranchName(pushDir));
	await prepareFiles(buildDir, pushDir, context);
	await createBuildInfoFile(buildDir, tagName, branchName);
	await copyFiles(buildDir, pushDir);
};

const executeCommit = async(tagName: string, octokit: GitHub, context: Context): Promise<void> => {
	const {pushDir, branchName} = getParams(context);
	await config(pushDir);
	if (!await commit(pushDir)) {
		return;
	}
	await push(pushDir, tagName, branchName, context);
	await updateRelease(octokit, context);
};

export const deploy = async(octokit: GitHub, context: Context): Promise<void> => {
	const {branchName, tagName} = getParams(context);
	signale.info('Tag name: %s', tagName);

	if (!isValidTagName(tagName)) {
		signale.info('This tag name is invalid.');
		return;
	}

	signale.info('Deploying branch %s to %s', branchName, getRepository(context));

	await prepareCommit(tagName, context);
	await executeCommit(tagName, octokit, context);
};
