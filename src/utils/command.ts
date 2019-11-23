import fs from 'fs';
import moment from 'moment';
import path from 'path';
import { Logger, Command, ContextHelper, GitHelper } from '@technote-space/github-action-helper';
import { GitHub } from '@actions/github/lib/github';
import { Context } from '@actions/github/lib/context';
import { ReposListReleasesResponseItem } from '@octokit/rest';
import {
	getBuildCommands,
	getCommitMessage,
	getCommitName,
	getCommitEmail,
	getCreateTags,
	getOriginalTagPrefix,
	getOutputBuildInfoFilename,
	getFetchDepth,
	getParams,
	getReplaceDirectory,
} from './misc';

const {getRepository, getTagName} = ContextHelper;

export const replaceDirectory = (message: string): string => {
	const directories = getReplaceDirectory();
	return Object.keys(directories).reduce((value, directory) => value.split(` -C ${directory}`).join('').split(directory).join(directories[directory]), message);
};

const logger               = new Logger(replaceDirectory);
const command              = new Command(logger);
const helper               = new GitHelper(logger, {depth: getFetchDepth()});
const {startProcess, info} = logger;

export const prepareFiles = async(context: Context): Promise<void> => {
	startProcess('Preparing files for release');

	const {buildDir} = getParams();
	fs.mkdirSync(buildDir, {recursive: true});

	startProcess('Cloning the working commit from the remote repo for build');
	await helper.checkout(buildDir, context);

	startProcess('Running build for release');
	await helper.runCommand(buildDir, getBuildCommands(buildDir));
};

export const createBuildInfoFile = async(context: Context): Promise<void> => {
	const filename = getOutputBuildInfoFilename();
	if (!filename) {
		return;
	}

	const {buildDir, branchName} = getParams();
	const tagName                = getTagName(context);

	startProcess('Creating build info file');
	const filepath = path.resolve(buildDir, filename);
	const dir      = path.dirname(filepath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {recursive: true});
	}
	fs.writeFileSync(filepath, JSON.stringify({
		owner: context.repo.owner,
		repo: context.repo.repo,
		sha: context.sha,
		ref: context.ref,
		tagName: tagName,
		branch: branchName,
		tags: getCreateTags(tagName),
		'updated_at': moment().toISOString(),
	}));
};

export const cloneForBranch = async(context: Context): Promise<void> => {
	const {pushDir, branchName} = getParams();
	startProcess('Cloning the branch %s from the remote repo', branchName);

	await helper.cloneBranch(pushDir, branchName, context);
};

export const checkBranch = async(clonedBranch: string): Promise<void> => {
	const {pushDir, branchName} = getParams();
	if (branchName !== clonedBranch) {
		info('remote branch %s not found.', branchName);
		info('now branch: %s', clonedBranch);

		startProcess('Initializing local git repo [%s]', branchName);
		await helper.gitInit(pushDir, branchName);
	}
};

export const config = async(): Promise<void> => {
	const {pushDir} = getParams();
	const name      = getCommitName();
	const email     = getCommitEmail();
	startProcess('Configuring git committer to be %s <%s>', name, email);

	await helper.config(pushDir, name, email);
};

export const commit = async(): Promise<boolean> => helper.commit(getParams().pushDir, getCommitMessage());

export const push = async(context: Context): Promise<void> => {
	const {pushDir, branchName} = getParams();
	const tagName               = getTagName(context);
	startProcess('Pushing to %s@%s (tag: %s)', getRepository(context), branchName, tagName);

	const prefix = getOriginalTagPrefix();
	if (prefix) {
		const originalTag = prefix + tagName;
		await helper.fetchTags(pushDir, context);
		await helper.copyTag(pushDir, originalTag, tagName, context);
	}

	const tagNames = getCreateTags(tagName);
	await helper.deleteTag(pushDir, tagNames, context);
	await helper.fetchTags(pushDir, context);
	await helper.addLocalTag(pushDir, tagNames);
	await helper.push(pushDir, branchName, true, context);
};

const findRelease = async(octokit: GitHub, context: Context): Promise<ReposListReleasesResponseItem | undefined> => {
	const tagName  = getTagName(context);
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

	startProcess('Re-publishing release');
	await octokit.repos.updateRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		'release_id': release.id,
		draft: false,
	});
};

export const copyFiles = async(): Promise<void> => {
	const {buildDir, pushDir} = getParams();
	startProcess('Copying %s contents to %s', buildDir, pushDir);

	await command.execAsync({command: `rsync -rl --exclude .git --delete "${buildDir}/" ${pushDir}`});
};

const initDirectory = async(): Promise<void> => {
	const {workDir, pushDir} = getParams();
	await command.execAsync({command: `rm -rdf ${workDir}`});
	fs.mkdirSync(pushDir, {recursive: true});
};

export const prepareCommit = async(context: Context): Promise<void> => {
	await initDirectory();
	await cloneForBranch(context);
	await checkBranch(await helper.getCurrentBranchName(getParams().pushDir));
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
	const {branchName} = getParams();
	startProcess('Deploying branch %s to %s', branchName, getRepository(context));

	const release = await findRelease(octokit, context);
	await prepareCommit(context);
	await executeCommit(release, octokit, context);
};
