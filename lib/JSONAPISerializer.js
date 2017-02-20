'use strict';

const _ = require('lodash');
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
        type: joi.string().required(),
        alternativeKey: joi.string(),
        schema: joi.string(),
        links: joi.alternatives([joi.func(), joi.object()]).default({}),
      })).default({}),
      topLevelLinks: joi.alternatives([joi.func(), joi.object()]).default({}),
      topLevelMeta: joi.alternatives([joi.func(), joi.object()]).default({}),
      convertCase: joi.string().valid('kebab-case', 'snake_case', 'camelCase'),
      // Deserialization options
      unconvertCase: joi.string().valid('kebab-case', 'snake_case', 'camelCase'),
      blacklistOnDeserialize: joi.array().items(joi.string()).single().default([]),
      whitelistOnDeserialize: joi.array().items(joi.string()).single().default([]),
    }).required();

    const validated = joi.validate(options, optionsSchema);

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
    options = options || {};

    _.set(this.schemas, [type, schema].join('.'), this.validateOptions(options));
  }

  /**
   * Serialze input data to a JSON API compliant response.
   * Input data can be a simple object or an array of objects.
   *
   * @see {@link http://jsonapi.org/format/#document-top-level}
   * @method JSONAPISerializer#serialize
   * @param {string} type resource's type.
   * @param {Object|Object[]} data input data.
   * @param {string} [schema=default] resource's schema name.
   * @param {Object} [extraOptions] additional data that can be used in topLevelMeta options.
   * @return {Object} serialized data.
   */
  serialize(type, data, schema, extraOptions) {
    // Support optional arguments (schema)
    if (arguments.length === 3) {
      if (_.isPlainObject(schema)) {
        extraOptions = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraOptions = extraOptions || {};

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error(`No schema ${schema} registered for ${type}`);
    }

    const resourceOpts = this.schemas[type][schema];
    const included = [];

    return {
      jsonapi: {
        version: '1.0',
      },
      meta: this.processOptionsValues(extraOptions, resourceOpts.topLevelMeta),
      links: this.processOptionsValues(extraOptions, resourceOpts.topLevelLinks),
      data: this.serializeData(type, data, resourceOpts, included),
      included: this.serializeIncluded(included),
    };
  }

  /**
   * Asynchronously serialze input data to a JSON API compliant response.
   * Input data can be a simple object or an array of objects.
   *
   * @see {@link http://jsonapi.org/format/#document-top-level}
   * @method JSONAPISerializer#serializeAsync
   * @param {string} type resource's type.
   * @param {Object|Object[]} data input data.
   * @param {string} [schema=default] resource's schema name.
   * @param {Object} [extraOptions] additional data that can be used in topLevelMeta options.
   * @return {Promise} resolves with serialized data.
   */
  serializeAsync(type, data, schema, extraOptions) {
    // Support optional arguments (schema)
    if (arguments.length === 3) {
      if (_.isPlainObject(schema)) {
        extraOptions = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraOptions = extraOptions || {};

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error(`No schema ${schema} registered for ${type}`);
    }

    const resourceOpts = this.schemas[type][schema];
    const included = [];

    let serializedData;
    let serializedIncludes;
    const isDataArray = Array.isArray(data);

    // Convert data into stream with serialization-transform. Single objects
    // will be converted to an array to unify the serialization process. They
    // will be converted back to a single object at the end.
    const dataStream = intoStream.obj(isDataArray ? data : [data])
      .pipe(through.obj((item, enc, callback) => {
        // Serialize a single item of the data-array.
        const serializedItem = this.serializeData(type, item, resourceOpts, included);

        // If the serialized item is null, we won't push it to the stream,
        // as pushing a null-value causes streams to end.
        if (serializedItem === null) {
          return callback();
        }

        return callback(null, serializedItem);
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
          jsonapi: {
            version: '1.0',
          },
          meta: this.processOptionsValues(extraOptions, resourceOpts.topLevelMeta),
          links: this.processOptionsValues(extraOptions, resourceOpts.topLevelLinks),
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
   * @param {string} type resource's type.
   * @param {Object} data JSON API input data.
   * @param {string} [schema=default] resource's schema name.
   * @return {Object} deserialized data.
   */
  deserialize(type, data, schema) {
    schema = schema || 'default';

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error(`No schema ${schema} registered for ${type}`);
    }

    let deserializedData = {};

    if (data.data) {
      if (Array.isArray(data.data)) {
        deserializedData = data.data.map(resource => this.deserializeResource(type, resource, schema));
      } else {
        deserializedData = this.deserializeResource(type, data.data, schema);
      }
    }

    return deserializedData;
  }

  /**
   * Deserialize a single JSON API resource.
   * Input data must be a simple object.
   *
   * @method JSONAPISerializer#deserializeResource
   * @param {string} type resource's type.
   * @param {Object} data JSON API resource data.
   * @param {string} [schema=default] resource's schema name.
   * @return {Object} deserialized data.
   */
  deserializeResource(type, data, schema) {
    const resourceOpts = this.schemas[type][schema];

    let deserializedData = {};
    // Deserialize id
    deserializedData[resourceOpts.id] = data.id || undefined;

    // whitelistOnDeserialize option
    if (resourceOpts.whitelistOnDeserialize.length > 0) {
      data.attributes = _.pick(data.attributes, resourceOpts.whitelistOnDeserialize);
    }

    // Remove unwanted keys (blacklistOnDeserialize option)
    if (resourceOpts.blacklistOnDeserialize.length > 0) {
      data.attributes = _.pick(data.attributes, _.difference(Object.keys(data.attributes), resourceOpts.blacklistOnDeserialize));
    }

    Object.assign(deserializedData, data.attributes);

    // Deserialize relationships
    if (data.relationships) {
      Object.keys(data.relationships).forEach((relationship) => {
        const value = data.relationships[relationship];
        // Support alternativeKey options for relationships
        let relationshipKey = relationship;
        if (resourceOpts.relationships[relationshipKey] && resourceOpts.relationships[relationshipKey].alternativeKey) {
          relationshipKey = resourceOpts.relationships[relationshipKey].alternativeKey;
        }

        if (Array.isArray(value.data)) {
          deserializedData[relationshipKey] = value.data.map(d => d.id);
        } else {
          deserializedData[relationshipKey] = value.data.id;
        }
      });
    }

    if (resourceOpts.unconvertCase) {
      deserializedData = this._convertCase(deserializedData, resourceOpts.unconvertCase);
    }

    return deserializedData;
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
   * @return {Object|Object[]} serialized data.
   */
  serializeData(type, data, options, included) {
    // Empty data
    if (_.isEmpty(data)) {
      // Return [] or null
      return Array.isArray(data) ? data : null;
    }

    // Array data
    if (Array.isArray(data)) {
      return data.map(d => this.serializeData(type, d, options, included));
    }

    // Single data
    return {
      type,
      id: data[options.id].toString(),
      attributes: this.serializeAttributes(data, options),
      relationships: this.serializeRelationships(data, options, included),
      links: this.processOptionsValues(data, options.links),
    };
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
    const serializedIncluded = _.uniqWith(included, _.isEqual);
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
      data = _.pick(data, options.whitelist);
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
    let serializedAttributes = _.pick(data, _.difference(Object.keys(data), [options.id].concat(Object.keys(options.relationships), alternativeKeys, options.blacklist)));

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
   * @return {Object} serialized relationships.
   */
  serializeRelationships(data, options, included) {
    const serializedRelationships = {};

    Object.keys(options.relationships).forEach((relationship) => {
      const rOptions = options.relationships[relationship];
      const schema = rOptions.schema || 'default';

      // Support alternativeKey options for relationships
      let relationshipKey = relationship;
      if (!data[relationship] && rOptions.alternativeKey) {
        relationshipKey = rOptions.alternativeKey;
      }

      const serializeRelationship = {
        links: this.processOptionsValues(data, rOptions.links),
        data: this.serializeRelationship(rOptions.type, data[relationshipKey], this.schemas[options.relationships[relationship].type][schema], included),
      };

      relationship = (options.convertCase) ? this._convertCase(relationship, options.convertCase) : relationship;

      _.set(serializedRelationships, relationship, serializeRelationship);
    });

    return Object.keys(serializedRelationships).length > 0 ? serializedRelationships : undefined;
  }

  /**
   * Serialize 'data' key of relationship's resource objects.
   *
   * @see {@link http://jsonapi.org/format/#document-resource-object-linkage}
   * @method JSONAPISerializer#serializeRelationship
   * @private
   * @param {string} rType the relationship's type.
   * @param {Object|Object[]} rData relationship's data.
   * @param {Object} rOptions relationship's configuration options.
   * @param {Object[]} included.
   * @return {Object|Object[]} serialized relationship data.
   */
  serializeRelationship(rType, rData, rOptions, included) {
    // No relationship data
    if (rData === undefined) {
      return undefined;
    }

    // Empty relationship data
    if (!(typeof rData === 'number') && _.isEmpty(rData)) {
      // Return [] or null
      return Array.isArray(rData) ? rData : null;
    }

    // To-many relationships
    if (Array.isArray(rData)) {
      return rData.map(d => this.serializeRelationship(rType, d, rOptions, included));
    }

    // To-one relationship
    const serializedRelationship = {
      type: rType,
    };

    // Support for unpopulated relationships (an id, or array of ids)
    if (!_.isObjectLike(rData)) {
      serializedRelationship.id = rData.toString();
    } else if (rData._bsontype && rData._bsontype === 'ObjectID') {
      // Support for unpopulated relationships (with mongoDB BSON ObjectId)
      serializedRelationship.id = rData.toString();
    } else {
        // Relationship has been populated
      serializedRelationship.id = rData[rOptions.id].toString();
      included.push(this.serializeData(rType, rData, rOptions, included));
    }
    return serializedRelationship;
  }

  /**
   * Process options values.
   * Allows options to be an object or a function.
   *
   * @method JSONAPISerializer#processOptionsValues
   * @private
   * @param {Object} data data passed to functions options
   * @param {Object} options configuration options.
   * @return {Object}
   */
  processOptionsValues(data, options) {
    let processedOptions = {};
    if (options && typeof options === 'function') {
      processedOptions = options(data);
    } else {
      Object.keys(options).forEach((key) => {
        const processedValue = options[key] && typeof options[key] === 'function' ? options[key](data) : options[key];
        Object.assign(processedOptions, { [key]: processedValue });
      });
    }

    // Clean all undefined values
    processedOptions = _.omitBy(processedOptions, _.isUndefined);

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
    if (Array.isArray(data) || _.isPlainObject(data)) {
      converted = _.transform(data, (result, value, key) => {
        if (Array.isArray(value) || _.isPlainObject(value)) {
          result[this._convertCase(key, convertCaseOptions)] = this._convertCase(value, convertCaseOptions);
        } else {
          result[this._convertCase(key, convertCaseOptions)] = value;
        }
      });
    } else {
      switch (convertCaseOptions) {
        case 'snake_case':
          converted = _.snakeCase(data);
          break;
        case 'kebab-case':
          converted = _.kebabCase(data);
          break;
        case 'camelCase':
          converted = _.camelCase(data);
          break;
        default: // Do nothing
      }
    }

    return converted;
  }
};
