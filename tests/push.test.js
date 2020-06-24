test('insert', async (done) => {
	let client = require('../index')();
	let inserted = client.proxify({id: 5, name: 'insert me'});

	let insertedPatch;
	let objFromServer = JSON.parse(JSON.stringify(inserted));
	objFromServer.newProp = 'new property';
	let rows = client.proxify([]);
	rows.push(inserted);
	let insertedReturned = await client.save(rows, (patch) => {
		insertedPatch = patch;
		return Promise.resolve(objFromServer);
	});
	console.log(insertedReturned);
	expect(insertedReturned).toEqual([inserted]);
	expect(rows).toEqual([objFromServer]);
	expect(insertedPatch).toEqual([{'op': 'add', 'path': '/5', 'value': {'id': 5, 'name': 'insert me'}}]);
	done();
});