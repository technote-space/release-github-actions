import global from './__tests__/global';

global.mockStdout = {
	write: jest.fn(),
};
process.stdout.write = global.mockStdout.write;

global.mockChildProcess = {
	stdout: 'stdout',
	stderr: '',
	exec: jest.fn((...args: any[]) => {
		const callback = args.length === 2 ? args[1] : args[2];
		callback(null, global.mockChildProcess.stdout, global.mockChildProcess.stderr);
	}),
};
jest.mock('child_process', () => ({
	...jest.requireActual('child_process'),
	exec: global.mockChildProcess.exec,
}));

global.console.log = jest.fn();
global.console.warn = jest.fn();
global.console.error = jest.fn();

process.env.GITHUB_ACTOR = 'octocat';
