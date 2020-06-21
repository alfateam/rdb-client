let createPatch = require('./createPatch');

function rdbClient() {
	let isSaving;
	let c = rdbClient;
	c.createPatch = createPatch;
	c.insert = insert;
	c.save = save;
	c.add = add;
	c.rows = [];
	let insertedRows = new WeakMap();
	let originalJSON = new WeakMap();

	function add(itemOrArray) {
		if (Array.isArray(itemOrArray)) {
			let result = [];
			for (let i = 0; i < itemOrArray.length; i++) {
				let item = itemOrArray[i];
				let proxy = new Proxy(item, handler);
				c.rows.push(proxy);
				result.push(proxy);
			}
			return result;
		}
		else {
			let proxy = new Proxy(itemOrArray, handler);
			c.rows.push(proxy);
			return proxy;
		}
	}

	let handler = {
		set: function(obj, prop, value, receiver) {
			if (isSaving)
				obj[prop] = value;
			if (insertedRows.has(receiver))
				obj[prop] = value;
			else if (!originalJSON.has(receiver)) {
				originalJSON.set(receiver, JSON.stringify(receiver));
				obj[prop] = value;
			}
			return true;
		}
	};

	function insert(row) {
		c.rows.push(row);
		insertedRows.set(row, row);
		return row;
	}

	async function save(row, saveFn) {
		if (insertedRows.has(row)) {
			let patch = createPatch([], [row]);
			let changedRow = await saveFn(patch);
			isSaving = true;
			Object.assign(row, changedRow);
			insertedRows.delete(row);
			isSaving = false;
		}
		else if (originalJSON.has(row)) {
			let patch = createPatch([JSON.parse(originalJSON.get(row))], [row]);
			let changedRow = await saveFn(patch);
			isSaving = true;
			Object.assign(row, changedRow);
			originalJSON.delete(row);
			isSaving = false;
		}
		return row;
	}

	return c;
}


module.exports = rdbClient();