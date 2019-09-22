# Filter GitHub Action

[![npm version](https://badge.fury.io/js/%40technote-space%2Ffilter-github-action.svg)](https://badge.fury.io/js/%40technote-space%2Ffilter-github-action)
[![Build Status](https://github.com/technote-space/filter-github-action/workflows/Build/badge.svg)](https://github.com/technote-space/filter-github-action/actions)
[![Coverage Status](https://coveralls.io/repos/github/technote-space/filter-github-action/badge.svg?branch=master)](https://coveralls.io/github/technote-space/filter-github-action?branch=master)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/filter-github-action/badge)](https://www.codefactor.io/repository/github/technote-space/filter-github-action)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/filter-github-action/blob/master/LICENSE)

*Read this in other languages: [English](README.md), [日本語](README.ja.md).*

GitHub Action を Context などでフィルタリングするためのヘルパー

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [使用方法](#%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95)
- [Author](#author)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 使用方法
1. インストール  
`npm i @technote-space/filter-github-action`
1.   
```js
import { isTargetEvent } from '@technote-space/filter-github-action';

console.log( isTargetEvent( {
	"release": [
		"published",
		"rerequested",
	],
	"push": [
		context => /^refs\/tags\//.test( context.ref ),
		"rerequested",
	],
} ) );
```

## Author
[GitHub (Technote)](https://github.com/technote-space)  
[Blog](https://technote.space)
