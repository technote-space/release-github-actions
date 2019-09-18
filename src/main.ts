import path from 'path';
import { setFailed, getInput } from '@actions/core';
import { context, GitHub } from '@actions/github';
import signale from 'signale';
import { deploy } from './utils/command';
import { getBuildVersion, isTargetEvent, getTagName, isValidTagName } from './utils/misc';

/**
 * run
 */
async function run(): Promise<void> {
	try {
		const version = getBuildVersion(path.resolve(__dirname, '..', 'build.json'));
		const tagName = getTagName(context);
		if ('string' === typeof version) {
			signale.info('Version: %s', version);
		}
		signale.info('Event: %s', context.eventName);
		signale.info('Action: %s', context.payload.action);
		signale.info('Tag name: %s', tagName);

		if (!isTargetEvent(context) || !isValidTagName(tagName)) {
			signale.complete('This is not target event.');
			return;
		}

		await deploy(new GitHub(getInput('GITHUB_TOKEN', {required: true})), context);
	} catch (error) {
		setFailed(error.message);
	}
}

run();
