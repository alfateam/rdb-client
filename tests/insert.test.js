test('insert', async (done) => {
	let client = require('../index')();
	let inserted = {id: 5, name: 'insert me'};

	let insertedPatch;
	let objFromServer = JSON.parse(JSON.stringify(inserted));
	objFromServer.newProp = 'new property';
	let insertedReturned = await client.insert(inserted, (patch) => {
		insertedPatch = patch;
		return Promise.resolve(objFromServer);
	});
	expect(insertedReturned).toEqual(objFromServer);
	expect(inserted).toEqual(objFromServer);
	expect(insertedPatch).toEqual([{'op': 'add', 'path': '/5', 'value': {'id': 5, 'name': 'insert me'}}]);
	done();
});