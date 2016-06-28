'use strict';

const _ = require('lodash');
const joi = require('joi');
const dasherize = require('dasherize');

module.exports = class JSONAPISerializer {
  constructor(opts) {
    this.opts = opts || {};
    this.schemas = {};
  }

  validateOptions(options) {
    const optionsSchema = joi.object({
      id: joi.string().default('id'),
      blacklist: joi.array().items(joi.string()).single().default([]),
      whitelist: joi.array().items(joi.string()).single().default([]),
      links: joi.object().default({}),
      relationships: joi.object().pattern(/.+/, joi.object({
        type: joi.string().required(),
        schema: joi.string(),
        links: joi.object().default({}),
      })).default({}),
      topLevelLinks: joi.object().default({}),
      topLevelMeta: joi.object().default({}),
    }).required();

    const validated = joi.validate(options, optionsSchema);

    if (validated.error) {
      throw new Error(validated.error);
    }

    return validated.value;
  }

  register(type, schemaName, options) {
    if (_.isObject(schemaName)) {
      options = schemaName;
      schemaName = 'default';
    }

    const name = schemaName || 'default';
    const opts = this.validateOptions(_.defaults({}, options));

    _.set(this.schemas, [type, name].join('.'), opts);
  }

  serialize(type, data, schemaName, extraOptions) {
    // Support optional arguments
    if (arguments.length === 3) {
      if (_.isPlainObject(schemaName)) {
        extraOptions = schemaName;
        schemaName = 'default';
      }
    }

    const schema = schemaName || 'default';
    const extraOpts = extraOptions || {};

    if (!this.schemas[type]) {
      throw new Error('No type registered for ' + type);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error('No schema ' + schema + ' registered for ' + type);
    }

    const included = [];
    return _.assign({}, {
      jsonapi: {
        version: '1.0',
      },
      meta: this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelMeta),
      links: this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelLinks),
      data: this.serializeData(type, data, this.schemas[type][schema], included),
      included: this.serializeIncluded(included),
    });
  }

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
    const resource = {
      type: type,
      id: data[options.id],
      attributes: this.serializeAttributes(data, options),
      relationships: this.serializeRelationships(data, options, included),
      links: this.processOptionsValues(data, options.links),
    };

    return resource;
  }

  serializeIncluded(included) {
    const serializedIncluded = _.uniqWith(included, _.isEqual);
    return !_.isEmpty(serializedIncluded) ? serializedIncluded : undefined;
  }

  serializeAttributes(data, options) {
    if (options.whitelist.length > 0) {
      data = _.pick(data, options.whitelist);
    }

    data = dasherize(data);

    return _.pick(data, _.difference(Object.keys(data), _.concat([options.id], Object.keys(options.relationships), options.blacklist)));
  }

  serializeRelationships(data, options, included) {
    const serializedRelationships = {};

    _.forOwn(options.relationships, (rOptions, relationship) => {
      const schema = rOptions.schema || 'default';

      const serializeRelationship = {
        links: this.processOptionsValues(data, rOptions.links),
        data: this.serializeRelationship(rOptions.type, data[relationship], this.schemas[options.relationships[relationship].type][schema], included),
      };

      _.set(serializedRelationships, relationship, serializeRelationship);
    });

    return !_.isEmpty(serializedRelationships) ? serializedRelationships : undefined;
  }

  serializeRelationship(rType, rData, rOptions, included) {
    // Empty relationship data
    if (_.isEmpty(rData)) {
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

    // support for unpopulated relationships (an id, or array of ids)
    if (!_.isPlainObject(rData)) {
      // Relationship has not been populated
      serializedRelationship.id = rData;
    } else {
      // Relationship has been populated
      serializedRelationship.id = rData[rOptions.id];
      included.push(this.serializeData(rType, rData, rOptions, included));
    }

    return serializedRelationship;
  }

  processOptionsValues(data, options) {
    let processedOptions = _.mapValues(options, value => {
      let processed;
      if (_.isFunction(value)) {
        processed = value(data);
      } else {
        processed = value;
      }
      return processed;
    });

    // Clean all undefined values
    processedOptions = _.omitBy(processedOptions, _.isUndefined);

    return !_.isEmpty(processedOptions) ? processedOptions : undefined;
  }
};
