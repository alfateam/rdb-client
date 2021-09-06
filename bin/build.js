#! /usr/bin/env node
let compile = require('./compile');
let glob = require('glob');
let path = require('path');
let findNodeModules = require('find-node-modules');
let fs = require('fs');
let util = require('util');
let writeFile = util.promisify(fs.writeFile);

run();

async function run() {
	let indexTs = await findIndexTs();
	if (!indexTs)
		return;
	let clientDir = path.join(path.dirname(indexTs), '/client');
	let nodeModules = findNodeModules({ cwd: indexTs, relative: false })[0];
	let outDir = path.join(nodeModules, '/.rdb-client');
	let indexJsPath = compile(indexTs, { outDir });
	if (!indexJsPath)
		return;
	let indexJs = require(indexJsPath);
	if ('default' in indexJs)
		indexJs = indexJs.default;
	let defs = '';
	for (let name in indexJs) {
		let table = indexJs[name];
		if (table.ts) {
			defs += table.ts(name);

		}
	}
	let indexDts = path.join(clientDir, '/index.d.ts');
	await writeFile(indexDts, getPrefixTs());
	fs.appendFileSync(indexDts, defs);
	fs.appendFileSync(indexDts, getRdbClientTs(indexJs));
	await writeFile(path.join(clientDir, '/index.ts'), getClientIndexTs());

}

async function findIndexTs() {
	let options = {
		ignore: "**node_modules/**"
	};
	return new Promise(function(resolve, reject) {
		glob("**/rdb/index.ts", options, async function(err, files) {
			if (err)
				reject(err);
			else if (files.length === 0)
				resolve();
			else {
				let file = path.join(process.cwd(), '/', files[0]);
				resolve(file);
			}
		});
	});
}

function getPrefixTs() {
	return `
import {RdbClientBase, RawFilter, Filter, Concurrencies} from 'rdb-client';
export * from 'rdb-client';

export interface RdbStatic {
    (baseUrl: string): RdbClient;
    (db: object): RdbClient;
    filter: Filter;
}      

declare const rdbClient: RdbStatic;
export default rdbClient;`;
}

function getRdbClientTs(tables) {
	return `
export interface RdbClient extends RdbClientBase {
    ${getTables()}    
}
    `;

	function getTables() {
		let result = ``;
		for (let name in tables) {
			let Name = name.substring(0, 1).toUpperCase() + name.substring(1);
			result +=
				`
    ${name}: ${Name}Table;`;
		}
		return result;
	}

}

function getClientIndexTs() {
	return `
    import {RdbClient} from './index.d';
    import * as d from './index.d';
    import rdbClient from 'rdb-client';
    import tables from '../index';
    
    function create(db: any) : RdbClient {
        const client = rdbClient(db, {tables});
        return client as RdbClient;
    }
    
    export import RdbClient = d.RdbClient;
    export default create;`;
}

