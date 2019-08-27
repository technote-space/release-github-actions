# Release GitHub Actions

[![Build Status](https://github.com/technote-space/release-github-actions/workflows/Build/badge.svg)](https://github.com/technote-space/release-github-actions/actions)
[![Coverage Status](https://coveralls.io/repos/github/technote-space/release-github-actions/badge.svg?branch=master)](https://coveralls.io/github/technote-space/release-github-actions?branch=master)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/release-github-actions/badge)](https://www.codefactor.io/repository/github/technote-space/release-github-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/release-github-actions/blob/master/LICENSE)

GitHub actions to auto release.  
Once you publish the release, this action will run build and create branch automatically.

## Installation
.github/workflows/release.yml
```yaml
on: release
name: Release
jobs:
  release:
    name: Release GitHub Actions
    runs-on: ubuntu-latest
    steps:
      - name: Release GitHub Actions
        uses: technote-space/release-github-actions@v1.0.3
        with:
          ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
```

## ACCESS_TOKEN
1. Generate a [personal access token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) with the public_repo or repo scope.
(repo is required for private repositories).  
1. [Save as secrets](https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables)

## Details
### Target event
- release
### Target action
- published
### Branch name
- Tag name

## Options
### BUILD_COMMAND
Build command.  
default: `''`  
- If package.json includes build or production or prod in scripts, the command is used for build.  
- If command does not have install command like `npm run install` or `yarn install`, install commands are added.  
- If command is not provided, `rm -rdf .github` command is added.

so if `BUILD_COMMAND` is not provided and package.json has `build` script,
the following commands are executed.
```shell
yarn install
yarn build
yarn install --production
rm -rdf .github
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