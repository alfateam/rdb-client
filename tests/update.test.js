test('insert', async (done) => {
	let client = require('../index')();
	let _a = {id: 1, name: 'a', lastName: 'to be removed from server'};

	let a = client.proxify(_a);
	a.name = 'a changed';
	a.addedProp = 'added prop';
	let updatePatch;
	let objFromServer = JSON.parse(JSON.stringify(a));
	objFromServer.newProp = 'new property from server';
	objFromServer.lastName = undefined;
	let updatedReturned = await client.update(a, (patch) => {
		updatePatch = patch;
		return Promise.resolve(objFromServer);
	});
	expect(updatedReturned).toBe(a);
	expect(updatedReturned).toEqual(_a);
	expect(updatedReturned).toEqual(objFromServer);
	expect(updatePatch).toEqual([{'op': 'replace', 'path': '/1/name', 'value': 'a changed', 'oldValue': 'a'}]);
	console.log(a);
	done();
});