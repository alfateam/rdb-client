let url = require('url');
let compile = require('./compile');
let glob = require('glob');
let path = require('path');
let findNodeModules = require('find-node-modules');
let fs = require('fs');
let util = require('util');
let writeFile = util.promisify(fs.writeFile);
let ts = require('typescript');
let moduleDefinition = require('module-definition');
require('isomorphic-fetch');


async function run(cwd) {
	for (let schemaTs of await findSchemaJs(cwd)) {
		try {
			await runSingle(schemaTs);
		}
		catch (e) {
			//ignore
		}
	}
}

async function runSingle(schemaTs) {
	let schemaJsPath;
	let isPureJs = false;
	if (!schemaTs)
		return;
	if (schemaTs.substring(schemaTs.length - 2) === 'js') {
		schemaJsPath = schemaTs;
		isPureJs = true;
	}
	console.log(`Rdb: found schema ${schemaTs}`);
	if (!schemaJsPath) {
		let nodeModules = findNodeModules({ cwd: schemaTs, relative: false })[0];
		let outDir = path.join(nodeModules, '/.rdb-client');
		schemaJsPath = compile(schemaTs, { outDir });
	}
	let schemaJs;
	try {
		schemaJs = isPureJs ? await import(url.pathToFileURL(schemaJsPath)) : require(schemaJsPath);
	}
	catch (e) {
		console.log(e.stack);
	}
	if ('default' in schemaJs)
		schemaJs = schemaJs.default;
	if (!schemaJs.tables) {
		console.log(`Rdb: no tables found.`);
		return;
	}
	let defs = '';
	for (let name in schemaJs.tables) {
		let db = schemaJs.db || '';
		let table = schemaJs.tables[name];
		if (typeof table === 'string' && typeof db === 'string')
			defs += (await download(db + table)) || (await download(db + table + '.d.ts'));
		else if (table.ts)
			defs += table.ts(name);
	}
	let src = '';
	src += getPrefixTs(isPureJs, schemaJs.tables);
	src += defs;
	src += getRdbClientTs(schemaJs.tables);
	src += '}';
	let indexDts = path.join(path.dirname(schemaTs), isPureJs ? '/index.d.ts' : '/index.ts');
	let sourceFile = ts.createSourceFile(indexDts, src, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
	const printer = ts.createPrinter();
	await writeFile(indexDts, printer.printFile(sourceFile));
	if (isPureJs)
		await writeIndexJs(schemaJsPath);
	console.log(`Rdb: created ts typings successfully.`);

}

async function writeIndexJs(schemaJsPath) {
	const schema = path.basename(schemaJsPath);
	const indexJs = path.join(path.dirname(schemaJsPath), '/index' + path.extname(schemaJsPath));
	if (moduleDefinition.sync(schemaJsPath) === 'commonjs')
		await writeFile(indexJs, `module.exports = require('./${schema}');`);
	else
		await writeFile(indexJs, `export * from './${schema}'`);
}

async function findSchemaJs(cwd) {
	let options = {
		ignore: ["**/node_modules/**", "**/dist/**", "**/dev/**"],
		cwd
	};
	return new Promise(function (resolve, reject) {
		glob("**/*(rdb|db)*/**/schema.*(js|mjs|ts)", options, async function (err, files) {
			if (err)
				reject(err);
			else if (files.length === 0)
				resolve([]);
			else {
				files.sort((a, b) => {
					const aIsTs = a.substring(a.length - 2) === 'ts';
					const bIsTs = b.substring(b.length - 2) === 'ts';
					if (aIsTs && bIsTs)
						return 0;
					else if (aIsTs)
						return -1;
					else if (bIsTs)
						return 1;
					else
						return 0;
				});
				files = files.map(x => path.join(cwd, '/', x));
				resolve(files);
			}
		});
	});
}

function getPrefixTs(isPureJs) {
	if (isPureJs)
		return `
	/* eslint-disable @typescript-eslint/no-empty-interface */
	import { RequestHandler} from 'express'; 
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import { BooleanColumn, JSONColumn, UUIDColumn, DateColumn, NumberColumn, BinaryColumn, StringColumn, Concurrencies, ExpressConfig, Express, Filter, RawFilter, Config, ResponseOptions, TransactionOptions } from 'rdb-client';
	declare const client: RdbClient;
	export default client;

	`;

	return `
/* eslint-disable @typescript-eslint/no-empty-interface */
import schema from './schema';
import { RequestHandler} from 'express'; 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BooleanColumn, JSONColumn, UUIDColumn, DateColumn, NumberColumn, BinaryColumn, StringColumn, Concurrencies, ExpressConfig, Express, Filter, RawFilter, Config, ResponseOptions, TransactionOptions } from 'rdb-client';
export default schema as RdbClient;`;
}

function getRdbClientTs(tables) {
	return `
	export interface RdbClient  {${getTables()}
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
		result += `
		(config: Config): RdbClient;
        beforeRequest(callback: (response: Response, options: ResponseOptions) => Promise<void> | void): void;
        beforeResponse(callback: (response: Response, options: ResponseOptions) => Promise<void> | void): void;
        reactive(proxyMethod: (obj: unknown) => unknown): void;
        and(filter: Filter, ...filters: Filter[]): Filter;
        or(filter: Filter, ...filters: Filter[]): Filter;
        not(): Filter;
        query(filter: RawFilter | string): Promise<unknown[]>;
        query<T>(filter: RawFilter | string): Promise<T[]>;
        transaction(fn: () => Promise<unknown>): Promise<void>;
        transaction(options: TransactionOptions, fn: () => Promise<unknown>): Promise<void>;
        filter: Filter;`;
		return result;
	}
}

async function download(url) {
	let request = new Request(url, { method: 'GET' });
	let response = await fetch(request);

	if (response.status >= 200 && response.status < 300)
		return response.text && await response.text();
	return '';
}

module.exports = function (cwd) {
	run(cwd).then(null, console.log);
};