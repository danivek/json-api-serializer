'use strict';

const _ = require('lodash');
const joi = require('joi');

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
      unconvertCase: joi.string().valid('kebab-case', 'snake_case', 'camelCase'),
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
    if (_.isObject(schema)) {
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
      throw new Error('No type registered for ' + type);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error('No schema ' + schema + ' registered for ' + type);
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
      throw new Error('No type registered for ' + type);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error('No schema ' + schema + ' registered for ' + type);
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

    // Deserialize attributes
    Object.assign(deserializedData, data.attributes);

    // Deserialize relationships
    _.forOwn(data.relationships, (value, relationship) => {
      // Support alternativeKey options for relationships
      let relationshipKey = relationship;
      if (resourceOpts.relationships[relationshipKey] && resourceOpts.relationships[relationshipKey].alternativeKey) {
        relationshipKey = resourceOpts.relationships[relationshipKey].alternativeKey;
      }

      if (_.isArray(value.data)) {
        deserializedData[relationshipKey] = value.data.map((d) => d.id);
      } else {
        deserializedData[relationshipKey] = value.data.id;
      }
    });

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
      return _.isArray(data) ? data : null;
    }

    // Array data
    if (_.isArray(data)) {
      return data.map(d => this.serializeData(type, d, options, included));
    }

    // Single data
    return {
      type: type,
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
    return !_.isEmpty(serializedIncluded) ? serializedIncluded : undefined;
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
    _.forOwn(options.relationships, (rOptions) => {
      if (rOptions.alternativeKey) {
        alternativeKeys.push(rOptions.alternativeKey);
      }
    });

    // Remove unwanted keys (id, blacklist, relationships, alternativeKeys)
    let serializedAttributes = _.pick(data, _.difference(Object.keys(data), _.concat([options.id], Object.keys(options.relationships), alternativeKeys, options.blacklist)));

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

    _.forOwn(options.relationships, (rOptions, relationship) => {
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

    return !_.isEmpty(serializedRelationships) ? serializedRelationships : undefined;
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
    if (!_.isNumber(rData) && _.isEmpty(rData)) {
      // Return [] or null
      return _.isArray(rData) ? rData : null;
    }

    // To-many relationships
    if (_.isArray(rData)) {
      return rData.map(d => this.serializeRelationship(rType, d, rOptions, included));
    }

    // To-one relationship
    const serializedRelationship = {
      type: rType,
    };

    // Support for unpopulated relationships (an id, or array of ids)
    if (!_.isObjectLike(rData)) {
      serializedRelationship.id = rData.toString();
    } else {
      // Support for unpopulated relationships (with mongoDB BSON ObjectId)
      if (rData._bsontype && rData._bsontype === 'ObjectID') {
        serializedRelationship.id = rData.toString();
      } else {
        // Relationship has been populated
        serializedRelationship.id = rData[rOptions.id].toString();
        included.push(this.serializeData(rType, rData, rOptions, included));
      }
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
    let processedOptions;
    if (_.isFunction(options)) {
      processedOptions = options(data);
    } else {
      processedOptions = _.mapValues(options, value => {
        let processed;
        if (_.isFunction(value)) {
          processed = value(data);
        } else {
          processed = value;
        }
        return processed;
      });
    }

    // Clean all undefined values
    processedOptions = _.omitBy(processedOptions, _.isUndefined);

    return !_.isEmpty(processedOptions) ? processedOptions : undefined;
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
    if (_.isArray(data) || _.isPlainObject(data)) {
      converted = _.transform(data, (result, value, key) => {
        if (_.isArray(value) || _.isPlainObject(value)) {
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
