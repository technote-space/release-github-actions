import fs from 'fs';
import { resolve, dirname } from 'path';
import { Context } from '@actions/github/lib/context';
import { Command, ContextHelper, GitHelper, Utils } from '@technote-space/github-action-helper';
import { Octokit } from '@technote-space/github-action-helper/dist/types';
import { Logger } from '@technote-space/github-action-log-helper';
import { ReposListReleasesResponseItem } from '../types';
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

export const replaceDirectory = (context: Context) => (message: string): string => {
  const directories = getReplaceDirectory(context);
  return Object.keys(directories).reduce((value, directory) => Utils.replaceAll(Utils.replaceAll(value, ` -C ${directory}`, ''), directory, directories[directory]), message);
};

export const prepareFiles = async(logger: Logger, helper: GitHelper, context: Context): Promise<void> => {
  const { buildDir, pushDir } = getParams(context);
  fs.mkdirSync(buildDir, { recursive: true });

  logger.startProcess('Cloning the remote repo for build...');
  await helper.checkout(buildDir, context);

  logger.startProcess('Running build for release...');
  await helper.runCommand(buildDir, getBuildCommands(buildDir, pushDir));
};

export const createBuildInfoFile = async(logger: Logger, context: Context): Promise<void> => {
  const filename = getOutputBuildInfoFilename();
  if (!filename) {
    return;
  }

  const { buildDir, branchName, tagName } = getParams(context);

  logger.startProcess('Creating build info file...');
  const filepath = resolve(buildDir, filename);
  const dir      = dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filepath, JSON.stringify({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: context.sha,
    ref: context.ref,
    tagName: tagName,
    branch: branchName,
    tags: getCreateTags(tagName),
    'updated_at': (new Date).toISOString(),
  }));
};

export const clone = async(logger: Logger, helper: GitHelper, context: Context): Promise<void> => {
  const { pushDir, branchName } = getParams(context);
  logger.startProcess('Fetching...');
  await helper.fetchOrigin(pushDir, context, ['--no-tags'], [Utils.getRefspec(branchName)]);

  logger.startProcess('Switching branch to [%s]...', branchName);
  await helper.switchBranch(pushDir, branchName);
};

export const checkBranch = async(clonedBranch: string, logger: Logger, helper: GitHelper, context: Context): Promise<void> => {
  const { pushDir, branchName } = getParams(context);
  if (branchName !== clonedBranch) {
    logger.info('remote branch %s not found.', branchName);
    logger.info('now branch: %s', clonedBranch);

    logger.startProcess('Initializing local git repo [%s]...', branchName);
    await helper.gitInit(pushDir, branchName);
  }
};

export const config = async(logger: Logger, helper: GitHelper, context: Context): Promise<void> => {
  const { pushDir } = getParams(context);
  const name        = getCommitName();
  const email       = getCommitEmail();
  logger.startProcess('Configuring git committer to be %s <%s>...', name, email);

  await helper.config(pushDir, { name, email });
};

export const commit = async(helper: GitHelper, context: Context): Promise<boolean> => helper.commit(getParams(context).pushDir, getCommitMessage(), { allowEmpty: true });

export const getDeleteTestTag = async(tagName: string, prefix: string, helper: GitHelper, context: Context): Promise<Array<string>> => (await helper.getTags(getParams(context).pushDir, { quiet: true }))
  .filter(tag => Utils.getPrefixRegExp(prefix).test(tag))
  .map(tag => tag.replace(Utils.getPrefixRegExp(prefix), ''))
  .filter(tag => Utils.versionCompare(tag, tagName, false) < 0) // eslint-disable-line no-magic-numbers
  .map(tag => `${prefix}${tag}`);

