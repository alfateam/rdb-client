import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
	input: 'index.js',
	output: {
		file: 'rdb-client.esm.js',
		format: 'esm'
	},
	plugins: [commonjs(), nodeResolve({browser: true})]
};