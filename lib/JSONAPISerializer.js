require('setimmediate');

const {
  pick,
  isEmpty,
  omit,
  isPlainObject,
  isObjectLike,
  transform,
  get,
  set,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  LRU,
} = require('./helpers');

const { validateOptions, validateDynamicTypeOptions, validateError } = require('./validator');

/**
 * JSONAPISerializer class.
 *
 * @example
 * const JSONAPISerializer = require('json-api-serializer');
 *
 * // Create an instance of JSONAPISerializer with default settings
 * const serializer = new JSONAPISerializer();
 * @class JSONAPISerializer
 * @param {Options} [opts] Global options.
 */
module.exports = class JSONAPISerializer {
  constructor(opts) {
    this.opts = opts || {};
    this.schemas = {};

    // Size of cache used for convertCase, 0 results in an infinitely sized cache
    const { convertCaseCacheSize = 5000 } = this.opts;
    // Cache of strings to convert to their converted values per conversion type
    this.convertCaseMap = {
      camelCase: new LRU(convertCaseCacheSize),
      kebabCase: new LRU(convertCaseCacheSize),
      snakeCase: new LRU(convertCaseCacheSize),
    };
  }

  /**
   * Register a resource with its type, schema name, and configuration options.
   *
   * @function JSONAPISerializer#register
   * @param {string} type resource's type.
   * @param {string|Options} [schema='default'] schema name.
   * @param {Options} [options] options.
   */
  register(type, schema, options) {
    if (typeof schema === 'object') {
      options = schema;
      schema = 'default';
    }

    schema = schema || 'default';
    options = { ...this.opts, ...options };

    this.schemas[type] = this.schemas[type] || {};
    this.schemas[type][schema] = validateOptions(options);
  }

  /**
   * Serialze input data to a JSON API compliant response.
   * Input data can be a simple object or an array of objects.
   *
   * @see {@link http://jsonapi.org/format/#document-top-level}
   * @function JSONAPISerializer#serialize
   * @param {string|DynamicTypeOptions} type resource's type as string or a dynamic type options as object.
   * @param {object|object[]} data input data.
   * @param {string|object} [schema='default'] resource's schema name.
   * @param {object} [extraData] additional data that can be used in topLevelMeta options.
   * @param {boolean} [excludeData] boolean that can be set to exclude the `data` property in serialized data.
   * @param {object} [overrideSchemaOptions={}] additional schema options, a map of types with options to override.
   * @returns {object|object[]} serialized data.
   */
  serialize(type, data, schema, extraData, excludeData, overrideSchemaOptions = {}) {
    // Support optional arguments (schema)
    if (arguments.length === 3) {
      if (typeof schema === 'object') {
        extraData = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraData = extraData || {};

    const included = new Map();
    const isDynamicType = typeof type === 'object';
    const options = this._getSchemaOptions(type, schema, overrideSchemaOptions);

    let dataProperty;

    if (excludeData) {
      dataProperty = undefined;
    } else if (isDynamicType) {
      dataProperty = this.serializeMixedResource(
        options,
        data,
        included,
        extraData,
        overrideSchemaOptions
      );
    } else {
      dataProperty = this.serializeResource(
        type,
        data,
        options,
        included,
        extraData,
        overrideSchemaOptions
      );
    }

    return {
      jsonapi: options.jsonapiObject ? { version: '1.0' } : undefined,
      meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
      links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
      data: dataProperty,
      included: included.size ? [...included.values()] : undefined,
    };
  }

  /**
   * Asynchronously serialize input data to a JSON API compliant response.
   * Input data can be a simple object or an array of objects.
   *
   * @see {@link http://jsonapi.org/format/#document-top-level}
   * @function JSONAPISerializer#serializeAsync
   * @param {string|DynamicTypeOptions} type resource's type as string or a dynamic type options as object.
   * @param {object|object[]} data input data.
   * @param {string} [schema='default'] resource's schema name.
   * @param {object} [extraData] additional data that can be used in topLevelMeta options.
   * @param {boolean} [excludeData] boolean that can be set to exclude the `data` property in serialized data.
   * @param {object} [overrideSchemaOptions={}] additional schema options, a map of types with options to override.
   * @returns {Promise} resolves with serialized data.
   */
  serializeAsync(type, data, schema, extraData, excludeData, overrideSchemaOptions = {}) {
    // Support optional arguments (schema)
    if (arguments.length === 3) {
      if (typeof schema === 'object') {
        extraData = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraData = extraData || {};

    const included = new Map();
    const isDataArray = Array.isArray(data);
    const isDynamicType = typeof type === 'object';
    const arrayData = isDataArray ? data : [data];
    const serializedData = [];
    const that = this;
    let i = 0;
    const options = this._getSchemaOptions(type, schema, overrideSchemaOptions);

    return new Promise((resolve, reject) => {
      /**
       * Non-blocking serialization using the immediate queue.
       *
       * @see {@link https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/}
       */
      function next() {
        setImmediate(() => {
          if (excludeData) {
            return resolve();
          }
          if (i >= arrayData.length) {
            return resolve(serializedData);
          }

          try {
            // Serialize a single item of the data-array.
            const serializedItem = isDynamicType
              ? that.serializeMixedResource(
                  type,
                  arrayData[i],
                  included,
                  extraData,
                  overrideSchemaOptions
                )
              : that.serializeResource(
                  type,
                  arrayData[i],
                  options,
                  included,
                  extraData,
                  overrideSchemaOptions
                );

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
    }).then((result) => {
      let dataProperty;

      if (typeof result === 'undefined') {
        dataProperty = undefined;
      } else if (isDataArray) {
        dataProperty = result;
      } else {
        dataProperty = result[0] || null;
      }

      return {
        jsonapi: options.jsonapiObject ? { version: '1.0' } : undefined,
        meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
        links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
        // If the source data was an array, we just pass the serialized data array.
        // Otherwise we try to take the first (and only) item of it or pass null.
        data: dataProperty,
        included: included.size ? [...included.values()] : undefined,
      };
    });
  }

  /**
   * Deserialize JSON API document data.
   * Input data can be a simple object or an array of objects.
   *
   * @function JSONAPISerializer#deserialize
   * @param {string|DynamicTypeOptions} type resource's type as string or a dynamic type options as object.
   * @param {object} data JSON API input data.
   * @param {string} [schema='default'] resource's schema name.
   * @returns {object} deserialized data.
   */
  deserialize(type, data, schema) {
    schema = schema || 'default';

    if (typeof type === 'object') {
      type = validateDynamicTypeOptions(type);
    } else {
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }
    }

    let deserializedData = {};

    if (data.data) {
      deserializedData = Array.isArray(data.data)
        ? data.data.map((resource) =>
            this.deserializeResource(type, resource, schema, data.included)
          )
        : this.deserializeResource(type, data.data, schema, data.included);
    }

    return deserializedData;
  }

  /**
   * Asynchronously Deserialize JSON API document data.
   * Input data can be a simple object or an array of objects.
   *
   * @function JSONAPISerializer#deserializeAsync
   * @param {string|DynamicTypeOptions} type resource's type as string or a dynamic type options as object.
   * @param {object} data JSON API input data.
   * @param {string} [schema='default'] resource's schema name.
   * @returns {Promise} resolves with serialized data.
   */
  deserializeAsync(type, data, schema) {
    schema = schema || 'default';

    if (typeof type === 'object') {
      type = validateDynamicTypeOptions(type);
    } else {
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }
    }

    const isDataArray = Array.isArray(data.data);
    let i = 0;
    const arrayData = isDataArray ? data.data : [data.data];
    const deserializedData = [];
    const that = this;

    return new Promise((resolve, reject) => {
      /**
       * Non-blocking deserialization using the immediate queue.
       *
       * @see {@link https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/}
       */
      function next() {
        setImmediate(() => {
          if (i >= arrayData.length) {
            return resolve(isDataArray ? deserializedData : deserializedData[0]);
          }

          try {
            // Serialize a single item of the data-array.
            const deserializedItem = that.deserializeResource(
              type,
              arrayData[i],
              schema,
              data.included
            );

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
   *  - An `Error` or an array of `Error` instances.
   *  - A JSON API error object or an array of JSON API error objects.
   *
   * @see {@link http://jsonapi.org/format/#errors}
   * @function JSONAPISerializer#serializeError
   * @param {Error|Error[]|object|object[]} error an Error, an array of Error, a JSON API error object, an array of JSON API error object.
   * @returns {object} resolves with serialized error.
   */
  serializeError(error) {
    return {
      errors: Array.isArray(error)
        ? error.map((err) => validateError(err))
        : [validateError(error)],
    };
  }

  /**
   * Deserialize a single JSON API resource.
   * Input data must be a simple object.
   *
   * @function JSONAPISerializer#deserializeResource
   * @private
   * @param {string|DynamicTypeOptions} type resource's type as string or an object with a dynamic type resolved from data.
   * @param {object} data JSON API resource data.
   * @param {string} [schema='default'] resource's schema name.
   * @param {Map<string, object>} included Included resources.
   * @param {string[]} lineage resource identifiers already deserialized to prevent circular references.
   * @returns {object} deserialized data.
   */
  deserializeResource(type, data, schema = 'default', included, lineage = []) {
    if (typeof type === 'object') {
      type = typeof type.type === 'function' ? type.type(data) : get(data, type.type);
    }

    if (!type) {
      throw new Error(`No type can be resolved from data: ${JSON.stringify(data)}`);
    }

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    const options = this.schemas[type][schema];

    let deserializedData = {};
    if (data.id !== undefined) {
      deserializedData[options.id] = data.id;
    }

    if (data.attributes && options.whitelistOnDeserialize.length) {
      data.attributes = pick(data.attributes, options.whitelistOnDeserialize);
    }

    if (data.attributes && options.blacklistOnDeserialize.length) {
      data.attributes = omit(data.attributes, options.blacklistOnDeserialize);
    }

    Object.assign(deserializedData, data.attributes);

    // Deserialize relationships
    if (data.relationships) {
      Object.keys(data.relationships).forEach((relationshipProperty) => {
        const relationship = data.relationships[relationshipProperty];
        const relationshipType = this._getRelationshipDataType(relationship.data);

        const relationshipKey = options.unconvertCase
          ? this._convertCase(relationshipProperty, options.unconvertCase)
          : relationshipProperty;

        const relationshipOptions =
          options.relationships[relationshipKey] || this.schemas[relationshipType];

        const deserializeFunction = (relationshipData) => {
          if (relationshipOptions && relationshipOptions.deserialize) {
            return relationshipOptions.deserialize(relationshipData);
          }
          return relationshipData.id;
        };

        if (relationship.data !== undefined) {
          if (relationship.data === null) {
            // null data
            set(
              deserializedData,
              (relationshipOptions && relationshipOptions.alternativeKey) || relationshipKey,
              null
            );
          } else {
            if ((relationshipOptions && relationshipOptions.alternativeKey) || !included) {
              set(
                deserializedData,
                (relationshipOptions && relationshipOptions.alternativeKey) || relationshipKey,
                Array.isArray(relationship.data)
                  ? relationship.data.map((d) => deserializeFunction(d))
                  : deserializeFunction(relationship.data)
              );
            }

            if (included) {
              const deserializeIncludedRelationship = (relationshipData) => {
                const lineageCopy = [...lineage];
                // Prevent circular relationships
                const lineageKey = `${relationshipData.type}-${relationshipData.id}`;
                const isCircular = lineageCopy.includes(lineageKey);

                if (isCircular) {
                  return deserializeFunction(relationshipData);
                }

                lineageCopy.push(lineageKey);
                return this.deserializeIncluded(
                  relationshipData.type,
                  relationshipData.id,
                  relationshipOptions,
                  included,
                  lineageCopy,
                  deserializeFunction
                );
              };

              const deserializedIncludedRelationship = Array.isArray(relationship.data)
                ? relationship.data.map((d) => deserializeIncludedRelationship(d))
                : deserializeIncludedRelationship(relationship.data);

              // not set to deserializedData if alternativeKey is set and relationship data is not in the included array (value is the same as alternativeKey value)
              if (
                !(
                  relationshipOptions &&
                  relationshipOptions.alternativeKey &&
                  deserializedIncludedRelationship.toString() ===
                    get(deserializedData, relationshipOptions.alternativeKey).toString()
                )
              ) {
                set(deserializedData, relationshipKey, deserializedIncludedRelationship);
              }
            }
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

    if (options.afterDeserialize) {
      return options.afterDeserialize(deserializedData);
    }

    return deserializedData;
  }

  /**
   * Deserialize included
   *
   * @function JSONAPISerializer#deserializeIncluded
   * @private
   * @param {string} type resource's type as string or an object with a dynamic type resolved from data.
   * @param {string} id identifier of the resource.
   * @param {RelationshipOptions} relationshipOpts relationship option.
   * @param {Map<string, object>} included Included resources.
   * @param {string[]} lineage resource identifiers already deserialized to prevent circular references.
   * @param {Function} deserializeFunction a deserialize function
   * @returns {object} deserialized data.
   */
  deserializeIncluded(type, id, relationshipOpts, included, lineage, deserializeFunction) {
    const includedResource = included.find(
      (resource) => resource.type === type && resource.id === id
    );

    if (!includedResource) {
      return deserializeFunction({ type, id });
    }

    if (!relationshipOpts) {
      throw new Error(`No type registered for ${type}`);
    }

    return this.deserializeResource(
      type,
      includedResource,
      relationshipOpts.schema,
      included,
      lineage
    );
  }

  /**
   * Serialize resource objects.
   *
   * @see {@link http://jsonapi.org/format/#document-resource-objects}
   * @function JSONAPISerializer#serializeDocument
   * @private
   * @param {string} type resource's type.
   * @param {object|object[]} data input data.
   * @param {Options} options resource's configuration options.
   * @param {Map<string, object>} [included] Included resources.
   * @param {object} [extraData] additional data.
   * @param {object} [overrideSchemaOptions={}] additional schema options, a map of types with options to override.
   * @returns {object|object[]} serialized data.
   */
  serializeResource(type, data, options, included, extraData, overrideSchemaOptions = {}) {
    if (isEmpty(data)) {
      // Return [] or null
      return Array.isArray(data) ? data : null;
    }

    if (Array.isArray(data)) {
      return data.map((d) =>
        this.serializeResource(type, d, options, included, extraData, overrideSchemaOptions)
      );
    }

    if (options.beforeSerialize) {
      data = options.beforeSerialize(data);
    }

    return {
      type,
      id: data[options.id] ? data[options.id].toString() : undefined,
      attributes: this.serializeAttributes(data, options),
      relationships: this.serializeRelationships(
        data,
        options,
        included,
        extraData,
        overrideSchemaOptions
      ),
      meta: this.processOptionsValues(data, extraData, options.meta),
      links: this.processOptionsValues(data, extraData, options.links),
    };
  }

  /**
   * Serialize mixed resource object with a dynamic type resolved from data
   *
   * @see {@link http://jsonapi.org/format/#document-resource-objects}
   * @function JSONAPISerializer#serializeMixedResource
   * @private
   * @param {DynamicTypeOptions} typeOption a dynamic type options.
   * @param {object|object[]} data input data.
   * @param {Map<string, object>} [included] Included resources.
   * @param {object} [extraData] additional data.
   * @param {object} [overrideSchemaOptions={}] additional schema options, a map of types with options to override.
   * @returns {object|object[]} serialized data.
   */
  serializeMixedResource(typeOption, data, included, extraData, overrideSchemaOptions = {}) {
    if (isEmpty(data)) {
      // Return [] or null
      return Array.isArray(data) ? data : null;
    }

    if (Array.isArray(data)) {
      return data.map((d) =>
        this.serializeMixedResource(typeOption, d, included, extraData, overrideSchemaOptions)
      );
    }

    // Resolve type from data (can be a string or a function deriving a type-string from each data-item)
    const type =
      typeof typeOption.type === 'function' ? typeOption.type(data) : get(data, typeOption.type);

    if (!type) {
      throw new Error(`No type can be resolved from data: ${JSON.stringify(data)}`);
    }

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    const options = this._getSchemaOptions(type, 'default', overrideSchemaOptions);

    return this.serializeResource(type, data, options, included, extraData, overrideSchemaOptions);
  }

  /**
   * Serialize 'attributes' key of resource objects: an attributes object representing some of the resource's data.
   *
   * @see {@link http://jsonapi.org/format/#document-resource-object-attributes}
   * @function JSONAPISerializer#serializeAttributes
   * @private
   * @param {object|object[]} data input data.
   * @param {Options} options resource's configuration options.
   * @returns {object} serialized attributes.
   */
  serializeAttributes(data, options) {
    if (options.whitelist && options.whitelist.length) {
      data = pick(data, options.whitelist);
    }

    // Support alternativeKey options for relationships
    const alternativeKeys = [];
    Object.keys(options.relationships).forEach((key) => {
      const rOptions = options.relationships[key];
      if (rOptions.alternativeKey) {
        alternativeKeys.push(rOptions.alternativeKey);
      }
    });

    // Remove unwanted keys
    let serializedAttributes = omit(data, [
      options.id,
      ...Object.keys(options.relationships),
      ...alternativeKeys,
      ...options.blacklist,
    ]);

    if (options.convertCase) {
      serializedAttributes = this._convertCase(serializedAttributes, options.convertCase);
    }

    return Object.keys(serializedAttributes).length ? serializedAttributes : undefined;
  }

  /**
   * Serialize 'relationships' key of resource objects: a relationships object describing relationships between the resource and other JSON API resources.
   *
   * @see {@link http://jsonapi.org/format/#document-resource-object-relationships}
   * @function JSONAPISerializer#serializeRelationships
   * @private
   * @param {object|object[]} data input data.
   * @param {Options} options resource's configuration options.
   * @param {Map<string, object>} [included]  Included resources.
   * @param {object} [extraData] additional data.
   * @param {object} [overrideSchemaOptions={}] additional schema options, a map of types with options to override.
   * @returns {object} serialized relationships.
   */
  serializeRelationships(data, options, included, extraData, overrideSchemaOptions = {}) {
    const serializedRelationships = {};

    Object.keys(options.relationships).forEach((relationship) => {
      const relationshipOptions = options.relationships[relationship];

      // Support alternativeKey options for relationships
      let relationshipKey = relationship;
      if (!data[relationship] && relationshipOptions.alternativeKey) {
        relationshipKey = relationshipOptions.alternativeKey;
      }

      const serializeRelationship = {
        links: this.processOptionsValues(data, extraData, relationshipOptions.links),
        meta: this.processOptionsValues(data, extraData, relationshipOptions.meta),
        data: this.serializeRelationship(
          relationshipOptions.type,
          relationshipOptions.schema,
          get(data, relationshipKey),
          included,
          data,
          extraData,
          overrideSchemaOptions
        ),
      };

      if (
        serializeRelationship.data !== undefined ||
        serializeRelationship.links !== undefined ||
        serializeRelationship.meta !== undefined
      ) {
        // Convert case
        relationship = options.convertCase
          ? this._convertCase(relationship, options.convertCase)
          : relationship;

        serializedRelationships[relationship] = serializeRelationship;
      }
    });

    return Object.keys(serializedRelationships).length ? serializedRelationships : undefined;
  }

  /**
   * Serialize 'data' key of relationship's resource objects.
   *
   * @see {@link http://jsonapi.org/format/#document-resource-object-linkage}
   * @function JSONAPISerializer#serializeRelationship
   * @private
   * @param {string|Function} rType the relationship's type.
   * @param {string} rSchema the relationship's schema
   * @param {object|object[]} rData relationship's data.
   * @param {Map<string, object>} [included] Included resources.
   * @param {object} [data] the entire resource's data.
   * @param {object} [extraData] additional data.
   * @param {object} [overrideSchemaOptions={}] additional schema options, a map of types with options to override.
   * @returns {object|object[]} serialized relationship data.
   */
  serializeRelationship(
    rType,
    rSchema,
    rData,
    included,
    data,
    extraData,
    overrideSchemaOptions = {}
  ) {
    included = included || new Map();
    const schema = rSchema || 'default';

    // No relationship data
    if (rData === undefined || rData === null) {
      return rData;
    }

    if (typeof rData === 'object' && isEmpty(rData)) {
      // Return [] or null
      return Array.isArray(rData) ? [] : null;
    }

    if (Array.isArray(rData)) {
      return rData.map((d) =>
        this.serializeRelationship(
          rType,
          schema,
          d,
          included,
          data,
          extraData,
          overrideSchemaOptions
        )
      );
    }

    // Resolve relationship type
    const type = typeof rType === 'function' ? rType(rData, data) : rType;

    if (!type) {
      throw new Error(`No type can be resolved from relationship's data: ${JSON.stringify(rData)}`);
    }

    if (!this.schemas[type]) {
      throw new Error(`No type registered for "${type}"`);
    }

    if (!this.schemas[type][schema]) {
      throw new Error(`No schema "${schema}" registered for type "${type}"`);
    }

    let rOptions = this.schemas[type][schema];

    if (overrideSchemaOptions[type]) {
      // Merge default (registered) options and extra options into new options object
      rOptions = { ...rOptions, ...overrideSchemaOptions[type] };
    }

    const serializedRelationship = { type };

    // Support for unpopulated relationships (an id, or array of ids)
    if (!isObjectLike(rData)) {
      serializedRelationship.id = rData.toString();
    } else {
      const serializedIncluded = this.serializeResource(
        type,
        rData,
        rOptions,
        included,
        extraData,
        overrideSchemaOptions
      );

      serializedRelationship.id = serializedIncluded.id;
      const identifier = `${type}-${serializedRelationship.id}`;

      // Not include relationship object which only contains an id
      if (
        (serializedIncluded.attributes && Object.keys(serializedIncluded.attributes).length) ||
        (serializedIncluded.relationships && Object.keys(serializedIncluded.relationships).length)
      ) {
        // Merge relationships data if already included
        if (included.has(identifier)) {
          const alreadyIncluded = included.get(identifier);

          if (serializedIncluded.relationships) {
            alreadyIncluded.relationships = {
              ...alreadyIncluded.relationships,
              ...serializedIncluded.relationships,
            };
            included.set(identifier, alreadyIncluded);
          }
        } else {
          included.set(identifier, serializedIncluded);
        }
      }
    }
    return serializedRelationship;
  }

  /**
   * Process options values.
   * Allows options to be an object or a function with 1 or 2 arguments
   *
   * @function JSONAPISerializer#processOptionsValues
   * @private
   * @param {object} data data passed to functions options.
   * @param {object} extraData additional data passed to functions options.
   * @param {object} options configuration options.
   * @param {string} [fallbackModeIfOneArg] fallback mode if only one argument is passed to function.
   * Avoid breaking changes with issue https://github.com/danivek/json-api-serializer/issues/27.
   * @returns {object} processed options.
   */
  processOptionsValues(data, extraData, options, fallbackModeIfOneArg) {
    let processedOptions = {};
    if (options && typeof options === 'function') {
      // Backward compatible with functions with one 'extraData' argument
      processedOptions =
        fallbackModeIfOneArg === 'extraData' && options.length === 1
          ? options(extraData)
          : options(data, extraData);
    } else {
      Object.keys(options).forEach((key) => {
        let processedValue = {};
        if (options[key] && typeof options[key] === 'function') {
          // Backward compatible with functions with one 'extraData' argument
          processedValue =
            fallbackModeIfOneArg === 'extraData' && options[key].length === 1
              ? options[key](extraData)
              : options[key](data, extraData);
        } else {
          processedValue = options[key];
        }
        Object.assign(processedOptions, { [key]: processedValue });
      });
    }

    return processedOptions && Object.keys(processedOptions).length ? processedOptions : undefined;
  }

  /**
   * Get the schema options for the given type and optional schema.
   *
   * @function JSONAPISerializer#_getSchemaOptions
   * @private
   * @param {string|object} [type] the type to get schema options for.
   * @param {schema} [schema] the schema name to get options for.
   * @param {object} [overrideSchemaOptions] optional options to override schema options.
   * @returns {object} the schema options for the given type.
   */
  _getSchemaOptions(type, schema, overrideSchemaOptions = {}) {
    const isDynamicType = typeof type === 'object';
    const overrideType = isDynamicType ? type.type : type;
    const overrideOptions = { ...(overrideSchemaOptions[overrideType] || {}) };

    if (isDynamicType) {
      return validateDynamicTypeOptions(type);
    }

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error(`No schema ${schema} registered for ${type}`);
    }

    return { ...this.schemas[type][schema], ...overrideOptions };
  }

  _getRelationshipDataType(data) {
    if (data === null || typeof data === 'undefined') {
      return null;
    }

    if (Array.isArray(data)) {
      return get(data[0], 'type');
    }

    return data.type;
  }

  /**
   * Recursively convert object keys case
   *
   * @function JSONAPISerializer#_convertCase
   * @private
   * @param {object|object[]|string} data to convert
   * @param {string} convertCaseOptions can be snake_case', 'kebab-case' or 'camelCase' format.
   * @returns {object} Object with it's keys converted as per the convertCaseOptions
   */
  _convertCase(data, convertCaseOptions) {
    if (Array.isArray(data)) {
      return data.map((item) => {
        if (item && (Array.isArray(item) || isPlainObject(item))) {
          return this._convertCase(item, convertCaseOptions);
        }
        return item;
      });
    }

    if (isPlainObject(data)) {
      return transform(
        data,
        (result, value, key) => {
          let converted;
          if (value && (Array.isArray(value) || isPlainObject(value))) {
            converted = this._convertCase(value, convertCaseOptions);
          } else {
            converted = value;
          }

          result[this._convertCase(key, convertCaseOptions)] = converted;
          return result;
        },
        {}
      );
    }

    if (typeof data === 'string') {
      let converted;

      switch (convertCaseOptions) {
        case 'snake_case':
          converted = this.convertCaseMap.snakeCase.get(data);
          if (!converted) {
            converted = toSnakeCase(data);
            this.convertCaseMap.snakeCase.set(data, converted);
          }
          break;
        case 'kebab-case':
          converted = this.convertCaseMap.kebabCase.get(data);
          if (!converted) {
            converted = toKebabCase(data);
            this.convertCaseMap.kebabCase.set(data, converted);
          }
          break;
        case 'camelCase':
          converted = this.convertCaseMap.camelCase.get(data);
          if (!converted) {
            converted = toCamelCase(data);
            this.convertCaseMap.camelCase.set(data, converted);
          }
          break;
        default: // Do nothing
      }

      return converted;
    }

    return data;
  }
};

/**
 * @typedef {object} Options
 * @property {string} [id='id'] the key to use as the reference. Default = 'id'
 * @property {string[]} [blacklist=[]] an array of blacklisted attributes. Default = []
 * @property {string[]} [whitelist=[]] an array of whitelisted attributes. Default = []
 * @property {boolean} [jsonapiObject=true] enable/Disable JSON API Object. Default = true
 * @property {Function|object} [links] describes the links inside data
 * @property {Function|object} [topLevelLinks] describes the top-level links
 * @property {Function|object} [topLevelMeta] describes the top-level meta
 * @property {Function|object} [meta] describes resource-level meta
 * @property {object.<string, RelationshipOptions>} [relationships] an object defining some relationships
 * @property {string[]} [blacklistOnDeserialize=[]] an array of blacklisted attributes. Default = []
 * @property {string[]} [whitelistOnDeserialize=[]] an array of whitelisted attributes. Default = []
 * @property {('kebab-case'|'snake_case'|'camelCase')} [convertCase] case conversion for serializing data
 * @property {('kebab-case'|'snake_case'|'camelCase')} [unconvertCase] case conversion for deserializing data
 * @property {number} [convertCaseCacheSize=5000] When using convertCase, a LRU cache is utilized for optimization. The default size of the cache is 5000 per conversion type.
 * @property {Function} [beforeSerialize] a function to transform data before serialization.
 * @property {Function} [afterDeserialize] a function to transform data after deserialization.
 */

/**
 * @typedef {object} RelationshipOptions
 * @property {string|Function} type a string or a function for the type to use for serializing the relationship (type need to be register)
 * @property {string} [alternativeKey] an alternative key (string or path) to use if relationship key not exist (example: 'author_id' as an alternative key for 'author' relationship)
 * @property {string} [schema] a custom schema for serializing the relationship. If no schema define, it use the default one.
 * @property {Function|object} [links] describes the links for the relationship
 * @property {Function|object} [meta] describes meta that contains non-standard meta-information about the relationship
 * @property {Function} [deserialize] describes the function which should be used to deserialize a related property which is not included in the JSON:API document
 */

/**
 *
 * @typedef {object} DynamicTypeOptions
 * @property {string} id a string for the path to the key to use to determine type or a function deriving a type-string from each data-item.
 * @property {boolean} [jsonapiObject=true] enable/Disable JSON API Object.
 * @property {Function|object} [topLevelLinks] describes the top-level links
 * @property {Function|object} [topLevelMeta] describes the top-level meta.
 */
