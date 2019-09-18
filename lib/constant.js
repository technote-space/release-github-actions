"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMMIT_MESSAGE = 'feat: Build for release';
exports.DEFAULT_COMMIT_NAME = 'GitHub Actions';
exports.DEFAULT_COMMIT_EMAIL = 'example@example.com';
exports.DEFAULT_BRANCH_NAME = 'gh-actions';
exports.DEFAULT_CLEAN_TARGETS = '.[!.]*,__tests__,src,*.js,*.ts,*.json,*.lock,_config.yml';
exports.DEFAULT_OUTPUT_BUILD_INFO_FILENAME = '';
exports.DEFAULT_FETCH_DEPTH = '3';
exports.DEFAULT_TEST_TAG_PREFIX = '';
exports.TARGET_EVENTS = {
    'release': [
        'published',
        'rerequested',
    ],
    'push': [
        (context) => /^refs\/tags\//.test(context.ref),
        'rerequested',
    ],
};
exports.SEARCH_BUILD_COMMAND_TARGETS = [
    'build',
    'production',
    'prod',
];
