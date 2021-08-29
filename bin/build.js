let compile = require('./compile');
let glob = require('glob');
let path = require('path');
let findNodeModules = require('find-node-modules');

run();

async function run() {
    let indexTs = await findIndexTs();
    if (!indexTs)
        return;
    let clientDir = path.join(path.dirname(fileUrl), '/client');
    let nodeModules = findNodeModules({cwd: indexTs, relative: false})[0];
    let outDir = path.join( nodeModules, '/.rdb-client');
    let indexJsPath = compile(indexTs,  {outDir});
    if (indexJsPath) {
        let indexJs = require(indexJsPath);
        console.log(indexJs);
    }
    
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
