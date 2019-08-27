import {setFailed, getInput} from '@actions/core';
import {context, GitHub} from '@actions/github';
import signale from 'signale';
import {deploy} from './utils/command';
import {isTargetEvent} from './utils/misc';

async function run() {
    try {
        signale.info(`Event: ${context.eventName}`);
        signale.info(`Action: ${context.action}`);
        if (!isTargetEvent(context)) {
            signale.info('This is not target event.');
            return;
        }

        signale.info(`Tag name: ${context.payload.release.tag_name}`);
        await deploy(context.payload.release.tag_name, new GitHub(getInput('GITHUB_TOKEN', {required: true})), context);
    } catch (error) {
        setFailed(error.message);
    }
}

run();
