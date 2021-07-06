let onChange = require('on-change');
let createPatch = require('./createPatch');
let stringify = require('./stringify');
let rootMap = new WeakMap();
let reactive;

function tryGetVue() {
	try {
		let {reactive: _reactive} = require('vue');
		reactive = _reactive;
	}
	catch(e) {
		console.log('no vue');
	}
}

function rdbClient() {
	let client = rdbClient;
	client.createPatch = createPatch; //keep for legacy reasons
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
			getManyDto,
			getMany: getManyDto,
			proxify,
			save: save,
		};

		let handler = {
			get(_target, property,) {
				if (property in c)
					return Reflect.get(...arguments);
				else
					return column(property);
			}

		};
		let _table =  new Proxy(c, handler);
		return _table;

		async function getManyDto() {
			let args = Array.prototype.slice.call(arguments);
			let rows =  await getManyDtoCore.apply(null, args);
			return proxify(rows);
		}

		async function getManyDtoCore() {
			let args = Array.prototype.slice.call(arguments);
			let body = JSON.stringify({
				path: 'getManyDto',
				args
			});
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = new Request(`${url}`, {method: 'POST', headers, body});
			// eslint-disable-next-line no-undef
			let response = await fetch(request);
			if (response.status === 200) {
				return await response.json();
			}
			else {
				let msg = response.json && await response.json() || `Status ${response.status} from server`;
				let e = new Error(msg);
				// @ts-ignore
				e.status = response.status;
				throw e;
			}
		}

		function proxify(itemOrArray) {
			if (Array.isArray(itemOrArray))
				return proxifyArray(itemOrArray);
			else
				return proxifyRow(itemOrArray);
		}

		function proxifyArray(array) {
			if (client.reactive)
				array = client.reactive(array);
			else if (reactive)
				array = reactive(array);
			let enabled = false;
			let handler = {
				get(_target, property,) {
					if (property === 'save')
						return saveArray.bind(null,array);
					else if (property === 'insert')
						return insertArray.bind(null,array);
					else if (property === 'get')
						return findArray.bind(null,array);
					else if (property === 'clearChanges')
						return clearChangesArray.bind(null,array);
					else
						return Reflect.get(...arguments);
				}

			};
			let innerProxy =  new Proxy(array, handler);
			let arrayProxy =  onChange(innerProxy, () => {}, {pathAsArray: true, ignoreDetached: true, onValidate});
			rootMap.set(array, {jsonMap: new Map(), original: new Set(array)});
			enabled = true;
			return arrayProxy;

			function onValidate(path) {
				if (!enabled)
					return true;
				if (enabled && path.length > 0) {
					let {jsonMap} = rootMap.get(array);
					if (!jsonMap.has(array[path[0]]))
						jsonMap.set(array[path[0]], stringify(array[path[0]]));
				}
				return true;
			}
		}

		function proxifyRow(row) {
			let enabled = false;
			let handler = {
				get(_target, property,) {
					if (property === 'save')
						return saveRow.bind(null,row);
					else if (property === 'insert')
						return insertRow.bind(null,row);
					else
						return Reflect.get(...arguments);
				}
			};
			let innerProxy =  new Proxy(row, handler);
			let rowProxy = onChange(innerProxy, () => {}, {pathAsArray: true, ignoreDetached: true, onValidate});
			rootMap.set(row, {jsonMap: new Map()});
			enabled = true;
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
			// eslint-disable-next-line no-undef
			let request = new Request(`${url}`, {method: 'GET', headers});
			// eslint-disable-next-line no-undef
			let response = await fetch(request);
			if (response.status === 200) {
				meta = await response.json();
				return meta;
			}
			else {
				let msg = response.text && await response.text() || `Status ${response.status} from server`;
				let e = new Error(msg);
				// @ts-ignore
				e.status = response.status;
				throw e;
			}
		}

		async function save(itemOrArray) {
			if (Array.isArray(itemOrArray))
				return saveArray(itemOrArray);
			else
				return saveRow(itemOrArray);
		}

		async function saveArray(array) {
			let {original, jsonMap} = rootMap.get(array);
			let meta = await getMeta();
			let {added, removed, changed} = difference(original, new Set(array), jsonMap);
			let insertPatch = createPatch([], added, meta);
			let deletePatch = createPatch(removed, [], meta);
			let updatePatch = createPatch(changed.map(x => JSON.parse(jsonMap.get(x))), changed, meta);
			let patch = [...insertPatch, ...updatePatch, ...deletePatch];

			let body = JSON.stringify(patch);
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = new Request(`${url}`, {method: 'PATCH', headers, body});
			// eslint-disable-next-line no-undef
			let response = await fetch(request);
			if (response.status >= 200 && response.status < 300 ) {
				rootMap.set(array, {jsonMap: new Map(), original: new Set(array)});
				return;
			}
			else {
				let msg = response.text && await response.text() || `Status ${response.status} from server`;
				let e = new Error(msg);
				// @ts-ignore
				e.status = response.status;
				throw e;
			}
			//todo
			//refresh changed and inserted with data from server with original strategy
		}

		async function clearChangesArray(array) {
			let {original, jsonMap} = rootMap.get(array);
			let {added, removed, changed} = difference(original, new Set(array), jsonMap);
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
				for(let row of original) {
					if (removed.has(row)) {
						if (jsonMap.has(row))
							row = JSON.parse(jsonMap.get(row));
						array.splice(i, 0, row);
					}
					i++;
				}
			}
			rootMap.set(array, {jsonMap: new Map(), original: new Set(array)});
		}

		async function insertArray(array) {
			let meta = await getMeta();
			let insertPatch = createPatch([], array, meta);
			let body = JSON.stringify(insertPatch);
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = new Request(`${url}`, {method: 'PATCH', headers, body});
			// eslint-disable-next-line no-undef
			let response = await fetch(request);
			if (response.status >= 200 && response.status < 300 ) {
				rootMap.set(array, {jsonMap: new Map(), original: new Set(array)});
				return;
			}
			else {
				let msg = response.text && await response.text() || `Status ${response.status} from server`;
				let e = new Error(msg);
				// @ts-ignore
				e.status = response.status;
				throw e;
			}
		}

		function setMapValue(rowsMap, keys, row, index) {
			let keyValue = row[keys[0]];
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
			let keyValue = row[keys[0]];
			if (keys.length > 1)
				return getMapValue(rowsMap.get(keyValue), keys.slice(1));
			else
				return rowsMap.get(keyValue);
		}

		async function findArray(array) {
			if (array.length === 0)
				return;
			let meta = await getMeta();
			let filter = client.filter;
			let rowsMap = new Map();
			for(let rowIndex = 0; rowIndex < array.length; rowIndex++) {
				let row = array[rowIndex];
				let keyFilter = client.filter;
				for (let i = 0; i < meta.keys.length; i++) {
					let keyName = meta.keys[i];
					let keyValue = row[keyName];
					keyFilter = keyFilter.and(_table[keyName].eq(keyValue));
				}
				setMapValue(rowsMap, meta.keys, row, rowIndex);
				filter = filter.or(keyFilter);
			}
			let args = [filter].concat(Array.prototype.slice.call(arguments).slice(1));
			let rows = await getManyDtoCore.apply(null, args);
			for(let i = 0; i < rows.length; i++) {
				let row = rows[i];
				let originalIndex = getMapValue(rowsMap, meta.keys, row);
				array[originalIndex] = row;
			}
		}

		async function insertRow(row) {
			let {url} = rootMap.get(row);
			let meta = await getMeta(url);
			let patch = createPatch([], [row], meta);
			let body = JSON.stringify(patch);
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = new Request(`${url}`, {method: 'PATCH', headers, body});
			// eslint-disable-next-line no-undef
			let response = await fetch(request);
			if (response.status >= 200 && response.status < 300 ) {
				rootMap.set(row, {url});
				return;
			}
			else {
				let msg = response.text && await response.text() || `Status ${response.status} from server`;
				let e = new Error(msg);
				// @ts-ignore
				e.status = response.status;
				throw e;
			}
			//todo
			//refresh changed and inserted with data from server with original strategy
		}
		async function saveRow(row) {
			let {json} = rootMap.get(row);
			if (!json)
				return;
			let meta = await getMeta(url);
			let patch = createPatch([JSON.parse(json)], [row], meta);
			let body = JSON.stringify(patch);
			// eslint-disable-next-line no-undef
			var headers = new Headers();
			headers.append('Content-Type', 'application/json');
			// eslint-disable-next-line no-undef
			let request = new Request(`${url}`, {method: 'PATCH', headers, body});
			// eslint-disable-next-line no-undef
			let response = await fetch(request);
			if (response.status >= 200 && response.status < 300 ) {
				rootMap.set(row, {url});
				return;
			}
			else {
				let msg = response.text && await response.text() || `Status ${response.status} from server`;
				let e = new Error(msg);
				// @ts-ignore
				e.status = response.status;
				throw e;
			}
			//todo
			//refresh changed and inserted with data from server with original strategy
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

	return {added, removed: Array.from(removed), changed};
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

tryGetVue();
module.exports = rdbClient();