test('insert', async (done) => {
	let client = require('../index')();
	// let a = client.proxify({id: 6, name: 'Roger'});
	// let a = client.proxify({id: 6, name: 'Roger'});
	let a = {id: 6, name: 'Roger'};

	let rows = client.proxify([]);
	// let rows =
	// console.log('pop');
	// rows.foo = 'hei';
	rows.unshift(a);
	let aFromServer = JSON.parse(JSON.stringify(a));
	aFromServer.extraProp = 'extra';
	let insertPatch;
	let returned = await client.save(rows, (patch) => {
		insertPatch = patch;
		return Promise.resolve(aFromServer);
	});
	expect(returned).toEqual([aFromServer]);
	expect(rows).toEqual([a]);
	expect(insertPatch).toEqual([{'op': 'add', 'path': '/6', 'value': {'id': 6, name: 'Roger'}}]);
	done();
});
