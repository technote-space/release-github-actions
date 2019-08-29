"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMMIT_MESSAGE = 'feat: Build for release';
exports.DEFAULT_COMMIT_NAME = 'GitHub Actions';
exports.DEFAULT_COMMIT_EMAIL = 'example@example.com';
exports.DEFAULT_BRANCH_NAME = 'gh-actions';
exports.DEFAULT_CLEAN_TARGETS = '.github,__tests__,src,.gitignore,*.js,*.json,*.lock,_config.yml';
exports.DEFAULT_OUTPUT_BUILD_INFO_FILENAME = '';
exports.TARGET_EVENTS = {
    'release': 'published'
};
exports.SEARCH_BUILD_COMMAND_TARGETS = [
    'build',
    'production',
    'prod',
];
