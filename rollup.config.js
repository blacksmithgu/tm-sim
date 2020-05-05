import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/main.ts',
    output: { dir: 'dist', format: 'umd' },
    watch: { include: 'src/**' },
    plugins: [typescript(), commonjs(), resolve(), terser()]
};