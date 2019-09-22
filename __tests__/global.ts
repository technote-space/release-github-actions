interface Global extends NodeJS.Global {
	mockStdout: {
		write: jest.Mock;
	};
	mockChildProcess: {
		exec: jest.Mock;
		stdout: string;
		stderr: string;
	};
}

declare const global: Global;
export default global;
