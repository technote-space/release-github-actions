import type { Context } from '@actions/github/lib/context';
export declare const DEFAULT_FETCH_DEPTH = 3;
export declare const TARGET_EVENTS: {
    create: ((context: Context) => boolean)[];
    release: (string | ((context: Context) => boolean))[][];
    push: ((context: Context) => boolean)[];
};
