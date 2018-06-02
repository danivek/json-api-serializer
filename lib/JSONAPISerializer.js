'use strict';

const _get = require('lodash/get');
const _set = require('lodash/set');
const _pick = require('lodash/pick');
const _difference = require('lodash/difference');
const _isPlainObject = require('lodash/isPlainObject');
const _find = require('lodash/find');
const _isEmpty = require('lodash/isEmpty');
const _uniqWith = require('lodash/uniqWith');
const _isEqual = require('lodash/isEqual');
const _isObjectLike = require('lodash/isObjectLike');
const _omitBy = require('lodash/omitBy');
const _isUndefined = require('lodash/isUndefined');
const _transform = require('lodash/transform');
const _snakeCase = require('lodash/snakeCase');
const _kebabCase = require('lodash/kebabCase');
const _camelCase = require('lodash/camelCase');

const joi = require('joi');
const intoStream = require('into-stream');
const through = require('through2');
const dedupeStream = require('unique-stream');
const streamToArray = require('stream-to-array');

/**
 * JSONAPISerializer class.
 *
 * @example
 * const JSONAPISerializer = require('json-api-serializer');
 *
 * // Create an instance of JSONAPISerializer with default settings
 * const Serializer = new JSONAPISerializer();
 *
 * @class JSONAPISerializer
 * @param {Object} [opts] Configuration options.
 */
