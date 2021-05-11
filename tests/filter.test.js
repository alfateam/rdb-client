test('filter column.eq', () => {
	let client = require('../index');
	let table = client.table('order');
	let filter = table.orderNo.eq(1);
	let expected = {path: 'orderNo.eq', args: [1]};
	expect(JSON.stringify(filter)).toEqual(JSON.stringify(expected));
});

test('filter nested column.eq', () => {
	let client = require('../index');
	let table = client.table('order');
	let filter = table.customer.customerNo.eq(1);
	let expected = {path: 'customer.customerNo.eq', args: [1]};
	expect(JSON.stringify(filter)).toEqual(JSON.stringify(expected));
});

test('filter column.eq.not', () => {
	let client = require('../index');
	let table = client.table('order');
	let filter = table.orderNo.eq(1).not();
	let expected = { path: 'not', args: [{path: 'orderNo.eq', args: [1]}]} ;
	expect(JSON.stringify(filter)).toEqual(JSON.stringify(expected));
});

test('filter column.eq.not.not', () => {
	let client = require('../index');
	let table = client.table('order');
	let filter = table.orderNo.eq(1).not().not();
	let expected = { path: 'not', args: [{ path: 'not', args: [{path: 'orderNo.eq', args: [1]}] }]} ;
	expect(JSON.stringify(filter)).toEqual(JSON.stringify(expected));
});

test('filter or', () => {
	let client = require('../index');
	let table = client.table('order');
	let filter1 = table.orderNo.eq(1);
	let filter2 = table.id.eq(2);
	let filter = filter1.or(filter2);
	let expected = {
		path: 'or',
		args: [
			{ path: 'orderNo.eq', args: [1] },
			{ path: 'id.eq', args: [2] }
		]
	};
	expect(JSON.stringify(filter)).toEqual(JSON.stringify(expected));
});
