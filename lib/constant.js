"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("./utils/misc");
exports.DEFAULT_COMMIT_MESSAGE = 'feat: Build for release';
exports.DEFAULT_COMMIT_NAME = 'github-actions[bot]';
exports.DEFAULT_COMMIT_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com';
exports.DEFAULT_BRANCH_NAME = 'gh-actions';
exports.DEFAULT_OUTPUT_BUILD_INFO_FILENAME = '';
exports.DEFAULT_FETCH_DEPTH = 3;
exports.DEFAULT_TEST_TAG_PREFIX = '';
exports.DEFAULT_ORIGINAL_TAG_PREFIX = '';
exports.DEFAULT_SEARCH_BUILD_COMMAND_TARGETS = [
    'build',
    'production',
    'prod',
    'package',
];
exports.TARGET_EVENTS = {
    'create': [
        (context) => misc_1.isValidContext(context),
    ],
    'release': [
        [
            'published',
            (context) => misc_1.isValidContext(context),
        ],
    ],
    'push': [
        (context) => misc_1.isValidContext(context),
    ],
};
