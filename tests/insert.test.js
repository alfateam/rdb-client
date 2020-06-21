test('insert', async (done) => {
	let client = require('../index')();
	let _a = {id: 1, name: 'a'};
	let _b = {id: 2, name: 'b'};
	let _c = {id: 3, name: 'c'};
	let _d = {id: 4, name: 'd'};
	let _inserted = {id: 5, name: 'insert me'};
	let a = client.add(_a);
	let b = client.add(_b);
	let [c, d] = client.add([_c,_d]);
	expect(client.rows).toEqual([a,b,c,d]);

	let inserted = client.insert(_inserted);
	expect(client.rows).toEqual([a,b,c,d, inserted]);
	expect(client.rows).toEqual([_a,_b,_c,_d, _inserted]);
	let insertedPatch;
	let objFromServer = JSON.parse(JSON.stringify(inserted));
	objFromServer.newProp = 'new property';
	let insertedReturned = await client.save(inserted, (patch) => {
		insertedPatch = patch;
		return Promise.resolve(objFromServer);
	});
	expect(insertedReturned).toBe(inserted);
	expect(inserted).toEqual(objFromServer);
	expect(insertedPatch).toEqual([{'op': 'add', 'path': '/5', 'value': {'id': 5, 'name': 'insert me'}}]);
	done();
});