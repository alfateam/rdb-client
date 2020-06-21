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

	a.name = 'a changed';
	a.addedProp = 'added prop';
	let updatePatch;
	let objFromServer = JSON.parse(JSON.stringify(a));
	objFromServer.newProp = 'new property from server';
	let updatedReturned = await client.save(a, (patch) => {
		updatePatch = patch;
		return Promise.resolve(objFromServer);
	});
	expect(updatedReturned).toBe(a);
	expect(updatedReturned).toEqual(objFromServer);
	expect(updatePatch).toEqual([{'op': 'replace', 'path': '/1/name', 'value': 'a changed', 'oldValue': 'a'}]);
	done();
});