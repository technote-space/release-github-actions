import path from 'path';
import { setFailed, getInput } from '@actions/core';
import { context, GitHub } from '@actions/github';
import signale from 'signale';
import { deploy } from './utils/command';
import { getBuildVersion, isTargetEvent, isValidTagName } from './utils/misc';

/**
 * run
 */
async function run(): Promise<void> {
	try {
		const version = getBuildVersion(path.resolve(__dirname, '..', 'build.json'));
		if ('string' === typeof version) {
			signale.info('Version: %s', version);
		}
		signale.info('Event: %s', context.eventName);
		signale.info('Action: %s', context.payload.action);
		if (!isTargetEvent(context)) {
			signale.info('This is not target event.');
			return;
		}

		signale.info('Tag name: %s', context.payload.release.tag_name);
		if (!isValidTagName(context.payload.release.tag_name)) {
			signale.info('This tag name is invalid.');
			return;
		}

		await deploy(context.payload.release.tag_name, new GitHub(getInput('GITHUB_TOKEN', {required: true})), context);
	} catch (error) {
		setFailed(error.message);
	}
}

run();
