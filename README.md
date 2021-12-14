__Rdb client for the browser__
------------------------------------- 
[![npm package][npm-image]][npm-url] 
[![Build Status][travis-image]][travis-url] 
[![Coverage Status][coveralls-image]][coveralls-url] 

A browser side client for [rdb](https://npmjs.org/package/rdb). For now it can create JSON patches that rdb will understand.

## Quickstart


```js
var client = require('rdb-client');
client.createPatch({"id": "123", name: 'Chris'}, {"id": "123", name: 'Chris Brown', "interests": ["skiiing", "hiking"]});
```

[npm-image]:https://img.shields.io/npm/v/rdb-client.svg
[npm-url]:http://npmjs.org/package/rdb-client
[travis-image]:https://travis-ci.org/alfateam/rdb-client.svg?branch=master
[travis-url]:https://travis-ci.org/alfateam/rdb-client
[david-image]:https://david-dm.org/alfateam/rdb-client/status.svg
[david-url]:https://david-dm.org/alfateam/rdb-client
[coveralls-image]:https://coveralls.io/repos/github/alfateam/rdb-client/badge.svg?branch=master
[coveralls-url]:https://coveralls.io/github/alfateam/rdb-client?branch=master