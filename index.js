let createPatch = require('./createPatch');

function rdbClient() {
	let isSaving;
	let c = rdbClient;
	c.createPatch = createPatch;
	c.insert = insert;
	c.update = update;
	c.delete = _delete;
	c.proxify = proxify;
	// c.save = save;
	let originalJSON = new WeakMap();

	function proxify(itemOrArray) {
		if (Array.isArray(itemOrArray))
		{
			let result = [];
			for (let i = 0; i < itemOrArray.length; i++) {
				let item = itemOrArray[i];
				let proxy = new Proxy(item, handler);
				result.push(proxy);
			}
			return result;
		}
		else
			return new Proxy(itemOrArray, handler);
	}

	// let arrayHandler = {
	// 	get(target, property, receiver) {
	// 		const value = Reflect.get(target, property, receiver);
	// 		if (typeof value === 'object')
	// 			return new Proxy(value, handler);
	// 		return value;
	// 	},
	// 	set(target, property, value) {
	// 		return Reflect.set(target, property, value);
	// 	}
	// };

	let handler = {
		set: function(obj, prop, value, receiver) {
			if (isSaving)
				obj[prop] = value;
			else if (!originalJSON.has(receiver)) {
				originalJSON.set(receiver, JSON.stringify(receiver));
				obj[prop] = value;
			}
			return true;
		}
	};

	async function insert(row, saveFn) {
		let patch = createPatch([], [row]);
		let changedRow = await saveFn(patch);
		Object.assign(row, changedRow);
		return proxify(row);
	}

	async function update(row, saveFn) {
		let patch = [];
		if (originalJSON.has(row))
			patch = createPatch([JSON.parse(originalJSON.get(row))], [row]);
		let changedRow = await saveFn(patch);
		isSaving = true;
		Object.assign(row, changedRow);
		isSaving = false;
		return row;
	}

	async function _delete(row, saveFn) {
		let patch = createPatch([row], []);
		await saveFn(patch);
		return;
	}

	// async function save(rows, saveFn) {

	// }

	return c;
}


module.exports = rdbClient();