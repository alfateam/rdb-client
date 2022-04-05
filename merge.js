const fs = require('fs').promises;

async function merge() {
	let data1 = await fs.readFile('./self.js');
	let data2 = await fs.readFile('./index.mjs');
	await fs.writeFile('./index.mjs', data1 + data2);
}

merge();