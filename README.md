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

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Screenshots](#screenshots)
- [Installation](#installation)
- [Options](#options)
  - [PACKAGE_MANAGER](#package_manager)
  - [BUILD_COMMAND](#build_command)
  - [COMMIT_MESSAGE](#commit_message)
  - [COMMIT_NAME](#commit_name)
  - [COMMIT_EMAIL](#commit_email)
  - [BRANCH_NAME](#branch_name)
  - [CLEAN_TARGETS](#clean_targets)
  - [BUILD_COMMAND_TARGET](#build_command_target)
  - [CREATE_MAJOR_VERSION_TAG](#create_major_version_tag)
  - [CREATE_MINOR_VERSION_TAG](#create_minor_version_tag)
  - [CREATE_PATCH_VERSION_TAG](#create_patch_version_tag)
  - [OUTPUT_BUILD_INFO_FILENAME](#output_build_info_filename)
  - [FETCH_DEPTH](#fetch_depth)
  - [TEST_TAG_PREFIX](#test_tag_prefix)
  - [ORIGINAL_TAG_PREFIX](#original_tag_prefix)
- [Action event details](#action-event-details)
  - [Target events](#target-events)
  - [condition](#condition)
- [Motivation](#motivation)
- [Addition](#addition)
  - [Tags](#tags)
- [Sample GitHub Actions using this Action](#sample-github-actions-using-this-action)
- [Author](#author)

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
           uses: technote-space/release-github-actions@v1
           with:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
[More details of target event](#action-event-details)

## Options
### PACKAGE_MANAGER
Package manager to use to install dependencies.  
If there is `yarn.lock` or` package-lock.json`, the action automatically determines the package manager to use, but this option can be used to specify it explicitly.  
（`npm` or `yarn`）  
default: `''`

### BUILD_COMMAND
Build command.  
default: `''`  
- If package.json includes `build` or `production` or `prod` in scripts, the command is used for build. (You can change this with [BUILD_COMMAND_TARGET](#build_command_target))  
- If command does not have install command like `npm run install` or `yarn install`, install commands are added.  
- If command is not provided, some files are deleted (see [CLEAN_TARGETS](#clean_targets)).

so if `BUILD_COMMAND` is not provided and package.json has `build` script,
the following commands are executed.
```shell
yarn install
yarn build
yarn install --production
rm -rdf .[!.]*
...
rm -rdf _config.yml
```

### COMMIT_MESSAGE
Commit message.  
default: `'feat: Build for release'`

### COMMIT_NAME
Commit name.  
default: `'GitHub Actions'`

### COMMIT_EMAIL
Commit email.  
default: `'example@example.com'`

### BRANCH_NAME
Branch name for `GitHub Actions` release.  
default: `'gh-actions'`

### CLEAN_TARGETS
Files or directories to delete before release (Comma separated).  
default: `.[!.]*,__tests__,src,*.js,*.ts,*.json,*.lock,_config.yml`  
Absolute path and `..` are not permitted to use.  
This parameter is ignored if `BUILD_COMMAND` is provided.  

### BUILD_COMMAND_TARGET
Command for search build command.  
default: `''`  
e.g. `compile`

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

### ORIGINAL_TAG_PREFIX
Prefix to add when leaving the original tag.  
default: `''`  
e.g. `'original/'`

## Action event details
### Target events
| eventName: action | condition |
|:---:|:---:|
|push: *|[condition](#condition)|
|release: published|[condition](#condition)|
|release: rerequested|[condition](#condition)|
|created: *|[condition](#condition)|
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

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
