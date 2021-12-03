let compile = require('./compile');
let glob = require('glob');
let path = require('path');
let findNodeModules = require('find-node-modules');
let fs = require('fs');
let util = require('util');
let writeFile = util.promisify(fs.writeFile);
let ts = require('typescript');

async function run(cwd) {
	let indexTs = await findIndexTs(cwd);
	let indexJsPath;
	let isPureJs = false;
	if (!indexTs)
		return;
	if (indexTs.substring(indexTs.length -2) === 'js') {
		indexJsPath = indexTs;
		isPureJs = true;
	}
	console.log(`Rdb: found schema ${indexTs}`);
	if (!indexJsPath) {
		let nodeModules = findNodeModules({ cwd: indexTs, relative: false })[0];
		let outDir = path.join(nodeModules, '/.rdb-client');
		indexJsPath = compile(indexTs, { outDir });
	}
	if (!indexJsPath)
		return;
	let indexJs = require(indexJsPath);
	if ('default' in indexJs)
		indexJs = indexJs.default;
	if (!indexJs.tables) {
		console.log(`Rdb: no tables found.`);
		return;
	}
	let defs = '';
	for (let name in indexJs.tables) {
		let table = indexJs.tables[name];
		if (table.ts)
			defs += table.ts(name);
	}
	let src = '';
	src += getPrefixTs(isPureJs);
	src += defs;
	src += getRdbClientTs(indexJs.tables);
	src += '}';
	let indexDts = path.join(path.dirname(indexTs), isPureJs ? '/index.d.ts' : '/tables.ts');
	let sourceFile = ts.createSourceFile(indexDts, src, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
	const printer = ts.createPrinter();
	await writeFile(indexDts, printer.printFile(sourceFile));
	console.log(`Rdb: created ts typings successfully.`);
}

async function findIndexTs(cwd) {
	let options = {
		ignore: "**node_modules/**",
		cwd
	};
	return new Promise(function(resolve, reject) {
		glob("**/rdb/index.?s", options, async function(err, files) {
			if (err)
				reject(err);
			else if (files.length === 0)
				resolve();
			else {
				files.sort((a,b ) => {
					const aIsTs = a.substr(a.length -2) === 'ts';
					const bIsTs = b.substr(b.length -2) === 'ts';
					if (aIsTs && bIsTs)
						return 0;
					else if (aIsTs)
						return -1;
					else if (bIsTs)
						return 1;
					else
						return 0;
				});
				let file = path.join(cwd, '/', files[0]);
				resolve(file);
			}
		});
	});
}

function getPrefixTs(isPureJs) {
	if (isPureJs)
		return `
	/* eslint-disable @typescript-eslint/no-empty-interface */
	import 'rdb-client';	
	import { Filter, RawFilter, RdbClient, ResponseOptions , Config, CustomerTable} from 'rdb-client';

	declare function r(config: Config): RdbClient;
	
	declare namespace r {
		function beforeRequest(callback: (response: Response, options: ResponseOptions) => Promise<void> | void): void;
		function beforeResponse(callback: (response: Response, options: ResponseOptions) => Promise<void> | void): void;
		function reactive(proxyMethod: (obj: any) => any): void;
		function and(filter: Filter, ...filters: Filter[]): Filter;
		function or(filter: Filter, ...filters: Filter[]): Filter;
		function not(): Filter;
		function query(filter: RawFilter): Promise<any[]>;
		function query<T>(filter: RawFilter): Promise<T[]>;
		var filter: Filter;
		var customer: CustomerTable;    
	}
	export = r;

	declare module 'rdb-client' {
	`;
	return `
/* eslint-disable @typescript-eslint/no-empty-interface */
import 'rdb-client';

declare module 'rdb-client' {`;

}

function getRdbClientTs(tables) {
	return `
	interface RdbClient  {${getTables()}
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

module.exports = function(cwd) {
	run(cwd).then(null, console.log);
};