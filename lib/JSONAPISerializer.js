'use strict';

const {
  pick,
  isEmpty,
  omit,
  isPlainObject,
  omitBy,
  transform,
  get,
  set,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
} = require('./helpers');

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
    options = Object.assign({
      id: 'id',
      blacklist: [],
      whitelist: [],
      links: {},
      relationships: {},
      topLevelLinks: {},
      topLevelMeta: {},
      blacklistOnDeserialize: [],
      whitelistOnDeserialize: [],
      jsonapiObject: true,
    }, options);

    if (!Array.isArray(options.blacklist)) throw new Error('option `blacklist` must be an Array');
    if (!Array.isArray(options.whitelist)) throw new Error('option `whitelist` must be an Array');
    if (typeof options.links !== 'object' && typeof options.links !== 'function') throw new Error('option `links` must be an object or a function');
    if (!Array.isArray(options.blacklistOnDeserialize)) throw new Error('option `blacklistOnDeserialize` must be an Array');
    if (!Array.isArray(options.whitelistOnDeserialize)) throw new Error('option `whitelistOnDeserialize` must be an Array');
    if (options.topLevelLinks && typeof options.topLevelLinks !== 'object' && typeof options.topLevelLinks !== 'function') throw new Error('option `topLevelLinks` must be an object or a function');
    if (options.topLevelMeta && typeof options.topLevelMeta !== 'object' && typeof options.topLevelMeta !== 'function') throw new Error('option `topLevelMeta` must be an object or a function');
    if (typeof options.jsonapiObject !== 'boolean') throw new Error('option `jsonapiObject` must a Boolean');
    if (options.convertCase && !['kebab-case', 'snake_case', 'camelCase'].includes(options.convertCase)) {
      throw new Error('option `convertCase` must be one of \'kebab-case\', \'snake_case\', \'camelCase\'');
    }
    if (options.unconvertCase && !['kebab-case', 'snake_case', 'camelCase'].includes(options.unconvertCase)) {
      throw new Error('option `unconvertCase` must be one of \'kebab-case\', \'snake_case\', \'camelCase\'');
    }

    const { relationships } = options;
    Object.keys(relationships).forEach((key) => {
      relationships[key] = Object.assign({ schema: 'default', links: {}, meta: {} }, relationships[key]);
      if (!relationships[key].type) throw new Error(`option \`type\` for relationship \`${key}\` is required`);
      if (typeof relationships[key].type !== 'string' && typeof relationships[key].type !== 'function') {
        throw new Error(`option \`type\` for relationship \`${key}\` must be a string or a function`);
      }
      if (relationships[key].alternativeKey && typeof relationships[key].alternativeKey !== 'string') {
        throw new Error(`option \`alternativeKey\` for relationship \`${key}\` should be a string`);
      }
      if (relationships[key].schema && typeof relationships[key].schema !== 'string') {
        throw new Error(`option \`schema\` for relationship \`${key}\` should be a string`);
      }
      if (typeof relationships[key].links !== 'object' && typeof relationships[key].links !== 'function') {
        throw new Error(`option \`links\` for relationship \`${key}\` should be an object or a function`);
      }
      if (typeof relationships[key].meta !== 'object' && typeof relationships[key].meta !== 'function') {
        throw new Error(`option \`meta\` for relationship \`${key}\` should be an object or a function`);
      }
      if (relationships[key].deserialize && typeof relationships[key].deserialize !== 'function') {
        throw new Error(`option \`deserialize\` for relationship \`${key}\` should be a function`);
      }
    });

    return options;
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
    options = Object.assign({ topLevelLinks: {}, topLevelMeta: {}, jsonapiObject: true }, options);

    if (!options.type) throw new Error('option `type` is required on a dynamic type object');
    if (typeof options.type !== 'string' && typeof options.type !== 'function') {
      throw new Error('option `type` should be a string or a function on a dynamic type object');
    }

    if (options.topLevelLinks && typeof options.topLevelLinks !== 'object' && typeof options.topLevelLinks !== 'function') throw new Error('option `topLevelLinks` should be an object or a function');
    if (options.topLevelMeta && typeof options.topLevelMeta !== 'object' && typeof options.topLevelMeta !== 'function') throw new Error('option `topLevelMeta` should be an object or a function');
    if (typeof options.jsonapiObject !== 'boolean') throw new Error('option `jsonapiObject` should a Boolean');

    return options;
  }

  /**
   * Validate a JSONAPI error object
   *
   * @method JSONAPISerializer#validateError
   * @private
   * @param {Object} err a JSONAPI error object
   * @return {Object}
   */
  validateError(err) {
    if (typeof err !== 'object') {
      throw new Error('error should be an object');
    }

    const {
      id,
      links,
      status,
      code,
      title,
      detail,
      source,
      meta,
    } = err;

    const isValidLink = function isValidLink(linksObj) {
      if (typeof linksObj !== 'object') {
        throw new Error('error `link` property should be an object');
      }

      Object.keys(linksObj).forEach((key) => {
        if (typeof linksObj[key] !== 'object' && typeof linksObj[key] !== 'string') {
          throw new Error(`error \`links.${key}\` should be a string or an object`);
        }

        if (typeof linksObj[key] === 'object') {
          if (linksObj[key].href && typeof linksObj[key].href !== 'string') {
            throw new Error(`\`links.${key}.href\` property should be a string`);
          }

          if (linksObj[key].meta && typeof linksObj[key].meta !== 'object') {
            throw new Error(`\`links.${key}.meta\` property should be an object`);
          }
        }
      });

      return links;
    };

    const isValidSource = function isValidSource(sourceObj) {
      if (typeof sourceObj !== 'object') {
        throw new Error('error `source` property should be an object');
      }

      if (sourceObj.pointer && typeof sourceObj.pointer !== 'string') {
        throw new Error('error `source.pointer` property must be a string');
      }

      if (sourceObj.parameter && typeof sourceObj.parameter !== 'string') {
        throw new Error('error `source.parameter` property must be a string');
      }

      return source;
    };

    const error = {};
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

    this.schemas[type] = this.schemas[type] || {};
    this.schemas[type][schema] = this.validateOptions(options);
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
      if (typeof schema === 'object') {
        extraData = schema;
        schema = 'default';
      }
    }

    schema = schema || 'default';
    extraData = extraData || {};

    const included = new Map();
    let serializedData;
    let options;

    if (typeof type === 'object') { // Serialize data with the dynamic type
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
      included: included.size ? [...included.values()] : undefined,
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

    let i = 0;
    const arrayData = isDataArray ? data : [data];
    const serializedData = [];
    const that = this;

    return new Promise((resolve, reject) => {
      function next() {
        setImmediate(() => {
          if (i >= arrayData.length) {
            return resolve(serializedData);
          }

          try {
            // Serialize a single item of the data-array.
            const serializedItem = isDynamicType
              ? that.serializeMixedData(type, arrayData[i], included, extraData)
              : that.serializeData(type, arrayData[i], options, included, extraData);

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
    })
      .then(result => ({
        jsonapi: options.jsonapiObject ? { version: '1.0' } : undefined,
        meta: this.processOptionsValues(data, extraData, options.topLevelMeta, 'extraData'),
        links: this.processOptionsValues(data, extraData, options.topLevelLinks, 'extraData'),
        // If the source data was an array, we just pass the serialized data array.
        // Otherwise we try to take the first (and only) item of it or pass null.
        data: isDataArray ? result : (result[0] || null),
        included: included.size ? [...included.values()] : undefined,
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

    if (typeof type === 'object') {
      type = this.validateDynamicTypeOptions(type);
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

    if (typeof type === 'object') {
      type = this.validateDynamicTypeOptions(type);
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
            const deserializedItem = that.deserializeResource(type, arrayData[i], schema, data.included);

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
          detail: err.message,
        };
      } else {
        serializedError = this.validateError(err);
      }

      return serializedError;
    }

    const convertError = convertToError.bind(this);

    if (Array.isArray(error)) {
      return {
        errors: error.map(err => convertError(err)),
      };
    }

    return {
      errors: [convertError(error)],
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
    if (typeof type === 'object') {
      type = (typeof type.type === 'function') ? type.type(data) : get(data, type.type);

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
    if (data.attributes && resourceOpts.whitelistOnDeserialize.length) {
      data.attributes = pick(data.attributes, resourceOpts.whitelistOnDeserialize);
    }

    // Remove unwanted keys (blacklistOnDeserialize option)
    if (data.attributes && resourceOpts.blacklistOnDeserialize.length) {
      data.attributes = omit(data.attributes, resourceOpts.blacklistOnDeserialize);
    }

    Object.assign(deserializedData, data.attributes);

    // Deserialize relationships
    if (data.relationships) {
      Object.keys(data.relationships).forEach((relationshipProperty) => {
        const relationship = data.relationships[relationshipProperty];

        // Support alternativeKey options for relationships
        let relationshipKey;
        if (resourceOpts.unconvertCase) {
          relationshipKey = this._convertCase(relationshipProperty, resourceOpts.unconvertCase);
        } else {
          relationshipKey = relationshipProperty;
        }
        if (resourceOpts.relationships[relationshipKey] && resourceOpts.relationships[relationshipKey].alternativeKey) {
          relationshipKey = resourceOpts.relationships[relationshipKey].alternativeKey;
        }
        const deserializeFunction = (relationshipData) => {
          if (resourceOpts.relationships[relationshipKey] && resourceOpts.relationships[relationshipProperty].deserialize) {
            return resourceOpts.relationships[relationshipProperty].deserialize(relationshipData);
          }
          return relationshipData.id;
        };

        if (relationship.data !== undefined) {
          if (Array.isArray(relationship.data)) {
            // Array data
            set(deserializedData, relationshipKey, relationship.data.map(d => (included
              ? this.deserializeIncluded(d.type, d.id, resourceOpts.relationships[relationshipProperty], included)
              : deserializeFunction(d))));
          } else if (relationship.data === null) {
            // null data
            set(deserializedData, relationshipKey, null);
          } else {
            // Object data
            set(deserializedData, relationshipKey, included
              ? this.deserializeIncluded(relationship.data.type, relationship.data.id, resourceOpts.relationships[relationshipProperty], included)
              : deserializeFunction(relationship.data));
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
    const includedResource = included.find((resource => resource.type === type && resource.id === id));

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
   * @param {Map<string:Object>} included.
   * @param {Object} extraData additional data.
   * @return {Object|Object[]} serialized data.
   */
  serializeData(type, data, options, included, extraData) {
    // Empty data
    if (isEmpty(data)) {
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
   * @param {Map<string:Object>} included.
   * @param {Object} extraData additional data.
   * @return {Object|Object[]} serialized data.
   */
  serializeMixedData(typeOption, data, included, extraData) {
    included = included || new Map();
    // Empty data
    if (isEmpty(data)) {
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
      : get(data, typeOption.type);

    if (!type) {
      throw new Error(`No type can be resolved from data: ${JSON.stringify(data)}`);
    }

    if (!this.schemas[type]) {
      throw new Error(`No type registered for ${type}`);
    }

    return this.serializeData(type, data, this.schemas[type].default, included, extraData);
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
    Object.keys(options.relationships).forEach((key) => {
      const rOptions = options.relationships[key];
      if (rOptions.alternativeKey) {
        alternativeKeys.push(rOptions.alternativeKey);
      }
    });

    // Remove unwanted keys (id, blacklist, relationships, alternativeKeys)
    let serializedAttributes = omit(data, [options.id, ...Object.keys(options.relationships), ...alternativeKeys, ...options.blacklist]);

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
        data: this.serializeRelationship(rOptions.type, rOptions.schema, get(data, relationshipKey), included, data, extraData),
      };

      // Avoid empty relationship object
      if (serializeRelationship.data === undefined && serializeRelationship.links === undefined && serializeRelationship.meta === undefined) {
        serializeRelationship = {
          data: null,
        };
      }

      // Convert case
      relationship = (options.convertCase) ? this._convertCase(relationship, options.convertCase) : relationship;

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

    // Empty relationship data
    if (typeof rData === 'object' && isEmpty(rData)) {
      // Return [] or null
      return Array.isArray(rData) ? [] : null;
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
    if (!isPlainObject(rData)) {
      serializedRelationship.id = rData.toString();
    } else {
      // Relationship has been populated
      serializedRelationship.id = rData[rOptions.id].toString();
      included.set(`${type}-${serializedRelationship.id}`, this.serializeData(type, rData, rOptions, included, extraData));
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
    processedOptions = omitBy(processedOptions, val => val === undefined);

    return Object.keys(processedOptions).length ? processedOptions : undefined;
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
    if (typeof data === 'object') {
      converted = transform(data, (result, value, key) => {
        if (typeof value === 'object') {
          result[this._convertCase(key, convertCaseOptions)] = this._convertCase(value, convertCaseOptions);
        } else {
          result[this._convertCase(key, convertCaseOptions)] = value;
        }
        return result;
      }, {});
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
