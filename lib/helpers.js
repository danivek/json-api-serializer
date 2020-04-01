const {
  pick,
  isEmpty,
  omit,
  isPlainObject,
  isObjectLike,
  transform,
  toKebabCase,
  toSnakeCase,
  toCamelCase,
} = require('30-seconds-of-code');
const set = require('lodash.set');
const LRU = require('./lru-cache');

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
const get = (obj, path, defaultValue) => {
  const result = String.prototype.split
    .call(path, /[,[\].]+?/)
    .filter(Boolean)
    .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  return result === undefined || result === obj ? defaultValue : result;
};

module.exports = {
  get,
  set,
  pick,
  isEmpty,
  omit,
  isPlainObject,
  isObjectLike,
  transform,
  toKebabCase,
  toSnakeCase,
  toCamelCase,
  LRU,
};
