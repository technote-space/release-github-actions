export const DEFAULT_COMMIT_MESSAGE = 'feat: Build for release';
export const DEFAULT_COMMIT_NAME = 'GitHub Actions';
export const DEFAULT_COMMIT_EMAIL = 'example@example.com';
export const DEFAULT_BRANCH_NAME = 'gh-actions';
export const DEFAULT_CLEAN_TARGETS = '.github,__tests__,src,.gitignore,*.js,*.json,*.lock';
export const TARGET_EVENT_NAME = 'release';
export const TARGET_EVENT_ACTION = 'published';
export const SEARCH_BUILD_COMMAND_TARGETS = [
    'build',
    'production',
    'prod',
];