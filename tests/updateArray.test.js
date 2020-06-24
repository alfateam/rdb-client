test('insert', async (done) => {
	let client = require('../index')();
	let a = {id: 5, name: 'insert me'};

	let updatePatch;
	let rows = client.proxify([a]);
	rows[0].name = 'changed name';
	let objFromServer = JSON.parse(JSON.stringify(a));
	objFromServer.newProp = 'new property';
	let returned = await client.save(rows, (patch) => {
		updatePatch = patch;
		return Promise.resolve(objFromServer);
	});
	console.log(returned);
	expect(returned).toEqual([a]);
	expect(rows).toEqual([objFromServer]);
	expect(updatePatch).toEqual([{'oldValue': 'insert me', 'op': 'replace','path': '/5/name','value': 'changed name'}]);
	done();
});