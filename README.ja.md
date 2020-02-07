# Release GitHub Actions

[![CI Status](https://github.com/technote-space/release-github-actions/workflows/CI/badge.svg)](https://github.com/technote-space/release-github-actions/actions)
[![codecov](https://codecov.io/gh/technote-space/release-github-actions/branch/master/graph/badge.svg)](https://codecov.io/gh/technote-space/release-github-actions)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/release-github-actions/badge)](https://www.codefactor.io/repository/github/technote-space/release-github-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/release-github-actions/blob/master/LICENSE)

*Read this in other languages: [English](README.md), [日本語](README.ja.md).*

これは `GitHub Actions` のリリースを自動化するための `GitHub Actions` です。  
タグを作成するとこのアクションは自動で以下を行います。
1. ビルド実行
1. リリース用ブランチ作成
1. リリース用ブランチに[タグ](#tags)を張り替え
1. 同じタグ名 かつ 公開済みのリリースが存在する場合、再度公開 (タグを張り替えた場合、リリースが下書き状態になるため)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<details>
<summary>Details</summary>

- [スクリーンショット](#%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88)
- [インストール](#%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB)
- [オプション](#%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3)
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
  - [ビルド](#%E3%83%93%E3%83%AB%E3%83%89)
  - [ファイル削除](#%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E5%89%8A%E9%99%A4)
- [Action イベント詳細](#action-%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E8%A9%B3%E7%B4%B0)
  - [対象イベント](#%E5%AF%BE%E8%B1%A1%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88)
  - [condition](#condition)
- [動機](#%E5%8B%95%E6%A9%9F)
- [補足](#%E8%A3%9C%E8%B6%B3)
  - [Tags](#tags)
- [このアクションを使用しているアクションの例](#%E3%81%93%E3%81%AE%E3%82%A2%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B%E3%82%A2%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E4%BE%8B)
- [Author](#author)

</details>
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## スクリーンショット
1. リリース作成前  
   ![Before publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-1.png)
1. リリースを作成 (タグを作成)  
   ![Publish release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-2.png)
1. GitHub Actions 実行中  
   ![Running GitHub Actions](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-3.png)
1. GitHub Actions 実行後  
   ![After running GitHub Actions](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-4.png)

## インストール
1. workflow を設定  
   例： `.github/workflows/release.yml`
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
           uses: technote-space/release-github-actions@v3
           with:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```
[対象イベントの詳細](#action-%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E8%A9%B3%E7%B4%B0)

## オプション
### BUILD_COMMAND
ビルド用コマンド  
default: `''`  
[More details of execute command](#execute-commands)

### CLEAN_TARGETS
リリース前に掃除するファイルやディレクトリ (カンマ区切り)  
default: `.[!.]*,__tests__,src,*.js,*.ts,*.json,*.lock,*.yml,*.yaml`  
絶対パスや `..` は使用できません。  
[More details of execute command](#execute-commands)

### PACKAGE_MANAGER
依存関係のインストールに使用するパッケージマネージャー  
`yarn.lock` や `package-lock.json` がある場合は自動で使用するパッケージマネージャーを決定しますが、このオプションで強制することができます。  
（`npm` または `yarn`）  
default: `''`  

### COMMIT_MESSAGE
コミット時に設定するメッセージ  
default: `'feat: Build for release'`

### COMMIT_NAME
コミット時に設定する名前  
default: `'github-actions[bot]'`

### COMMIT_EMAIL
コミット時に設定するメールアドレス  
default: `'41898282+github-actions[bot]@users.noreply.github.com'`

### BRANCH_NAME
GitHub Actions 用のブランチ名  
default: `'gh-actions'`

### BUILD_COMMAND_TARGET
ビルド用コマンド検索ターゲット  
default: `''`  
例：`compile`  
このオプションが設定されていない場合、`build`, `production`, `prod` と `package` が使用されます。  

### CREATE_MAJOR_VERSION_TAG
メジャーバージョンタグ(例：v1)を作成するかどうか  
default: `true`  
[タグの詳細](#tags)

### CREATE_MINOR_VERSION_TAG
マイナーバージョンタグ(例：v1.2)を作成するかどうか  
default: `true`  
[タグの詳細](#tags)

### CREATE_PATCH_VERSION_TAG
パッチバージョンタグ(例：v1.2.3)を作成するかどうか  
default: `true`  
[タグの詳細](#tags)

### FETCH_DEPTH
取得するコミット履歴の制限数  
default: `3`  

### TEST_TAG_PREFIX
テスト用タグのプリフィックス  
default: `''`  
例：`'test/'`  

### CLEAN_TEST_TAG
テストタグを掃除するかどうか  
default: `'false'`  
例：`'true'`  

### ORIGINAL_TAG_PREFIX
元のタグを残す際に付与するプリフィックス  
default: `''`  
例：`'original/'`  

## Execute commands
### ビルド
- `build`、 `production`、 `prod` または `package` が package.json の scripts に含まれる場合、ビルド用のコマンドとしてそれを使用します。([BUILD_COMMAND_TARGET](#build_command_target) で変更可能です)  
- `npm run install` や `yarn install` のようなインストール用コマンドが存在しない場合、インストール用コマンドが追加されます。  

したがって、`BUILD_COMMAND` が設定されていない かつ package.json に `build` が存在する場合、以下のコマンドが実行されます。

```shell
yarn install
yarn build
yarn install --production
```

### ファイル削除
`GitHub Actions` の実行には「ビルドに使用するソース」や「テストファイル」、「テストの設定」などを必要としません。  
そして `GitHub Actions` は使用されるたびにダウンロードされるため、ファイルは少ないほうが良いです。  

`CLEAN_TARGETS` オプションはこの目的のために使用されます。  
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

(action.yml は削除の対象ではありません)

このデフォルト値は「TypeScriptのActionテンプレート」や「JavaScriptのActionテンプレート」の使用を想定した値になっています。  
https://github.com/actions/typescript-action  
https://github.com/actions/javascript-action  

不要なファイルが削除された`GitHub Actions`の例を以下で確認できます。  
https://github.com/technote-space/release-github-actions/tree/gh-actions

## Action イベント詳細
### 対象イベント
| eventName: action | condition |
|:---:|:---:|
|push: *|[condition](#condition)|
|release: published|[condition](#condition)|
|release: rerequested|[condition](#condition)|
|create: *|[condition](#condition)|
### condition
- tags
  - semantic versioning tag (例：`v1.2.3`)
  - [テストタグ](#test_tag_prefix) (例：`test/v1.2.3`)

## 動機
`GitHub Actions`をリリースするには、すべてのビルドファイルと `node_modules` のような依存関係が必要ですが、通常はそれらをコミットしません。  
したがって`GitHub Actions`リリースする際には以下のような手順が必要です。  
1. ローカルの開発用ブランチで開発
1. リリース用にビルド
1. `node_modules` のような依存モジュールを含めて必要なソースをリリース用ブランチにコミット
1. タグを付与 (メジャー、マイナー、パッチバージョンの考慮が必要)
1. GitHub にプッシュ
1. リリースを作成

リリースの度にこれらの手順を実行するのはとても面倒です。  

この `GitHub Actions` を使用することで手順は単純になります。
1. ローカルの開発用ブランチで開発
1. リリースを作成 (タグを作成)
1. 自動化された手順が完了するのを待つ
   1. リリース用にビルド
   1. `node_modules` のような依存モジュールを含めて必要なソースをリリース用ブランチにコミット
   1. タグを付与 (メジャー、マイナー、パッチバージョンの考慮が必要)
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
- パッチバージョンのタグ名 (指定されたタグ名から生成)
  - 例：`v1.2.3`

## このアクションを使用しているアクションの例
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
