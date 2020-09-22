test('insert', async (done) => {
	let client = require('../index')();
	let a = {id: 6, name: 'Roger'};
	let b = {id: 7, name: 'James'};
	let c = {id: 8, name: 'To be updated'};

	let rows = client.proxify([c, a]);
	c = rows[0];
	c.name = 'Updated name';
	let cFromServer = JSON.parse(JSON.stringify(c));
	c.extraProp = 'extra prop';

	rows.unshift(b);
	rows.pop();
	let patches = [];
	let returned = await client.save(rows, (patch) => {
		patches.push(patch);
		if (patch.op === 'remove' &&  patch.path === '/6')
			return Promise.resolve();
		else if (patch.op === 'add' &&  patch.path === '/7')
			return Promise.resolve(JSON.parse(JSON.stringify(b)));
		else
			return Promise.resolve(JSON.parse(JSON.stringify(cFromServer)));
	});
	expect(patches).toHaveLength(3);
	expect(returned).toEqual([b,c]);
	expect(rows).toEqual([b,c]);
	expect(c).toEqual(cFromServer);
	expect(patches[0]).toEqual([{'op': 'add', 'path': '/7', 'value': {'id': 7, 'name': 'James'}}]);
	expect(patches[1]).toEqual([{'oldValue': 'To be updated', 'op': 'replace', 'path': '/8/name', 'value': 'Updated name'}]);
	expect(patches[2]).toEqual([{'op': 'remove', 'path': '/6', 'oldValue': {'id': 6, 'name': 'Roger'}}]);
	done();
});
