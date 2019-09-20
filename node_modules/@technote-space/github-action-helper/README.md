# GitHub Action Helper

[![npm version](https://badge.fury.io/js/%40technote-space%2Fgithub-action-helper.svg)](https://badge.fury.io/js/%40technote-space%2Fgithub-action-helper)
[![Build Status](https://github.com/technote-space/github-action-helper/workflows/Build/badge.svg)](https://github.com/technote-space/github-action-helper/actions)
[![Coverage Status](https://coveralls.io/repos/github/technote-space/github-action-helper/badge.svg?branch=master)](https://coveralls.io/github/technote-space/github-action-helper?branch=master)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/github-action-helper/badge)](https://www.codefactor.io/repository/github/technote-space/github-action-helper)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/github-action-helper/blob/master/LICENSE)

Helper for GitHub Action.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Usage](#usage)
  - [Logger](#logger)
  - [Command](#command)
  - [Utils](#utils)
  - [Test](#test)
- [Author](#author)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usage
1. Install  
`npm i @technote-space/github-action-helper`
1. Use
```js
import { Logger, Command, Utils, Test } from '@technote-space/github-action-helper';
```

### Logger
```js
import { Logger } from '@technote-space/github-action-helper';

const logger = new Logger();
logger.startProcess('Process name');
logger.displayCommand('command');
logger.displayStdout('stdout1\nstdout2');
logger.displayStderr('stderr1\nstderr2');
logger.log();
logger.info('output info');

// ✔  process   [Process name]
//                 > command
//                   >> stdout1
//                   >> stdout2
// ⚠  warning       >> stderr1
// ⚠  warning       >> stderr2
//
// ℹ  info      output info
```

### Command
```js
import { Logger, Command } from '@technote-space/github-action-helper';

const command = new Command(new Logger());
async function run() {
    logger.startProcess('Simple use');
    await command.execAsync({command: 'ls'});
    logger.log();
    logger.startProcess('Options');
    await command.execAsync({command: 'ls', altCommand: 'alt', quiet: true, suppressError: true, suppressOutput: true});

    // ✔  process   [Simple use]
    //                 > ls
    //                   >> README.md
    //                   >> src
    //
    // ✔  process   [Options]
    //                 > alt
}

run();
```

### Utils
```js
import { Utils } from '@technote-space/github-action-helper';
import { context } from '@actions/github';
import path from 'path';

const {
	isRelease,
	getWorkspace,
	getGitUrl,
	escapeRegExp,
	getBoolValue,
	getRepository,
	getTagName,
	uniqueArray,
	getBuildVersion,
	showActionInfo,
} = Utils;

console.log(isRelease(context));  // e.g. true
console.log(getWorkspace());  // e.g. /home/runner/work/RepoOwner/RepoName
console.log(getGitUrl());  // e.g. https://token@github.com/RepoOwner/RepoName.git
console.log(escapeRegExp('.*+?^${}()|[]\\')); // '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\'
console.log(getBoolValue('0'));  // false
console.log(getBoolValue('false'));  // false
console.log(getRepository(context));  // e.g. 'RepoOwner/RepoName'
console.log(getTagName(context));  // e.g. 'v1.2.3'
console.log(uniqueArray([1, 2, 2, 3, 4, 3]));  // [1, 2, 3, 4]
console.log(getBuildVersion(path.resolve(__dirname, 'build.json')));  // e.g. 'v1.2.3'
showActionInfo();
```

### Test
```js
import { Test } from '@technote-space/github-action-helper';
import nock from 'nock';

const {getContext, encodeContent, getConfigFixture, getApiFixture, disableNetConnect, testEnv} = Test;

getContext({});
encodeContent('content');
getConfigFixture('rootDir', 'fileName');
getApiFixture('rootDir', 'name');
disableNetConnect(nock);
testEnv();
```

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
