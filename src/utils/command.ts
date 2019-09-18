import fs from 'fs';
import moment from 'moment';
import path from 'path';
import signale from 'signale';
import { exec, ExecException } from 'child_process';
import { GitHub } from '@actions/github/lib/github';
import { Context } from '@actions/github/lib/context';
import { ReposListReleasesResponseItem } from '@octokit/rest';
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

const getParams = (): { workDir: string; buildDir: string; pushDir: string; branchName: string } => {
	const workDir = path.resolve(getWorkspace(), '.work');
	const buildDir = path.resolve(workDir, 'build');
	const pushDir = path.resolve(workDir, 'push');
	const branchName = getBranchName();
	return {workDir, buildDir, pushDir, branchName};
};

const cloneForBuild = async(context: Context): Promise<void> => {
	signale.info('Cloning the working commit from the remote repo for build');

	const {buildDir} = getParams();
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

export const prepareFiles = async(context: Context): Promise<void> => {
	signale.info('Preparing files for release');

	const {buildDir} = getParams();

	fs.mkdirSync(buildDir, {recursive: true});
	await cloneForBuild(context);
	await runBuild(buildDir);
};

export const createBuildInfoFile = async(context: Context): Promise<void> => {
	const filename = getOutputBuildInfoFilename();
	if (!filename) {
		return;
	}

	const {buildDir, branchName} = getParams();
	const tagName = getTagName(context);

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

export const getCurrentBranchName = async(): Promise<string> => {
	const {pushDir} = getParams();
	if (!fs.existsSync(path.resolve(pushDir, '.git'))) {
		return '';
	}
	return (await execAsync({command: `git -C ${pushDir} branch -a | grep -E '^\\*' | cut -b 3-`})).trim();
};

const gitInit = async(): Promise<void> => {
	const {pushDir} = getParams();
	signale.info('Initializing local git repo');

	await execAsync({command: `git -C ${pushDir} init .`});
};

const gitCheckout = async(): Promise<void> => {
	const {pushDir, branchName} = getParams();
	signale.info('Checking out orphan branch %s', branchName);

	await execAsync({command: `git -C ${pushDir} checkout --orphan "${branchName}"`});
};

export const cloneForBranch = async(context: Context): Promise<void> => {
	const {pushDir, branchName} = getParams();
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

export const checkBranch = async(clonedBranch: string): Promise<void> => {
	const {pushDir, branchName} = getParams();
	if (branchName !== clonedBranch) {
		signale.info('remote branch %s not found.', branchName);
		signale.info('now branch: %s', clonedBranch);

		await execAsync({command: `rm -rdf ${pushDir}`});
		fs.mkdirSync(pushDir, {recursive: true});
		await gitInit();
		await gitCheckout();
	}
};

export const config = async(): Promise<void> => {
	const {pushDir} = getParams();
	const name = getCommitName();
	const email = getCommitEmail();
	signale.info('Configuring git committer to be %s <%s>', name, email);

	await execAsync({command: `git -C ${pushDir} config user.name "${name}"`});
	await execAsync({command: `git -C ${pushDir} config user.email "${email}"`});
};

const checkDiff = async(): Promise<boolean> => {
	const {pushDir} = getParams();
	return !!(await execAsync({
		command: `git -C ${pushDir} status --short -uno`,
		quiet: false,
		suppressOutput: true,
	})).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).length;
};

export const commit = async(): Promise<boolean> => {
	const {pushDir} = getParams();
	const message = getCommitMessage();
	await execAsync({command: `git -C ${pushDir} add --all --force`});
	if (!await checkDiff()) {
		signale.info('There is no diff.');
		return false;
	}
	await execAsync({command: `git -C ${pushDir} commit -qm "${message}"`});
	await execAsync({command: `git -C ${pushDir} show --stat-count=10 HEAD`});
	return true;
};

export const push = async(context: Context): Promise<void> => {
	const {pushDir, branchName} = getParams();
	const tagName = getTagName(context);
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

const findRelease = async(octokit: GitHub, context: Context): Promise<ReposListReleasesResponseItem | undefined> => {
	const tagName = getTagName(context);
	const releases = await octokit.repos.listReleases({
		owner: context.repo.owner,
		repo: context.repo.repo,
	});
	return releases.data.find(release => release.tag_name === tagName);
};

export const updateRelease = async(release: ReposListReleasesResponseItem | undefined, octokit: GitHub, context: Context): Promise<void> => {
	if (!release || release.draft) {
		return;
	}

	signale.info('Re-publishing release');
	await octokit.repos.updateRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		'release_id': release.id,
		draft: false,
	});
};

export const copyFiles = async(): Promise<void> => {
	const {buildDir, pushDir} = getParams();
	signale.info('=== Copying %s contents to %s ===', buildDir, pushDir);

	await execAsync({command: `rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`});
};

export const prepareCommit = async(context: Context): Promise<void> => {
	const {workDir, pushDir} = getParams();
	await execAsync({command: `rm -rdf ${workDir}`});
	fs.mkdirSync(pushDir, {recursive: true});
	await cloneForBranch(context);
	await checkBranch(await getCurrentBranchName());
	await prepareFiles(context);
	await createBuildInfoFile(context);
	await copyFiles();
};

const executeCommit = async(release: ReposListReleasesResponseItem | undefined, octokit: GitHub, context: Context): Promise<boolean> => {
	await config();
	if (!await commit()) {
		return false;
	}
	await push(context);
	await updateRelease(release, octokit, context);
	return true;
};

export const deploy = async(octokit: GitHub, context: Context): Promise<void> => {
	const tagName = getTagName(context);
	if (!isValidTagName(tagName)) {
		signale.info('This tag name is invalid.');
		return;
	}

	const {branchName} = getParams();
	signale.info('Deploying branch %s to %s', branchName, getRepository(context));

	const release = await findRelease(octokit, context);
	await prepareCommit(context);
	await executeCommit(release, octokit, context);
};
