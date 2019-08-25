import {setFailed, getInput} from '@actions/core' ;
import {context, GitHub} from '@actions/github' ;
import signale from 'signale';
import {clone, runBuild, getDiffFiles} from './utils/command';
import {push} from './utils/github';
import {isTargetEvent} from './utils/misc';

async function run() {
    try {
        signale.info(`Event: ${context.eventName}`);
        signale.info(`Action: ${context.action}`);
        if (!isTargetEvent(context)) {
            signale.info('This is not target event.');
            return;
        }

        // signale.info(`Tag name: ${context.payload.release.tag_name}`);
        const octokit = new GitHub(getInput('GITHUB_TOKEN', {required: true}));
        await clone(context);
        await runBuild();
        const files = await getDiffFiles();
        signale.info(`Diff files count: ${files.length}`);
        if (!files.length) return;

        // await push(files, context.payload.release.tag_name, octokit, context);
        await push(files, 'test', octokit, context);
    } catch (error) {
        setFailed(error.message);
    }
}

run();
