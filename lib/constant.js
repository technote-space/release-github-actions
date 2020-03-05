"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("./utils/misc");
exports.DEFAULT_FETCH_DEPTH = 3;
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
