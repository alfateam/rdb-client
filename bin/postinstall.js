#! /usr/bin/env node
let path = require('path');
let build = require('./build');

let folder = path.normalize(path.join(process.cwd(), '../..'));
console.log('postinstall');
console.log(folder);
build(folder);