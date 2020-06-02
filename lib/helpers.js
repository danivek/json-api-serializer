/* eslint-disable no-sequences */
/* eslint-disable no-return-assign */

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

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/pick.md
const pick = (obj, arr) =>
  arr.reduce((acc, curr) => (curr in obj && (acc[curr] = obj[curr]), acc), {});

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/isEmpty.md
const isEmpty = (val) => val == null || !(Object.keys(val) || val).length;

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/omit.md
const omit = (obj, arr) =>
  Object.keys(obj)
    .filter((k) => !arr.includes(k))
    .reduce((acc, key) => ((acc[key] = obj[key]), acc), {});

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/isObjectLike.md
const isObjectLike = (val) => val !== null && typeof val === 'object';

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/isPlainObject.md
const isPlainObject = (val) => !!val && typeof val === 'object' && val.constructor === Object;

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/transform.md
const transform = (obj, fn, acc) => Object.keys(obj).reduce((a, k) => fn(a, obj[k], k, obj), acc);

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/toKebabCase.md
const toKebabCase = (str) =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join('-');

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/toSnakeCase.md
const toSnakeCase = (str) =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join('_');

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/toCamelCase.md
const toCamelCase = (str) => {
  const s =
    str &&
    str
      .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
      .map((x) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
      .join('');
  return s.slice(0, 1).toLowerCase() + s.slice(1);
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
