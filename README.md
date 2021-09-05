# Release GitHub Actions

[![CI Status](https://github.com/technote-space/release-github-actions/workflows/CI/badge.svg)](https://github.com/technote-space/release-github-actions/actions)
[![codecov](https://codecov.io/gh/technote-space/release-github-actions/branch/main/graph/badge.svg)](https://codecov.io/gh/technote-space/release-github-actions)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/release-github-actions/badge)](https://www.codefactor.io/repository/github/technote-space/release-github-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/release-github-actions/blob/main/LICENSE)

*Read this in other languages: [English](README.md), [日本語](README.ja.md).*

This is a `GitHub Actions` that automates the release of `GitHub Actions`.  
Once you create a new tag, this action will automatically
1. Run build
1. Create branch for release
1. Change [tags](#tags) to release branch
1. If there is release which has same tag name and has been published, re-publish it (Because if the tag is changed, the release will be in a draft state).

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<details>
<summary>Details</summary>

- [Usage](#usage)
- [CLI Tool](#cli-tool)
- [Screenshot](#screenshot)
- [Options](#options)
- [Execute commands](#execute-commands)
  - [Build](#build)
  - [Delete files](#delete-files)
- [Action event details](#action-event-details)
  - [Target events](#target-events)
- [Motivation](#motivation)
- [Addition](#addition)
  - [Tags](#tags)
- [Sample GitHub Actions using this Action](#sample-github-actions-using-this-action)
- [Author](#author)

*generated with [TOC Generator](https://github.com/technote-space/toc-generator)*

</details>
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usage
e.g. `.github/workflows/release.yml`  
```yaml
#on:
#  push:
#    tags:
#      - "v*"

on: create

name: Release
jobs:
  release:
    name: Release GitHub Actions
    runs-on: ubuntu-latest
    steps:
      - uses: technote-space/release-github-actions@v6
```

[More details of target event](#action-event-details)

## CLI Tool
[![technote-space/release-github-actions-cli - GitHub](https://gh-card.dev/repos/technote-space/release-github-actions-cli.svg)](https://github.com/technote-space/release-github-actions-cli)

## Screenshot
![Release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-7.gif)

## Options
| name | description | default | required | e.g. |
|:---:|:---|:---:|:---:|:---:|
| BUILD_COMMAND | Build command<br>[More details of execute command](#execute-commands) | | | `yarn build:all` |
| CLEAN_TARGETS | Files or directories to clean before release (Comma separated)<br>Absolute path and `..` are not permitted to use.<br>[More details of execute command](#execute-commands) | `.[!.]*,__tests__,docs,src,*.js,*.ts,*.json,*.lock,*.yml,*.yaml` | true | `.[!.]*,*.txt` |
| PACKAGE_MANAGER | Package manager to use to install dependencies<br>If there is `yarn.lock` or` package-lock.json`, the action automatically determines the package manager to use, but this option can be used to specify it explicitly.<br>（`npm` or `yarn`） | | | `yarn` |
| COMMIT_MESSAGE | Commit message | `feat: build for release` | true | `feat: release` |
| COMMIT_NAME | Commit name | `github-actions[bot]` | true | |
| COMMIT_EMAIL | Commit email | `41898282+github-actions[bot]@users.noreply.github.com` | true | |
| BRANCH_NAME | Branch name for `GitHub Actions` release | `gh-actions` | true | `gh-actions/${MAJOR}/${MINOR}/${PATCH}` |
| BUILD_COMMAND_TARGET | Command for search build command | `prepare, build, production, prod, package, pack` | | `compile` |
| ALLOW_MULTIPLE_BUILD_COMMANDS | Whether to allow run multiple build commands. | `true` | | `false` |
| CREATE_MAJOR_VERSION_TAG | Whether to create major version tag (e.g. v1)<br>[Detail of tags](#tags) | `true` | | `false` |
| CREATE_MINOR_VERSION_TAG | Whether to create minor version tag (e.g. v1.2)<br>[Detail of tags](#tags) | `true` | | `false` |
| CREATE_PATCH_VERSION_TAG | Whether to create patch version tag (e.g. v1.2.3)<br>[Detail of tags](#tags) | `true` | | `false` |
| FETCH_DEPTH | Limit fetching to the specified number of commits from the tip of each remote branch history | `3` | | `5` |
| TEST_TAG_PREFIX | Prefix for test tag | | | `test/` |
| CLEAN_TEST_TAG | Whether to clean test tag | `false` | | `true` |
| ORIGINAL_TAG_PREFIX | Prefix to add when leaving the original tag | | | `original/` |
| GITHUB_TOKEN | Access token | `${{github.token}}` | true | `${{secrets.ACCESS_TOKEN}}` |

## Execute commands
### Build
- If package.json includes `prepare`, `build`, `production`, `prod`, `package` or `pack` in scripts, the commands are used for build. (You can change this with [BUILD_COMMAND_TARGET](#options))  
- If command does not have install command like `npm run install` or `yarn install`, install commands are added.  

so if `BUILD_COMMAND` is not provided and package.json has `build` script,
the following commands are executed for build.

```shell
yarn install
yarn build
yarn install --production
```

If `build` and `pack` are included, the commands are:
                            
```shell
yarn install
yarn build
yarn pack
yarn install --production
```

### Delete files
To execute `GitHub Actions`, `src files used for build`, `test files`, `test settings`, etc. are not required.  
And `GitHub Actions` is downloaded every time when it is used, so fewer files are better.  

`CLEAN_TARGETS` option is used for this purpose.  
default: `.[!.]*,__tests__,docs,src,*.js,*.ts,*.json,*.lock,*.yml,*.yaml`  

```shell
rm -rdf .[!.]*
rm -rdf *.js
rm -rdf *.ts
rm -rdf *.json
rm -rdf *.lock
rm -rdf *.yml
rm -rdf *.yaml
rm -rdf __tests__ docs src
```

(action.yml is not subject to deletion.)

The default setting assumes the use of `Action template for TypeScript` or `Action template for JavaScript`.  
https://github.com/actions/typescript-action  
https://github.com/actions/javascript-action  

However, these templates have security issues etc, you must do the following.

#### Action template for JavaScript

If a pull request includes a built file, it is highly likely that even malicious code will be missed in a review, so you need to fix `.gitignore` as follows:

`.gitignore`
```diff
+ /dist
```

#### Action template for TypeScript

Since processing by `ncc` is unnecessary, delete the related commands and packages and modify `action.yml` to use script built with `tsc`.

`action.yml`  
```diff
 name: 'Your name here'
 description: 'Provide a description here'
 author: 'Your name or organization here'
 inputs:
   myInput:              # change this
     description: 'input description here'
     default: 'default value if applicable'
 runs:
   using: 'node12'
-  main: 'dist/index.js'
+  main: 'lib/main.js'
``` 

`package.json`
```diff
   "scripts": {
     "build": "tsc",
     "format": "prettier --write **/*.ts",
     "format-check": "prettier --check **/*.ts",
     "lint": "eslint src/**/*.ts",
-    "package": "ncc build --source-map --license licenses.txt",
-    "test": "jest",
-    "all": "npm run build && npm run format && npm run lint && npm run package && npm test"
+    "test": "jest"
   },
``` 

```diff
  "devDependencies": {
     "@types/jest": "^26.0.10",
     "@types/node": "^14.6.0",
     "@typescript-eslint/parser": "^3.10.1",
-    "@vercel/ncc": "^0.23.0",
     "eslint": "^7.7.0",
     "eslint-plugin-github": "^4.1.1",
     "eslint-plugin-jest": "^23.20.0",
     "jest": "^24.9.0",
     "jest-circus": "^26.4.2",
     "js-yaml": "^3.14.0",
     "prettier": "2.1.1",
     "ts-jest": "^24.3.0",
     "typescript": "^4.0.2"
   }
``` 

You can see an example of `GitHub Actions` with unnecessary files deleted below.  
https://github.com/technote-space/release-github-actions/tree/gh-actions

## Action event details
### Target events
| eventName: action | condition |
|:---:|:---:|
|push: *|[condition](#condition)|
|release: published|[condition](#condition)|
|create: *|[condition](#condition)|

### condition
- tags
  - semantic versioning tag (e.g. `v1.2.3`)
  - [test tag](#options) (e.g. `test/v1.2.3`)

## Motivation
Releasing `GitHub Actions` needs all build files and dependencies like `node_modules`, but are not usually committed.  
So if you want to release `GitHub Actions`, you have to do following steps.  
1. Develop locally on the branch for develop
1. Build for release
1. Commit all source code including dependencies like `node_modules` to branch for release
1. Add tags (consider major, minor and patch versions)
1. Push to GitHub
1. Publish release

It is very troublesome to do this steps for every release.  

If you use this `GitHub Actions`, the steps to do are simpler.
1. Develop locally on the branch for develop
1. Publish release (Create tag)
1. Wait for the automated steps to finish
   1. Build for release
   1. Commit all source code including dependencies like `node_modules` to branch for release
   1. Add tags (consider major, minor and patch versions)
   1. Push to GitHub

## Addition
### Tags 
Tag name format must be [Semantic Versioning](https://semver.org/).  
The following tags will be created.
- tag name
- major tag name (generated by tag name)
  - e.g. `v1`
- minor tag name (generated by tag name)
  - e.g. `v1.2`
- patch tag name (generated by tag name)
  - e.g. `v1.2.3`

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
