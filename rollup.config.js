/* eslint-disable jsdoc/require-jsdoc */

const babel = require('@rollup/plugin-babel').default;
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('rollup-plugin-terser');

function buildBabelConfig() {
  return {
    babelHelpers: 'bundled',
    babelrc: false,
    presets: [['@babel/preset-env']],
  };
}

function buildConfig({
  format,
  transpiled = true,
  minified = false,
  includeExtension = true,
  extension = format,
  sourceMap = false,
}) {
  function buildFileName() {
    return `dist/json-api-serializer${includeExtension ? `.${extension}` : ''}${
      minified ? '.min' : ''
    }.js`;
  }

  function buildPlugins() {
    const plugins = [resolve(), commonjs()];
    if (transpiled) plugins.push(babel(buildBabelConfig()));
    if (minified) plugins.push(terser());
    return plugins;
  }

  return {
    input: './lib/JSONAPISerializer.js',
    output: {
      name: 'JSONAPISerializer',
      format,
      file: buildFileName(),
      sourcemap: sourceMap,
    },
    plugins: buildPlugins(),
  };
}

const configs = [
  buildConfig({ format: 'amd' }),
  buildConfig({ format: 'umd' }),
  buildConfig({
    format: 'umd',
    minified: true,
    includeExtension: false,
    sourceMap: true,
  }),
  buildConfig({ format: 'esm', transpiled: false }),
];

export default configs;
