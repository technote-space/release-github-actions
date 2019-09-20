# Release GitHub Actions

[![Build Status](https://github.com/technote-space/release-github-actions/workflows/Build/badge.svg)](https://github.com/technote-space/release-github-actions/actions)
[![Coverage Status](https://coveralls.io/repos/github/technote-space/release-github-actions/badge.svg?branch=master)](https://coveralls.io/github/technote-space/release-github-actions?branch=master)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/release-github-actions/badge)](https://www.codefactor.io/repository/github/technote-space/release-github-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/release-github-actions/blob/master/LICENSE)

*Read this in other languages: [English](README.md), [日本語](README.ja.md).*

これは GitHub Action のリリースを自動化するための GitHub Action です。  
タグを作成するとこのアクションは自動で
1. ビルド実行
1. リリース用ブランチ作成
1. リリース用ブランチに[タグ](#tags)を張り替え
1. 同じタグ名 かつ 公開済みのリリースが存在する場合、公開させます。(タグを張り替えた場合、リリースが下書き状態になるため)

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

## スクリーンショット
1. リリース作成前  
   ![Before publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-1.png)
1. リリースを作成 (タグを作成)  
   ![Publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-2.png)
1. GitHub Action 実行中  
   ![Running GitHub Action](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-3.png)
1. GitHub Action 実行後  
   ![After running GitHub Action](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-4.png)

## インストール
1. workflow を設定  
   例： `.github/workflows/release.yml`
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

## 必要なパラメータ
### ACCESS_TOKEN
1. public_repo または repo のスコープで [personal access token](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) を生成。  
(プライベートリポジトリの場合 repo が必要です)  
1. [Secretsに保存](https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables)

## オプション
### BUILD_COMMAND
ビルド用コマンド  
default: `''`  
- build、 production または prod package.json の scripts に含まれる場合、ビルド用のコマンドとしてそれを使用します。  
- `npm run install` や `yarn install` のようなインストール用コマンドが存在しない場合、インストール用コマンドが追加されます。  
- ビルド用コマンドが空の場合、いくつかのファイルが削除されます。 (詳細：[CLEAN_TARGETS](#clean_targets)).  

したがって、`BUILD_COMMAND` が設定されていない かつ package.json に `build` が存在する場合、以下のコマンドが実行されます。
```shell
yarn install
yarn build
yarn install --production
rm -rdf .[!.]*
...
rm -rdf _config.yml
```

### COMMIT_MESSAGE
コミット時に設定するメッセージ  
default: `'feat: Build for release'`

### COMMIT_NAME
コミット時に設定する名前  
default: `'GitHub Actions'`

### COMMIT_EMAIL
コミット時に設定するメールアドレス  
default: `'example@example.com'`

### BRANCH_NAME
GitHub Action 用のブランチ名  
default: `'gh-actions'`

### CLEAN_TARGETS
リリース前に削除するファイルやディレクトリ (カンマ区切り)  
default: `.[!.]*,__tests__,src,*.js,*.ts,*.json,*.lock,_config.yml`  
絶対パスや `..` は使用できません。  

### CREATE_MAJOR_VERSION_TAG
メジャーバージョンタグ(例：v1)を作成するかどうか  
default: `true`  
[タグの詳細](#tags)

### CREATE_MINOR_VERSION_TAG
マイナーバージョンタグ(例：v1.2)を作成するかどうか  
default: `true`  
[タグの詳細](#tags)

### OUTPUT_BUILD_INFO_FILENAME
ビルド情報を出力するファイル名  
default: `''`  
絶対パスや `..` は使用できません。  
この設定が空でない場合、以下のような情報が出力されます。  
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
取得するコミット履歴の制限数  
default: `3`  

### TEST_TAG_PREFIX
テスト用タグのプリフィックス  
default: `''`  
例：`'test/'`

### ORIGINAL_TAG_PREFIX
元のタグを残す際に付与するプリフィックス  
default: `''`  
例：`'original/'`

## Action イベント詳細
### 対象イベント
- push: *
  - tags
    - semantic versioning tag (例：`v1.2.3`)
    - [テストタグ](#test_tag_prefix) (例：`test/v1.2.3`)
- push: rerequested

## 動機
`GitHub Action`をリリースするには、すべてのビルドファイルと `node_modules` のような依存関係が必要ですが、通常はそれらをコミットしません。  
したがって`GitHub Action`リリースする際には以下のような手順が必要です。  
1. ローカルの開発用ブランチで開発
1. リリース用にビルド
1. `node_modules` のような依存モジュールを含めて必要なソースをリリース用ブランチにコミット
1. タグを付与 (メジャーバージョンやマイナーバージョンの考慮が必要)
1. GitHub にプッシュ
1. リリースを作成

リリースの度にこれらの手順を実行するのはとても面倒です。  

この `GitHub Action` を使用することで手順は単純になります。
1. ローカルの開発用ブランチで開発
1. リリースを作成 (タグを作成)
1. 自動化された手順が完了するのを待つ
   1. リリース用にビルド
   1. `node_modules` のような依存モジュールを含めて必要なソースをリリース用ブランチにコミット
   1. タグを付与 (メジャーバージョンやマイナーバージョンの考慮が必要)
   1. GitHub にプッシュ

## 補足
### Tags
タグ名は [Semantic Versioning](https://semver.org/) に従っている必要があります。  
以下のタグが作成されます。
- 指定されたタグ名
- メジャーバージョンのタグ名 (指定されたタグ名から生成)
  - 例：`v1`
- マイナーバージョンのタグ名 (指定されたタグ名から生成)
  - 例：`v1.2`

## このアクションを使用しているアクションの例
- [Release GitHub Actions](https://github.com/technote-space/release-github-actions)
  - [released.yml](https://github.com/technote-space/release-github-actions/blob/master/.github/workflows/released.yml)
- [Auto card labeler](https://github.com/technote-space/auto-card-labeler)
  - [released.yml](https://github.com/technote-space/auto-card-labeler/blob/master/.github/workflows/released.yml)
- [Assign Author](https://github.com/technote-space/assign-author)
  - [released.yml](https://github.com/technote-space/assign-author/blob/master/.github/workflows/released.yml)
- [TOC Generator](https://github.com/technote-space/toc-generator)
  - [released.yml](https://github.com/technote-space/toc-generator/blob/master/.github/workflows/released.yml)

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
