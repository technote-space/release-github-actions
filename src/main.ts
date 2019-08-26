import {setFailed} from '@actions/core' ;
import {context} from '@actions/github' ;
import signale from 'signale';
import {deploy} from './utils/command';
// import {isTargetEvent} from './utils/misc';

async function run() {
    try {
        signale.info(`Event: ${context.eventName}`);
        signale.info(`Action: ${context.action}`);
        // if (!isTargetEvent(context)) {
        //     signale.info('This is not target event.');
        //     return;
        // }

        // signale.info(`Tag name: ${context.payload.release.tag_name}`);
        // await deploy(context.payload.release.tag_name, context);
        await deploy('test', context);
    } catch (error) {
        setFailed(error.message);
    }
}

run();