export const deleteTestTags = async(helper: GitHelper, context: Context): Promise<void> => {
  const { pushDir, tagName } = getParams(context);
  if (!isTestTag(tagName) && isEnabledCleanTestTag()) {
    const prefixForTestTag = getTestTagPrefix();
    if (prefixForTestTag) {
      await helper.deleteTag(pushDir, await getDeleteTestTag(tagName, prefixForTestTag, helper, context), context);

      const prefixForOriginalTag = getOriginalTagPrefix();
      if (prefixForOriginalTag) {
        await helper.deleteTag(pushDir, await getDeleteTestTag(tagName, prefixForOriginalTag + prefixForTestTag, helper, context), context);
      }
    }
  }
};

export const push = async(logger: Logger, helper: GitHelper, context: Context): Promise<void> => {
  const { pushDir, branchName, tagName, branchNames } = getParams(context);
  logger.startProcess('Pushing to %s@%s (tag: %s)...', ContextHelper.getRepository(context), branchName, tagName);

  const prefixForOriginalTag = getOriginalTagPrefix();
  if (prefixForOriginalTag) {
    const originalTag = prefixForOriginalTag + tagName;
    await helper.fetchTags(pushDir, context);
    await helper.copyTag(pushDir, originalTag, tagName, context);
  }

  const tagNames = getCreateTags(tagName);
  await helper.fetchTags(pushDir, context);
  await deleteTestTags(helper, context);
  await helper.deleteLocalTag(pushDir, tagNames);
  await helper.addLocalTag(pushDir, tagNames);
  await helper.push(pushDir, branchName, context, { withTag: true, force: true });
  await branchNames.reduce(async(prev, branch) => {
    await prev;
    await helper.createBranch(pushDir, branch);
    await helper.forcePush(pushDir, branch, context);
  }, Promise.resolve());
};

const findRelease = async(octokit: Octokit, context: Context): Promise<ReposListReleasesResponseItem | undefined> => {
  const { tagName } = getParams(context);
  const releases    = await octokit.rest.repos.listReleases({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
  return releases.data.find(release => release.tag_name === tagName);
};

export const updateRelease = async(release: ReposListReleasesResponseItem | undefined, logger: Logger, octokit: Octokit, context: Context): Promise<void> => {
  if (!release || release.draft) {
    return;
  }

  logger.startProcess('Re-publishing release...');
  await octokit.rest.repos.updateRelease({
    owner: context.repo.owner,
    repo: context.repo.repo,
    'release_id': release.id,
    draft: false,
  });
};

export const copyFiles = async(logger: Logger, command: Command, context: Context): Promise<void> => {
  const { buildDir, pushDir } = getParams(context);
  logger.startProcess('Copying %s contents to %s...', buildDir, pushDir);

  await command.execAsync({
    command: 'rsync',
    args: ['-rl', '--exclude', '.git', '--delete', `${buildDir}/`, pushDir],
  });
};

export const prepareCommit = async(logger: Logger, command: Command, helper: GitHelper, context: Context): Promise<void> => {
  await clone(logger, helper, context);
  await checkBranch(await helper.getCurrentBranchName(getParams(context).pushDir), logger, helper, context);
  await prepareFiles(logger, helper, context);
  await createBuildInfoFile(logger, context);
  await copyFiles(logger, command, context);
};

const executeCommit = async(release: ReposListReleasesResponseItem | undefined, logger: Logger, helper: GitHelper, octokit: Octokit, context: Context): Promise<boolean> => {
  await config(logger, helper, context);
  await commit(helper, context);
  await push(logger, helper, context);
  await updateRelease(release, logger, octokit, context);
  return true;
};

export const deploy = async(octokit: Octokit, context: Context): Promise<void> => {
  const logger         = new Logger(replaceDirectory(context));
  const command        = new Command(logger);
  const { branchName } = getParams(context);

  logger.startProcess('Deploying branch %s to %s...', branchName, ContextHelper.getRepository(context));

  const helper  = new GitHelper(logger, { depth: getFetchDepth() });
  const release = await findRelease(octokit, context);
  await prepareCommit(logger, command, helper, context);
  await executeCommit(release, logger, helper, octokit, context);
};
