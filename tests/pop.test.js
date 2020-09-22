test('insert', async (done) => {
	let client = require('../index')();
	// let a = client.proxify({id: 6, name: 'Roger'});
	let a = {id: 6, name: 'Roger'};

	let rows = client.proxify([a]);
	// let rows =
	// console.log('pop');
	// rows.foo = 'hei';
	rows.pop();
	let deletePatch;
	let returned = await client.save(rows, (patch) => {
		deletePatch = patch;
		return Promise.resolve();
	});
	expect(returned).toEqual([]);
	expect(rows).toEqual([]);
	expect(deletePatch).toEqual([{'op': 'remove', 'path': '/6', 'oldValue': {id: 6, name: 'Roger'}}]);
	done();
});
