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
	c.table = table;
	c.or = column('or');
	c.and = column('and');
	c.not = column('not');
	c.filter = {
		or: c.or,
		and: c.and,
		not: c.not,
	};
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


	function table(url) {
		let c = {
			getManyDto,
		};

		async function getManyDto(filter, strategy) {
			let body = JSON.stringify({
				filter, strategy
			});
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = new Request(`${url}`, {method: 'POST', headers, body});
			// eslint-disable-next-line no-undef
			let response = await fetch(request);
			if (response.status === 200) {
				return response.json();
			}
			else {
				let msg = response.json && await response.json() || `Status ${response.status} from server`;
				let e = new Error(msg);
				// @ts-ignore
				e.status = response.status;
				throw e;
			}
		}

		let handler = {
			get(_target, property,) {
				if (property in c)
					return Reflect.get(...arguments);
				else
					return column(property);
			}

		};
		return new Proxy(c, handler);
	}

	function column(path, ...previous) {
		function c() {
			let args = previous.concat(Array.prototype.slice.call(arguments));
			let result = {path, args};
			let handler = {
				get(_target, property) {
					if (property === 'toJSON')
						return result.toJSON;
					if (property in result)
						return Reflect.get(...arguments);
					else
						return column(property, result);

				}
			};
			return new Proxy(result, handler);
		}
		let handler = {
			get(_target, property) {
				if (property === 'toJSON')
					return Reflect.get(...arguments);
				else if (property in c)
					return Reflect.get(...arguments);
				else
					return column(path + '.' + property);
			}

		};
		return new Proxy(c, handler);

	}
	return c;
}


module.exports = rdbClient();