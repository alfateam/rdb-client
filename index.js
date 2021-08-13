let onChange = require('on-change');
let createPatch = require('./createPatch');
let stringify = require('./stringify');
require('isomorphic-fetch');
let rootMap = new WeakMap();
let proxyMap = new WeakMap();

let _log = console.log;
let _dir = console.dir;

console.log = function(obj) {
	let inner = proxyMap.get(obj);
	if (inner)
		return _log.apply(console, [inner].concat(arguments.slice(1)));
	else
		return _log.apply(console, arguments);
};

console.dir = function(obj) {
	let inner = proxyMap.get(obj);
	if (inner)
		return _dir.apply(this, [inner].concat(arguments.slice(1)));
	else
		return _dir.apply(this, arguments);
};

function rdbClient() {
	let _beforeResponse;
	let _beforeRequest;
	let _reactive;

	let client = rdbClient;
	client.Concurrencies = {
		Optimistic: 'optimistic',
		SkipOnConflict: 'skipOnConflict',
		Overwrite: 'overwrite'
	};
	client.createPatch = createPatch; //keep for legacy reasons
	client.beforeResponse = (cb => _beforeResponse = cb);
	client.beforeRequest = (cb => _beforeRequest = cb);
	client.reactive = (cb => _reactive = cb);
	client.table = table;
	client.or = column('or');
	client.and = column('and');
	client.not = column('not');
	client.filter = {
		or: client.or,
		and: client.and,
		not: client.not,
	};

	function table(url) {
		let meta;
		let c = {
			getManyDto: getMany,
			getMany,
			tryGetFirst,
			tryGetById,
			getById,
			proxify
		};

		let handler = {
			get(_target, property,) {
				if (property in c)
					return Reflect.get(...arguments);
				else
					return column(property);
			}

		};
		let _table = new Proxy(c, handler);
		return _table;

		async function getMany(_, strategy) {
			let args = Array.prototype.slice.call(arguments);
			let rows = await getManyCore.apply(null, args);
			return proxify(rows, strategy);
		}

		async function tryGetFirst(filter, strategy) {
			if (strategy === undefined)
				strategy = await getDefaultStrategy();
			let _strategy = { ...(strategy), ...{ limit: 1 } };
			let args = [filter, _strategy].concat(Array.prototype.slice.call(arguments).slice(2));
			let rows = await getManyCore.apply(null, args);
			if (rows.length === 0)
				return;
			return proxify(rows[0], strategy);
		}

		async function tryGetById() {
			if (arguments.length === 0)
				return;
			let meta = await getMeta();
			let keyFilter = client.filter;
			for (let i = 0; i < meta.keys.length; i++) {
				let keyName = meta.keys[i].name;
				let keyValue = arguments[i];
				keyFilter = keyFilter.and(_table[keyName].eq(keyValue));
			}
			let args = [keyFilter].concat(Array.prototype.slice.call(arguments).slice(meta.keys.length));
			return tryGetFirst.apply(null, args);
		}

		async function getById() {
			let row = await tryGetById.apply(null, arguments);
			if (!row)
				throw new Error('Row not found : ' + arguments);
			return row;
		}

		async function getManyCore() {
			let args = Array.prototype.slice.call(arguments);
			let body = stringify({
				path: 'getManyDto',
				args
			});
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let response = await sendRequest({ url, init: { method: 'POST', headers, body } });
			if (response.status === 200) {
				return await response.json();
			}
			else {
				let msg = response.json && await response.json() || `Status ${response.status} from server`;
				let e = new Error(msg);
				e.status = response.status;
				throw e;
			}
		}

		function proxify(itemOrArray, strategy) {
			if (Array.isArray(itemOrArray))
				return proxifyArray(itemOrArray, strategy);
			else
				return proxifyRow(itemOrArray, strategy);
		}

		function proxifyArray(array, strategy) {
			let _array = array;
			if (_reactive)
				array = _reactive(array);
			let enabled = false;
			let handler = {
				get(_target, property) {
					if (property === 'toJSON')
						return () => _target;
					if (property === 'save')
						return saveArray.bind(null, array);
					else if (property === 'insert')
						return insertArray.bind(null, array);
					else if (property === 'delete')
						return deleteArray.bind(null, array);
					else if (property === 'refresh')
						return refreshArray.bind(null, array);
					else if (property === 'clearChanges')
						return clearChangesArray.bind(null, array);
					else if (property === 'acceptChanges')
						return acceptChangesArray.bind(null, array);
					else
						return Reflect.get.apply(_array, arguments);
				}

			};
			let innerProxy = new Proxy(array, handler);
			let arrayProxy = onChange(innerProxy, () => { }, { pathAsArray: true, ignoreDetached: true, onValidate });
			rootMap.set(array, { jsonMap: new Map(), original: new Set(array), strategy });
			enabled = true;
			proxyMap.set(arrayProxy, _array);
			return arrayProxy;

			function onValidate(path) {
				if (!enabled)
					return true;
				if (enabled && path.length > 0) {
					let { jsonMap } = rootMap.get(array);
					if (!jsonMap.has(array[path[0]]))
						jsonMap.set(array[path[0]], stringify(array[path[0]]));
				}
				return true;
			}
		}

		function proxifyRow(row, strategy) {
			let enabled = false;
			let handler = {
				get(_target, property,) {
					if (property === 'save') //call server then acceptChanges
						return saveRow.bind(null, row);
					else if (property === 'insert') //call server then remove from jsonMap and add to original
						return insertRow.bind(null, row);
					else if (property === 'delete') //call server then remove from jsonMap and original
						return deleteRow.bind(null, row);
					else if (property === 'refresh') //refresh from server then acceptChanges
						return refreshRow.bind(null, row);
					else if (property === 'clearChanges') //refresh from jsonMap, update original if present
						return clearChangesRow.bind(null, row);
					else if (property === 'acceptChanges') //remove from jsonMap
						return acceptChangesRow.bind(null, row);
					else
						return Reflect.get(...arguments);
				}

			};
			let innerProxy = new Proxy(row, handler);
			let rowProxy = onChange(innerProxy, () => { }, { pathAsArray: true, ignoreDetached: true, onValidate });
			rootMap.set(row, { jsonMap: new Map(), strategy });
			enabled = true;
			proxyMap.set(rowProxy, row);
			return rowProxy;

			function onValidate() {
				if (!enabled)
					return false;
				let root = rootMap.get(row);
				if (!root.json)
					root.json = stringify(row);
				return true;
			}
		}

		async function getMeta() {
			if (meta)
				return meta;
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			headers.append('Accept', 'application/json');
			// eslint-disable-next-line no-undef
			let request = { url, init: { method: 'GET', headers } };
			let response = await sendRequest(request);
			return handleResponse(response, () => response.json());
		}

		async function beforeResponse(response, { url, init, attempts }) {
			if (!_beforeResponse)
				return response;

			let shouldRetry;
			await _beforeResponse(response.clone(), { retry, attempts, request: init });
			if (shouldRetry)
				return sendRequest({ url, init }, { attempts: ++attempts });
			return response;

			function retry() {
				shouldRetry = true;
			}
		}

		async function sendRequest({ url, init }, { attempts = 0 } = {}) {
			if (_beforeRequest) {
				init = await _beforeRequest(init) || init;
			}
			// eslint-disable-next-line no-undef
			let request = new Request(url, init);
			// eslint-disable-next-line no-undef
			return beforeResponse(await fetch(request), { url, init, attempts });
		}

		async function saveArray(array, options) {
			let { original, jsonMap, strategy } = rootMap.get(array);
			let meta = await getMeta();
			let { added, removed, changed } = difference(original, new Set(array), jsonMap);
			let insertPatch = createPatch([], added, meta);
			let deletePatch = createPatch(removed, [], meta);
			let updatePatch = createPatch(changed.map(x => JSON.parse(jsonMap.get(x))), changed, meta);
			let patch = [...insertPatch, ...updatePatch, ...deletePatch];

			let body = stringify({ patch, options: { ...options, strategy } });
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = { url, init: { method: 'PATCH', headers, body } };
			let response = await sendRequest(request);
			await handleResponse(response, async (response) => {
				let { updated, inserted } = await response.json();
				copyInto(updated, changed);
				copyInto(inserted, added);
				rootMap.set(array, { jsonMap: new Map(), original: new Set(array), strategy });
			});
		}

		function copyInto(from, to) {
			for (let i = 0; i < from.length; i++) {
				for (let p in from[i]) {
					to[p] = from[p];
					console.log(to[p]);
				}
			}
		}

		async function getDefaultStrategy(meta) {
			meta = meta || await getMeta();
			let relations = {};
			for (let p in meta.relations) {
				relations[p] = getDefaultStrategy(meta.relations[p]);
			}
			return relations;
		}



		function clearChangesArray(array) {
			let { original, jsonMap, strategy } = rootMap.get(array);
			let { added, removed, changed } = difference(original, new Set(array), jsonMap);
			added = new Set(added);
			removed = new Set(removed);
			changed = new Set(changed);
			for (let i = 0; i < array.length; i++) {
				let row = array[i];
				if (added.has(row)) {
					array.splice(i, 1);
					i--;
				}
				else if (changed.has(row)) {
					array[i] = JSON.parse(jsonMap.get(row));
				}
			}
			if (removed.size > 0) {
				let i = 0;
				for (let row of original) {
					if (removed.has(row)) {
						if (jsonMap.has(row))
							row = JSON.parse(jsonMap.get(row));
						array.splice(i, 0, row);
					}
					i++;
				}
			}
			rootMap.set(array, { jsonMap: new Map(), original: new Set(array), strategy });
		}

		function acceptChangesArray(array) {
			rootMap.set(array, { jsonMap: new Map(), original: new Set(array) });
		}

		async function insertArray(array) {
			if (array.length === 0)
				return;
			let meta = await getMeta();
			let insertPatch = createPatch([], array, meta);
			let body = stringify(insertPatch);
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = { url, init: { method: 'PATCH', headers, body } };
			// eslint-disable-next-line no-undef
			let strategy = rootMap.get(array).strategy;
			let response = await sendRequest(request);
			await handleResponse(response, () => rootMap.set(array, { jsonMap: new Map(), original: new Set(array), strategy }));
		}

		async function handleResponse(response, onSuccess) {
			if (response.status >= 200 && response.status < 300) {
				return onSuccess(response);
			}
			else {
				let msg = response.text && await response.text() || `Status ${response.status} from server`;
				let e = new Error(msg);
				e.status = response.status;
				throw e;
			}
		}


		async function deleteArray(array, options) {
			if (array.length === 0)
				return;
			let meta = await getMeta();
			let patch = createPatch(array, [], meta);
			let body = stringify({ patch, options });
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = { url, init: { method: 'PATCH', headers, body } };
			let response = await sendRequest(request);
			let strategy = rootMap.get(array).strategy;
			await handleResponse(response, () => {
				array.length = 0;
				rootMap.set(array, { jsonMap: new Map(), original: new Set(array), strategy });
			});
		}

		function setMapValue(rowsMap, keys, row, index) {
			let keyValue = row[keys[0].name];
			if (keys.length > 1) {
				let subMap = rowsMap.get(keyValue);
				if (!subMap) {
					subMap = new Map();
					rowsMap.set(keyValue, subMap);
				}
				setMapValue(subMap, keys.slice(1), row, index);
			}
			else
				rowsMap.set(keyValue, index);
		}

		function getMapValue(rowsMap, keys, row) {
			let keyValue = row[keys[0].name];
			if (keys.length > 1)
				return getMapValue(rowsMap.get(keyValue), keys.slice(1));
			else
				return rowsMap.get(keyValue);
		}

		async function refreshArray(array, strategy) {
			strategy = strategy || rootMap.get(array).strategy;
			if (array.length === 0)
				return;
			let meta = await getMeta();
			let filter = client.filter;
			let rowsMap = new Map();
			for (let rowIndex = 0; rowIndex < array.length; rowIndex++) {
				let row = array[rowIndex];
				let keyFilter = client.filter;
				for (let i = 0; i < meta.keys.length; i++) {
					let keyName = meta.keys[i].name;
					let keyValue = row[keyName];
					keyFilter = keyFilter.and(_table[keyName].eq(keyValue));
				}
				setMapValue(rowsMap, meta.keys, row, rowIndex);
				filter = filter.or(keyFilter);
			}
			let rows = await getManyCore(filter, strategy);
			let removedIndexes = new Set();
			if (array.length !== rows.length)
				for (var i = 0; i < array.length; i++) {
					removedIndexes.add(i);
				}
			for (let i = 0; i < rows.length; i++) {
				let row = rows[i];
				let originalIndex = getMapValue(rowsMap, meta.keys, row);
				if (array.length !== rows.length)
					removedIndexes.delete(originalIndex);
				array[originalIndex] = row;
			}
			let offset = 0;
			for (let i of removedIndexes) {
				array.splice(i + offset, 1);
				offset--;
			}
			rootMap.set(array, { jsonMap: new Map(), original: new Set(array), strategy });
		}

		async function insertRow(row, options) {
			let { strategy } = rootMap.get(row);
			let meta = await getMeta(url);
			let patch = createPatch([], [row], meta);
			let body = stringify({ patch, options });
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = { url, init: { method: 'PATCH', headers, body } };
			let response = await sendRequest(request);
			await handleResponse(response, () => rootMap.set(row, { strategy }));
		}

		async function deleteRow(row, options) {
			let { strategy } = rootMap.get(row);
			let meta = await getMeta(url);
			let patch = createPatch([row], [], meta);
			let body = stringify({ patch, options });
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = { url, init: { method: 'PATCH', headers, body } };
			let response = await sendRequest(request);
			await handleResponse(response, () => rootMap.set(row, { strategy }));
		}

		async function saveRow(row, options) {
			let { json, strategy } = rootMap.get(row);
			if (!json)
				return;
			let meta = await getMeta(url);
			let patch = createPatch([JSON.parse(json)], [row], meta);
			let body = stringify({ patch, options: { ...options, strategy } });
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = { url, init: { method: 'PATCH', headers, body } };
			let response = await sendRequest(request);
			await handleResponse(response, async (response) => {
				let { updated } = response;
				copyInto(updated, [row]);
				rootMap.set(row, { strategy });
			});
		}

		async function refreshRow(row, strategy) {
			strategy = strategy || rootMap.get(row);
			let meta = await getMeta();
			let keyFilter = client.filter;
			for (let i = 0; i < meta.keys.length; i++) {
				let keyName = meta.keys[i].name;
				let keyValue = row[keyName];
				keyFilter = keyFilter.and(_table[keyName].eq(keyValue));
			}
			let rows = await getManyCore.apply(keyFilter, strategy);
			for (let p in row) {
				delete row[p];
			}
			if (rows.length === 0)
				return;
			for (let p in rows[0]) {
				row[p] = rows[0][p];
			}
			rootMap.set(row, { strategy });
		}

		function acceptChangesRow(row) {
			rootMap.set(row, {});
		}

		function clearChangesRow(row) {
			let { json } = rootMap.get(row);
			if (!json)
				return;
			let old = JSON.parse(json);
			for (let p in row) {
				delete row[p];
			}
			for (let p in old) {
				row[p] = old[p];
			}
			rootMap.set(row, {});
		}

	}

	return client;
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

	return { added, removed: Array.from(removed), changed };
}

function column(path, ...previous) {
	function c() {
		let args = previous.concat(Array.prototype.slice.call(arguments));
		let result = { path, args };
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

module.exports = rdbClient();