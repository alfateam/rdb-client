const onChange = require('on-change');
const util = require('util');
let createPatch = require('./createPatch');
let _originalJSON = new WeakMap();
let rootMap = new WeakMap();
let _insertDeleteCount = new WeakMap();
let i = 0;

function rdbClient() {
	let isSaving;
	let isSlicing;
	let c = rdbClient;
	c.createPatch = createPatch;
	c.insert = insert;
	c.update = update;
	c.delete = _delete;
	c.proxify = proxify2;
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

	function proxify2(itemOrArray) {
		if (Array.isArray(itemOrArray))
			return proxifyArray(itemOrArray);
		else
			return proxifyRow(itemOrArray);
	}

	function proxifyArray(array) {
		let arrayProxy =  onChange(array, () => {}, {pathAsArray: true, ignoreDetached: true, onValidate: onValidate});
		rootMap.set(array, {jsonMap: new Map(), original: new Set(array)});
		arrayProxy.save = saveArray.bind(null, array);
		return arrayProxy;

		function onValidate(path) {
			if (path.length > 0) {
				let {jsonMap} = rootMap.get(array);
				if (!jsonMap.has(array[path[0]]))
					jsonMap.set(array[path[0]], JSON.stringify(array[path[0]]));
			}
			return true;
		}
	}

	function saveArray(array) {
		let {original, jsonMap} = rootMap.get(array);
		let {added, removed, changed} = difference(original, new Set(array), jsonMap);
		let insertPatch = createPatch([], added);
		let deletePatch = createPatch(removed, []);
		let updatePatch = createPatch(changed.map(x => JSON.parse(jsonMap.get(x))), changed);
		let patch = [...insertPatch, ...updatePatch, ...deletePatch];
		console.log('patch ' + util.inspect(patch, { depth: 10 }));
		//todo
		//save on server
		//refresh changed and inserted with data from server with original strategy
		//rootMap.set(array, {jsonMap: new Map(), original: new Set(array)});
	}

	function difference(setA, setB, jsonMap) {
		let removed = new Set(setA);
		let added = [];
		let changed = [];
		for (let elem of setB) {
			if (!setA.has(elem))
				added.push(elem);
			else {
				removed.delete(elem);
				if (jsonMap.get(elem))
					changed.push(elem);
			}
		}


		console.log('added ' + util.inspect(added, { depth: 10 }));
		console.log('removed ' + util.inspect(removed, { depth: 10 }));
		console.log('changed ' + util.inspect(changed, { depth: 10 }));

		return {added, removed: Array.from(removed), changed};
	}

	function proxifyRow(row) {

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