(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.JSONAPISerializer = factory());
}(this, function () { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  (function (global, undefined$1) {

    if (global.setImmediate) {
      return;
    }

    var nextHandle = 1; // Spec says greater than zero

    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      } // Copy function arguments


      var args = new Array(arguments.length - 1);

      for (var i = 0; i < args.length; i++) {
        args[i] = arguments[i + 1];
      } // Store and register the task


      var task = {
        callback: callback,
        args: args
      };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
      delete tasksByHandle[handle];
    }

    function run(task) {
      var callback = task.callback;
      var args = task.args;

      switch (args.length) {
        case 0:
          callback();
          break;

        case 1:
          callback(args[0]);
          break;

        case 2:
          callback(args[0], args[1]);
          break;

        case 3:
          callback(args[0], args[1], args[2]);
          break;

        default:
          callback.apply(undefined$1, args);
          break;
      }
    }

    function runIfPresent(handle) {
      // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
      // So if we're currently running a task, we'll need to delay this invocation.
      if (currentlyRunningATask) {
        // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
        // "too much recursion" error.
        setTimeout(runIfPresent, 0, handle);
      } else {
        var task = tasksByHandle[handle];

        if (task) {
          currentlyRunningATask = true;

          try {
            run(task);
          } finally {
            clearImmediate(handle);
            currentlyRunningATask = false;
          }
        }
      }
    }

    function installNextTickImplementation() {
      registerImmediate = function registerImmediate(handle) {
        process.nextTick(function () {
          runIfPresent(handle);
        });
      };
    }

    function canUsePostMessage() {
      // The test against `importScripts` prevents this implementation from being installed inside a web worker,
      // where `global.postMessage` means something completely different and can't be used for this purpose.
      if (global.postMessage && !global.importScripts) {
        var postMessageIsAsynchronous = true;
        var oldOnMessage = global.onmessage;

        global.onmessage = function () {
          postMessageIsAsynchronous = false;
        };

        global.postMessage("", "*");
        global.onmessage = oldOnMessage;
        return postMessageIsAsynchronous;
      }
    }

    function installPostMessageImplementation() {
      // Installs an event handler on `global` for the `message` event: see
      // * https://developer.mozilla.org/en/DOM/window.postMessage
      // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages
      var messagePrefix = "setImmediate$" + Math.random() + "$";

      var onGlobalMessage = function onGlobalMessage(event) {
        if (event.source === global && typeof event.data === "string" && event.data.indexOf(messagePrefix) === 0) {
          runIfPresent(+event.data.slice(messagePrefix.length));
        }
      };

      if (global.addEventListener) {
        global.addEventListener("message", onGlobalMessage, false);
      } else {
        global.attachEvent("onmessage", onGlobalMessage);
      }

      registerImmediate = function registerImmediate(handle) {
        global.postMessage(messagePrefix + handle, "*");
      };
    }

    function installMessageChannelImplementation() {
      var channel = new MessageChannel();

      channel.port1.onmessage = function (event) {
        var handle = event.data;
        runIfPresent(handle);
      };

      registerImmediate = function registerImmediate(handle) {
        channel.port2.postMessage(handle);
      };
    }

    function installReadyStateChangeImplementation() {
      var html = doc.documentElement;

      registerImmediate = function registerImmediate(handle) {
        // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
        // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
        var script = doc.createElement("script");

        script.onreadystatechange = function () {
          runIfPresent(handle);
          script.onreadystatechange = null;
          html.removeChild(script);
          script = null;
        };

        html.appendChild(script);
      };
    }

    function installSetTimeoutImplementation() {
      registerImmediate = function registerImmediate(handle) {
        setTimeout(runIfPresent, 0, handle);
      };
    } // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.


    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global; // Don't get fooled by e.g. browserify environments.

    if ({}.toString.call(global.process) === "[object process]") {
      // For Node.js before 0.9
      installNextTickImplementation();
    } else if (canUsePostMessage()) {
      // For non-IE10 modern browsers
      installPostMessageImplementation();
    } else if (global.MessageChannel) {
      // For web workers, where supported
      installMessageChannelImplementation();
    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
      // For IE 6–8
      installReadyStateChangeImplementation();
    } else {
      // For older browsers
      installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
  })(typeof self === "undefined" ? typeof commonjsGlobal === "undefined" ? commonjsGlobal : commonjsGlobal : self);

  /**
   * lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="npm" -o ./`
   * Copyright jQuery Foundation and other contributors <https://jquery.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   */

  /** Used as the `TypeError` message for "Functions" methods. */

  var FUNC_ERROR_TEXT = 'Expected a function';
  /** Used to stand-in for `undefined` hash values. */

  var HASH_UNDEFINED = '__lodash_hash_undefined__';
  /** Used as references for various `Number` constants. */

  var INFINITY = 1 / 0,
      MAX_SAFE_INTEGER = 9007199254740991;
  /** `Object#toString` result references. */

  var funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]',
      symbolTag = '[object Symbol]';
  /** Used to match property names within property paths. */

  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      reLeadingDot = /^\./,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
  /**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */

  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
  /** Used to match backslashes in property paths. */

  var reEscapeChar = /\\(\\)?/g;
  /** Used to detect host constructors (Safari). */

  var reIsHostCtor = /^\[object .+?Constructor\]$/;
  /** Used to detect unsigned integer values. */

  var reIsUint = /^(?:0|[1-9]\d*)$/;
  /** Detect free variable `global` from Node.js. */

  var freeGlobal = _typeof(commonjsGlobal) == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
  /** Detect free variable `self`. */

  var freeSelf = (typeof self === "undefined" ? "undefined" : _typeof(self)) == 'object' && self && self.Object === Object && self;
  /** Used as a reference to the global object. */

  var root = freeGlobal || freeSelf || Function('return this')();
  /**
   * Gets the value at `key` of `object`.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */

  function getValue(object, key) {
    return object == null ? undefined : object[key];
  }
  /**
   * Checks if `value` is a host object in IE < 9.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
   */


  function isHostObject(value) {
    // Many host objects are `Object` objects that can coerce to strings
    // despite having improperly defined `toString` methods.
    var result = false;

    if (value != null && typeof value.toString != 'function') {
      try {
        result = !!(value + '');
      } catch (e) {}
    }

    return result;
  }
  /** Used for built-in method references. */


  var arrayProto = Array.prototype,
      funcProto = Function.prototype,
      objectProto = Object.prototype;
  /** Used to detect overreaching core-js shims. */

  var coreJsData = root['__core-js_shared__'];
  /** Used to detect methods masquerading as native. */

  var maskSrcKey = function () {
    var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
    return uid ? 'Symbol(src)_1.' + uid : '';
  }();
  /** Used to resolve the decompiled source of functions. */


  var funcToString = funcProto.toString;
  /** Used to check objects for own properties. */

  var hasOwnProperty = objectProto.hasOwnProperty;
  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */

  var objectToString = objectProto.toString;
  /** Used to detect if a method is native. */

  var reIsNative = RegExp('^' + funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&').replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$');
  /** Built-in value references. */

  var _Symbol = root.Symbol,
      splice = arrayProto.splice;
  /* Built-in method references that are verified to be native. */

  var Map$1 = getNative(root, 'Map'),
      nativeCreate = getNative(Object, 'create');
  /** Used to convert symbols to primitives and strings. */

  var symbolProto = _Symbol ? _Symbol.prototype : undefined,
      symbolToString = symbolProto ? symbolProto.toString : undefined;
  /**
   * Creates a hash object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */

  function Hash(entries) {
    var index = -1,
        length = entries ? entries.length : 0;
    this.clear();

    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  /**
   * Removes all key-value entries from the hash.
   *
   * @private
   * @name clear
   * @memberOf Hash
   */


  function hashClear() {
    this.__data__ = nativeCreate ? nativeCreate(null) : {};
  }
  /**
   * Removes `key` and its value from the hash.
   *
   * @private
   * @name delete
   * @memberOf Hash
   * @param {Object} hash The hash to modify.
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */


  function hashDelete(key) {
    return this.has(key) && delete this.__data__[key];
  }
  /**
   * Gets the hash value for `key`.
   *
   * @private
   * @name get
   * @memberOf Hash
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */


  function hashGet(key) {
    var data = this.__data__;

    if (nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED ? undefined : result;
    }

    return hasOwnProperty.call(data, key) ? data[key] : undefined;
  }
  /**
   * Checks if a hash value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Hash
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */


  function hashHas(key) {
    var data = this.__data__;
    return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
  }
  /**
   * Sets the hash `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Hash
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the hash instance.
   */


  function hashSet(key, value) {
    var data = this.__data__;
    data[key] = nativeCreate && value === undefined ? HASH_UNDEFINED : value;
    return this;
  } // Add methods to `Hash`.


  Hash.prototype.clear = hashClear;
  Hash.prototype['delete'] = hashDelete;
  Hash.prototype.get = hashGet;
  Hash.prototype.has = hashHas;
  Hash.prototype.set = hashSet;
  /**
   * Creates an list cache object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */

  function ListCache(entries) {
    var index = -1,
        length = entries ? entries.length : 0;
    this.clear();

    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  /**
   * Removes all key-value entries from the list cache.
   *
   * @private
   * @name clear
   * @memberOf ListCache
   */


  function listCacheClear() {
    this.__data__ = [];
  }
  /**
   * Removes `key` and its value from the list cache.
   *
   * @private
   * @name delete
   * @memberOf ListCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */


  function listCacheDelete(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      return false;
    }

    var lastIndex = data.length - 1;

    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }

    return true;
  }
  /**
   * Gets the list cache value for `key`.
   *
   * @private
   * @name get
   * @memberOf ListCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */


  function listCacheGet(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);
    return index < 0 ? undefined : data[index][1];
  }
  /**
   * Checks if a list cache value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf ListCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */


  function listCacheHas(key) {
    return assocIndexOf(this.__data__, key) > -1;
  }
  /**
   * Sets the list cache `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf ListCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the list cache instance.
   */


  function listCacheSet(key, value) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }

    return this;
  } // Add methods to `ListCache`.


  ListCache.prototype.clear = listCacheClear;
  ListCache.prototype['delete'] = listCacheDelete;
  ListCache.prototype.get = listCacheGet;
  ListCache.prototype.has = listCacheHas;
  ListCache.prototype.set = listCacheSet;
  /**
   * Creates a map cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */

  function MapCache(entries) {
    var index = -1,
        length = entries ? entries.length : 0;
    this.clear();

    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  /**
   * Removes all key-value entries from the map.
   *
   * @private
   * @name clear
   * @memberOf MapCache
   */


  function mapCacheClear() {
    this.__data__ = {
      'hash': new Hash(),
      'map': new (Map$1 || ListCache)(),
      'string': new Hash()
    };
  }
  /**
   * Removes `key` and its value from the map.
   *
   * @private
   * @name delete
   * @memberOf MapCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */


  function mapCacheDelete(key) {
    return getMapData(this, key)['delete'](key);
  }
  /**
   * Gets the map value for `key`.
   *
   * @private
   * @name get
   * @memberOf MapCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */


  function mapCacheGet(key) {
    return getMapData(this, key).get(key);
  }
  /**
   * Checks if a map value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf MapCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */


  function mapCacheHas(key) {
    return getMapData(this, key).has(key);
  }
  /**
   * Sets the map `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf MapCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the map cache instance.
   */


  function mapCacheSet(key, value) {
    getMapData(this, key).set(key, value);
    return this;
  } // Add methods to `MapCache`.


  MapCache.prototype.clear = mapCacheClear;
  MapCache.prototype['delete'] = mapCacheDelete;
  MapCache.prototype.get = mapCacheGet;
  MapCache.prototype.has = mapCacheHas;
  MapCache.prototype.set = mapCacheSet;
  /**
   * Assigns `value` to `key` of `object` if the existing value is not equivalent
   * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {string} key The key of the property to assign.
   * @param {*} value The value to assign.
   */

  function assignValue(object, key, value) {
    var objValue = object[key];

    if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === undefined && !(key in object)) {
      object[key] = value;
    }
  }
  /**
   * Gets the index at which the `key` is found in `array` of key-value pairs.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} key The key to search for.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */


  function assocIndexOf(array, key) {
    var length = array.length;

    while (length--) {
      if (eq(array[length][0], key)) {
        return length;
      }
    }

    return -1;
  }
  /**
   * The base implementation of `_.isNative` without bad shim checks.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function,
   *  else `false`.
   */


  function baseIsNative(value) {
    if (!isObject(value) || isMasked(value)) {
      return false;
    }

    var pattern = isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource(value));
  }
  /**
   * The base implementation of `_.set`.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {Array|string} path The path of the property to set.
   * @param {*} value The value to set.
   * @param {Function} [customizer] The function to customize path creation.
   * @returns {Object} Returns `object`.
   */


  function baseSet(object, path, value, customizer) {
    if (!isObject(object)) {
      return object;
    }

    path = isKey(path, object) ? [path] : castPath(path);
    var index = -1,
        length = path.length,
        lastIndex = length - 1,
        nested = object;

    while (nested != null && ++index < length) {
      var key = toKey(path[index]),
          newValue = value;

      if (index != lastIndex) {
        var objValue = nested[key];
        newValue = customizer ? customizer(objValue, key, nested) : undefined;

        if (newValue === undefined) {
          newValue = isObject(objValue) ? objValue : isIndex(path[index + 1]) ? [] : {};
        }
      }

      assignValue(nested, key, newValue);
      nested = nested[key];
    }

    return object;
  }
  /**
   * The base implementation of `_.toString` which doesn't convert nullish
   * values to empty strings.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */


  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == 'string') {
      return value;
    }

    if (isSymbol(value)) {
      return symbolToString ? symbolToString.call(value) : '';
    }

    var result = value + '';
    return result == '0' && 1 / value == -INFINITY ? '-0' : result;
  }
  /**
   * Casts `value` to a path array if it's not one.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {Array} Returns the cast property path array.
   */


  function castPath(value) {
    return isArray(value) ? value : stringToPath(value);
  }
  /**
   * Gets the data for `map`.
   *
   * @private
   * @param {Object} map The map to query.
   * @param {string} key The reference key.
   * @returns {*} Returns the map data.
   */


  function getMapData(map, key) {
    var data = map.__data__;
    return isKeyable(key) ? data[typeof key == 'string' ? 'string' : 'hash'] : data.map;
  }
  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */


  function getNative(object, key) {
    var value = getValue(object, key);
    return baseIsNative(value) ? value : undefined;
  }
  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */


  function isIndex(value, length) {
    length = length == null ? MAX_SAFE_INTEGER : length;
    return !!length && (typeof value == 'number' || reIsUint.test(value)) && value > -1 && value % 1 == 0 && value < length;
  }
  /**
   * Checks if `value` is a property name and not a property path.
   *
   * @private
   * @param {*} value The value to check.
   * @param {Object} [object] The object to query keys on.
   * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
   */


  function isKey(value, object) {
    if (isArray(value)) {
      return false;
    }

    var type = _typeof(value);

    if (type == 'number' || type == 'symbol' || type == 'boolean' || value == null || isSymbol(value)) {
      return true;
    }

    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
  }
  /**
   * Checks if `value` is suitable for use as unique object key.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
   */


  function isKeyable(value) {
    var type = _typeof(value);

    return type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean' ? value !== '__proto__' : value === null;
  }
  /**
   * Checks if `func` has its source masked.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` is masked, else `false`.
   */


  function isMasked(func) {
    return !!maskSrcKey && maskSrcKey in func;
  }
  /**
   * Converts `string` to a property path array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the property path array.
   */


  var stringToPath = memoize(function (string) {
    string = toString(string);
    var result = [];

    if (reLeadingDot.test(string)) {
      result.push('');
    }

    string.replace(rePropName, function (match, number, quote, string) {
      result.push(quote ? string.replace(reEscapeChar, '$1') : number || match);
    });
    return result;
  });
  /**
   * Converts `value` to a string key if it's not a string or symbol.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {string|symbol} Returns the key.
   */

  function toKey(value) {
    if (typeof value == 'string' || isSymbol(value)) {
      return value;
    }

    var result = value + '';
    return result == '0' && 1 / value == -INFINITY ? '-0' : result;
  }
  /**
   * Converts `func` to its source code.
   *
   * @private
   * @param {Function} func The function to process.
   * @returns {string} Returns the source code.
   */


  function toSource(func) {
    if (func != null) {
      try {
        return funcToString.call(func);
      } catch (e) {}

      try {
        return func + '';
      } catch (e) {}
    }

    return '';
  }
  /**
   * Creates a function that memoizes the result of `func`. If `resolver` is
   * provided, it determines the cache key for storing the result based on the
   * arguments provided to the memoized function. By default, the first argument
   * provided to the memoized function is used as the map cache key. The `func`
   * is invoked with the `this` binding of the memoized function.
   *
   * **Note:** The cache is exposed as the `cache` property on the memoized
   * function. Its creation may be customized by replacing the `_.memoize.Cache`
   * constructor with one whose instances implement the
   * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
   * method interface of `delete`, `get`, `has`, and `set`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] The function to resolve the cache key.
   * @returns {Function} Returns the new memoized function.
   * @example
   *
   * var object = { 'a': 1, 'b': 2 };
   * var other = { 'c': 3, 'd': 4 };
   *
   * var values = _.memoize(_.values);
   * values(object);
   * // => [1, 2]
   *
   * values(other);
   * // => [3, 4]
   *
   * object.a = 2;
   * values(object);
   * // => [1, 2]
   *
   * // Modify the result cache.
   * values.cache.set(object, ['a', 'b']);
   * values(object);
   * // => ['a', 'b']
   *
   * // Replace `_.memoize.Cache`.
   * _.memoize.Cache = WeakMap;
   */


  function memoize(func, resolver) {
    if (typeof func != 'function' || resolver && typeof resolver != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }

    var memoized = function memoized() {
      var args = arguments,
          key = resolver ? resolver.apply(this, args) : args[0],
          cache = memoized.cache;

      if (cache.has(key)) {
        return cache.get(key);
      }

      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result);
      return result;
    };

    memoized.cache = new (memoize.Cache || MapCache)();
    return memoized;
  } // Assign cache to `_.memoize`.


  memoize.Cache = MapCache;
  /**
   * Performs a
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * comparison between two values to determine if they are equivalent.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.eq(object, object);
   * // => true
   *
   * _.eq(object, other);
   * // => false
   *
   * _.eq('a', 'a');
   * // => true
   *
   * _.eq('a', Object('a'));
   * // => false
   *
   * _.eq(NaN, NaN);
   * // => true
   */

  function eq(value, other) {
    return value === other || value !== value && other !== other;
  }
  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */


  var isArray = Array.isArray;
  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */

  function isFunction(value) {
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 8-9 which returns 'object' for typed array and other constructors.
    var tag = isObject(value) ? objectToString.call(value) : '';
    return tag == funcTag || tag == genTag;
  }
  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */


  function isObject(value) {
    var type = _typeof(value);

    return !!value && (type == 'object' || type == 'function');
  }
  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */


  function isObjectLike(value) {
    return !!value && _typeof(value) == 'object';
  }
  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */


  function isSymbol(value) {
    return _typeof(value) == 'symbol' || isObjectLike(value) && objectToString.call(value) == symbolTag;
  }
  /**
   * Converts `value` to a string. An empty string is returned for `null`
   * and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */


  function toString(value) {
    return value == null ? '' : baseToString(value);
  }
  /**
   * Sets the value at `path` of `object`. If a portion of `path` doesn't exist,
   * it's created. Arrays are created for missing index properties while objects
   * are created for all other missing properties. Use `_.setWith` to customize
   * `path` creation.
   *
   * **Note:** This method mutates `object`.
   *
   * @static
   * @memberOf _
   * @since 3.7.0
   * @category Object
   * @param {Object} object The object to modify.
   * @param {Array|string} path The path of the property to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns `object`.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': 3 } }] };
   *
   * _.set(object, 'a[0].b.c', 4);
   * console.log(object.a[0].b.c);
   * // => 4
   *
   * _.set(object, ['x', '0', 'y', 'z'], 5);
   * console.log(object.x[0].y.z);
   * // => 5
   */


  function set(object, path, value) {
    return object == null ? object : baseSet(object, path, value);
  }

  var lodash_set = set;

  /* eslint-disable no-sequences */

  /* eslint-disable no-return-assign */
  // https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get

  var get = function get(obj, path, defaultValue) {
    return String.prototype.split.call(path, /[,[\].]+?/).filter(Boolean).reduce(function (a, c) {
      return Object.hasOwnProperty.call(a, c) ? a[c] : defaultValue;
    }, obj);
  };

  var pick = function pick(obj, arr) {
    return arr.reduce(function (acc, curr) {
      return curr in obj && (acc[curr] = obj[curr]), acc;
    }, {});
  };

  var isEmpty = function isEmpty(val) {
    return val == null || !(Object.keys(val) || val).length;
  };

  var omit = function omit(obj, arr) {
    return Object.keys(obj).filter(function (k) {
      return !arr.includes(k);
    }).reduce(function (acc, key) {
      return acc[key] = obj[key], acc;
    }, {});
  };

  var isPlainObject = function isPlainObject(val) {
    return !!val && _typeof(val) === 'object' && val.constructor === Object;
  };

  var transform = function transform(obj, fn, acc) {
    return Object.keys(obj).reduce(function (a, k) {
      return fn(a, obj[k], k, obj);
    }, acc);
  };

  var toKebabCase = function toKebabCase(str) {
    return str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g).map(function (x) {
      return x.toLowerCase();
    }).join('-');
  };

  var toSnakeCase = function toSnakeCase(str) {
    return str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g).map(function (x) {
      return x.toLowerCase();
    }).join('_');
  };

  var toCamelCase = function toCamelCase(str) {
    var s = str && str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g).map(function (x) {
      return x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase();
    }).join('');
    return s.slice(0, 1).toLowerCase() + s.slice(1);
  };

  var helpers = {
    get: get,
    set: lodash_set,
    pick: pick,
    isEmpty: isEmpty,
    omit: omit,
    isPlainObject: isPlainObject,
    transform: transform,
    toKebabCase: toKebabCase,
    toSnakeCase: toSnakeCase,
    toCamelCase: toCamelCase
  };

  /**
   * Validate and apply default values to resource's configuration options.
   *
   * @method validateOptions
   * @private
   * @param {Object} options Configuration options.
   * @return {Object}
   */
  function validateOptions(options) {
    options = Object.assign({
      id: 'id',
      blacklist: [],
      whitelist: [],
      links: {},
      relationships: {},
      topLevelLinks: {},
      topLevelMeta: {},
      meta: {},
      blacklistOnDeserialize: [],
      whitelistOnDeserialize: [],
      jsonapiObject: true
    }, options);
    if (!Array.isArray(options.blacklist)) throw new Error("option 'blacklist' must be an array");
    if (!Array.isArray(options.whitelist)) throw new Error("option 'whitelist' must be an array");
    if (_typeof(options.links) !== 'object' && typeof options.links !== 'function') throw new Error("option 'links' must be an object or a function");
    if (!Array.isArray(options.blacklistOnDeserialize)) throw new Error("option 'blacklistOnDeserialize' must be an array");
    if (!Array.isArray(options.whitelistOnDeserialize)) throw new Error("option 'whitelistOnDeserialize' must be an array");
    if (options.topLevelLinks && _typeof(options.topLevelLinks) !== 'object' && typeof options.topLevelLinks !== 'function') throw new Error("option 'topLevelLinks' must be an object or a function");
    if (options.topLevelMeta && _typeof(options.topLevelMeta) !== 'object' && typeof options.topLevelMeta !== 'function') throw new Error("option 'topLevelMeta' must be an object or a function");
    if (options.meta && _typeof(options.meta) !== 'object' && typeof options.meta !== 'function') throw new Error("option 'meta' must be an object or a function");
    if (typeof options.jsonapiObject !== 'boolean') throw new Error("option 'jsonapiObject' must a boolean");
    if (options.convertCase && !['kebab-case', 'snake_case', 'camelCase'].includes(options.convertCase)) throw new Error("option 'convertCase' must be one of 'kebab-case', 'snake_case', 'camelCase'");
    if (options.unconvertCase && !['kebab-case', 'snake_case', 'camelCase'].includes(options.unconvertCase)) throw new Error("option 'unconvertCase' must be one of 'kebab-case', 'snake_case', 'camelCase'");
    var _options = options,
        relationships = _options.relationships;
    Object.keys(relationships).forEach(function (key) {
      relationships[key] = Object.assign({
        schema: 'default',
        links: {},
        meta: {}
      }, relationships[key]);
      if (!relationships[key].type) throw new Error("option 'type' for relationship '".concat(key, "' is required"));
      if (typeof relationships[key].type !== 'string' && typeof relationships[key].type !== 'function') throw new Error("option 'type' for relationship '".concat(key, "' must be a string or a function"));
      if (relationships[key].alternativeKey && typeof relationships[key].alternativeKey !== 'string') throw new Error("option 'alternativeKey' for relationship '".concat(key, "' must be a string"));
      if (relationships[key].schema && typeof relationships[key].schema !== 'string') throw new Error("option 'schema' for relationship '".concat(key, "' must be a string"));
      if (_typeof(relationships[key].links) !== 'object' && typeof relationships[key].links !== 'function') throw new Error("option 'links' for relationship '".concat(key, "' must be an object or a function"));
      if (_typeof(relationships[key].meta) !== 'object' && typeof relationships[key].meta !== 'function') throw new Error("option 'meta' for relationship '".concat(key, "' must be an object or a function"));
      if (relationships[key].deserialize && typeof relationships[key].deserialize !== 'function') throw new Error("option 'deserialize' for relationship '".concat(key, "' must be a function"));
    });
    return options;
  }
  /**
   * Validate and apply default values to the dynamic type object option.
   *
   * @method validateDynamicTypeOptions
   * @private
   * @param {Object} options dynamic type object option.
   * @return {Object}
   */


  function validateDynamicTypeOptions(options) {
    options = Object.assign({
      topLevelLinks: {},
      topLevelMeta: {},
      jsonapiObject: true
    }, options);
    if (!options.type) throw new Error("option 'type' is required");

    if (typeof options.type !== 'string' && typeof options.type !== 'function') {
      throw new Error("option 'type' must be a string or a function");
    }

    if (options.topLevelLinks && _typeof(options.topLevelLinks) !== 'object' && typeof options.topLevelLinks !== 'function') throw new Error("option 'topLevelLinks' must be an object or a function");
    if (options.topLevelMeta && _typeof(options.topLevelMeta) !== 'object' && typeof options.topLevelMeta !== 'function') throw new Error("option 'topLevelMeta' must be an object or a function");
    if (options.meta && _typeof(options.meta) !== 'object' && typeof options.meta !== 'function') throw new Error("option 'meta' must be an object or a function");
    if (typeof options.jsonapiObject !== 'boolean') throw new Error("option 'jsonapiObject' must a boolean");
    return options;
  }
  /**
   * Validate a JSONAPI error object
   *
   * @method validateError
   * @private
   * @param {Object} err a JSONAPI error object
   * @return {Object}
   */


  function validateError(err) {
    if (_typeof(err) !== 'object') {
      throw new Error('error must be an object');
    }

    var id = err.id,
        links = err.links,
        status = err.status,
        code = err.code,
        title = err.title,
        detail = err.detail,
        source = err.source,
        meta = err.meta;

    var isValidLink = function isValidLink(linksObj) {
      if (_typeof(linksObj) !== 'object') {
        throw new Error("error 'link' property must be an object");
      }

      Object.keys(linksObj).forEach(function (key) {
        if (_typeof(linksObj[key]) !== 'object' && typeof linksObj[key] !== 'string') {
          throw new Error("error 'links.".concat(key, "' must be a string or an object"));
        }

        if (_typeof(linksObj[key]) === 'object') {
          if (linksObj[key].href && typeof linksObj[key].href !== 'string') {
            throw new Error("'links.".concat(key, ".href' property must be a string"));
          }

          if (linksObj[key].meta && _typeof(linksObj[key].meta) !== 'object') {
            throw new Error("'links.".concat(key, ".meta' property must be an object"));
          }
        }
      });
      return links;
    };

    var isValidSource = function isValidSource(sourceObj) {
      if (_typeof(sourceObj) !== 'object') {
        throw new Error("error 'source' property must be an object");
      }

      if (sourceObj.pointer && typeof sourceObj.pointer !== 'string') {
        throw new Error("error 'source.pointer' property must be a string");
      }

      if (sourceObj.parameter && typeof sourceObj.parameter !== 'string') {
        throw new Error("error 'source.parameter' property must be a string");
      }

      return source;
    };

    var error = {};
    if (id) error.id = id.toString();
    if (links) error.links = isValidLink(links);
    if (status) error.status = status.toString();
    if (code) error.code = code.toString();
    if (title) error.title = title.toString();
    if (detail) error.detail = detail.toString();
    if (source) error.source = isValidSource(source);
    if (meta) error.meta = meta;
    return error;
  }

  var validator = {
    validateOptions: validateOptions,
    validateDynamicTypeOptions: validateDynamicTypeOptions,
    validateError: validateError
  };

  var pick$1 = helpers.pick,
      isEmpty$1 = helpers.isEmpty,
      omit$1 = helpers.omit,
      isPlainObject$1 = helpers.isPlainObject,
      transform$1 = helpers.transform,
      get$1 = helpers.get,
      set$1 = helpers.set,
      toCamelCase$1 = helpers.toCamelCase,
      toKebabCase$1 = helpers.toKebabCase,
      toSnakeCase$1 = helpers.toSnakeCase;
  var validateOptions$1 = validator.validateOptions,
      validateDynamicTypeOptions$1 = validator.validateDynamicTypeOptions,
      validateError$1 = validator.validateError;
  /**
   * JSONAPISerializer class.
   *
   * @example
   * const JSONAPISerializer = require('json-api-serializer');
   *
   * // Create an instance of JSONAPISerializer with default settings
   * const serializer = new JSONAPISerializer();
   *
   * @class JSONAPISerializer
   * @param {Object} [opts] Global options.
   */

  var JSONAPISerializer_1 =
  /*#__PURE__*/
  function () {
    function JSONAPISerializer(opts) {
      _classCallCheck(this, JSONAPISerializer);

      this.opts = opts || {};
      this.schemas = {};
    }
    /**
     * Register a resource with its type, schema name, and configuration options.
     *
     * @method JSONAPISerializer#register
     * @param {string} type resource's type.
     * @param {string} [schema=default] schema name.
     * @param {Object} [options] options.
     */


    _createClass(JSONAPISerializer, [{
      key: "register",
      value: function register(type, schema, options) {
        if (_typeof(schema) === 'object') {
          options = schema;
          schema = 'default';
        }

        schema = schema || 'default';
        options = Object.assign({}, this.opts, options);
        this.schemas[type] = this.schemas[type] || {};
        this.schemas[type][schema] = validateOptions$1(options);
      }
      /**
       * Serialze input data to a JSON API compliant response.
       * Input data can be a simple object or an array of objects.
       *
       * @see {@link http://jsonapi.org/format/#document-top-level}
       * @method JSONAPISerializer#serialize
       * @param {string|Object} type resource's type as string or a dynamic type options as object.
       * @param {Object|Object[]} data input data.
       * @param {string} [schema=default] resource's schema name.
       * @param {Object} [extraData] additional data that can be used in topLevelMeta options.
       * @return {Object} serialized data.
       */

    }, {
      key: "serialize",
      value: function serialize(type, data, schema, extraData) {
        // Support optional arguments (schema)
        if (arguments.length === 3) {
          if (_typeof(schema) === 'object') {
            extraData = schema;
            schema = 'default';
          }
        }

        schema = schema || 'default';
        extraData = extraData || {};
        var included = new Map();
        var isDynamicType = _typeof(type) === 'object';
        var options;

        if (isDynamicType) {
          // Dynamic type option
          options = validateDynamicTypeOptions$1(type);
        } else {
          // Serialize data with the defined type
          if (!this.schemas[type]) {
            throw new Error("No type registered for ".concat(type));
          }

          if (schema && !this.schemas[type][schema]) {
            throw new Error("No schema ".concat(schema, " registered for ").concat(type));
          }

          options = this.schemas[type][schema];
        }

        return {
          jsonapi: options.jsonapiObject ? {
            version: '1.0'
          } : undefined,
          meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
          links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
          data: isDynamicType ? this.serializeMixedResource(options, data, included, extraData) : this.serializeResource(type, data, options, included, extraData),
          included: included.size ? _toConsumableArray(included.values()) : undefined
        };
      }
      /**
       * Asynchronously serialize input data to a JSON API compliant response.
       * Input data can be a simple object or an array of objects.
       *
       * @see {@link http://jsonapi.org/format/#document-top-level}
       * @method JSONAPISerializer#serializeAsync
       * @param {string} type resource's type.
       * @param {Object|Object[]} data input data.
       * @param {string} [schema=default] resource's schema name.
       * @param {Object} [extraData] additional data that can be used in topLevelMeta options.
       * @return {Promise} resolves with serialized data.
       */

    }, {
      key: "serializeAsync",
      value: function serializeAsync(type, data, schema, extraData) {
        var _this = this;

        // Support optional arguments (schema)
        if (arguments.length === 3) {
          if (_typeof(schema) === 'object') {
            extraData = schema;
            schema = 'default';
          }
        }

        schema = schema || 'default';
        extraData = extraData || {};
        var included = new Map();
        var isDataArray = Array.isArray(data);
        var isDynamicType = _typeof(type) === 'object';
        var arrayData = isDataArray ? data : [data];
        var serializedData = [];
        var that = this;
        var i = 0;
        var options;

        if (isDynamicType) {
          options = validateDynamicTypeOptions$1(type);
        } else {
          if (!this.schemas[type]) {
            throw new Error("No type registered for ".concat(type));
          }

          if (schema && !this.schemas[type][schema]) {
            throw new Error("No schema ".concat(schema, " registered for ").concat(type));
          }

          options = this.schemas[type][schema];
        }

        return new Promise(function (resolve, reject) {
          function next() {
            setImmediate(function () {
              if (i >= arrayData.length) {
                return resolve(serializedData);
              }

              try {
                // Serialize a single item of the data-array.
                var serializedItem = isDynamicType ? that.serializeMixedResource(type, arrayData[i], included, extraData) : that.serializeResource(type, arrayData[i], options, included, extraData);

                if (serializedItem !== null) {
                  serializedData.push(serializedItem);
                }

                i += 1;
                return next();
              } catch (e) {
                return reject(e);
              }
            });
          }

          next();
        }).then(function (result) {
          return {
            jsonapi: options.jsonapiObject ? {
              version: '1.0'
            } : undefined,
            meta: _this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
            links: _this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
            // If the source data was an array, we just pass the serialized data array.
            // Otherwise we try to take the first (and only) item of it or pass null.
            data: isDataArray ? result : result[0] || null,
            included: included.size ? _toConsumableArray(included.values()) : undefined
          };
        });
      }
      /**
       * Deserialize JSON API document data.
       * Input data can be a simple object or an array of objects.
       *
       * @method JSONAPISerializer#deserialize
       * @param {string|Object} type resource's type as string or an object with a dynamic type resolved from data.
       * @param {Object} data JSON API input data.
       * @param {string} [schema=default] resource's schema name.
       * @return {Object} deserialized data.
       */

    }, {
      key: "deserialize",
      value: function deserialize(type, data, schema) {
        var _this2 = this;

        schema = schema || 'default';

        if (_typeof(type) === 'object') {
          type = validateDynamicTypeOptions$1(type);
        } else {
          if (!this.schemas[type]) {
            throw new Error("No type registered for ".concat(type));
          }

          if (schema && !this.schemas[type][schema]) {
            throw new Error("No schema ".concat(schema, " registered for ").concat(type));
          }
        }

        var deserializedData = {};

        if (data.data) {
          deserializedData = Array.isArray(data.data) ? data.data.map(function (resource) {
            return _this2.deserializeResource(type, resource, schema, data.included);
          }) : this.deserializeResource(type, data.data, schema, data.included);
        }

        return deserializedData;
      }
      /**
       * Asynchronously Deserialize JSON API document data.
       * Input data can be a simple object or an array of objects.
       *
       * @method JSONAPISerializer#deserializeAsync
       * @param {string|Object} type resource's type as string or an object with a dynamic type resolved from data.
       * @param {Object} data JSON API input data.
       * @param {string} [schema=default] resource's schema name.
       * @return {Promise} resolves with serialized data.
       */

    }, {
      key: "deserializeAsync",
      value: function deserializeAsync(type, data, schema) {
        schema = schema || 'default';

        if (_typeof(type) === 'object') {
          type = validateDynamicTypeOptions$1(type);
        } else {
          if (!this.schemas[type]) {
            throw new Error("No type registered for ".concat(type));
          }

          if (schema && !this.schemas[type][schema]) {
            throw new Error("No schema ".concat(schema, " registered for ").concat(type));
          }
        }

        var isDataArray = Array.isArray(data.data);
        var i = 0;
        var arrayData = isDataArray ? data.data : [data.data];
        var deserializedData = [];
        var that = this;
        return new Promise(function (resolve, reject) {
          function next() {
            setImmediate(function () {
              if (i >= arrayData.length) {
                return resolve(isDataArray ? deserializedData : deserializedData[0]);
              }

              try {
                // Serialize a single item of the data-array.
                var deserializedItem = that.deserializeResource(type, arrayData[i], schema, data.included);
                deserializedData.push(deserializedItem);
                i += 1;
                return next();
              } catch (e) {
                return reject(e);
              }
            });
          }

          next();
        });
      }
      /**
       * Serialize any error into a JSON API error document.
       * Input data can be:
       *  - An Error or an array of Error.
       *  - A JSON API error object or an array of JSON API error object.
       *
       * @see {@link http://jsonapi.org/format/#errors}
       * @method JSONAPISerializer#serializeError
       * @param {Error|Error[]|Object|Object[]} error an Error, an array of Error, a JSON API error object, an array of JSON API error object
       * @return {Promise} resolves with serialized error.
       */

    }, {
      key: "serializeError",
      value: function serializeError(error) {
        function convertToError(err) {
          var serializedError;

          if (err instanceof Error) {
            var status = err.status || err.statusCode;
            serializedError = {
              status: status && status.toString(),
              code: err.code,
              detail: err.message
            };
          } else {
            serializedError = validateError$1(err);
          }

          return serializedError;
        }

        return {
          errors: Array.isArray(error) ? error.map(function (err) {
            return convertToError(err);
          }) : [convertToError(error)]
        };
      }
      /**
       * Deserialize a single JSON API resource.
       * Input data must be a simple object.
       *
       * @method JSONAPISerializer#deserializeResource
       * @param {string|Object} type resource's type as string or an object with a dynamic type resolved from data.
       * @param {Object} data JSON API resource data.
       * @param {string} [schema=default] resource's schema name.
       * @param {Map<string:Object>} included.
       * @return {Object} deserialized data.
       */

    }, {
      key: "deserializeResource",
      value: function deserializeResource(type, data, schema, included) {
        var _this3 = this;

        if (_typeof(type) === 'object') {
          type = typeof type.type === 'function' ? type.type(data) : get$1(data, type.type);

          if (!type) {
            throw new Error("No type can be resolved from data: ".concat(JSON.stringify(data)));
          }

          if (!this.schemas[type]) {
            throw new Error("No type registered for ".concat(type));
          }

          schema = 'default';
        }

        var options = this.schemas[type][schema];
        var deserializedData = {};
        deserializedData[options.id] = data.id || undefined;

        if (data.attributes && options.whitelistOnDeserialize.length) {
          data.attributes = pick$1(data.attributes, options.whitelistOnDeserialize);
        }

        if (data.attributes && options.blacklistOnDeserialize.length) {
          data.attributes = omit$1(data.attributes, options.blacklistOnDeserialize);
        }

        Object.assign(deserializedData, data.attributes); // Deserialize relationships

        if (data.relationships) {
          Object.keys(data.relationships).forEach(function (relationshipProperty) {
            var relationship = data.relationships[relationshipProperty];
            var relationshipKey = options.unconvertCase ? _this3._convertCase(relationshipProperty, options.unconvertCase) : relationshipProperty; // Support alternativeKey options for relationships

            if (options.relationships[relationshipKey] && options.relationships[relationshipKey].alternativeKey) {
              relationshipKey = options.relationships[relationshipKey].alternativeKey;
            }

            var deserializeFunction = function deserializeFunction(relationshipData) {
              if (options.relationships[relationshipKey] && options.relationships[relationshipProperty].deserialize) {
                return options.relationships[relationshipProperty].deserialize(relationshipData);
              }

              return relationshipData.id;
            };

            if (relationship.data !== undefined) {
              if (Array.isArray(relationship.data)) {
                set$1(deserializedData, relationshipKey, relationship.data.map(function (d) {
                  return included ? _this3.deserializeIncluded(d.type, d.id, options.relationships[relationshipProperty], included) : deserializeFunction(d);
                }));
              } else if (relationship.data === null) {
                // null data
                set$1(deserializedData, relationshipKey, null);
              } else {
                set$1(deserializedData, relationshipKey, included ? _this3.deserializeIncluded(relationship.data.type, relationship.data.id, options.relationships[relationshipProperty], included) : deserializeFunction(relationship.data));
              }
            }
          });
        }

        if (options.unconvertCase) {
          deserializedData = this._convertCase(deserializedData, options.unconvertCase);
        }

        if (data.links) {
          deserializedData.links = data.links;
        }

        if (data.meta) {
          deserializedData.meta = data.meta;
        }

        return deserializedData;
      }
    }, {
      key: "deserializeIncluded",
      value: function deserializeIncluded(type, id, relationshipOpts, included) {
        var includedResource = included.find(function (resource) {
          return resource.type === type && resource.id === id;
        });

        if (!includedResource) {
          return id;
        }

        return this.deserializeResource(type, includedResource, relationshipOpts.schema, included);
      }
      /**
       * Serialize resource objects.
       *
       * @see {@link http://jsonapi.org/format/#document-resource-objects}
       * @method JSONAPISerializer#serializeDocument
       * @private
       * @param {string} type resource's type.
       * @param {Object|Object[]} data input data.
       * @param {options} options resource's configuration options.
       * @param {Map<string:Object>} included.
       * @param {Object} extraData additional data.
       * @return {Object|Object[]} serialized data.
       */

    }, {
      key: "serializeResource",
      value: function serializeResource(type, data, options, included, extraData) {
        var _this4 = this;

        if (isEmpty$1(data)) {
          // Return [] or null
          return Array.isArray(data) ? data : null;
        }

        if (Array.isArray(data)) {
          return data.map(function (d) {
            return _this4.serializeResource(type, d, options, included, extraData);
          });
        }

        return {
          type: type,
          id: data[options.id] ? data[options.id].toString() : undefined,
          attributes: this.serializeAttributes(data, options),
          relationships: this.serializeRelationships(data, options, included, extraData),
          meta: this.processOptionsValues(data, extraData, options.meta),
          links: this.processOptionsValues(data, extraData, options.links)
        };
      }
      /**
       * Serialize mixed resource object with a dynamic type resolved from data
       *
       * @see {@link http://jsonapi.org/format/#document-resource-objects}
       * @method JSONAPISerializer#serializeMixedResource
       * @private
       * @param {Object} typeOption a dynamic type options.
       * @param {Object|Object[]} data input data.
       * @param {Map<string:Object>} included.
       * @param {Object} extraData additional data.
       * @return {Object|Object[]} serialized data.
       */

    }, {
      key: "serializeMixedResource",
      value: function serializeMixedResource(typeOption, data, included, extraData) {
        var _this5 = this;

        if (isEmpty$1(data)) {
          // Return [] or null
          return Array.isArray(data) ? data : null;
        }

        if (Array.isArray(data)) {
          return data.map(function (d) {
            return _this5.serializeMixedResource(typeOption, d, included, extraData);
          });
        } // Resolve type from data (can be a string or a function deriving a type-string from each data-item)


        var type = typeof typeOption.type === 'function' ? typeOption.type(data) : get$1(data, typeOption.type);

        if (!type) {
          throw new Error("No type can be resolved from data: ".concat(JSON.stringify(data)));
        }

        if (!this.schemas[type]) {
          throw new Error("No type registered for ".concat(type));
        }

        return this.serializeResource(type, data, this.schemas[type]["default"], included, extraData);
      }
      /**
       * Serialize 'attributes' key of resource objects: an attributes object representing some of the resource's data.
       *
       * @see {@link http://jsonapi.org/format/#document-resource-object-attributes}
       * @method JSONAPISerializer#serializeAttributes
       * @private
       * @param {Object|Object[]} data input data.
       * @param {Object} options resource's configuration options.
       * @return {Object} serialized attributes.
       */

    }, {
      key: "serializeAttributes",
      value: function serializeAttributes(data, options) {
        if (options.whitelist && options.whitelist.length) {
          data = pick$1(data, options.whitelist);
        } // Support alternativeKey options for relationships


        var alternativeKeys = [];
        Object.keys(options.relationships).forEach(function (key) {
          var rOptions = options.relationships[key];

          if (rOptions.alternativeKey) {
            alternativeKeys.push(rOptions.alternativeKey);
          }
        }); // Remove unwanted keys

        var serializedAttributes = omit$1(data, [options.id].concat(_toConsumableArray(Object.keys(options.relationships)), alternativeKeys, _toConsumableArray(options.blacklist)));

        if (options.convertCase) {
          serializedAttributes = this._convertCase(serializedAttributes, options.convertCase);
        }

        return Object.keys(serializedAttributes).length ? serializedAttributes : undefined;
      }
      /**
       * Serialize 'relationships' key of resource objects: a relationships object describing relationships between the resource and other JSON API resources.
       *
       * @see {@link http://jsonapi.org/format/#document-resource-object-relationships}
       * @method JSONAPISerializer#serializeRelationships
       * @private
       * @param {Object|Object[]} data input data.
       * @param {Object} options resource's configuration options.
       * @param {Map<string:Object>} included.
       * @param {Object} extraData additional data.
       * @return {Object} serialized relationships.
       */

    }, {
      key: "serializeRelationships",
      value: function serializeRelationships(data, options, included, extraData) {
        var _this6 = this;

        var serializedRelationships = {};
        Object.keys(options.relationships).forEach(function (relationship) {
          var relationshipOptions = options.relationships[relationship]; // Support alternativeKey options for relationships

          var relationshipKey = relationship;

          if (!data[relationship] && relationshipOptions.alternativeKey) {
            relationshipKey = relationshipOptions.alternativeKey;
          }

          var serializeRelationship = {
            links: _this6.processOptionsValues(data, extraData, relationshipOptions.links),
            meta: _this6.processOptionsValues(data, extraData, relationshipOptions.meta),
            data: _this6.serializeRelationship(relationshipOptions.type, relationshipOptions.schema, get$1(data, relationshipKey), included, data, extraData)
          }; // Avoid empty relationship object

          if (serializeRelationship.data === undefined && serializeRelationship.links === undefined && serializeRelationship.meta === undefined) {
            serializeRelationship = {
              data: null
            };
          } // Convert case


          relationship = options.convertCase ? _this6._convertCase(relationship, options.convertCase) : relationship;
          serializedRelationships[relationship] = serializeRelationship;
        });
        return Object.keys(serializedRelationships).length ? serializedRelationships : undefined;
      }
      /**
       * Serialize 'data' key of relationship's resource objects.
       *
       * @see {@link http://jsonapi.org/format/#document-resource-object-linkage}
       * @method JSONAPISerializer#serializeRelationship
       * @private
       * @param {string|Function} rType the relationship's type.
       * @param {string} rSchema the relationship's schema
       * @param {Object|Object[]} rData relationship's data.
       * @param {Map<string:Object>} included.
       * @param {Object} the entire resource's data.
       * @param {Object} extraData additional data.
       * @return {Object|Object[]} serialized relationship data.
       */

    }, {
      key: "serializeRelationship",
      value: function serializeRelationship(rType, rSchema, rData, included, data, extraData) {
        var _this7 = this;

        included = included || new Map();
        var schema = rSchema || 'default'; // No relationship data

        if (rData === undefined || rData === null) {
          return rData;
        }

        if (_typeof(rData) === 'object' && isEmpty$1(rData)) {
          // Return [] or null
          return Array.isArray(rData) ? [] : null;
        }

        if (Array.isArray(rData)) {
          return rData.map(function (d) {
            return _this7.serializeRelationship(rType, schema, d, included, data, extraData);
          });
        } // Resolve relationship type


        var type = typeof rType === 'function' ? rType(rData, data) : rType;

        if (!type) {
          throw new Error("No type can be resolved from relationship's data: ".concat(JSON.stringify(rData)));
        }

        if (!this.schemas[type]) {
          throw new Error("No type registered for \"".concat(type, "\""));
        }

        if (!this.schemas[type][schema]) {
          throw new Error("No schema \"".concat(schema, "\" registered for type \"").concat(type, "\""));
        }

        var rOptions = this.schemas[type][schema];
        var serializedRelationship = {
          type: type
        }; // Support for unpopulated relationships (an id, or array of ids)

        if (!isPlainObject$1(rData)) {
          serializedRelationship.id = rData.toString();
        } else {
          // Relationship has been populated
          serializedRelationship.id = rData[rOptions.id].toString();
          included.set("".concat(type, "-").concat(serializedRelationship.id), this.serializeResource(type, rData, rOptions, included, extraData));
        }

        return serializedRelationship;
      }
      /**
       * Process options values.
       * Allows options to be an object or a function with 1 or 2 arguments
       *
       * @method JSONAPISerializer#processOptionsValues
       * @private
       * @param {Object} data data passed to functions options
       * @param {Object} extraData additional data passed to functions options
       * @param {Object} options configuration options.
       * @param {string} fallbackModeIfOneArg fallback mode if only one argument is passed to function.
       * Avoid breaking changes with issue https://github.com/danivek/json-api-serializer/issues/27.
       * @return {Object}
       */

    }, {
      key: "processOptionsValues",
      value: function processOptionsValues(data, extraData, options, fallbackModeIfOneArg) {
        var processedOptions = {};

        if (options && typeof options === 'function') {
          // Backward compatible with functions with one 'extraData' argument
          processedOptions = fallbackModeIfOneArg === 'extraData' && options.length === 1 ? options(extraData) : options(data, extraData);
        } else {
          Object.keys(options).forEach(function (key) {
            var processedValue = {};

            if (options[key] && typeof options[key] === 'function') {
              // Backward compatible with functions with one 'extraData' argument
              processedValue = fallbackModeIfOneArg === 'extraData' && options[key].length === 1 ? options[key](extraData) : options[key](data, extraData);
            } else {
              processedValue = options[key];
            }

            Object.assign(processedOptions, _defineProperty({}, key, processedValue));
          });
        }

        return processedOptions && Object.keys(processedOptions).length ? processedOptions : undefined;
      }
      /**
       * Recursively convert object keys case
       *
       * @method JSONAPISerializer#_convertCase
       * @private
       * @param {Object|Object[]|string} data to convert
       * @param {string} convertCaseOptions can be snake_case', 'kebab-case' or 'camelCase' format.
       * @return {Object}
       */

    }, {
      key: "_convertCase",
      value: function _convertCase(data, convertCaseOptions) {
        var _this8 = this;

        var converted;

        if (_typeof(data) === 'object') {
          converted = transform$1(data, function (result, value, key) {
            if (_typeof(value) === 'object') {
              result[_this8._convertCase(key, convertCaseOptions)] = _this8._convertCase(value, convertCaseOptions);
            } else {
              result[_this8._convertCase(key, convertCaseOptions)] = value;
            }

            return result;
          }, {});
        } else {
          switch (convertCaseOptions) {
            case 'snake_case':
              converted = toSnakeCase$1(data);
              break;

            case 'kebab-case':
              converted = toKebabCase$1(data);
              break;

            case 'camelCase':
              converted = toCamelCase$1(data);
              break;

            default: // Do nothing

          }
        }

        return converted;
      }
    }]);

    return JSONAPISerializer;
  }();

  return JSONAPISerializer_1;

}));
