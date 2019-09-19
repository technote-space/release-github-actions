# Release GitHub Actions

[![Build Status](https://github.com/technote-space/release-github-actions/workflows/Build/badge.svg)](https://github.com/technote-space/release-github-actions/actions)
[![Coverage Status](https://coveralls.io/repos/github/technote-space/release-github-actions/badge.svg?branch=master)](https://coveralls.io/github/technote-space/release-github-actions?branch=master)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/release-github-actions/badge)](https://www.codefactor.io/repository/github/technote-space/release-github-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/release-github-actions/blob/master/LICENSE)

This is a GitHub Action that automates the release of GitHub Action.  
Once you publish the release, this action will automatically
1. Run build
1. Create branch for release
1. Change [tags](#tags) to release branch
1. If there is release which has same tag name and has been published, re-publish it (Because if the tag is changed, the release will be in a draft state).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Screenshots](#screenshots)
- [Installation](#installation)
- [Required parameter](#required-parameter)
  - [ACCESS_TOKEN](#access_token)
- [Options](#options)
  - [BUILD_COMMAND](#build_command)
  - [COMMIT_MESSAGE](#commit_message)
  - [COMMIT_NAME](#commit_name)
  - [COMMIT_EMAIL](#commit_email)
  - [BRANCH_NAME](#branch_name)
  - [CLEAN_TARGETS](#clean_targets)
  - [CREATE_MAJOR_VERSION_TAG](#create_major_version_tag)
  - [CREATE_MINOR_VERSION_TAG](#create_minor_version_tag)
  - [OUTPUT_BUILD_INFO_FILENAME](#output_build_info_filename)
  - [FETCH_DEPTH](#fetch_depth)
  - [TEST_TAG_PREFIX](#test_tag_prefix)
  - [ORIGINAL_TAG_PREFIX](#original_tag_prefix)
- [Action event details](#action-event-details)
  - [Target events](#target-events)
- [Motivation](#motivation)
- [Addition](#addition)
  - [tags](#tags)
- [GitHub Actions using this Action](#github-actions-using-this-action)
- [Author](#author)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Screenshots
1. Before publish release  
   ![Before publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-1.png)
1. Publish release (Create tag)  
   ![Publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-2.png)
1. Running GitHub Action  
   ![Running GitHub Action](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-3.png)
1. After running GitHub Action  
   ![After running GitHub Action](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-4.png)

## Installation
1. Setup workflow  
   e.g. `.github/workflows/release.yml`
   ```yaml
   on: push
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
             ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
   ```

## Required parameter
### ACCESS_TOKEN
1. Generate a [personal access token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) with the public_repo or repo scope.
(repo is required for private repositories.)  
1. [Save as secrets](https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables)

## Options
### BUILD_COMMAND
Build command.  
default: `''`  
- If package.json includes build or production or prod in scripts, the command is used for build.  
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
Branch name for GitHub Action release.  
default: `'gh-actions'`

### CLEAN_TARGETS
Files or directories to delete before release (Comma separated).  
default: `.[!.]*,__tests__,src,*.js,*.ts,*.json,*.lock,_config.yml`  
Absolute path and `..` are not permitted to use.

### CREATE_MAJOR_VERSION_TAG
Whether to create major version tag.  
default: `true`  
Set to `false` if you do not want to create a major version tag.  
[Detail of tags](#tags)

### CREATE_MINOR_VERSION_TAG
Whether to create minor version tag.  
default: `true`  
Set to `false` if you do not want to create a minor version tag.  
[Detail of tags](#tags)

### OUTPUT_BUILD_INFO_FILENAME
Filename of build information.  
default: `''`  
Absolute path and `..` are not permitted to use.  
If this setting is not empty, following information is output with the file name.
```json
{
  "tagName": "${tagName}",
  "branch": "${branch}",
  "tags": [
    "${created_tag_1}",
    "...",
    "${created_tag_n}"
  ],
  "updated_at": "${updated_at}"
}
```

### FETCH_DEPTH
Limit fetching to the specified number of commits from the tip of each remote branch history.  
default: `3`  

### TEST_TAG_PREFIX
Prefix for test tag.  
default: `''`  
ex. `'test/'`

### ORIGINAL_TAG_PREFIX
Prefix to add when leaving the original tag.  
default: `''`  
ex. `'original/'`

## Action event details
### Target events
- push: *
  - tags
    - semantic versioning tag (e.g. `v1.2.3`)
    - [test tag](#test_tag_prefix) (e.g. `test/v1.2.3`)
- push: rerequested

## Motivation
Release package needs all build files and dependencies like `node_modules`, but are not usually committed.  
So if you want to release `GitHub Action`, you have to do following steps.  
1. Develop locally on the branch for develop
1. Build for release
1. Commit all source code including dependencies like `node_modules`
1. Add tags (consider major and minor versions)
1. Push to GitHub
1. Publish release

It is very troublesome to do this steps for every release.  

If you use this `GitHub Action`, the steps to do are simpler.
1. Develop locally on the branch for develop
1. Publish release (Create tag)
1. Wait for the automated steps to finish
   1. Build for release
   1. Commit all source code including dependencies like `node_modules`
   1. Add tags (consider major and minor versions)
   1. Push to GitHub

## Addition
### tags 
Tag name format must be [Semantic Versioning](https://semver.org/).  
The following tags will be created.
- tag name
- major tag name (generated by tag name)
  - e.g. `v1`
- minor tag name (generated by tag name)
  - e.g. `v1.2`

## GitHub Actions using this Action
- [Release GitHub Actions](https://github.com/technote-space/release-github-actions)
- [Auto card labeler](https://github.com/technote-space/auto-card-labeler)
- [Assign Author](https://github.com/technote-space/assign-author)
- [TOC Generator](https://github.com/technote-space/toc-generator)

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
