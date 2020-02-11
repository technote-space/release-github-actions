import fs from 'fs';
import moment from 'moment';
import path from 'path';
import { Logger, Command, ContextHelper, GitHelper, Utils } from '@technote-space/github-action-helper';
import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';
import {
	getBuildCommands,
	getCommitMessage,
	getCommitName,
	getCommitEmail,
	getCreateTags,
	getOriginalTagPrefix,
	isTestTag,
	isEnabledCleanTestTag,
	getTestTagPrefix,
	getOutputBuildInfoFilename,
	getFetchDepth,
	getParams,
	getReplaceDirectory,
} from './misc';

const {getRepository, getTagName}                   = ContextHelper;
const {replaceAll, versionCompare, getPrefixRegExp} = Utils;

export const replaceDirectory = (message: string): string => {
	const directories = getReplaceDirectory();
	return Object.keys(directories).reduce((value, directory) => replaceAll(replaceAll(value, ` -C ${directory}`, ''), directory, directories[directory]), message);
};

const logger               = new Logger(replaceDirectory);
const command              = new Command(logger);
const {startProcess, info} = logger;

export const prepareFiles = async(helper: GitHelper, context: Context): Promise<void> => {
	const {buildDir, pushDir} = getParams();
	fs.mkdirSync(buildDir, {recursive: true});

	startProcess('Cloning the remote repo for build...');
	await helper.checkout(buildDir, context);

	startProcess('Running build for release...');
	await helper.runCommand(buildDir, getBuildCommands(buildDir, pushDir));
};

export const createBuildInfoFile = async(context: Context): Promise<void> => {
	const filename = getOutputBuildInfoFilename();
	if (!filename) {
		return;
	}

	const {buildDir, branchName} = getParams();
	const tagName                = getTagName(context);

	startProcess('Creating build info file...');
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

export const clone = async(helper: GitHelper, context: Context): Promise<void> => {
	const {pushDir, branchName} = getParams();
	startProcess('Fetching...');
	await helper.fetchOrigin(pushDir, context, ['--no-tags'], [`refs/heads/${branchName}:refs/remotes/origin/${branchName}`]);

	startProcess('Switching branch to [%s]...', branchName);
	await helper.switchBranch(pushDir, branchName);
};

export const checkBranch = async(clonedBranch: string, helper: GitHelper): Promise<void> => {
	const {pushDir, branchName} = getParams();
	if (branchName !== clonedBranch) {
		info('remote branch %s not found.', branchName);
		info('now branch: %s', clonedBranch);

		startProcess('Initializing local git repo [%s]...', branchName);
		await helper.gitInit(pushDir, branchName);
	}
};

export const config = async(helper: GitHelper): Promise<void> => {
	const {pushDir} = getParams();
	const name      = getCommitName();
	const email     = getCommitEmail();
	startProcess('Configuring git committer to be %s <%s>...', name, email);

	await helper.config(pushDir, name, email);
};

export const commit = async(helper: GitHelper): Promise<boolean> => helper.commit(getParams().pushDir, getCommitMessage(), {allowEmpty: true});

export const getDeleteTestTag = async(tagName: string, prefix, helper: GitHelper): Promise<Array<string>> => {
	return (await helper.getTags(getParams().pushDir))
		.filter(tag => getPrefixRegExp(prefix).test(tag))
		.map(tag => tag.replace(getPrefixRegExp(prefix), ''))
		.filter(tag => versionCompare(tag, tagName, false) < 0) // eslint-disable-line no-magic-numbers
		.map(tag => `${prefix}${tag}`);
};

export const deleteTestTags = async(helper: GitHelper, context: Context): Promise<void> => {
	const tagName   = getTagName(context);
	const {pushDir} = getParams();
	if (!isTestTag(tagName) && isEnabledCleanTestTag()) {
		const prefixForTestTag = getTestTagPrefix();
		if (prefixForTestTag) {
			await helper.deleteTag(pushDir, await getDeleteTestTag(tagName, prefixForTestTag, helper), context);

			const prefixForOriginalTag = getOriginalTagPrefix();
			if (prefixForOriginalTag) {
				await helper.deleteTag(pushDir, await getDeleteTestTag(tagName, prefixForOriginalTag + prefixForTestTag, helper), context);
			}
		}
	}
};

export const push = async(helper: GitHelper, context: Context): Promise<void> => {
	const {pushDir, branchName} = getParams();
	const tagName               = getTagName(context);
	startProcess('Pushing to %s@%s (tag: %s)...', getRepository(context), branchName, tagName);

	const prefixForOriginalTag = getOriginalTagPrefix();
	if (prefixForOriginalTag) {
		const originalTag = prefixForOriginalTag + tagName;
		await helper.fetchTags(pushDir, context);
		await helper.copyTag(pushDir, originalTag, tagName, context);
	}

	const tagNames = getCreateTags(tagName);
	await helper.fetchTags(pushDir, context);
	await deleteTestTags(helper, context);
	// eslint-disable-next-line no-magic-numbers
	await helper.deleteTag(pushDir, tagNames, context, 1);
	await helper.addLocalTag(pushDir, tagNames);
	await helper.push(pushDir, branchName, context, {withTag: true});
};

const findRelease = async(octokit: Octokit, context: Context): Promise<Octokit.ReposListReleasesResponseItem | undefined> => {
	const tagName  = getTagName(context);
	const releases = await octokit.repos.listReleases({
		owner: context.repo.owner,
		repo: context.repo.repo,
	});
	return releases.data.find(release => release.tag_name === tagName);
};

export const updateRelease = async(release: Octokit.ReposListReleasesResponseItem | undefined, octokit: Octokit, context: Context): Promise<void> => {
	if (!release || release.draft) {
		return;
	}

	startProcess('Re-publishing release...');
	await octokit.repos.updateRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		'release_id': release.id,
		draft: false,
	});
};

export const copyFiles = async(): Promise<void> => {
	const {buildDir, pushDir} = getParams();
	startProcess('Copying %s contents to %s...', buildDir, pushDir);

	await command.execAsync({
		command: 'rsync',
		args: ['-rl', '--exclude', '.git', '--delete', `${buildDir}/`, pushDir],
	});
};

export const prepareCommit = async(helper: GitHelper, context: Context): Promise<void> => {
	await clone(helper, context);
	await checkBranch(await helper.getCurrentBranchName(getParams().pushDir), helper);
	await prepareFiles(helper, context);
	await createBuildInfoFile(context);
	await copyFiles();
};

const executeCommit = async(release: Octokit.ReposListReleasesResponseItem | undefined, helper: GitHelper, octokit: Octokit, context: Context): Promise<boolean> => {
	await config(helper);
	await commit(helper);
	await push(helper, context);
	await updateRelease(release, octokit, context);
	return true;
};

export const deploy = async(octokit: Octokit, context: Context): Promise<void> => {
	const {branchName} = getParams();
	startProcess('Deploying branch %s to %s...', branchName, getRepository(context));

	const helper  = new GitHelper(logger, {depth: getFetchDepth()});
	const release = await findRelease(octokit, context);
	await prepareCommit(helper, context);
	await executeCommit(release, helper, octokit, context);
};
