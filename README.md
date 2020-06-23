__Rdb client for the browser__
------------------------------------- 
[![npm package][npm-image]][npm-url] 

A browser side client for [rdb](https://npmjs.org/package/rdb). For now it can create JSON patches that rdb will understand.

## Quickstart


```js
var client = require('rdb-client');
client.createPatch({"id": "123", name: 'Chris'}, {"id": "123", name: 'Chris Brown', "interests": ["skiiing", "hiking"]});
```
