# Release GitHub Actions

[![CI Status](https://github.com/technote-space/release-github-actions/workflows/CI/badge.svg)](https://github.com/technote-space/release-github-actions/actions)
[![codecov](https://codecov.io/gh/technote-space/release-github-actions/branch/main/graph/badge.svg)](https://codecov.io/gh/technote-space/release-github-actions)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/release-github-actions/badge)](https://www.codefactor.io/repository/github/technote-space/release-github-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/release-github-actions/blob/main/LICENSE)

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

- [使用方法](#%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95)
- [CLI ツール](#cli-%E3%83%84%E3%83%BC%E3%83%AB)
- [スクリーンショット](#%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88)
- [オプション](#%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3)
- [Execute commands](#execute-commands)
  - [ビルド](#%E3%83%93%E3%83%AB%E3%83%89)
  - [ファイル削除](#%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E5%89%8A%E9%99%A4)
- [Action イベント詳細](#action-%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E8%A9%B3%E7%B4%B0)
  - [対象イベント](#%E5%AF%BE%E8%B1%A1%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88)
  - [condition](#condition)
- [動機](#%E5%8B%95%E6%A9%9F)
- [補足](#%E8%A3%9C%E8%B6%B3)
  - [Tags](#tags)
- [Author](#author)

*generated with [TOC Generator](https://github.com/technote-space/toc-generator)*

</details>
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 使用方法
例：`.github/workflows/release.yml`  
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

[対象イベントの詳細](#action-%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E8%A9%B3%E7%B4%B0)

## CLI ツール
[![technote-space/release-github-actions-cli - GitHub](https://gh-card.dev/repos/technote-space/release-github-actions-cli.svg)](https://github.com/technote-space/release-github-actions-cli)

## スクリーンショット
![Release](https://raw.githubusercontent.com/technote-space/release-github-actions/images/screenshot-7.gif)

## オプション
| name | description | default | required | e.g. |
|:---:|:---|:---:|:---:|:---:|
| BUILD_COMMAND | ビルド用コマンド<br>[コマンドの詳細](#execute-commands) | | | `yarn build:all` |
| CLEAN_TARGETS | リリース前に掃除するファイルやディレクトリ (カンマ区切り)<br>絶対パスや `..` は使用できません<br>[コマンドの詳細](#execute-commands) |`.[!.]*,__tests__,docs,src,*.[jt]s,*.[mc][jt]s,*.json,*.lock,*.yml,*.yaml` | true | `.[!.]*,*.txt` |
| PACKAGE_MANAGER | 依存関係のインストールに使用するパッケージマネージャー<br>`yarn.lock` や `package-lock.json` がある場合は自動で使用するパッケージマネージャーを決定しますが、このオプションで強制することができます<br>（`npm` または `yarn`） | | | `yarn` |
| COMMIT_MESSAGE | コミット時に設定するメッセージ | `feat: build for release` | true | `feat: release` |
| COMMIT_NAME | コミット時に設定する名前 | `github-actions[bot]` | true | |
| COMMIT_EMAIL | コミット時に設定する名前 | `41898282+github-actions[bot]@users.noreply.github.com` | true | |
| BRANCH_NAME | GitHub Actions 用のブランチ名 | `gh-actions` | true | `gh-actions/${MAJOR}/${MINOR}/${PATCH}` |
| BUILD_COMMAND_TARGET | ビルド用コマンド検索ターゲット | `prepare, build, production, prod, package, pack` | | `compile` |
| ALLOW_MULTIPLE_BUILD_COMMANDS | 複数のビルドコマンド実行を許可するかどうか | `true` | | `false` |
| CREATE_MAJOR_VERSION_TAG | メジャーバージョンタグ(例：v1)を作成するかどうか<br>[タグの詳細](#tags) | `true` | | `false` |
| CREATE_MINOR_VERSION_TAG | マイナーバージョンタグ(例：v1.2)を作成するかどうか<br>[タグの詳細](#tags) | `true` | | `false` |
| CREATE_PATCH_VERSION_TAG | パッチバージョンタグ(例：v1.2.3)を作成するかどうか<br>[タグの詳細](#tags) | `true` | | `false` |
| FETCH_DEPTH | 取得するコミット履歴の制限数 | `3` | | `5` |
| TEST_TAG_PREFIX | テスト用タグのプリフィックス | | | `test/` |
| CLEAN_TEST_TAG | テストタグを掃除するかどうか | `false` | | `true` |
| ORIGINAL_TAG_PREFIX | 元のタグを残す際に付与するプリフィックス | | | `original/` |
| DELETE_NODE_MODULES | node_modules を削除するかどうか | `false` | | `true` |
| GITHUB_TOKEN | アクセストークン | `${{github.token}}` | true | `${{secrets.ACCESS_TOKEN}}` |

## Execute commands
### ビルド
- `prepare`、 `build`、 `production`、 `prod`、 `package` または `pack` が package.json の scripts に含まれる場合、ビルド用のコマンドとしてそれらを使用します。([BUILD_COMMAND_TARGET](#%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3) で変更可能です)  
- `npm run install` や `yarn install` のようなインストール用コマンドが存在しない場合、インストール用コマンドが追加されます。  

したがって、`BUILD_COMMAND` が設定されていない かつ package.json に `build` が存在する場合、以下のコマンドが実行されます。

```shell
yarn install
yarn build
yarn install --production
```

`build` と `pack` が含まれる場合は、以下のコマンドになります。
                            
```shell
yarn install
yarn build
yarn pack
yarn install --production
```

### ファイル削除
`GitHub Actions` の実行には「ビルドに使用するソース」や「テストファイル」、「テストの設定」などを必要としません。  
そして `GitHub Actions` は使用されるたびにダウンロードされるため、ファイルは少ないほうが良いです。  

`CLEAN_TARGETS` オプションはこの目的のために使用されます。  
default: `.[!.]*,__tests__,docs,src,*.[jt]s,*.[mc][jt]s,*.json,*.lock,*.yml,*.yaml`  

```shell
rm -rdf .[!.]*
rm -rdf *.js
rm -rdf *.mjs
rm -rdf *.ts
rm -rdf *.cts
rm -rdf *.json
rm -rdf *.lock
rm -rdf *.yml
rm -rdf *.yaml
rm -rdf __tests__ docs src
```

(action.yml は削除の対象ではありません)

## Action イベント詳細
### 対象イベント
| eventName: action | condition |
|:---:|:---:|
|push: *|[condition](#condition)|
|release: published|[condition](#condition)|
|create: *|[condition](#condition)|

### condition
- tags
  - semantic versioning tag (例：`v1.2.3`)
  - [テストタグ](#%E3%82%AA%E3%83%97%E3%82%B7%E3%83%A7%E3%83%B3) (例：`test/v1.2.3`)

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

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
