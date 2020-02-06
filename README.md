# Release GitHub Actions

[![CI Status](https://github.com/technote-space/release-github-actions/workflows/CI/badge.svg)](https://github.com/technote-space/release-github-actions/actions)
[![codecov](https://codecov.io/gh/technote-space/release-github-actions/branch/master/graph/badge.svg)](https://codecov.io/gh/technote-space/release-github-actions)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/release-github-actions/badge)](https://www.codefactor.io/repository/github/technote-space/release-github-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/release-github-actions/blob/master/LICENSE)

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

- [Screenshots](#screenshots)
- [Installation](#installation)
- [Options](#options)
  - [BUILD_COMMAND](#build_command)
  - [CLEAN_TARGETS](#clean_targets)
  - [PACKAGE_MANAGER](#package_manager)
  - [COMMIT_MESSAGE](#commit_message)
  - [COMMIT_NAME](#commit_name)
  - [COMMIT_EMAIL](#commit_email)
  - [BRANCH_NAME](#branch_name)
  - [BUILD_COMMAND_TARGET](#build_command_target)
  - [CREATE_MAJOR_VERSION_TAG](#create_major_version_tag)
  - [CREATE_MINOR_VERSION_TAG](#create_minor_version_tag)
  - [CREATE_PATCH_VERSION_TAG](#create_patch_version_tag)
  - [FETCH_DEPTH](#fetch_depth)
  - [TEST_TAG_PREFIX](#test_tag_prefix)
  - [CLEAN_TEST_TAG](#clean_test_tag)
  - [ORIGINAL_TAG_PREFIX](#original_tag_prefix)
- [Execute commands](#execute-commands)
  - [Build](#build)
  - [Delete files](#delete-files)
- [Action event details](#action-event-details)
  - [Target events](#target-events)
  - [condition](#condition)
- [Motivation](#motivation)
- [Addition](#addition)
  - [Tags](#tags)
- [Sample GitHub Actions using this Action](#sample-github-actions-using-this-action)
- [Author](#author)

</details>
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Screenshots
1. Before publish release  
   ![Before publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-1.png)
1. Publish release (Create tag)  
   ![Publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-2.png)
1. Running `GitHub Actions`  
   ![Running GitHub Actions](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-3.png)
1. After running `GitHub Actions`  
   ![After running GitHub Actions](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-4.png)

## Installation
1. Setup workflow  
   e.g. `.github/workflows/release.yml`
   ```yaml
   # on: push
   on: create

   name: Release
   jobs:
     release:
       name: Release GitHub Actions
       runs-on: ubuntu-latest
       steps:
         - name: Release GitHub Actions
           uses: technote-space/release-github-actions@v2
           with:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
[More details of target event](#action-event-details)

## Options
### BUILD_COMMAND
Build command.  
default: `''`  
[More details of execute command](#execute-commands)

### CLEAN_TARGETS
Files or directories to clean before release (Comma separated).  
default: `.[!.]*,__tests__,src,*.js,*.ts,*.json,*.lock,*.yml,*.yaml`  
Absolute path and `..` are not permitted to use.  
[More details of execute command](#execute-commands)

### PACKAGE_MANAGER
Package manager to use to install dependencies.  
If there is `yarn.lock` or` package-lock.json`, the action automatically determines the package manager to use, but this option can be used to specify it explicitly.  
（`npm` or `yarn`）  
default: `''`  

### COMMIT_MESSAGE
Commit message.  
default: `'feat: Build for release'`

### COMMIT_NAME
Commit name.  
default: `'github-actions[bot]'`

### COMMIT_EMAIL
Commit email.  
default: `'41898282+github-actions[bot]@users.noreply.github.com'`

### BRANCH_NAME
Branch name for `GitHub Actions` release.  
default: `'gh-actions'`

### BUILD_COMMAND_TARGET
Command for search build command.  
default: `''`  
e.g. `compile`  
If this option is not provided, `build`, `production`, `prod` and `package` are used.

### CREATE_MAJOR_VERSION_TAG
Whether to create major version tag (e.g. v1).  
default: `true`  
[Detail of tags](#tags)

### CREATE_MINOR_VERSION_TAG
Whether to create minor version tag (e.g. v1.2).  
default: `true`  
[Detail of tags](#tags)

### CREATE_PATCH_VERSION_TAG
Whether to create patch version tag (e.g. v1.2.3).  
default: `true`  
[Detail of tags](#tags)

### FETCH_DEPTH
Limit fetching to the specified number of commits from the tip of each remote branch history.  
default: `3`  

### TEST_TAG_PREFIX
Prefix for test tag.  
default: `''`  
e.g. `'test/'`  

### CLEAN_TEST_TAG
Whether to clean test tag.  
default: `'false'`  
e.g. `'true'`  

### ORIGINAL_TAG_PREFIX
Prefix to add when leaving the original tag.  
default: `''`  
e.g. `'original/'`  

## Execute commands
### Build
- If package.json includes `build`, `production`, `prod` or `package` in scripts, the command is used for build. (You can change this with [BUILD_COMMAND_TARGET](#build_command_target))  
- If command does not have install command like `npm run install` or `yarn install`, install commands are added.  

so if `BUILD_COMMAND` is not provided and package.json has `build` script,
the following commands are executed for build.

```shell
yarn install
yarn build
yarn install --production
```

### Delete files
To execute `GitHub Actions`, `src files used for build`, `test files`, `test settings`, etc. are not required.  
And `GitHub Actions` is downloaded every time when it is used, so fewer files are better.  

`CLEAN_TARGETS` option is used for this purpose.  
default: `.[!.]*,__tests__,src,*.js,*.ts,*.json,*.lock,*.yml,*.yaml`  

```shell
rm -rdf .[!.]*
rm -rdf *.js
rm -rdf *.ts
rm -rdf *.json
rm -rdf *.lock
rm -rdf *.yml
rm -rdf *.yaml
rm -rdf __tests__ src
```

The default setting assumes the use of `Action template for TypeScript` or `Action template for JavaScript`.  
https://github.com/actions/typescript-action  
https://github.com/actions/javascript-action  

You can see an example of `GitHub Actions` with unnecessary files deleted below.  
https://github.com/technote-space/release-github-actions/tree/gh-actions

## Action event details
### Target events
| eventName: action | condition |
|:---:|:---:|
|push: *|[condition](#condition)|
|release: published|[condition](#condition)|
|release: rerequested|[condition](#condition)|
|create: *|[condition](#condition)|
### condition
- tags
  - semantic versioning tag (e.g. `v1.2.3`)
  - [test tag](#test_tag_prefix) (e.g. `test/v1.2.3`)

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

## Sample GitHub Actions using this Action
- [Release GitHub Actions](https://github.com/technote-space/release-github-actions)
  - [release.yml](https://github.com/technote-space/release-github-actions/blob/master/.github/workflows/release.yml)
- [Auto card labeler](https://github.com/technote-space/auto-card-labeler)
  - [release.yml](https://github.com/technote-space/auto-card-labeler/blob/master/.github/workflows/release.yml)
- [Assign Author](https://github.com/technote-space/assign-author)
  - [release.yml](https://github.com/technote-space/assign-author/blob/master/.github/workflows/release.yml)
- [TOC Generator](https://github.com/technote-space/toc-generator)
  - [release.yml](https://github.com/technote-space/toc-generator/blob/master/.github/workflows/release.yml)
- [Package Version Check Action](https://github.com/technote-space/package-version-check-action)
  - [release.yml](https://github.com/technote-space/package-version-check-action/blob/master/.github/workflows/release.yml)
- [Get Diff Action](https://github.com/technote-space/get-diff-action)
  - [release.yml](https://github.com/technote-space/get-diff-action/blob/master/.github/workflows/release.yml)
- [Create Project Card Action](https://github.com/technote-space/create-project-card-action)
  - [release.yml](https://github.com/technote-space/create-project-card-action/blob/master/.github/workflows/release.yml)
- [Get git comment action](https://github.com/technote-space/get-git-comment-action)
  - [release.yml](https://github.com/technote-space/get-git-comment-action/blob/master/.github/workflows/release.yml)

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
