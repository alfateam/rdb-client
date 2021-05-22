let rfc = require('rfc6902');

module.exports = function createPatch(original, dto) {
	let clonedOriginal = toCompareObject(original);
	let clonedDto = toCompareObject(dto);
	let changes = rfc.createPatch(clonedOriginal, clonedDto);
	changes = changes.map(addOldValue);
	return changes;

	function addOldValue(change) {
		if (change.op === 'remove' || change.op === 'replace') {
			let splitPath = change.path.split('/');
			splitPath.shift();
			change.oldValue = splitPath.reduce(extract, clonedOriginal);
		}
		else
			return change;

		function extract(obj, element) {
			return obj[element];
		}

		return change;
	}

	function toCompareObject(object) {
		if (Array.isArray(object)) {
			let copy = { __patchType: 'Array' };
			for (let i = 0; i < object.length; i++) {
				let element = toCompareObject(object[i]);
				if (element === Object(element) && 'id' in element)
					copy[element.id] = element;
				else
					copy[i] = element;
			}
			return copy;
		}
		else if (isValidDate(object))
			return toIsoString(object);
		else if (object === Object(object)) {
			let copy = {};
			for (let name in object) {
				copy[name] = toCompareObject(object[name]);
			}
			return copy;
		}
		return object;
	}

	function isValidDate(d) {
		return d instanceof Date && !isNaN(d);
	}

	function toIsoString(date) {
		console.log(date);
		let tzo = -date.getTimezoneOffset();
		let dif = tzo >= 0 ? '+' : '-';
		function pad(num) {
			let norm = Math.floor(Math.abs(num));
			return (norm < 10 ? '0' : '') + norm;
		}

		return date.getFullYear() +
			'-' + pad(date.getMonth() + 1) +
			'-' + pad(date.getDate()) +
			'T' + pad(date.getHours()) +
			':' + pad(date.getMinutes()) +
			':' + pad(date.getSeconds()) +
			dif + pad(tzo / 60) +
			':' + pad(tzo % 60);
	}
};
