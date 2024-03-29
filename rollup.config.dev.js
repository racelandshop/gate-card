import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import babel from 'rollup-plugin-babel';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import ignore from "./rollup-ignore-plugin"

export default {
  input: ['src/gate-card.ts'],
  output: {
    dir: './dist',
    format: 'es',
  },
  plugins: [
    resolve(),
    typescript(),
    json(),
    babel({
      exclude: 'node_modules/**',
    }),
    terser(),
    ignore({
      files: [
        require.resolve("@material/mwc-notched-outline/mwc-notched-outline.js"),
        require.resolve("@material/mwc-ripple/mwc-ripple.js"),
        require.resolve("@material/mwc-list/mwc-list-item.js"),
        require.resolve("@material/mwc-list/mwc-list.js"),
        require.resolve("@material/mwc-menu/mwc-menu.js"),
        require.resolve("@material/mwc-menu/mwc-menu-surface.js"),
        require.resolve("@material/mwc-icon/mwc-icon.js"),
      ],
    }),
    serve({
      contentBase: './dist',
      host: '0.0.0.0',
      port: 5000,
      allowCrossOrigin: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }),
  ],
};
