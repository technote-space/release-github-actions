# Filter GitHub Action

[![npm version](https://badge.fury.io/js/%40technote-space%2Ffilter-github-action.svg)](https://badge.fury.io/js/%40technote-space%2Ffilter-github-action)
[![Build Status](https://github.com/technote-space/filter-github-action/workflows/Build/badge.svg)](https://github.com/technote-space/filter-github-action/actions)
[![Coverage Status](https://coveralls.io/repos/github/technote-space/filter-github-action/badge.svg?branch=master)](https://coveralls.io/github/technote-space/filter-github-action?branch=master)
[![CodeFactor](https://www.codefactor.io/repository/github/technote-space/filter-github-action/badge)](https://www.codefactor.io/repository/github/technote-space/filter-github-action)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/technote-space/filter-github-action/blob/master/LICENSE)

Helper to filter GitHub Action.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Usage](#usage)
- [Author](#author)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usage
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
