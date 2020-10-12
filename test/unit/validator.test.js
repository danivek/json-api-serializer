/* eslint-disable func-names */
const { expect } = require('chai');

const validator = require('../../lib/validator');

describe('validator', function () {
  describe('validateDynamicTypeOptions', function () {
    it('no type provided', (done) => {
      expect(function () {
        validator.validateDynamicTypeOptions({});
      }).to.throw(Error, "option 'type' is required");

      done();
    });

    it('incorrect type', (done) => {
      expect(function () {
        validator.validateDynamicTypeOptions({ type: {} });
      }).to.throw(Error, 'must be a string or a function');

      done();
    });

    it('incorrect jsonapiObject', (done) => {
      expect(function () {
        validator.validateDynamicTypeOptions({ type: 'test', jsonapiObject: {} });
      }).to.throw(Error, "option 'jsonapiObject' must a boolean");

      done();
    });

    it('incorrect topLevelLinks', (done) => {
      expect(function () {
        validator.validateDynamicTypeOptions({ type: 'test', topLevelLinks: 'test' });
      }).to.throw(Error, "option 'topLevelLinks' must be an object or a function");

      done();
    });

    it('incorrect topLevelMeta', (done) => {
      expect(function () {
        validator.validateDynamicTypeOptions({ type: 'test', topLevelMeta: 'test' });
      }).to.throw(Error, "option 'topLevelMeta' must be an object or a function");

      done();
    });

    it('incorrect meta', (done) => {
      expect(function () {
        validator.validateDynamicTypeOptions({ type: 'test', meta: 'test' });
      }).to.throw(Error, "option 'meta' must be an object or a function");

      done();
    });
  });

  describe('validateOptions', function () {
    it('incorrect blacklist', (done) => {
      expect(function () {
        validator.validateOptions({
          blacklist: {},
        });
      }).to.throw(Error, "option 'blacklist' must be an array");

      done();
    });

    it('incorrect whitelist', (done) => {
      expect(function () {
        validator.validateOptions({
          whitelist: {},
        });
      }).to.throw(Error, "option 'whitelist' must be an array");

      done();
    });

    it('incorrect links', (done) => {
      expect(function () {
        validator.validateOptions({
          links: 'test',
        });
      }).to.throw(Error, "option 'links' must be an object or a function");

      done();
    });

    it('incorrect meta', (done) => {
      expect(function () {
        validator.validateOptions({
          meta: 'test',
        });
      }).to.throw(Error, "option 'meta' must be an object or a function");

      done();
    });

    it('incorrect blacklistOnDeserialize', (done) => {
      expect(function () {
        validator.validateOptions({
          blacklistOnDeserialize: {},
        });
      }).to.throw(Error, "option 'blacklistOnDeserialize' must be an array");

      done();
    });

    it('incorrect whitelistOnDeserialize', (done) => {
      expect(function () {
        validator.validateOptions({
          whitelistOnDeserialize: {},
        });
      }).to.throw(Error, "option 'whitelistOnDeserialize' must be an array");

      done();
    });

    it('incorrect topLevelLinks', (done) => {
      expect(function () {
        validator.validateOptions({
          topLevelLinks: 'test',
        });
      }).to.throw(Error, "option 'topLevelLinks' must be an object or a function");

      done();
    });

    it('incorrect topLevelMeta', (done) => {
      expect(function () {
        validator.validateOptions({
          topLevelMeta: 'test',
        });
      }).to.throw(Error, "option 'topLevelMeta' must be an object or a function");

      done();
    });

    it('incorrect convertCase', (done) => {
      expect(function () {
        validator.validateOptions({
          convertCase: 'TOCAMELCASE',
        });
      }).to.throw(
        Error,
        "option 'convertCase' must be one of 'kebab-case', 'snake_case', 'camelCase'"
      );

      done();
    });

    it('incorrect unconvertCase', (done) => {
      expect(function () {
        validator.validateOptions({
          unconvertCase: 'TOCAMELCASE',
        });
      }).to.throw(
        Error,
        "option 'unconvertCase' must be one of 'kebab-case', 'snake_case', 'camelCase'"
      );

      done();
    });

    it('incorrect jsonapiObject', (done) => {
      expect(function () {
        validator.validateOptions({
          jsonapiObject: {},
        });
      }).to.throw(Error, "'jsonapiObject' must a boolean");

      done();
    });

    it('incorrect beforeSerialize', (done) => {
      expect(function () {
        validator.validateOptions({
          beforeSerialize: 'test',
        });
      }).to.throw(Error, "option 'beforeSerialize' must be function");

      done();
    });

    it('incorrect afterDeserialize', (done) => {
      expect(function () {
        validator.validateOptions({
          afterDeserialize: 'test',
        });
      }).to.throw(Error, "option 'afterDeserialize' must be function");

      done();
    });

    it('no type provided on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {},
          },
        });
      }).to.throw(Error, "option 'type' for relationship 'test' is required");

      done();
    });

    it('incorrect type on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {
              type: {},
            },
          },
        });
      }).to.throw(Error, "option 'type' for relationship 'test' must be a string or a function");

      done();
    });

    it('incorrect schema on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {
              type: 'test',
              schema: {},
            },
          },
        });
      }).to.throw(Error, "option 'schema' for relationship 'test' must be a string");

      done();
    });

    it('incorrect links on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {
              type: 'test',
              links: '',
            },
          },
        });
      }).to.throw(Error, "option 'links' for relationship 'test' must be an object or a function");

      done();
    });

    it('incorrect alternativeKey on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {
              type: 'test',
              alternativeKey: {},
            },
          },
        });
      }).to.throw(Error, "option 'alternativeKey' for relationship 'test' must be a string");

      done();
    });

    it('incorrect meta on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {
              type: 'test',
              meta: '',
            },
          },
        });
      }).to.throw(Error, "option 'meta' for relationship 'test' must be an object or a function");

      done();
    });

    it('incorrect deserialize on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {
              type: 'test',
              deserialize: 'test',
            },
          },
        });
      }).to.throw(Error, "option 'deserialize' for relationship 'test' must be a function");

      done();
    });

    it('incorrect data on relationship', (done) => {
      expect(function () {
        validator.validateOptions({
          relationships: {
            test: {
              type: 'test',
              data: 'test',
            },
          },
        });
      }).to.throw(Error, "option 'data' for relationship 'test' must be a function");

      done();
    });
  });
});
