test('delete', async (done) => {
	let client = require('../index')();
	let _a = {id: 5, name: 'a'};

	let a = client.proxify(_a);
	let updatePatch;
	let updatedReturned = await client.delete(a, (patch) => {
		updatePatch = patch;
		return Promise.resolve(undefined);
	});
	expect(updatedReturned).toBe(undefined);
	expect(updatedReturned).toEqual(undefined);
	expect(updatedReturned).toEqual(undefined);
	expect(updatePatch).toEqual([{'op': 'remove', 'path': '/5'}]);
	done();
});