test('updateArray', async (done) => {
	let createPatch = require('../createPatch');
	let a = {id: 1, date: 'original'};
	let b = {id: 1, date: 'changed'};
	let updatePatch = createPatch([a], [b]);
	expect(updatePatch).toEqual([{'op': 'replace', 'path': '/1/date', 'value': 'changed', 'oldValue': 'original'}]);
	done();
});

test('update non-id pk', async (done) => {
	let createPatch = require('../createPatch');
	let a = {otherPk: 1, date: 'original'};
	let b = {otherPk: 1, date: 'changed'};
	let updatePatch = createPatch([a], [b], {keys: ['otherPk']});
	expect(updatePatch).toEqual([{'op': 'replace', 'path': '/{"otherPk":1}/date', 'value': 'changed', 'oldValue': 'original'}]);
	done();
});

test('update nested composite pk', async (done) => {
	let createPatch = require('../createPatch');
	let a = {otherPk: 1, date: 'original', lines: [{linePk: 22, otherPk: 1, foo: '_foo'}, {linePk: 23, otherPk: 1, foo: 'original'}]};
	let b = {otherPk: 1, date: 'original', lines: [{linePk: 22, otherPk: 1, foo: '_foo'}, {linePk: 23, otherPk: 1, foo: 'changed'}]};
	let updatePatch = createPatch([a], [b], {keys: ['otherPk'], lines: {keys: ['otherPk', 'linePk']}});
	expect(updatePatch).toEqual([{'op': 'replace', 'path': '/{"otherPk":1}/lines/{"otherPk":1,"linePk":23}/foo', 'value': 'changed', 'oldValue': 'original'}]);
	done();
});