module.exports = class JSONAPISerializer {
  constructor(opts) {
    this.opts = opts || {};
    this.schemas = {};
  }

  /**
   * Validate and apply default values to resource's configuration options.
   *
   * @method JSONAPISerializer#validateOptions
   * @private
   * @param {Object} options Configuration options.
   * @return {Object}
   */
  validateOptions(options) {
    const optionsSchema = joi.object({
      id: joi.string().default('id'),
      blacklist: joi.array().items(joi.string()).single().default([]),
      whitelist: joi.array().items(joi.string()).single().default([]),
      links: joi.alternatives([joi.func(), joi.object()]).default({}),
      relationships: joi.object().pattern(/.+/, joi.object({
        type: joi.alternatives([joi.func(), joi.string()]).required(),
        alternativeKey: joi.string(),
        schema: joi.string().default('default'),
        links: joi.alternatives([joi.func(), joi.object()]).default({}),
        meta: joi.alternatives([joi.func(), joi.object()]).default({}),
      })).default({}),
      topLevelLinks: joi.alternatives([joi.func(), joi.object()]).default({}),
      topLevelMeta: joi.alternatives([joi.func(), joi.object()]).default({}),
      convertCase: joi.string().valid('kebab-case', 'snake_case', 'camelCase'),
      // Deserialization options
      unconvertCase: joi.string().valid('kebab-case', 'snake_case', 'camelCase'),
      blacklistOnDeserialize: joi.array().items(joi.string()).single().default([]),
      whitelistOnDeserialize: joi.array().items(joi.string()).single().default([]),
      jsonapiObject: joi.boolean().default(true),
    }).required();

    const validated = joi.validate(options, optionsSchema);

    if (validated.error) {
      throw new Error(validated.error);
    }

    return validated.value;
  }

  /**
   * Validate and apply default values to the dynamic type object option.
   *
   * @method JSONAPISerializer#validateDynamicTypeOptions
   * @private
   * @param {Object} options dynamic type object option.
   * @return {Object}
   */
  validateDynamicTypeOptions(options) {
    const schema = joi.object({
      type: joi.alternatives([joi.func(), joi.string()]).required(),
      topLevelLinks: joi.alternatives([joi.func(), joi.object()]).default({}),
      topLevelMeta: joi.alternatives([joi.func(), joi.object()]).default({}),
      jsonapiObject: joi.boolean().default(true),
    }).required();

    const validated = joi.validate(options, schema);

    if (validated.error) {
      throw new Error(validated.error);
    }

    return validated.value;
  }

  /**
   * Register a resource with its type, schema name, and configuration options.
   *
   * @method JSONAPISerializer#register
   * @param {string} type resource's type.
   * @param {string} [schema=default] schema name.
   * @param {Object} [options] Configuration options.
   */
  register(type, schema, options) {
    if (typeof schema === 'object') {
      options = schema;
      schema = 'default';
    }

    schema = schema || 'default';
    options = Object.assign({}, this.opts, options);

    _set(this.schemas, [type, schema].join('.'), this.validateOptions(options));
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
      if (_isPlainObject(schema)) {
        extraData = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraData = extraData || {};

    const included = [];
    let serializedData;
    let options;

    if (_isPlainObject(type)) { // Serialize data with the dynamic type
      options = this.validateDynamicTypeOptions(type);
      // Override top level data
      serializedData = this.serializeMixedData(options, data, included, extraData);
    } else { // Serialize data with the defined type
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }

      options = this.schemas[type][schema];
      serializedData = this.serializeData(type, data, options, included, extraData);
    }


    return {
      jsonapi: options.jsonapiObject ? { version: '1.0' } : undefined,
      meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
      links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
      data: serializedData,
      included: this.serializeIncluded(included),
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
      if (_isPlainObject(schema)) {
        extraData = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraData = extraData || {};

    const included = [];
    const isDataArray = Array.isArray(data);
    const isDynamicType = _isPlainObject(type);
    let serializedData;
    let serializedIncludes;
    let options;

    if (isDynamicType) {
      options = this.validateDynamicTypeOptions(type);
    } else {
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }

      options = this.schemas[type][schema];
    }

    // Convert data into stream with serialization-transform. Single objects
    // will be converted to an array to unify the serialization process. They
    // will be converted back to a single object at the end.
    const dataStream = intoStream.obj(isDataArray ? data : [data])
      .pipe(through.obj((item, enc, callback) => {
        try {
          // Serialize a single item of the data-array.
          const serializedItem = isDynamicType
            ? this.serializeMixedData(type, item, included, extraData)
            : this.serializeData(type, item, options, included, extraData);

          // If the serialized item is null, we won't push it to the stream,
          // as pushing a null-value causes streams to end.
          if (serializedItem === null) {
            return callback();
          }

          return callback(null, serializedItem);
        } catch (e) {
          return callback(e);
        }
      }));

    // Concat the processed stream back to an array and return promise-chain.
    return streamToArray(dataStream)
      .then((result) => {
        serializedData = result;
        // After the serialization of the dataStream is finished, the included
        // objects (side-loaded relations) need to be serialized as well.
        return this.serializeIncludedAsync(included);
      })
      .then((result) => {
        serializedIncludes = result;
        return {
          jsonapi: options.jsonapiObject ? { version: '1.0' } : undefined,
          meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
          links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
          // If the source data was an array, we just pass the serialized data array.
          // Otherwise we try to take the first (and only) item of it or pass null.
          data: isDataArray ? serializedData : (serializedData[0] || null),
          included: serializedIncludes,
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
  deserialize(type, data, schema) {
    schema = schema || 'default';

    if (!_isPlainObject(type)) {
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }
    } else {
      type = this.validateDynamicTypeOptions(type);
    }

    let deserializedData = {};

    if (data.data) {
      if (Array.isArray(data.data)) {
        deserializedData = data.data.map(resource => this.deserializeResource(type, resource, schema, data.included));
      } else {
        deserializedData = this.deserializeResource(type, data.data, schema, data.included);
      }
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

    if (!_isPlainObject(type)) {
      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      if (schema && !this.schemas[type][schema]) {
        throw new Error(`No schema ${schema} registered for ${type}`);
      }
    } else {
      type = this.validateDynamicTypeOptions(type);
    }

    return new Promise((resolve, reject) => { // eslint-disable-line consistent-return
      if (Array.isArray(data.data)) {
        const deserializedData = [];

        const stream = intoStream.obj(data.data);
        stream.on('data', (item) => {
          deserializedData.push(this.deserializeResource(type, item, schema, data.included));
        });

        stream.on('end', () => resolve(deserializedData));

        stream.on('error', reject);
      } else {
        return resolve(this.deserializeResource(type, data.data, schema, data.included));
      }
    });
  }

  /**
   * Deserialize a single JSON API resource.
   * Input data must be a simple object.
   *
   * @method JSONAPISerializer#deserializeResource
   * @param {string|Object} type resource's type as string or an object with a dynamic type resolved from data.
   * @param {Object} data JSON API resource data.
   * @param {string} [schema=default] resource's schema name.
   * @param {Object[]} included.
   * @return {Object} deserialized data.
   */
  deserializeResource(type, data, schema, included) {
    if (_isPlainObject(type)) {
      type = (typeof type.type === 'function') ? type.type(data) : _get(data, type.type);

      if (!type) {
        throw new Error(`No type can be resolved from data: ${JSON.stringify(data)}`);
      }

      if (!this.schemas[type]) {
        throw new Error(`No type registered for ${type}`);
      }

      schema = 'default';
    }

    const resourceOpts = this.schemas[type][schema];

    let deserializedData = {};
    // Deserialize id
    deserializedData[resourceOpts.id] = data.id || undefined;

    // whitelistOnDeserialize option
    if (resourceOpts.whitelistOnDeserialize.length > 0) {
      data.attributes = _pick(data.attributes, resourceOpts.whitelistOnDeserialize);
    }

    // Remove unwanted keys (blacklistOnDeserialize option)
    if (resourceOpts.blacklistOnDeserialize.length > 0) {
      data.attributes = _pick(data.attributes, _difference(Object.keys(data.attributes), resourceOpts.blacklistOnDeserialize));
    }

    Object.assign(deserializedData, data.attributes);

    // Deserialize relationships
    if (data.relationships) {
      Object.keys(data.relationships).forEach((relationshipProperty) => {
        const relationship = data.relationships[relationshipProperty];

        // Support alternativeKey options for relationships
        let relationshipKey = relationshipProperty;
        if (resourceOpts.relationships[relationshipKey] && resourceOpts.relationships[relationshipKey].alternativeKey) {
          relationshipKey = resourceOpts.relationships[relationshipKey].alternativeKey;
        }

        if (relationship.data !== undefined) {
          if (Array.isArray(relationship.data)) {
            // Array data
            _set(deserializedData, relationshipKey, relationship.data.map(d => (included
              ? this.deserializeIncluded(d.type, d.id, resourceOpts.relationships[relationshipProperty], included)
              : d.id)));
          } else if (relationship.data === null) {
            // null data
            _set(deserializedData, relationshipKey, null);
          } else {
            // Object data
            _set(deserializedData, relationshipKey, included
              ? this.deserializeIncluded(relationship.data.type, relationship.data.id, resourceOpts.relationships[relationshipProperty], included)
              : relationship.data.id);
          }
        }
      });
    }

    if (resourceOpts.unconvertCase) {
      deserializedData = this._convertCase(deserializedData, resourceOpts.unconvertCase);
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
    const includedResource = _find(included, {
      type,
      id,
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
   * @method JSONAPISerializer#serializeData
   * @private
   * @param {string} type resource's type.
   * @param {Object|Object[]} data input data.
   * @param {options} options resource's configuration options.
   * @param {Object[]} included.
   * @param {Object} extraData additional data.
   * @return {Object|Object[]} serialized data.
   */
  serializeData(type, data, options, included, extraData) {
    // Empty data
    if (_isEmpty(data)) {
      // Return [] or null
      return Array.isArray(data) ? data : null;
    }

    // Array data
    if (Array.isArray(data)) {
      return data.map(d => this.serializeData(type, d, options, included, extraData));
    }

    // Single data
    return {
      type,
      id: data[options.id] ? data[options.id].toString() : undefined,
      attributes: this.serializeAttributes(data, options),
      relationships: this.serializeRelationships(data, options, included, extraData),
      links: this.processOptionsValues(data, extraData, options.links),
    };
  }

  /**
   * Serialize mixed resource object with a dynamic type resolved from data
   *
   * @see {@link http://jsonapi.org/format/#document-resource-objects}
   * @method JSONAPISerializer#serializeMixedData
   * @private
   * @param {Object} typeOption a dynamic type options.
   * @param {Object|Object[]} data input data.
   * @param {Object[]} included.
   * @param {Object} extraData additional data.
   * @return {Object|Object[]} serialized data.
   */
  serializeMixedData(typeOption, data, included, extraData) {
    // Empty data
    if (_isEmpty(data)) {
      // Return [] or null
      return Array.isArray(data) ? data : null;
    }

    // Array data
    if (Array.isArray(data)) {
      return data.map(d => this.serializeMixedData(typeOption, d, included, extraData));
    }

    // Single data
    // Resolve type from data (can be a string or a function deriving a type-string from each data-item)
    const type = (typeof typeOption.type === 'function')
      ? typeOption.type(data)
      : _get(data, typeOption.type);

    if (!type) {
      throw new Error(`No type can be resolved from data: ${JSON.stringify(data)}`);
    }

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    return this.serializeData(type, data, this.schemas[type].default, included, extraData);
  }

  /**
   * Serialize top level 'included' key: an array of resource objects that are related to the resource data.
   * Remove all duplicated resource.
   *
   * @method JSONAPISerializer#serializeIncluded
   * @private
   * @param {Object[]} included.
   * @return {Object[]} included.
   */
  serializeIncluded(included) {
    const serializedIncluded = _uniqWith(included, _isEqual);
    return Object.keys(serializedIncluded).length > 0 ? serializedIncluded : undefined;
  }

  /**
   * Asynchronously serialize top level 'included' key: an array of resource
   * objects that are related to the resource data.
   * Remove all duplicated items.
   *
   * @method JSONAPISerializer#serializeIncludedAsync
   * @private
   * @param {Object[]} included.
   * @return {Promise} resolves with serialized included data.
   */
  serializeIncludedAsync(included) {
    if (included.length === 0) {
      return Promise.resolve(undefined);
    }

    // Convert array into stream and remove duplicates. Duplicates
    // are identified by the comparison of a compound key of their
    // `type` and `id` fields.
    const uniqueStream = intoStream.obj(included)
      .pipe(dedupeStream(item => `${item.type}-${item.id}`));

    // Concat the stream to an array (which resolves with a promise).
    return streamToArray(uniqueStream);
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
    if (options.whitelist.length > 0) {
      data = _pick(data, options.whitelist);
    }

    // Support alternativeKey options for relationships
    const alternativeKeys = [];
    Object.keys(options.relationships).forEach((key) => {
      const rOptions = options.relationships[key];
      if (rOptions.alternativeKey) {
        alternativeKeys.push(rOptions.alternativeKey);
      }
    });

    // Remove unwanted keys (id, blacklist, relationships, alternativeKeys)
    let serializedAttributes = _pick(data, _difference(Object.keys(data), [options.id].concat(Object.keys(options.relationships), alternativeKeys, options.blacklist)));

    if (options.convertCase) {
      serializedAttributes = this._convertCase(serializedAttributes, options.convertCase);
    }

    return serializedAttributes;
  }

  /**
   * Serialize 'relationships' key of resource objects: a relationships object describing relationships between the resource and other JSON API resources.
   *
   * @see {@link http://jsonapi.org/format/#document-resource-object-relationships}
   * @method JSONAPISerializer#serializeRelationships
   * @private
   * @param {Object|Object[]} data input data.
   * @param {Object} options resource's configuration options.
   * @param {Object[]} included.
   * @param {Object} extraData additional data.
   * @return {Object} serialized relationships.
   */
  serializeRelationships(data, options, included, extraData) {
    const serializedRelationships = {};

    Object.keys(options.relationships).forEach((relationship) => {
      const rOptions = options.relationships[relationship];

      // Support alternativeKey options for relationships
      let relationshipKey = relationship;
      if (!data[relationship] && rOptions.alternativeKey) {
        relationshipKey = rOptions.alternativeKey;
      }

      let serializeRelationship = {
        links: this.processOptionsValues(data, extraData, rOptions.links),
        meta: this.processOptionsValues(data, extraData, rOptions.meta),
        data: this.serializeRelationship(rOptions.type, rOptions.schema, _get(data, relationshipKey), included, data, extraData),
      };

      // Avoid empty relationship object
      if (serializeRelationship.data === undefined && serializeRelationship.links === undefined && serializeRelationship.meta === undefined) {
        serializeRelationship = {
          data: null,
        };
      }

      // Convert case
      relationship = (options.convertCase) ? this._convertCase(relationship, options.convertCase) : relationship;

      _set(serializedRelationships, relationship, serializeRelationship);
    });

    return Object.keys(serializedRelationships).length > 0 ? serializedRelationships : undefined;
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
   * @param {Object[]} included.
   * @param {Object} the entire resource's data.
   * @param {Object} extraData additional data.
   * @return {Object|Object[]} serialized relationship data.
   */
  serializeRelationship(rType, rSchema, rData, included, data, extraData) {
    const schema = rSchema || 'default';

    // No relationship data
    if (rData === undefined) {
      return undefined;
    }

    // Empty relationship data
    if (!(typeof rData === 'number') && _isEmpty(rData)) {
      // Return [] or null
      return Array.isArray(rData) ? rData : null;
    }

    // To-many relationships
    if (Array.isArray(rData)) {
      return rData.map(d => this.serializeRelationship(rType, schema, d, included, data, extraData));
    }

    // Resolve relationship type
    const type = (typeof rType === 'function') ? rType(rData, data) : rType;

    if (!type) {
      throw new Error(`No type can be resolved from relationship's data: ${JSON.stringify(rData)}`);
    }

    if (!this.schemas[type]) {
      throw new Error(`No type registered for "${type}"`);
    }

    if (!this.schemas[type][schema]) {
      throw new Error(`No schema "${schema}" registered for type "${type}"`);
    }

    // To-one relationship
    const rOptions = this.schemas[type][schema];
    const serializedRelationship = { type };

    // Support for unpopulated relationships (an id, or array of ids)
    if (!_isObjectLike(rData)) {
      serializedRelationship.id = rData.toString();
    } else if (rData._bsontype && rData._bsontype === 'ObjectID') {
      // Support for unpopulated relationships (with mongoDB BSON ObjectId)
      serializedRelationship.id = rData.toString();
    } else {
      // Relationship has been populated
      serializedRelationship.id = rData[rOptions.id].toString();
      included.push(this.serializeData(type, rData, rOptions, included, extraData));
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
      processedOptions = (fallbackModeIfOneArg === 'extraData' && options.length === 1) ? options(extraData) : options(data, extraData);
    } else {
      Object.keys(options).forEach((key) => {
        let processedValue = {};
        if (options[key] && typeof options[key] === 'function') {
          // Backward compatible with functions with one 'extraData' argument
          processedValue = (fallbackModeIfOneArg === 'extraData' && options[key].length === 1) ? options[key](extraData) : options[key](data, extraData);
        } else {
          processedValue = options[key];
        }
        Object.assign(processedOptions, { [key]: processedValue });
      });
    }

    // Clean all undefined values
    processedOptions = _omitBy(processedOptions, _isUndefined);

    return Object.keys(processedOptions).length > 0 ? processedOptions : undefined;
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
    if (Array.isArray(data) || _isPlainObject(data)) {
      converted = _transform(data, (result, value, key) => {
        if (Array.isArray(value) || _isPlainObject(value)) {
          result[this._convertCase(key, convertCaseOptions)] = this._convertCase(value, convertCaseOptions);
        } else {
          result[this._convertCase(key, convertCaseOptions)] = value;
        }
      });
    } else {
      switch (convertCaseOptions) {
        case 'snake_case':
          converted = _snakeCase(data);
          break;
        case 'kebab-case':
          converted = _kebabCase(data);
          break;
        case 'camelCase':
          converted = _camelCase(data);
          break;
        default: // Do nothing
      }
    }

    return converted;
  }
};
