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
// import fs from 'fs';
// import path from 'path';
const signale_1 = __importDefault(require("signale"));
// import {getCommitMessage, getWorkspace} from './misc';
const command_1 = require("./command");
exports.push = (files, name, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    // const commit = await createCommit(files, octokit, context);
    // await updateRef(commit.data.sha, name, octokit, context);
    yield updateRef(yield command_1.commit(), name, octokit, context);
});
// const getCommit = async (octokit: GitHub, context: Context) => {
//     return await octokit.git.getCommit({
//         owner: context.repo.owner,
//         repo: context.repo.repo,
//         commit_sha: context.sha,
//     });
// };
const existsRef = (name, octokit, context) => {
    return new Promise(resolve => {
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
const getRef = (name) => `refs/heads/${name}`;
// const createBlob = async (filePath: string, octokit: GitHub, context: Context) => {
//     const file = path.resolve(getWorkspace(), filePath);
//     const isExists = fs.existsSync(file);
//     const blob = await octokit.git.createBlob({
//         owner: context.repo.owner,
//         repo: context.repo.repo,
//         content: isExists ? Buffer.from(fs.readFileSync(file)).toString('base64') : '',
//         encoding: 'base64',
//     });
//     return ({path: filePath, sha: blob.data.sha});
// };
const createRef = (name, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    signale_1.default.info(`Create Ref: ${name}`);
    yield octokit.git.createRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: getRef(name),
        sha: context.sha,
    });
});
// const filesToBlobs = async (files: object, octokit: GitHub, context: Context) => Object.values(files).map(async file => await createBlob(file, octokit, context));
//
// const createTree = async (blobs: object, octokit: GitHub, context: Context) => {
//     signale.info('Create Tree');
//     return await octokit.git.createTree({
//         owner: context.repo.owner,
//         repo: context.repo.repo,
//         base_tree: (await getCommit(octokit, context)).data.tree.sha,
//         tree: Object.values(blobs).map(blob => ({
//             path: blob.path,
//             type: 'blob',
//             mode: '100644',
//             sha: blob.sha,
//         })),
//     });
// };
//
// const createCommit = async (files: object, octokit: GitHub, context: Context) => {
//     const blobs = await filesToBlobs(files, octokit, context);
//     const tree = await createTree(blobs, octokit, context);
//     signale.info('Create Commit');
//     return await octokit.git.createCommit({
//         owner: context.repo.owner,
//         repo: context.repo.repo,
//         tree: tree.data.sha,
//         parents: [context.sha],
//         message: getCommitMessage(),
//     });
// };
const updateRef = (commit, name, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    if (!(yield existsRef(name, octokit, context))) {
        yield createRef(name, octokit, context);
    }
    signale_1.default.info(`Update Ref: ${commit}`);
    yield octokit.git.updateRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: getRef(name),
        sha: commit.trim(),
    });
});
