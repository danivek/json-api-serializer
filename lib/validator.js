/**
 * Validate and apply default values to resource's configuration options.
 *
 * @function validateOptions
 * @private
 * @param {object} options Configuration options.
 * @returns {object} valid configuration options.
 */
function validateOptions(options) {
  options = Object.assign(
    {
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
    },
    options
  );

  if (!Array.isArray(options.blacklist)) throw new Error("option 'blacklist' must be an array");
  if (!Array.isArray(options.whitelist)) throw new Error("option 'whitelist' must be an array");
  if (typeof options.links !== 'object' && typeof options.links !== 'function')
    throw new Error("option 'links' must be an object or a function");
  if (!Array.isArray(options.blacklistOnDeserialize))
    throw new Error("option 'blacklistOnDeserialize' must be an array");
  if (!Array.isArray(options.whitelistOnDeserialize))
    throw new Error("option 'whitelistOnDeserialize' must be an array");
  if (
    options.topLevelLinks &&
    typeof options.topLevelLinks !== 'object' &&
    typeof options.topLevelLinks !== 'function'
  )
    throw new Error("option 'topLevelLinks' must be an object or a function");
  if (
    options.topLevelMeta &&
    typeof options.topLevelMeta !== 'object' &&
    typeof options.topLevelMeta !== 'function'
  )
    throw new Error("option 'topLevelMeta' must be an object or a function");
  if (options.meta && typeof options.meta !== 'object' && typeof options.meta !== 'function')
    throw new Error("option 'meta' must be an object or a function");
  if (typeof options.jsonapiObject !== 'boolean')
    throw new Error("option 'jsonapiObject' must a boolean");
  if (
    options.convertCase &&
    !['kebab-case', 'snake_case', 'camelCase'].includes(options.convertCase)
  )
    throw new Error("option 'convertCase' must be one of 'kebab-case', 'snake_case', 'camelCase'");

  if (
    options.unconvertCase &&
    !['kebab-case', 'snake_case', 'camelCase'].includes(options.unconvertCase)
  )
    throw new Error(
      "option 'unconvertCase' must be one of 'kebab-case', 'snake_case', 'camelCase'"
    );

  const { relationships } = options;
  Object.keys(relationships).forEach(key => {
    relationships[key] = Object.assign(
      { schema: 'default', links: {}, meta: {} },
      relationships[key]
    );

    if (!relationships[key].type)
      throw new Error(`option 'type' for relationship '${key}' is required`);
    if (
      typeof relationships[key].type !== 'string' &&
      typeof relationships[key].type !== 'function'
    )
      throw new Error(`option 'type' for relationship '${key}' must be a string or a function`);
    if (relationships[key].alternativeKey && typeof relationships[key].alternativeKey !== 'string')
      throw new Error(`option 'alternativeKey' for relationship '${key}' must be a string`);

    if (relationships[key].schema && typeof relationships[key].schema !== 'string')
      throw new Error(`option 'schema' for relationship '${key}' must be a string`);

    if (
      typeof relationships[key].links !== 'object' &&
      typeof relationships[key].links !== 'function'
    )
      throw new Error(`option 'links' for relationship '${key}' must be an object or a function`);

    if (
      typeof relationships[key].meta !== 'object' &&
      typeof relationships[key].meta !== 'function'
    )
      throw new Error(`option 'meta' for relationship '${key}' must be an object or a function`);

    if (relationships[key].deserialize && typeof relationships[key].deserialize !== 'function')
      throw new Error(`option 'deserialize' for relationship '${key}' must be a function`);
  });

  return options;
}

/**
 * Validate and apply default values to the dynamic type object option.
 *
 * @function validateDynamicTypeOptions
 * @private
 * @param {object} options dynamic type object option.
 * @returns {object} valid dynamic type options.
 */
function validateDynamicTypeOptions(options) {
  options = Object.assign({ topLevelLinks: {}, topLevelMeta: {}, jsonapiObject: true }, options);

  if (!options.type) throw new Error("option 'type' is required");
  if (typeof options.type !== 'string' && typeof options.type !== 'function') {
    throw new Error("option 'type' must be a string or a function");
  }

  if (
    options.topLevelLinks &&
    typeof options.topLevelLinks !== 'object' &&
    typeof options.topLevelLinks !== 'function'
  )
    throw new Error("option 'topLevelLinks' must be an object or a function");
  if (
    options.topLevelMeta &&
    typeof options.topLevelMeta !== 'object' &&
    typeof options.topLevelMeta !== 'function'
  )
    throw new Error("option 'topLevelMeta' must be an object or a function");
  if (options.meta && typeof options.meta !== 'object' && typeof options.meta !== 'function')
    throw new Error("option 'meta' must be an object or a function");
  if (typeof options.jsonapiObject !== 'boolean')
    throw new Error("option 'jsonapiObject' must a boolean");

  return options;
}

/**
 * Validate a JSONAPI error object
 *
 * @function validateError
 * @private
 * @param {object} err a JSONAPI error object
 * @returns {object} JSONAPI  valid error object
 */
function validateError(err) {
  if (typeof err !== 'object') {
    throw new Error('error must be an object');
  }

  const { id, links, status, code, title, detail, source, meta } = err;

  const isValidLink = function isValidLink(linksObj) {
    if (typeof linksObj !== 'object') {
      throw new Error("error 'link' property must be an object");
    }

    Object.keys(linksObj).forEach(key => {
      if (typeof linksObj[key] !== 'object' && typeof linksObj[key] !== 'string') {
        throw new Error(`error 'links.${key}' must be a string or an object`);
      }

      if (typeof linksObj[key] === 'object') {
        if (linksObj[key].href && typeof linksObj[key].href !== 'string') {
          throw new Error(`'links.${key}.href' property must be a string`);
        }

        if (linksObj[key].meta && typeof linksObj[key].meta !== 'object') {
          throw new Error(`'links.${key}.meta' property must be an object`);
        }
      }
    });

    return links;
  };

  const isValidSource = function isValidSource(sourceObj) {
    if (typeof sourceObj !== 'object') {
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

module.exports = {
  validateOptions,
  validateDynamicTypeOptions,
  validateError
};
