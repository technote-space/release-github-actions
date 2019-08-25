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
const misc_1 = require("./misc");
exports.filesToBlobs = (files, octokit, context) => __awaiter(this, void 0, void 0, function* () { return yield Promise.all(Object.values(files).map(file => createBlob(file, octokit, context))); });
exports.createTree = (blobs, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    return yield octokit.git.createTree({
        owner: context.repo.owner,
        repo: context.repo.repo,
        base_tree: (yield getCommit(octokit, context)).data.tree.sha,
        tree: Object.values(blobs).map(blob => ({
            path: blob.path,
            type: 'blob',
            mode: '100644',
            sha: blob.sha,
        })),
    });
});
exports.createCommit = (tree, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    return yield octokit.git.createCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        tree: tree.data.sha,
        parents: [context.sha],
        message: misc_1.getCommitMessage(),
    });
});
exports.updateRef = (commit, name, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    if (!(yield existsRef(name, octokit, context))) {
        yield createRef(name, octokit, context);
    }
    yield octokit.git.updateRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: getRef(name),
        sha: commit.data.sha,
    });
});
const getCommit = (octokit, context) => __awaiter(this, void 0, void 0, function* () {
    return yield octokit.git.getCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha,
    });
});
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
const createBlob = (filePath, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    const file = path_1.default.resolve(misc_1.getWorkspace(), filePath);
    const isExists = fs_1.default.existsSync(file);
    const blob = yield octokit.git.createBlob({
        owner: context.repo.owner,
        repo: context.repo.repo,
        content: isExists ? Buffer.from(fs_1.default.readFileSync(file)).toString('base64') : '',
        encoding: 'base64',
    });
    return ({ path: filePath, sha: blob.data.sha });
});
const createRef = (name, octokit, context) => __awaiter(this, void 0, void 0, function* () {
    yield octokit.git.createRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: getRef(name),
        sha: context.sha,
    });
});
