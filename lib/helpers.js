const {
  pick, isEmpty, omit, isPlainObject, omitBy, transform, toKebabCase, toSnakeCase, toCamelCase,
} = require('30-seconds-of-code');
const set = require('lodash.set');

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
const get = (obj, path, defaultValue) => String.prototype.split.call(path, /[,[\].]+?/)
  .filter(Boolean)
  .reduce((a, c) => (Object.hasOwnProperty.call(a, c) ? a[c] : defaultValue), obj);

module.exports = {
  get,
  set,
  pick,
  isEmpty,
  omit,
  isPlainObject,
  omitBy,
  transform,
  toKebabCase,
  toSnakeCase,
  toCamelCase,
};
