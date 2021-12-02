let compile = require('./compile');
let glob = require('glob');
let path = require('path');
let findNodeModules = require('find-node-modules');
let fs = require('fs');
let util = require('util');
let writeFile = util.promisify(fs.writeFile);

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
	let indexDts = path.join(path.dirname(indexTs), isPureJs ? '/index2.d.ts' : '/tables.ts');
	await writeFile(indexDts, getPrefixTs());
	fs.appendFileSync(indexDts, defs);
	fs.appendFileSync(indexDts, getRdbClientTs(indexJs.tables));
	fs.appendFileSync(indexDts, '}');
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
				let file = path.join(cwd, '/', files[0]);
				resolve(file);
			}
		});
	});
}

function getPrefixTs() {
	return `
import 'rdb-client';

declare module 'rdb-client' {`;

}

function getRdbClientTs(tables) {
	return `
	interface RdbClient  {
		(config: Config): RdbClient;${getTables()}    
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
}