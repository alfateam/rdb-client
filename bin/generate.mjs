#! /usr/bin/env node
import * as fs from 'fs';
import * as util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fileUrl from 'file-url';

const cwd = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);
const copyFile = util.promisify(fs.copyFile);

const indexSource = fileUrl(path.join(cwd, '/src/rdb/index.js'));
const mod = await import(indexSource);
const targetDir = path.join(cwd, '/src/.rdb');
const dsTarget = path.join(targetDir, '/index.d.ts');
const coredsSource = path.join(__dirname, '/../core.d.ts');
const coredsTarget = path.join(targetDir, '/core.d.ts');
const commonJsTarget = path.join(targetDir, '/index.js');
const moduleJsTarget = path.join(targetDir, '/index.esm.js');
const packageJSONTarget = path.join(targetDir, '/package.json');

const commonJs = `
    let rdbClient = require('rdb-client');
    const models = require('../rdb/index.js');
    module.exports = rdbClient(undefined, {models});
`;
const moduleJs = `
    import rdbClient from 'rdb-client';
    const models = require('../rdb/index.js')
    
    export default rdbClient(undefined, {models});    
`;

const appendix = `
import {RdbClientBase, RawFilter, Filter, Concurrencies} from './core';
export * from './core';

export interface RdbClient extends RdbClientBase {
    customer: CustomerTable;
    order: OrderTable;
}

export interface RdbStatic {
    (baseUrl: string): RdbClient;
    (db: object): RdbClient;
    filter: Filter;
}      

declare const rdbClient: RdbStatic;
export default rdbClient;`

const packageJSON = `
{
    "name": ".rdb",
    "version": "1.0.0",
    "main": "index.js",
    "module": "index.esm.js"
}`;


if (!fs.existsSync(targetDir))
    fs.mkdirSync(targetDir);

    await writeFile(packageJSONTarget, packageJSON);
await writeFile(commonJsTarget, commonJs);
await writeFile(moduleJsTarget, moduleJs);
await writeFile(dsTarget, appendix);

await copyFile(coredsSource, coredsTarget);

for(let name in mod) {
    let ts = mod[name].ts(name);    
    await appendFile(dsTarget, ts);
}