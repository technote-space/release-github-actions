import fs from 'fs';
import path from 'path';
import {GitHub} from '@actions/github/lib/github';
import {Context} from '@actions/github/lib/context';
import {Response, GitCreateCommitResponse} from '@octokit/rest';
import {getCommitMessage, getWorkspace} from './misc';

export const push = async (files: object, name: string, octokit: GitHub, context: Context) => {
    const commit = await createCommit(files, octokit, context);
    await updateRef(commit, name, octokit, context);
};

const getCommit = async (octokit: GitHub, context: Context) => {
    return await octokit.git.getCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha,
    });
};

const existsRef = (name: string, octokit: GitHub, context: Context) => {
    return new Promise<boolean>(resolve => {
        octokit.git.getRef({
            owner: context.repo.owner,
            repo: context.repo.repo,
            ref: getRef(name),
        }).then(() => {
            resolve(true);
        }).catch(() => {
            resolve(false);
        });
    });
};

const getRef = (name: string) => `refs/heads/${name}`;

const createBlob = async (filePath: string, octokit: GitHub, context: Context) => {
    const file = path.resolve(getWorkspace(), filePath);
    const isExists = fs.existsSync(file);
    const blob = await octokit.git.createBlob({
        owner: context.repo.owner,
        repo: context.repo.repo,
        content: isExists ? Buffer.from(fs.readFileSync(file)).toString('base64') : '',
        encoding: 'base64',
    });
    return ({path: filePath, sha: blob.data.sha});
};

const createRef = async (name: string, octokit: GitHub, context: Context) => {
    await octokit.git.createRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: getRef(name),
        sha: context.sha,
    });
};

const filesToBlobs = async (files: object, octokit: GitHub, context: Context) => Object.values(files).map(async file => await createBlob(file, octokit, context));

const createTree = async (blobs: object, octokit: GitHub, context: Context) => {
    return await octokit.git.createTree({
        owner: context.repo.owner,
        repo: context.repo.repo,
        base_tree: (await getCommit(octokit, context)).data.tree.sha,
        tree: Object.values(blobs).map(blob => ({
            path: blob.path,
            type: 'blob',
            mode: '100644',
            sha: blob.sha,
        })),
    });
};

const createCommit = async (files: object, octokit: GitHub, context: Context) => {
    const blobs = await filesToBlobs(files, octokit, context);
    const tree = await createTree(blobs, octokit, context);
    return await octokit.git.createCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        tree: tree.data.sha,
        parents: [context.sha],
        message: getCommitMessage(),
    });
};

const updateRef = async (commit: Response<GitCreateCommitResponse>, name: string, octokit: GitHub, context: Context) => {
    if (!await existsRef(name, octokit, context)) {
        await createRef(name, octokit, context);
    }
    await octokit.git.updateRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: getRef(name),
        sha: commit.data.sha,
    });
};
