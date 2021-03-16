/* eslint-disable no-sequences */
/* eslint-disable no-return-assign */

const LRU = require('./lru-cache');

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
const get = (obj, path, defaultValue) => {
  const result = String.prototype.split
    .call(path, /[,[\].]+?/)
    .filter(Boolean)
    .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  return result === undefined || result === obj ? defaultValue : result;
};

// https://stackoverflow.com/questions/54733539/javascript-implementation-of-lodash-set-method
const set = (obj, path, value) => {
  if (Object(obj) !== obj) return obj; // When obj is not an object
  // If not yet an array, get the keys from the string-path
  if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
  path.slice(0, -1).reduce(
    (
      a,
      c,
      i // Iterate all of them except the last one
    ) =>
      Object(a[c]) === a[c] // Does the key exist and is its value an object?
        ? // Yes: then follow that path
          a[c]
        : // No: create the key. Is the next key a potential array-index?
          (a[c] =
            // eslint-disable-next-line no-bitwise
            Math.abs(path[i + 1]) >> 0 === +path[i + 1]
              ? [] // Yes: assign a new array object
              : {}), // No: assign a new plain object
    obj
  )[path[path.length - 1]] = value; // Finally assign the value to the last key
  return obj; // Return the top-level object to allow chaining
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
const toKebabCase = (str) => {
  const match =
    str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);

  if (!match) {
    return str;
  }

  return match.map((x) => x.toLowerCase()).join('-');
};
// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/toSnakeCase.md
const toSnakeCase = (str) => {
  const match =
    str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);

  if (!match) {
    return str;
  }

  return match.map((x) => x.toLowerCase()).join('_');
};

// https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/toCamelCase.md
const toCamelCase = (str) => {
  const match =
    str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);

  if (!match) {
    return str;
  }

  const s = match.map((x) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase()).join('');
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
