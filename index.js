const onChange = require('on-change');
const util = require('util');
let createPatch = require('./createPatch');
let dateToIsoString = require('./dateToIsoString');
let rootMap = new WeakMap();
let isStringifying = false;

let dateToJSON = Date.prototype.toJSON;
Date.prototype.toJSON = function() {
	if (isStringifying)
		return dateToIsoString(this);
	return dateToJSON.apply(this);
};

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
		array.save = saveArray.bind(null, array);
		let arrayProxy =  onChange(array, () => {}, {pathAsArray: true, ignoreDetached: true, onValidate});
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

	function stringify(value) {
		isStringifying = true;
		let result = JSON.stringify(value);
		isStringifying = false;
		return result;
	}

	function proxifyRow(url, row) {
		let enabled = false;
		row.save = saveRow.bind(null, row);
		let rowProxy = onChange(row, () => {}, {pathAsArray: true, ignoreDetached: true, onValidate});
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
	async function save(itemOrArray) {
		if (Array.isArray(itemOrArray))
			return saveArray(itemOrArray);
		else
			return saveRow(itemOrArray);
	}

	async function saveArray(array) {
		let {original, jsonMap, url} = rootMap.get(array);
		let {added, removed, changed} = difference(original, new Set(array), jsonMap);
		let insertPatch = createPatch([], added);
		let deletePatch = createPatch(removed, []);
		let updatePatch = createPatch(changed.map(x => JSON.parse(jsonMap.get(x))), changed);
		let patch = [...insertPatch, ...updatePatch, ...deletePatch];
		console.log('patch ' + util.inspect(patch, { depth: 10 }));

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
	async function saveRow(row) {
		let {json, url} = rootMap.get(row);
		if (!json)
			return;
		let patch = createPatch([JSON.parse(json)], [row]);
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

	async function _delete(itemOrArray) {
		let patch;
		if (Array.isArray(itemOrArray))
			patch = createPatch(itemOrArray, []);
		else
			patch = createPatch([itemOrArray], []);

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
			let body = JSON.stringify({
				path: 'getManyDto',
				args: [filter, strategy]
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