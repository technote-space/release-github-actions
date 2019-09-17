export const DEFAULT_COMMIT_MESSAGE = 'feat: Build for release';
export const DEFAULT_COMMIT_NAME = 'GitHub Actions';
export const DEFAULT_COMMIT_EMAIL = 'example@example.com';
export const DEFAULT_BRANCH_NAME = 'gh-actions';
export const DEFAULT_CLEAN_TARGETS = '.github,__tests__,src,.gitignore,*.js,*.json,*.lock,_config.yml';
export const DEFAULT_OUTPUT_BUILD_INFO_FILENAME = '';
export const DEFAULT_FETCH_DEPTH = '3';
export const TARGET_EVENTS = {
	'release': 'published',
};
export const SEARCH_BUILD_COMMAND_TARGETS = [
	'build',
	'production',
	'prod',
];
