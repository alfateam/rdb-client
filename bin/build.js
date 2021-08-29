#! /usr/bin/env node
let compile = require('./compile');
let glob = require('glob');
let path = require('path');
let findNodeModules = require('find-node-modules');
let fs = require('fs');
let util = require('util');
let writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);


run();

async function run() {
    let indexTs = await findIndexTs();
    if (!indexTs)
        return;
    let clientDir = path.join(path.dirname(indexTs), '/client');
    let nodeModules = findNodeModules({cwd: indexTs, relative: false})[0];
    let outDir = path.join( nodeModules, '/.rdb-client');
    let indexJsPath = compile(indexTs,  {outDir});
    if (!indexJsPath)
        return;
    let indexJs = require(indexJsPath);
    if ('default' in indexJs) 
        indexJs = indexJs.default;
    let defs = '';
    for (let name in indexJs) {
        let table = indexJs[name];
        if (table.ts) {
            defs+= table.ts(name);

        }
    }
    // fs.copyFileSync(path.join(__dirname, '/../core.d.ts'), path.join(clientDir, '/core.d.ts'))
    let indexDts = path.join(clientDir, '/index.d.ts');
    await writeFile(indexDts, getPrefixTs());
    fs.appendFileSync(indexDts, defs);
    fs.appendFileSync(indexDts, getRdbClientTs(indexJs));
    
    // console.log(indexJs);
    
}

async function findIndexTs() {
    let options = {
        ignore: "**node_modules/**"
    };
    return new Promise(function(resolve, reject) {
        glob("**/rdb/index.ts", options, async function (err, files) {
            if (err)
                reject(err);
            else if (files.length === 0)
                resolve();
            else {
                // const file = fileUrl(path.join(process.cwd(), '/', files[0]));
                let file = path.join(process.cwd(), '/', files[0]);
                resolve(file);
            }
          })
      })      
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
        for(let name in tables) {
            let Name = name.substring(0,1).toUpperCase() + name.substring(1);
            result += 
`
    ${name}: ${Name}Table;`;
        }
        return result;        
    }

}

