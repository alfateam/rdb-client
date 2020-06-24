let createPatch = require('./createPatch');

function rdbClient() {
	let isSaving;
	let isSlicing;
	let c = rdbClient;
	c.createPatch = createPatch;
	c.insert = insert;
	c.update = update;
	c.delete = _delete;
	c.proxify = proxify;
	c.save = save;
	let originalJSON = new WeakMap();
	let insertDeleteCount = new WeakMap();
	let previousArray = new WeakMap();
	let proxified = new WeakMap();

	function proxify(itemOrArray) {
		if (proxified.has(itemOrArray))
			return itemOrArray;
		if (Array.isArray(itemOrArray)) {
			for (let i = 0; i < itemOrArray.length; i++) {
				const row = itemOrArray[i];
				itemOrArray[i] = proxify(row);

			}
			let p = new Proxy(itemOrArray, arrayHandler);
			insertDeleteCount.set(p, new Map());
			proxified.set(p, p);
			return p;
		}
		else {
			let p = new Proxy(itemOrArray, handler);
			proxified.set(p, p);
			return p;
		}
	}

	let arrayHandler = {

		get(target, property, receiver) {
			if (property === 'length' & !isSlicing) {
				isSlicing = true;
				previousArray.set(receiver, target.slice(0));
				isSlicing = false;
			}
			const value = Reflect.get(target, property, receiver);
			// if (typeof value === 'object')
			// 	return proxify(value);
			return value;
		},
		set: function(target, property, value, receiver) {
			isSlicing = true;
			let previous = receiver[property];
			if (property === 'length' && previous > value) {
				let previousAr = previousArray.get(receiver);
				for (let i = Number.parseInt(value); i < previousAr.length; i++) {
					let row = previousAr[i];
					updateInsertDeleteCount(receiver, row, -1);
				}

			}
			else if (typeof previous === 'object')
				updateInsertDeleteCount(receiver, previous, -1);
			if (typeof value === 'object') {
				value = proxify(value);
				updateInsertDeleteCount(receiver, value, 1);
			}
			isSlicing = false;
			return Reflect.set(target, property, value);
		}
	};

	let handler = {
		set: function(obj, prop, value, receiver) {
			if (isSaving)
				obj[prop] = value;
			else if (! originalJSON.has(receiver)) {
				originalJSON.set(receiver, JSON.stringify(receiver));
				obj[prop] = value;
			}
			return true;
		}
	};
	function updateInsertDeleteCount(array, object, step) {
		let countMap = insertDeleteCount.get(array);
		let count = countMap.get(object) || 0;
		countMap.set(object, count + step);
	}

	async function insert(row, saveFn) {
		let patch = createPatch([], [row]);
		let changedRow = await saveFn(patch);
		console.log('changed inserted ' + JSON.stringify(changedRow));
		row =  proxify(row);
		isSaving = true;
		refresh(row, changedRow);
		isSaving = false;
		return row;
	}

	async function update(row, saveFn) {
		console.log('updating');
		let patch = [];
		if (originalJSON.has(row)) {
			patch = createPatch([JSON.parse(originalJSON.get(row))], [row]);
			console.log('got patch');
		}
		else
			console.log('no patch');
		let changedRow = await saveFn(patch);
		isSaving = true;
		refresh(row, changedRow);
		isSaving = false;
		return row;
	}

	async function _delete(row, saveFn) {
		let patch = createPatch([row], []);
		await saveFn(patch);
		return;
	}

	function refresh(row, updated) {
		for(let p in row) {
			if (!(p in updated))
				delete row[p];
		}
		Object.assign(row, updated);
	}
	async function save(rows, saveFn) {
		let counts = insertDeleteCount.get(rows);
		for (let i = 0; i < rows.length; i++) {
			let row = rows[i];
			if (counts.get(row) > 0)
				await insert(row, saveFn);
			else if (!counts.has(row) || counts.get(row) === 0)
				await update(row, saveFn);
		}
		for(let [row, count] of counts) {
			if (count < 0)
				await _delete(row, saveFn);
		}
		return rows;

	}

	return c;
}


module.exports = rdbClient();