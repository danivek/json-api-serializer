import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

function buildBabelConfig() {
  return {
    babelrc: false,
    presets: [['@babel/preset-env']]
  };
}

function buildConfig({
  format,
  transpiled = true,
  minified = false,
  includeExtension = true,
  extension = format,
  sourceMap = false
}) {
  function buildFileName() {
    return `dist/json-api-serializer${includeExtension ? `.${extension}` : ''}${
      minified ? '.min' : ''
    }.js`;
  }

  function buildPlugins() {
    const plugins = [resolve(), commonjs()];
    if (transpiled) plugins.push(babel(buildBabelConfig()));
    if (minified) plugins.push(uglify());
    return plugins;
  }

  return {
    input: './lib/JSONAPISerializer.js',
    output: {
      name: 'JSONAPISerializer',
      format,
      file: buildFileName(),
      sourcemap: sourceMap
    },
    plugins: buildPlugins()
  };
}

const configs = [
  buildConfig({ format: 'amd' }),
  // buildConfig({ format: 'cjs' }),
  buildConfig({ format: 'umd' }),
  buildConfig({
    format: 'umd',
    minified: true,
    includeExtension: false,
    sourceMap: true
  }),
  buildConfig({ format: 'esm', transpiled: false })
  // buildConfig({ format: 'system' })
];

export default configs;
