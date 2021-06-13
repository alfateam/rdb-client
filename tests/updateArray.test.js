test('updateArray', async (done) => {
	let createPatch = require('../createPatch');
	let a = {id: 1, date: 'original'};
	let b = {id: 1, date: 'changed'};
	let updatePatch = createPatch([a], [b]);
	expect(updatePatch).toEqual([{'op': 'replace', 'path': '/1/date', 'value': 'changed', 'oldValue': 'original'}]);
	done();
});