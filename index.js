const onChange = require('on-change');
let createPatch = require('./createPatch');
let stringify = require('./stringify');
let rootMap = new WeakMap();

function rdbClient() {
	let c = rdbClient;
	c.createPatch = createPatch;
	c.table = table;
	c.or = column('or');
	c.and = column('and');
	c.not = column('not');
	c.filter = {
		or: c.or,
		and: c.and,
		not: c.not,
	};

	function proxify(url, itemOrArray) {
		if (Array.isArray(itemOrArray))
			return proxifyArray(url, itemOrArray);
		else
			return proxifyRow(url, itemOrArray);
	}

	function proxifyArray(url, array) {
		let enabled = false;
		let handler = {
			get(_target, property,) {
				if (property === 'save')
					return saveArray.bind(null,array);
				else if (property === 'insert')
					return insertArray.bind(null,array);
				else
					return Reflect.get(...arguments);
			}

		};
		let innerProxy =  new Proxy(array, handler);

		let arrayProxy =  onChange(innerProxy, () => {}, {pathAsArray: true, ignoreDetached: true, onValidate});
		rootMap.set(array, {jsonMap: new Map(), original: new Set(array), url});
		enabled = true;
		return arrayProxy;

		function onValidate(path) {
			if (!enabled)
				return false;
			if (enabled && path.length > 0) {
				let {jsonMap} = rootMap.get(array);
				if (!jsonMap.has(array[path[0]]))
					jsonMap.set(array[path[0]], stringify(array[path[0]]));
			}
			return true;
		}
	}

	function proxifyRow(url, row) {
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
		rootMap.set(row, {jsonMap: new Map(), url});
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

	async function getMeta(rowOrArray) {
		let {url, meta} = rootMap.get(rowOrArray);
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
			rootMap.get(rowOrArray).meta = meta;
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
		let {original, jsonMap, url} = rootMap.get(array);
		let meta = await getMeta(array);
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
			rootMap.set(array, {jsonMap: new Map(), original: new Set(array), url});
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
	async function insertArray(array) {
		let {url} = rootMap.get(array);
		let meta = await getMeta(array);
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
			rootMap.set(array, {jsonMap: new Map(), original: new Set(array), url});
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
	async function insertRow(row) {
		let {url} = rootMap.get(row);
		let meta = await getMeta(row);
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
		let {json, url} = rootMap.get(row);
		if (!json)
			return;
		let meta = await getMeta(row);
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


	function table(url) {
		let _proxify = proxify.bind(null, url);
		let c = {
			getManyDto,
			getMany: getManyDto,
			proxify: _proxify,
			save: save,
		};
		async function getManyDto(filter, strategy) {
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
				return _proxify(await response.json());
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