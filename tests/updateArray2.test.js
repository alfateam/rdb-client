// test('insert', async (done) => {
let client = require('../index');
let a = {id: 5, name: 'update me', lines: [1, {b: false}]};
let b = {id: 6, name: 'insert me', lines: [2, {c: 'c some'}]};
let c = {id: 7, name: 'c', lines: [2, {c: 'c some'}]};
let d = {id: 8, name: 'd', lines: [2, {c: 'c some'}]};

let rows = client.proxify([a,b]);
// rows.splice(1, c,d);
rows[0].name =  'foo';
rows[rows.length-1].name =  'juba';
rows.pop();
rows.push(c);

// console.log(rows);
rows.save();
// console.log(client.previous);
// if (rows[0].lines === client.previous)
// 	console.log('same as previous');
// rows.length = 1;
// 	rows[0].name = 'changed name';
// 	expect(updatePatch).toEqual([{'oldValue': 'insert me', 'op': 'replace','path': '/5/name','value': 'changed name'}]);
// 	done();
// });