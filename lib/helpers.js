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

/**
 * Serialize resource ID
 *
 * @private
 * @param {object|object[]} data input data.
 * @param {object} options resource's configuration options.
 * @returns {object|object[]} id and attributes for serialization
 */
const serializeId = (data, options) => {
  if (typeof options.id === 'string') {
    const { [options.id]: id, ...attributes } = data;
    return {
      id: id ? id.toString() : undefined,
      attributes,
    };
  }

  return options.id.serialize(data);
};

/**
 * Deserialize resource ID
 *
 * @private
 * @param {object|object[]} data input data.
 * @param {object} options resource's configuration options.
 * @returns {object|object[]} deserialized id attributes
 */
const deserializeId = (data, options) => {
  if (typeof options.id === 'string') {
    return { [options.id]: data.id || undefined };
  }

  return options.id.deserialize(data);
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
  serializeId,
  deserializeId,
};
