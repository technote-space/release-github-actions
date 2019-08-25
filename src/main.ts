import {setFailed, getInput} from '@actions/core' ;
import {context, GitHub} from '@actions/github' ;
import signale from 'signale';
import {clone, runBuild, getDiffFiles} from './utils/command';
import {filesToBlobs, createTree, createCommit, updateRef} from './utils/github';
import {isTargetEvent} from './utils/misc';

async function run() {
    try {
        // if (!isTargetEvent(context)) {
        //     signale.info('This is not target event.');
        //     signale.info(`Event: ${context.eventName}  Action: ${context.action}`);
        //     return;
        // }
        // const octokit = new GitHub(getInput('GITHUB_TOKEN', {required: true}));
        await clone(context);
        await runBuild();
        const files = await getDiffFiles();
        signale.info(`Diff files count: ${files.length}`);
        if (!files.length) return;

        // const blobs = await filesToBlobs(files, octokit, context);
        // const tree = await createTree(blobs, octokit, context);
        // const commit = await createCommit(tree, octokit, context);
        // await updateRef(commit, context.payload.release.tag_name, octokit, context);
    } catch (error) {
        setFailed(error.message);
    }
}

run();
