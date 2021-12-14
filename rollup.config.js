import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
	input: 'index.cjs',
	output: {
		file: 'index.mjs',
		format: 'esm'
	},
	plugins: [commonjs(), nodeResolve({browser: true})],
	external: ['vue']
};