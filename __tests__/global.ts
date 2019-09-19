interface Global extends NodeJS.Global {
	mockSignale: {
		info: jest.Mock;
		log: jest.Mock;
		process: jest.Mock;
		command: jest.Mock;
		warn: jest.Mock;
	};
	mockChildProcess: {
		exec: jest.Mock;
		stdout: string;
		stderr: string;
	};
}

declare const global: Global;
export default global;
