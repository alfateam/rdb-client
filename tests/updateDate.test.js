test('updateDate', async (done) => {
	let createPatch = require('../createPatch');
	let a = {id: 1, date: new Date('2020-10-13')};
	let b = {id: 1, date: new Date('2020-10-12')};
	let aIso = toIsoString(a.date);
	let bIso = toIsoString(b.date);
	let updatePatch = createPatch(a, b);
	console.log(updatePatch);
	expect(updatePatch).toEqual([{'op': 'replace', 'path': '/date', 'value': bIso, 'oldValue': aIso}]);
	console.log(a);
	done();
});

function toIsoString(date) {
	var tzo = -date.getTimezoneOffset(),
		dif = tzo >= 0 ? '+' : '-';
	function pad(num) {
		var norm = Math.floor(Math.abs(num));
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
