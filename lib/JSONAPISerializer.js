const {
  pick,
  isEmpty,
  omit,
  isPlainObject,
  transform,
  get,
  set,
  toCamelCase,
  toKebabCase,
  toSnakeCase
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
 *
 * @class JSONAPISerializer
 * @param {Object} [opts] Global options.
 */
module.exports = class JSONAPISerializer {
  constructor(opts) {
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
  register(type, schema, options) {
    if (isPlainObject(schema)) {
      options = schema;
      schema = 'default';
    }

    schema = schema || 'default';
    options = Object.assign({}, this.opts, options);

    this.schemas[type] = this.schemas[type] || {};
    this.schemas[type][schema] = validateOptions(options);
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
  serialize(type, data, schema, extraData) {
    // Support optional arguments (schema)
    if (arguments.length === 3) {
      if (isPlainObject(schema)) {
        extraData = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraData = extraData || {};

    const included = new Map();
    const isDynamicType = isPlainObject(type);
    let options;

    if (isDynamicType) {
      // Dynamic type option
      options = validateDynamicTypeOptions(type);
    } else {
      // Serialize data with the defined type
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }

      options = this.schemas[type][schema];
    }

    return {
      jsonapi: options.jsonapiObject ? { version: '1.0' } : undefined,
      meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
      links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
      data: isDynamicType
        ? this.serializeMixedResource(options, data, included, extraData)
        : this.serializeResource(type, data, options, included, extraData),
      included: included.size ? [...included.values()] : undefined
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
  serializeAsync(type, data, schema, extraData) {
    // Support optional arguments (schema)
    if (arguments.length === 3) {
      if (isPlainObject(schema)) {
        extraData = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraData = extraData || {};

    const included = new Map();
    const isDataArray = Array.isArray(data);
    const isDynamicType = isPlainObject(type);
    const arrayData = isDataArray ? data : [data];
    const serializedData = [];
    const that = this;
    let i = 0;
    let options;

    if (isDynamicType) {
      options = validateDynamicTypeOptions(type);
    } else {
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }

      options = this.schemas[type][schema];
    }

    return new Promise((resolve, reject) => {
      function next() {
        setImmediate(() => {
          if (i >= arrayData.length) {
            return resolve(serializedData);
          }

          try {
            // Serialize a single item of the data-array.
            const serializedItem = isDynamicType
              ? that.serializeMixedResource(type, arrayData[i], included, extraData)
              : that.serializeResource(type, arrayData[i], options, included, extraData);

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
    }).then(result => ({
      jsonapi: options.jsonapiObject ? { version: '1.0' } : undefined,
      meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
      links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
      // If the source data was an array, we just pass the serialized data array.
      // Otherwise we try to take the first (and only) item of it or pass null.
      data: isDataArray ? result : result[0] || null,
      included: included.size ? [...included.values()] : undefined
    }));
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
  deserialize(type, data, schema) {
    schema = schema || 'default';

    if (isPlainObject(type)) {
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
        ? data.data.map(resource => this.deserializeResource(type, resource, schema, data.included))
        : this.deserializeResource(type, data.data, schema, data.included);
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
  deserializeAsync(type, data, schema) {
    schema = schema || 'default';

    if (isPlainObject(type)) {
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
   *  - An Error or an array of Error.
   *  - A JSON API error object or an array of JSON API error object.
   *
   * @see {@link http://jsonapi.org/format/#errors}
   * @method JSONAPISerializer#serializeError
   * @param {Error|Error[]|Object|Object[]} error an Error, an array of Error, a JSON API error object, an array of JSON API error object
   * @return {Promise} resolves with serialized error.
   */
  serializeError(error) {
    function convertToError(err) {
      let serializedError;

      if (err instanceof Error) {
        const status = err.status || err.statusCode;

        serializedError = {
          status: status && status.toString(),
          code: err.code,
          detail: err.message
        };
      } else {
        serializedError = validateError(err);
      }

      return serializedError;
    }

    return {
      errors: Array.isArray(error) ? error.map(err => convertToError(err)) : [convertToError(error)]
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
  deserializeResource(type, data, schema, included) {
    if (isPlainObject(type)) {
      type = typeof type.type === 'function' ? type.type(data) : get(data, type.type);

      if (!type) {
        throw new Error(`No type can be resolved from data: ${JSON.stringify(data)}`);
      }

      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      schema = 'default';
    }

    const options = this.schemas[type][schema];

    let deserializedData = {};
    deserializedData[options.id] = data.id || undefined;

    if (data.attributes && options.whitelistOnDeserialize.length) {
      data.attributes = pick(data.attributes, options.whitelistOnDeserialize);
    }

    if (data.attributes && options.blacklistOnDeserialize.length) {
      data.attributes = omit(data.attributes, options.blacklistOnDeserialize);
    }

    Object.assign(deserializedData, data.attributes);

    // Deserialize relationships
    if (data.relationships) {
      Object.keys(data.relationships).forEach(relationshipProperty => {
        const relationship = data.relationships[relationshipProperty];

        let relationshipKey = options.unconvertCase
          ? this._convertCase(relationshipProperty, options.unconvertCase)
          : relationshipProperty;

        // Support alternativeKey options for relationships
        if (
          options.relationships[relationshipKey] &&
          options.relationships[relationshipKey].alternativeKey
        ) {
          relationshipKey = options.relationships[relationshipKey].alternativeKey;
        }

        const deserializeFunction = relationshipData => {
          if (
            options.relationships[relationshipKey] &&
            options.relationships[relationshipProperty].deserialize
          ) {
            return options.relationships[relationshipProperty].deserialize(relationshipData);
          }
          return relationshipData.id;
        };

        if (relationship.data !== undefined) {
          if (Array.isArray(relationship.data)) {
            set(
              deserializedData,
              relationshipKey,
              relationship.data.map(d =>
                included
                  ? this.deserializeIncluded(
                      d.type,
                      d.id,
                      options.relationships[relationshipProperty],
                      included
                    )
                  : deserializeFunction(d)
              )
            );
          } else if (relationship.data === null) {
            // null data
            set(deserializedData, relationshipKey, null);
          } else {
            set(
              deserializedData,
              relationshipKey,
              included
                ? this.deserializeIncluded(
                    relationship.data.type,
                    relationship.data.id,
                    options.relationships[relationshipProperty],
                    included
                  )
                : deserializeFunction(relationship.data)
            );
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

  deserializeIncluded(type, id, relationshipOpts, included) {
    const includedResource = included.find(
      resource => resource.type === type && resource.id === id
    );

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
  serializeResource(type, data, options, included, extraData) {
    if (isEmpty(data)) {
      // Return [] or null
      return Array.isArray(data) ? data : null;
    }

    if (Array.isArray(data)) {
      return data.map(d => this.serializeResource(type, d, options, included, extraData));
    }

    return {
      type,
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
  serializeMixedResource(typeOption, data, included, extraData) {
    if (isEmpty(data)) {
      // Return [] or null
      return Array.isArray(data) ? data : null;
    }

    if (Array.isArray(data)) {
      return data.map(d => this.serializeMixedResource(typeOption, d, included, extraData));
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

    return this.serializeResource(type, data, this.schemas[type].default, included, extraData);
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
  serializeAttributes(data, options) {
    if (options.whitelist && options.whitelist.length) {
      data = pick(data, options.whitelist);
    }

    // Support alternativeKey options for relationships
    const alternativeKeys = [];
    Object.keys(options.relationships).forEach(key => {
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
      ...options.blacklist
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
   * @method JSONAPISerializer#serializeRelationships
   * @private
   * @param {Object|Object[]} data input data.
   * @param {Object} options resource's configuration options.
   * @param {Map<string:Object>} included.
   * @param {Object} extraData additional data.
   * @return {Object} serialized relationships.
   */
  serializeRelationships(data, options, included, extraData) {
    const serializedRelationships = {};

    Object.keys(options.relationships).forEach(relationship => {
      const relationshipOptions = options.relationships[relationship];

      // Support alternativeKey options for relationships
      let relationshipKey = relationship;
      if (!data[relationship] && relationshipOptions.alternativeKey) {
        relationshipKey = relationshipOptions.alternativeKey;
      }

      let serializeRelationship = {
        links: this.processOptionsValues(data, extraData, relationshipOptions.links),
        meta: this.processOptionsValues(data, extraData, relationshipOptions.meta),
        data: this.serializeRelationship(
          relationshipOptions.type,
          relationshipOptions.schema,
          get(data, relationshipKey),
          included,
          data,
          extraData
        )
      };

      // Avoid empty relationship object
      if (
        serializeRelationship.data === undefined &&
        serializeRelationship.links === undefined &&
        serializeRelationship.meta === undefined
      ) {
        serializeRelationship = {
          data: null
        };
      }

      // Convert case
      relationship = options.convertCase
        ? this._convertCase(relationship, options.convertCase)
        : relationship;

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
  serializeRelationship(rType, rSchema, rData, included, data, extraData) {
    included = included || new Map();
    const schema = rSchema || 'default';

    // No relationship data
    if (rData === undefined || rData === null) {
      return rData;
    }

    if (isPlainObject(rData) && isEmpty(rData)) {
      // Return [] or null
      return Array.isArray(rData) ? [] : null;
    }

    if (Array.isArray(rData)) {
      return rData.map(d =>
        this.serializeRelationship(rType, schema, d, included, data, extraData)
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

    const rOptions = this.schemas[type][schema];
    const serializedRelationship = { type };

    // Support for unpopulated relationships (an id, or array of ids)
    if (!isPlainObject(rData)) {
      serializedRelationship.id = rData.toString();
    } else {
      // Relationship has been populated
      serializedRelationship.id = rData[rOptions.id].toString();
      included.set(
        `${type}-${serializedRelationship.id}`,
        this.serializeResource(type, rData, rOptions, included, extraData)
      );
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
  processOptionsValues(data, extraData, options, fallbackModeIfOneArg) {
    let processedOptions = {};
    if (options && typeof options === 'function') {
      // Backward compatible with functions with one 'extraData' argument
      processedOptions =
        fallbackModeIfOneArg === 'extraData' && options.length === 1
          ? options(extraData)
          : options(data, extraData);
    } else {
      Object.keys(options).forEach(key => {
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
   * Recursively convert object keys case
   *
   * @method JSONAPISerializer#_convertCase
   * @private
   * @param {Object|Object[]|string} data to convert
   * @param {string} convertCaseOptions can be snake_case', 'kebab-case' or 'camelCase' format.
   * @return {Object}
   */
  _convertCase(data, convertCaseOptions) {
    let converted;
    if (isPlainObject(data)) {
      converted = transform(
        data,
        (result, value, key) => {
          if (isPlainObject(value)) {
            result[this._convertCase(key, convertCaseOptions)] = this._convertCase(
              value,
              convertCaseOptions
            );
          } else {
            result[this._convertCase(key, convertCaseOptions)] = value;
          }
          return result;
        },
        {}
      );
    } else {
      switch (convertCaseOptions) {
        case 'snake_case':
          converted = toSnakeCase(data);
          break;
        case 'kebab-case':
          converted = toKebabCase(data);
          break;
        case 'camelCase':
          converted = toCamelCase(data);
          break;
        default: // Do nothing
      }
    }

    return converted;
  }
};
