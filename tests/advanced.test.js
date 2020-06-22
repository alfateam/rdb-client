test('insert', async (done) => {
	let client = require('../index')();
	let _a = { id: 5, name: 'insert me' };
	let a;

	async function insert() {
		let insertedPatch;
		let objFromServer = JSON.parse(JSON.stringify(_a));
		objFromServer.newProp = 'new property';
		a = await client.insert(_a, (patch) => {
			insertedPatch = patch;
			return Promise.resolve(objFromServer);
		});
		expect(a).toEqual(objFromServer);
		expect(_a).toEqual(objFromServer);
		expect(insertedPatch).toEqual([{ 'op': 'add', 'path': '/5', 'value': { 'id': 5, 'name': 'insert me' } }]);
	}

	async function update() {
		a.name = 'a changed';
		a.addedProp = 'added prop';
		let updatePatch;
		let objFromServer = JSON.parse(JSON.stringify(a));
		objFromServer.newProp = 'new property from server';
		let updatedReturned = await client.update(a, (patch) => {
			updatePatch = patch;
			return Promise.resolve(objFromServer);
		});
		expect(updatedReturned).toBe(a);
		expect(updatedReturned).toEqual(_a);
		expect(updatedReturned).toEqual(objFromServer);
		expect(updatePatch).toEqual([{'op': 'replace', 'path': '/5/name', 'value': 'a changed', 'oldValue': 'insert me'}]);
	}

	async function _delete() {
		let updatePatch;
		let updatedReturned = await client.delete(a, (patch) => {
			updatePatch = patch;
			return Promise.resolve(undefined);
		});
		expect(updatedReturned).toBe(undefined);
		expect(updatedReturned).toEqual(undefined);
		expect(updatedReturned).toEqual(undefined);
		expect(updatePatch).toEqual([{'op': 'remove', 'path': '/5'}]);
	}

	await insert();
	await update();
	await _delete();
	done();
});