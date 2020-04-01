/* eslint-disable */

const expect = require('chai').expect;
const _ = require('lodash');
const ObjectID = require('bson-objectid');

const TickCounter = require('../helpers/tick-counter');

const JSONAPISerializer = require('../../');
const validator = require('../../lib/validator');

describe('JSONAPISerializer', function() {
  describe('register', function() {
    it('should register an empty schema with the \'default\' schema name and default options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles');
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('default');
      expect(Serializer.schemas.articles.default).to.eql(validator.validateOptions({}));
      done();
    });

    it('should register a schema with the \'default\' schema name', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        id: 'id',
      });
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('default');
      expect(Serializer.schemas.articles.default).to.eql(validator.validateOptions({
        id: 'id',
      }));
      expect(Serializer.schemas.articles.default).to.have.property('id').to.eql('id');
      done();
    });

    it('should register a schema with the \'custom\' schema name', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', 'custom');
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('custom');
      done();
    });

    it('should throw an error for a bad options', function(done) {
      const Serializer = new JSONAPISerializer();
      expect(function() {
        Serializer.register('bad', {
          blacklist: {
            bad: 'badOptions',
          },
        });
      }).to.throw(Error);
      done();
    });
  });

  describe('serializeResource', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('articles');
    const defaultOptions = validator.validateOptions({});

    it('should return null for an empty single data', function(done) {
      const serializedData = Serializer.serializeResource('articles', {});
      expect(serializedData).to.eql(null);
      done();
    });

    it('should return empty array for an empty array data', function(done) {
      const serializedData = Serializer.serializeResource('articles', []);
      expect(serializedData).to.eql([]);
      done();
    });

    it('should return serialized data for a single data', function(done) {
      const singleData = {
        id: '1',
        body: 'test body',
      };
      const serializedData = Serializer.serializeResource('articles', singleData, defaultOptions);

      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData).to.have.property('attributes').to.have.property('body').to.eql('test body');
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;
      expect(serializedData.meta).to.be.undefined;

      done();
    });

    it('should return only resource identifier objects (type, id)', function(done) {
      const singleData = {
        id: '1',
      };
      const serializedData = Serializer.serializeResource('articles', singleData, defaultOptions);

      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData.attributes).to.be.undefined;
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;
      expect(serializedData.meta).to.be.undefined;

      done();
    });

    it('should return serialized data for an array data', function(done) {
      const arrayData = [{
        id: '1',
        body: 'test body 1',
      }, {
        id: '2',
        body: 'test body 2',
      }];
      const serializedData = Serializer.serializeResource('articles', arrayData, defaultOptions);
      expect(serializedData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedData[0]).to.have.property('type').to.eql('articles');
      expect(serializedData[0]).to.have.property('id').to.eql('1');
      expect(serializedData[0]).to.have.property('attributes').to.have.property('body').to.eql('test body 1');
      expect(serializedData[0].relationships).to.be.undefined;
      expect(serializedData[0].links).to.be.undefined;
      expect(serializedData[0].meta).to.be.undefined;
      expect(serializedData[1]).to.have.property('type').to.eql('articles');
      expect(serializedData[1]).to.have.property('id').to.eql('2');
      expect(serializedData[1]).to.have.property('attributes').to.have.property('body').to.eql('test body 2');
      expect(serializedData[1].relationships).to.be.undefined;
      expect(serializedData[1].links).to.be.undefined;
      expect(serializedData[1].meta).to.be.undefined;
      done();
    });

    it('should return serialized data with option id', function(done) {
      const singleData = {
        _id: '1',
      };
      const serializedData = Serializer.serializeResource('articles', singleData, _.merge({}, defaultOptions, {
        id: '_id',
      }));
      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;
      expect(serializedData.meta).to.be.undefined;

      done();
    });

    it('should return serialized data with option beforeSerialize', function(done) {
      const singleData = {
        pk1: '1',
        pk2: '4',
      };
      const serializedData = Serializer.serializeResource('articles', singleData, _.merge({}, defaultOptions, {
        beforeSerialize: (data) => {
          const { pk1, pk2, ...attributes } = data;
          const id = `${pk1}-${pk2}`;
          return {
            ...attributes,
            id
          };
        }
      }));
      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.eql('1-4');
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;
      expect(serializedData.meta).to.be.undefined;

      done();
    });

    it('should return type of string for a non string id in input', function(done) {
      const singleData = {
        id: 1,
      };
      const serializedData = Serializer.serializeResource('articles', singleData, defaultOptions);
      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.be.a('string').to.eql('1');
      done();
    });

    it('should return serialized data without id attribute', function(done) {
      const singleData = {
        body: 'test',
      };
      const serializedData = Serializer.serializeResource('articles', singleData, defaultOptions);
      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData.id).to.be.undefined;
      done();
    });
  });

  describe('serializeMixedResource', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('article');
    Serializer.register('people');
    const typeOption = {type: 'type'};
    const defaultTypeOption = validator.validateDynamicTypeOptions(typeOption);

    it('should return null for an empty single data', function(done) {
      const serializedData = Serializer.serializeMixedResource(defaultTypeOption, {});
      expect(serializedData).to.eql(null);
      done();
    });

    it('should return empty array for an empty array data', function(done) {
      const serializedData = Serializer.serializeMixedResource(defaultTypeOption, []);
      expect(serializedData).to.eql([]);
      done();
    });

    it('should return error if no type can be resolved from data', function(done) {
      const singleData = {
        id: '1',
        body: 'test body',
      };

      expect(function() {
        Serializer.serializeMixedResource(defaultTypeOption, singleData);
      }).to.throw(Error, 'No type can be resolved from data: {"id":"1","body":"test body"}');
      done();
    });

    it('should return error if type has not been registered', function(done) {
      const singleData = {
        id: '1',
        type: 'book',
        body: 'test body',
      };

      expect(function() {
        Serializer.serializeMixedResource(defaultTypeOption, singleData);
      }).to.throw(Error, 'No type registered for book');
      done();
    });

    it('should return serialized data for a single data', function(done) {
      const singleData = {
        id: '1',
        type: 'article',
        body: 'test body',
      };
      const serializedData = Serializer.serializeMixedResource(defaultTypeOption, singleData);

      expect(serializedData).to.have.property('type').to.eql('article');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData).to.have.property('attributes').to.have.property('body').to.eql('test body');
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;
      expect(serializedData.meta).to.be.undefined;

      done();
    });

    it('should return serialized data for an array with mixed data', function(done) {
      const arrayData = [{
        id: '1',
        type: 'article',
        body: 'article body',
      }, {
        id: '1',
        type: 'people',
        body: 'people body',
      }];
      const serializedData = Serializer.serializeMixedResource(defaultTypeOption, arrayData);
      expect(serializedData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedData[0]).to.have.property('type').to.eql('article');
      expect(serializedData[0]).to.have.property('id').to.eql('1');
      expect(serializedData[0]).to.have.property('attributes').to.have.property('body').to.eql('article body');
      expect(serializedData[0].relationships).to.be.undefined;
      expect(serializedData[0].links).to.be.undefined;
      expect(serializedData[0].meta).to.be.undefined;
      expect(serializedData[1]).to.have.property('type').to.eql('people');
      expect(serializedData[1]).to.have.property('id').to.eql('1');
      expect(serializedData[1]).to.have.property('attributes').to.have.property('body').to.eql('people body');
      expect(serializedData[1].relationships).to.be.undefined;
      expect(serializedData[1].links).to.be.undefined;
      expect(serializedData[1].meta).to.be.undefined;
      done();
    });

    it('should return serialized data with a type resolved from a function deriving a type-string from data', function(done) {
      const singleData = {
        id: '1',
        type: 'article',
        body: 'test body',
      };
      const typeFuncOption = {type: (data) => data.type ? 'article' : ''};
      const defaultTypeFuncOption = validator.validateDynamicTypeOptions(typeFuncOption);
      const serializedData = Serializer.serializeMixedResource(defaultTypeFuncOption, singleData);

      expect(serializedData).to.have.property('type').to.eql('article');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData).to.have.property('attributes').to.have.property('body').to.eql('test body');
      done();
    });
  });

  describe('serializeRelationship', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('authors');
    Serializer.register('articles', {
      relationships: {
        author: {
          type: 'authors',
        },
      },
    });

     it('should throw an error if type as not been registered', function(done) {
      const SerializerError = new JSONAPISerializer();

      expect(function() {
        SerializerError.serializeRelationship('people', 'default', '1');
      }).to.throw(Error, 'No type registered for "people"');
      done();
    });

    it('should throw an error if custom schema as not been registered on a relationship', function(done) {
      const SerializerError = new JSONAPISerializer();
      SerializerError.register('people');

      expect(function() {
        SerializerError.serializeRelationship('people', 'custom', '1');
      }).to.throw(Error, 'No schema "custom" registered for type "people"');
      done();
    });

    it('should throw an error if no type can be resolved', function(done) {
      const SerializerError = new JSONAPISerializer();
      const typeFn = (data) => data.notype;

      expect(function() {
        SerializerError.serializeRelationship(typeFn, 'default', '1');
      }).to.throw(Error, 'No type can be resolved from relationship\'s data: "1"');
      done();
    });

    it('should return undefined for an undefined relationship data', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('articles', 'default', undefined);
      expect(serializedRelationshipData).to.eql(undefined);
      done();
    });

    it('should return null for an empty single relationship data', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('articles', 'default', {});
      expect(serializedRelationshipData).to.eql(null);
      done();
    });

    it('should return empty array for an empty array of relationship data', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('articles', 'default', []);
      expect(serializedRelationshipData).to.eql([]);
      done();
    });

    it('should return serialized relationship data and populated included for a to one populated relationship', function(done) {
      const included = new Map();
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', {
        id: '1',
        name: 'Author 1',
      }, included);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      expect([...included.values()]).to.have.lengthOf(1);
      done();
    });

    it('should return serialized relationship data and populated included for a to many populated relationships', function(done) {
      const included = new Map();
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', [{
        id: '1',
        name: 'Author 1',
      }, {
        id: '2',
        name: 'Author 2',
      }], included);
      expect(serializedRelationshipData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedRelationshipData[0]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[0]).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationshipData[1]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[1]).to.have.property('id').to.be.a('string').to.eql('2');
      expect([...included.values()]).to.have.lengthOf(2);
      done();
    });

    it('should return type of string for a to one populated relationship with non string id', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', {
        id: 1
      });
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      done();
    });

    it('should return serialized relationship data and empty included for a to one unpopulated relationship', function(done) {
      const included = new Map();
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', '1', included);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      expect([...included.values()]).to.have.lengthOf(0);
      done();
    });

    it('should return serialized relationship data and empty included for a to many unpopulated relationship', function(done) {
      const included = new Map();
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', ['1', '2'], included);
      expect(serializedRelationshipData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedRelationshipData[0]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[0]).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationshipData[1]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[1]).to.have.property('id').to.be.a('string').to.eql('2');
      expect([...included.values()]).to.have.lengthOf(0);
      done();
    });

    it('should return type of string for a to one unpopulated relationship with non string id', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', 1);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      done();
    });


    it('should return serialized relationship with unpopulated relationship with mongoDB BSON ObjectID', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', new ObjectID());
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string');
      done();
    });

    it('should return serialized relationship data and empty included for a relationship object wich only contains an id', function(done) {
      const included = new Map();
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 'default', {id: '1'}, included);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.eql('1');
      expect([...included.values()]).to.have.lengthOf(0);
      done();
    });

    it('should return serialized relationship data and populated included with a custom schema', function(done) {
      const Serializer2 = new JSONAPISerializer();
      // Custom schema 'only-name' for authors resource
      Serializer2.register('authors', 'only-name', {
        whitelist: ['name']
      });

      let included = new Map();
      const serializedRelationshipData = Serializer2.serializeRelationship('authors', 'only-name', {
        id: '1',
        name: 'Author 1',
        gender: 'male'
      }, included);

      included = [...included.values()];
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.eql('1');
      expect(included).to.have.lengthOf(1);
      expect(included[0]).to.have.property('type', 'authors');
      expect(included[0]).to.have.property('id', '1').to.be.a('string');
      expect(included[0]).to.have.property('attributes');
      expect(included[0].attributes).to.have.property('name', 'Author 1');
      expect(included[0].attributes).to.not.have.property('gender');
      done();
    });

    it('should serialize relationship with dynamic type', function(done) {
      const included = new Map();
      const typeFn = (data) => data.type;

      const Serializer = new JSONAPISerializer();
      Serializer.register('people');
      Serializer.register('author');

      const data = [{
        type: 'people',
        id: '1',
        name: 'Roman Nelson'
      }, {
        type: 'author',
        id: '1',
        firstName: 'Kaley',
        lastName: 'Maggio'
      }]

      const serializedRelationships = Serializer.serializeRelationship(typeFn, 'default', data, included);
      expect(serializedRelationships).to.deep.equal([
        { type: 'people', id: '1' },
        { type: 'author', id: '1' }
      ]);
      expect([...included.values()]).to.deep.equal([
      {
        type: 'people',
        id: '1',
        attributes: { type: 'people', name: 'Roman Nelson' },
        relationships: undefined,
        meta: undefined,
        links: undefined
      }, {
        type: 'author',
        id: '1',
        attributes: { type: 'author', firstName: 'Kaley', lastName: 'Maggio' },
        relationships: undefined,
        meta: undefined,
        links: undefined }
      ]);
      done();
    });

    it('should serialize relationship with classes', function(done) {
      const included = new Map();
      const typeFn = (data) => data.type;

      const Serializer = new JSONAPISerializer();
      Serializer.register('author');
      class Author {
        constructor({ id, name }) {
          this.id = id;
          this.name = name;
        }
      }

      const data = new Author({
        id: '1',
        name: 'Kaley Maggio'
      });

      const serializedRelationships = Serializer.serializeRelationship('author', 'default', data, included);
      expect(serializedRelationships).to.deep.equal({ type: 'author', id: '1' });
      expect([...included.values()]).to.deep.equal([
        {
          type: 'author',
          id: '1',
          attributes: { name: 'Kaley Maggio' },
          relationships: undefined,
          meta: undefined,
          links: undefined
        }]);
      done();
    });
  });

  describe('serializeRelationships', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('authors');
    Serializer.register('comments');
    Serializer.register('articles', {
      relationships: {
        author: {
          type: 'authors',
        },
        comments: {
          type: 'comments',
        },
      },
    });

    it('should return undefined relationships for no relationships options', function(done) {
      const serializedRelationships = Serializer.serializeRelationships({
        id: '1',
        name: 'Author 1',
      }, Serializer.schemas.authors.default);
      expect(serializedRelationships).to.be.undefined;
      done();
    });

    it('should not serialize relationships if no links, data, or meta are deduce', function(done) {
      const serializedRelationships = Serializer.serializeRelationships({
        id: '1',
      }, Serializer.schemas.articles.default);
      expect(serializedRelationships).to.be.undefined;
      done();
    });

    it('should return relationships for author and comments', function(done) {
      const serializedRelationships = Serializer.serializeRelationships({
        id: '1',
        author: {
          id: '1'
        },
        comments: [{
          id: '1'
        }, {
          id: '2'
        }],
      }, Serializer.schemas.articles.default);
      expect(serializedRelationships).to.have.property('author');
      expect(serializedRelationships.author).to.have.property('data');
      expect(serializedRelationships.author.data).to.have.property('type').to.eql('authors');
      expect(serializedRelationships.author.data).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationships.author).to.have.property('links').to.be.undefined;
      expect(serializedRelationships).to.have.property('comments');
      expect(serializedRelationships.comments).to.have.property('data').to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedRelationships.comments.data[0]).to.have.property('type').to.eql('comments');
      expect(serializedRelationships.comments.data[0]).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationships.comments).to.have.property('links').to.be.undefined;
      done();
    });

    it('should return relationships with the convertCase options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('authors');
      Serializer.register('articles', {
        convertCase: 'kebab-case',
        relationships: {
          articleAuthors: {
            type: 'authors',
          }
        }
      });

      const serializedRelationships = Serializer.serializeRelationships({
        id: '1',
        articleAuthors: {
          id: '1'
        },
      }, Serializer.schemas.articles.default);
      expect(serializedRelationships).to.have.property('article-authors');
      done();
    });

    it('should return relationships with alternativeKey option if relationship key not exist', function(done) {
      const Serializer = new JSONAPISerializer();

      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author_id'
          }
        }
      });
      Serializer.register('people');

      const serializedRelationships = Serializer.serializeRelationships({
        id: '1',
        author_id: '1'
      }, Serializer.schemas.article.default);
      expect(serializedRelationships).to.have.property('author');
      expect(serializedRelationships.author).to.have.property('data');
      expect(serializedRelationships.author.data).to.have.property('type').to.eql('people');
      expect(serializedRelationships.author.data).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationships.author).to.have.property('links').to.be.undefined;
      done();
    });
  });

  describe('serializeAttributes', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('articles');

    it('should return all attributes of data without id', function(done) {
      const data = {
        id: '1',
        title: 'My First article',
        body: 'Content of my article',
      };
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.not.have.property('id');
      expect(serializedAttributes).to.have.property('title');
      expect(serializedAttributes).to.have.property('body');
      done();
    });

    it('should return all attributes of data except for blacklisted attributes', function(done) {
      const data = {
        id: '1',
        title: 'My First article',
        body: 'Content of my article',
      };
      Serializer.register('articles', {
        blacklist: ['body'],
      });
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.not.have.property('id');
      expect(serializedAttributes).to.have.property('title');
      expect(serializedAttributes).to.not.have.property('body');
      done();
    });

    it('should return only whitelisted attributes', function(done) {
      const data = {
        id: '1',
        title: 'My First article',
        body: 'Content of my article',
      };
      Serializer.register('articles', {
        whitelist: ['body'],
      });
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.not.have.property('id');
      expect(serializedAttributes).to.not.have.property('title');
      expect(serializedAttributes).to.have.property('body');
      done();
    });

    it('should convert attributes to kebab-case format', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        convertCase: 'kebab-case'
      });
      const data = {
        id: '1',
        firstName: 'firstName',
        lastName: 'lastName',
        articles: [{
          createdAt: '2016-06-04T06:09:24.864Z'
        }],
        address: {
          zipCode: 123456
        }
      };
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.have.property('first-name');
      expect(serializedAttributes).to.have.property('last-name');
      expect(serializedAttributes.articles[0]).to.have.property('created-at');
      expect(serializedAttributes.address).to.have.property('zip-code');
      done();
    });

    it('should convert attributes to snake_case format', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        convertCase: 'snake_case'
      });
      const data = {
        id: '1',
        firstName: 'firstName',
        lastName: 'lastName',
        articles: [{
          createdAt: '2016-06-04T06:09:24.864Z'
        }],
        address: {
          zipCode: 123456
        }
      };
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.have.property('first_name');
      expect(serializedAttributes).to.have.property('last_name');
      expect(serializedAttributes.articles[0]).to.have.property('created_at');
      expect(serializedAttributes.address).to.have.property('zip_code');
      done();
    });

    it('should convert attributes to camelCase format', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        convertCase: 'camelCase'
      });
      const data = {
        id: '1',
        'first-name': 'firstName',
        'last-name': 'lastName',
        articles: [{
          'created-at': '2016-06-04T06:09:24.864Z'
        }],
        address: {
          'zip-code': 123456
        }
      };
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.have.property('firstName');
      expect(serializedAttributes).to.have.property('lastName');
      expect(serializedAttributes.articles[0]).to.have.property('createdAt');
      expect(serializedAttributes.address).to.have.property('zipCode');
      done();
    });

    it('should not return alternativeKey option on relationships', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('people', {});
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author_id'
          }
        }
      });

      const data = {
        id: '1',
        title: 'Nice article',
        author_id: '1',
        author: {
          id: '1'
        },
      };

      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.article.default);
      expect(serializedAttributes).to.not.have.property('id'); // No identifier
      expect(serializedAttributes).to.not.have.property('author_id'); // No relationship alternativeKey
      expect(serializedAttributes).to.not.have.property('author'); // No relationship key
      expect(serializedAttributes).to.have.property('title');
      done();
    });
  });

  describe('processOptionsValues', function() {

    const Serializer = new JSONAPISerializer();
    it('should process options with string values', function(done) {
      const linksOptions = {
        self: '/articles',
      };
      const links = Serializer.processOptionsValues({}, null, linksOptions);
      expect(links).to.have.property('self').to.eql('/articles');
      done();
    });

    it('should process options with functions values', function(done) {
      const linksOptions = {
        self: function(data) {
          return '/articles/' + data.id;
        },
      };
      const links = Serializer.processOptionsValues({
        id: '1',
      }, null, linksOptions);
      expect(links).to.have.property('self').to.eql('/articles/1');
      done();
    });

    it('should process options with functions values with 2 arguments', function(done) {
      const linksOptions = {
        self: function(data, extraData) {
          return extraData.url + '/' + data.id;
        },
      };
      const links = Serializer.processOptionsValues({ id: '1' }, { url : '/articles' }, linksOptions);
      expect(links).to.have.property('self').to.eql('/articles/1');
      done();
    });

    it('should process options function', function(done) {
      const optionsFn = function(data) {
        return {
          self: '/articles/' + data.id
        }
      };
      const links = Serializer.processOptionsValues({
        id: '1',
      }, null, optionsFn);
      expect(links).to.have.property('self').to.eql('/articles/1');
      done();
    });

    it('should process options function with 2 arguments', function(done) {
      const optionsFn = function(data, extraData) {
        return {
          self: extraData.url + '/' + data.id
        }
      };
      const links = Serializer.processOptionsValues({ id: '1' }, { url : '/articles' }, optionsFn);
      expect(links).to.have.property('self').to.eql('/articles/1');
      done();
    });

    it('should process options function with extraData as fallbackModeIfOneArg', function(done) {
      const optionsFn = function(extraData) {
        return {
          self: extraData.url
        }
      };
      const links = Serializer.processOptionsValues({ id: '1' }, { url : '/articles' }, optionsFn, 'extraData');
      expect(links).to.have.property('self').to.eql('/articles');
      done();
    });

    it('should process options with a function returning null or undefined', function(done) {
      const optionsFn = function(extraData) {
        return null;
      };
      const links = Serializer.processOptionsValues({ id: '1' }, { url : '/articles' }, optionsFn, 'extraData');
      expect(links).to.be.undefined;
      done();
    });
  });

  describe('serialize', function() {
    const Serializer = new JSONAPISerializer();
    const dataArray = [{
      id: 1,
      title: 'Article 1',
    }, {
      id: 2,
      title: 'Article 2',
    }, {
      id: 3,
      title: 'Article 3',
    }]

    Serializer.register('articles', {
      topLevelMeta: (data, extraData) => ({
        count: extraData.count,
        total: data.length
      })
    });

    it('should not include data property if excludeData is true', (done) => {
      const serializedData = Serializer.serialize('articles', dataArray, 'default', {count: 2}, true);
      expect(serializedData.data).to.be.undefined;
      expect(serializedData.meta).to.have.property('count', 2)
      expect(serializedData.meta).to.have.property('total', 3)
      expect(serializedData.included).to.be.undefined;
      done();
    });

    it('should serialize empty single data', function(done) {
      const serializedData = Serializer.serialize('articles', {});
      expect(serializedData.data).to.eql(null);
      expect(serializedData.included).to.be.undefined;
      done();
    });

    it('should serialize empty array data', function(done) {
      const serializedData = Serializer.serialize('articles', []);
      expect(serializedData.data).to.eql([]);
      expect(serializedData.included).to.be.undefined;
      done();
    });

    it('should serialize with extra options as the third argument', function(done) {
      const serializedData = Serializer.serialize('articles', [], {
        count: 0
      });
      expect(serializedData.data).to.eql([]);
      expect(serializedData.included).to.be.undefined;
      expect(serializedData.links).to.be.undefined;
      expect(serializedData.meta).to.have.property('count').to.eql(0);
      done();
    });

    it('should serialize with a custom schema', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', 'only-title', {
        whitelist: ['title']
      });

      const data = {
        id: '1',
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.'
      };

      const serializedData = Serializer.serialize('articles', data, 'only-title');
      expect(serializedData.data).to.have.property('type', 'articles');
      expect(serializedData.data).to.have.property('id', '1');
      expect(serializedData.data).to.have.property('attributes');
      expect(serializedData.data.attributes).to.have.property('title');
      expect(serializedData.data.attributes).to.not.have.property('body');
      expect(serializedData.included).to.be.undefined;
      done();
    });

    it('should throw an error if type has not been registered', function(done) {
      expect(function() {
        Serializer.serialize('authors', {});
      }).to.throw(Error, 'No type registered for authors');
      done();
    });

    it('should throw an error if custom schema has not been registered', function(done) {
      expect(function() {
        Serializer.serialize('articles', {}, 'custom');
      }).to.throw(Error, 'No schema custom registered for articles');
      done();
    });

    it('should throw an error when serializing mixed data with a bad dynamic type option', function(done) {
      expect(function() {
        Serializer.serialize({bad: 'bad'}, {});
      }).to.throw(Error, 'option \'type\' is required');
      done();
    });

    it('should serialize mixed data with a dynamic type option as the first argument', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article');

      const data = {
        id: '1',
        type: 'article',
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.'
      };

      const serializedData = Serializer.serialize({type: 'type'}, data);
      expect(serializedData.data).to.have.property('type', 'article');
      expect(serializedData.data).to.have.property('id', '1');
      expect(serializedData.data).to.have.property('attributes');
      expect(serializedData.data.attributes).to.have.property('title');
      expect(serializedData.data.attributes).to.have.property('body');
      expect(serializedData.included).to.be.undefined;
      done();
    });

    it('should serialize with option \'jsonapiObject\' disabled', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        jsonapiObject: false
      });

      const data = {
        id: '1',
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.'
      };

      const serializedData = Serializer.serialize('article', data);
      expect(serializedData).have.property('jsonapi').to.be.undefined;
      done();
    });

    it('should serialize mixed data with option \'jsonapiObject\' disabled', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article');

      const data = {
        id: '1',
        type: 'article',
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.'
      };

      const serializedData = Serializer.serialize({ type: 'type', jsonapiObject: false }, data);
      expect(serializedData).have.property('jsonapi').to.be.undefined;
      done();
    });

    it('should override options with provided override object', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('person', {
        relationships: {
          address: {
            type: 'address'
          }
        }
      });
      Serializer.register('address', {});
      Serializer.register('articles', {});
      const data = {
        id: '1',
        'first-name': 'firstName',
        'last-name': 'lastName',
        'social-security-number': '000-00-0000',
        address: {
          id:'1',
          'zip-code': 123456,
          'phone-number': '000-000-0000'
        }
      };
      const serializedData = Serializer.serialize('person', data, 'default', null, null, {
        'person': {
          convertCase: 'camelCase',
          blacklist: ['social-security-number']
        },
        'address': {
          whitelist: ['zip-code']
        }
      });
      expect(serializedData.data.attributes).to.have.property('firstName');
      expect(serializedData.data.attributes).to.have.property('lastName');
      expect(serializedData.data.attributes).to.not.have.property('socialSecurityNumber');
      expect(serializedData.included[0].attributes).to.have.property('zip-code');
      expect(serializedData.included[0].attributes).to.not.have.property('phone-number');
      done();
    });

    it('should override options with provided override object for mixedResourceType', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('person', {
        convertCase: 'camelCase',
        relationships: {
          address: {
            type: 'address'
          }
        }
      });
      Serializer.register('address', {});
      const data = {
        id: '1',
        'first-name': 'firstName',
        'last-name': 'lastName',
        'social-security-number': '000-00-0000',
        address: {
          id:'1',
          'zip-code': 123456,
          'phone-number': '000-000-0000'
        },
        type: 'person'
      };
      const serializedData = Serializer.serialize({
        type: 'type',
      }, data, 'default', null, null, {
        'person': {
          blacklist: ['social-security-number']
        },
        'address': {
          whitelist: ['zip-code']
        }
      });
      expect(serializedData.data.attributes).to.have.property('firstName');
      expect(serializedData.data.attributes).to.have.property('lastName');
      expect(serializedData.data.attributes).to.not.have.property('socialSecurityNumber');
      expect(serializedData.included[0].attributes).to.have.property('zip-code');
      expect(serializedData.included[0].attributes).to.not.have.property('phone-number');
      done();
    });

    it('should merge relationships data if already included', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people'
          },
          comments: {
            type: 'comment'
          }
        }
      });
      Serializer.register('people', {
        relationships: {
          friends: {
            type: 'people'
          },
          image: {
            type: 'image'
          }
        }
      });
      Serializer.register('comment', {
        relationships: {
          author: {
            type: 'people'
          }
        }
      });
      Serializer.register('image', {});

      const data = {
        id: '1',
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.',
        created: '2015-05-22T14:56:29.000Z',
        author: {
          id: '1',
          firstName: 'Kaley',
          lastName: 'Maggio',
          friends: [{
            id: '2',
            firstName: 'Kaley2',
            lastName: 'Maggio2',
          }]
        },
        comments: [{
          id: '1',
          body: 'I Like !',
          author: {
            id: '1',
            firstName: 'Kaley',
            lastName: 'Maggio',
            image: {
              id: '1',
              title: 'Beautiful picture',
            }
          }
        }]
      };

      const serializedData = Serializer.serialize('article', data);
      
      const people1 = serializedData.included.find((include => include.type === 'people' && include.id === '1'));
      expect(people1).to.have.property('relationships');
      expect(people1.relationships).to.have.property('image');
      expect(people1.relationships).to.have.property('friends');
      done();
    });
  });

  describe('serializeAsync', function() {
    const Serializer = new JSONAPISerializer();
    const dataArray = [{
      id: 1,
      title: 'Article 1',
    }, {
      id: 2,
      title: 'Article 2',
    }, {
      id: 3,
      title: 'Article 3',
    }]

    Serializer.register('articles', {
      topLevelMeta: (data, extraData) => ({
        count: extraData.count,
        total: data.length,
      })
    });

    it('should return a Promise', () => {
      const promise = Serializer.serializeAsync('articles', {});
      expect(promise).to.be.instanceOf(Promise);
    });

    it('should not include data property if excludeData is true', () => {
      return Serializer.serializeAsync('articles', dataArray, 'default', {count: 2}, true)
        .then((serializedData) => {
          expect(serializedData.data).to.be.undefined;
          expect(serializedData.meta).to.have.property('count', 2)
          expect(serializedData.meta).to.have.property('total', 3)
          expect(serializedData.included).to.be.undefined;
        });
    });

    it('should serialize empty single data', () =>
      Serializer.serializeAsync('articles', {})
        .then((serializedData) => {
          expect(serializedData.data).to.eql(null);
          expect(serializedData.included).to.be.undefined;
        })
    );

    it('should serialize empty array data', () =>
      Serializer.serializeAsync('articles', [])
        .then((serializedData) => {
          expect(serializedData.data).to.eql([]);
          expect(serializedData.included).to.be.undefined;
        })
    );

    it('should serialize a single object of data', () =>
      Serializer.serializeAsync('articles', dataArray[0])
        .then((serializedData) => {
          expect(serializedData.data.id).to.eql('1');
          expect(serializedData.data.attributes.title).to.eql('Article 1');
        })
    );

    it('should serialize an array of data', () =>
      Serializer.serializeAsync('articles', dataArray)
        .then((serializedData) => {
          expect(serializedData.data.length).to.eql(3);
        })
    );

    it('should serialize each array item on next tick', () => {
      const tickCounter = new TickCounter(5);
      return Serializer.serializeAsync('articles', dataArray)
        .then(() => {
          expect(tickCounter.ticks).to.eql(4);
        })
    });

    it('should serialize with extra options as the third argument', () => {
      return Serializer.serializeAsync('articles', [], { count: 0 })
        .then((serializedData) => {
          expect(serializedData.data).to.eql([]);
          expect(serializedData.included).to.be.undefined;
          expect(serializedData.links).to.be.undefined;
          expect(serializedData.meta).to.have.property('count').to.eql(0);
        });
    });

    it('should serialize with a custom schema', () => {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', 'only-title', {
        whitelist: ['title']
      });

      const data = {
        id: '1',
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.'
      };

      return Serializer.serializeAsync('articles', data, 'only-title')
        .then((serializedData) => {
          expect(serializedData.data).to.have.property('type', 'articles');
          expect(serializedData.data).to.have.property('id', '1');
          expect(serializedData.data).to.have.property('attributes');
          expect(serializedData.data.attributes).to.have.property('title');
          expect(serializedData.data.attributes).to.not.have.property('body');
          expect(serializedData.included).to.be.undefined;
        });
    });

    it('should throw an error if type has not been registered', function(done) {
      expect(function() {
        Serializer.serializeAsync('authors', {});
      }).to.throw(Error, 'No type registered for authors');
      done();
    });

    it('should throw an error if custom schema has not been registered', function(done) {
      expect(function() {
        Serializer.serializeAsync('articles', {}, 'custom');
      }).to.throw(Error, 'No schema custom registered for articles');
      done();
    });

    it('should throw an error when serializing mixed data with a bad dynamic type option', function(done) {
      expect(function() {
        Serializer.serializeAsync({bad: 'bad'}, {});
      }).to.throw(Error, 'option \'type\' is required');
      done();
    });

    it('should return an error when serializing mixed data with an unregistered type', () => {
      const data = {
        id: '1',
        type: 'authors'
      };

      return Serializer.serializeAsync({type: 'type'}, data)
        .catch(e => {
          expect(e).to.be.an('error');
        });
    });

    it('should serialize mixed data with a dynamic type option as the first argument', () => {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article');

      const data = {
        id: '1',
        type: 'article',
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.'
      };

      return Serializer.serializeAsync({type: 'type'}, data)
        .then((serializedData) => {
          expect(serializedData.data).to.have.property('type', 'article');
          expect(serializedData.data).to.have.property('id', '1');
          expect(serializedData.data).to.have.property('attributes');
          expect(serializedData.data.attributes).to.have.property('title');
          expect(serializedData.data.attributes).to.have.property('body');
          expect(serializedData.included).to.be.undefined;
        });
    });

    it('should override options with provided override object', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('person', {
        relationships: {
          address: {
            type: 'address'
          }
        }
      });
      Serializer.register('address', {});
      const data = {
        id: '1',
        'first-name': 'firstName',
        'last-name': 'lastName',
        'social-security-number': '000-00-0000',
        address: {
          id:'1',
          'zip-code': 123456,
          'phone-number': '000-000-0000'
        }
      };
      Serializer.serializeAsync('person', data, 'default', null, null, {
        'person': {
          convertCase: 'camelCase',
          blacklist: ['social-security-number']
        },
        'address': {
          whitelist: ['zip-code']
        }
      })
        .then(serializedData => {
          expect(serializedData.data.attributes).to.have.property('firstName');
          expect(serializedData.data.attributes).to.have.property('lastName');
          expect(serializedData.data.attributes).to.not.have.property('socialSecurityNumber');
          expect(serializedData.included[0].attributes).to.have.property('zip-code');
          expect(serializedData.included[0].attributes).to.not.have.property('phone-number');
          done();
        });
    });
  });

  describe('deserialize', function() {
    it('should deserialize data with relationships', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {});

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            },
            comments: {
              data: [{
                type: 'comment',
                id: '1'
              }, {
                type: 'comment',
                id: '2'
              }]
            },
            emptyArray: {
              data: []
            },
            nullRelationship: {
              data: null
            },
            falsyIdRelationship: {
              data: {
                type: 'stuff',
                id: ''
              }
            },
            noDataRelationship: {
              id: '1'
            }
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('id');
      expect(deserializedData).to.have.property('title');
      expect(deserializedData).to.have.property('body');
      expect(deserializedData).to.have.property('created');
      expect(deserializedData).to.have.property('author', '1');
      expect(deserializedData).to.have.property('comments').to.be.instanceof(Array).to.eql(['1', '2']);
      expect(deserializedData).to.have.property('emptyArray').to.eql([]);
      expect(deserializedData).to.have.property('nullRelationship').to.eql(null);
      expect(deserializedData).to.have.property('falsyIdRelationship').to.eql('');
      expect(deserializedData).to.not.have.property('noDataRelationship');
      done();
    });

    it('should deserialize data with included', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people'
          },
          comments: {
            type: 'comment'
          }
        }
      });
      Serializer.register('people', {});
      Serializer.register('comment', {
        relationships: {
          author: {
            type: 'people'
          }
        }
      });

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            },
            comments: {
              data: [{
                type: 'comment',
                id: '1'
              }, {
                type: 'comment',
                id: '2'
              }]
            }
          }
        },
        included: [{
            type: 'people',
            id: '1',
            attributes: {
              firstName: 'Kaley',
              lastName: 'Maggio',
              email: 'Kaley-Maggio@example.com',
              age: '80',
              gender: 'male'
            }
          },
          {
            type: 'comment',
            id: '1',
            attributes: {
              body: 'First !'
            },
            relationships: {
              author: {
                data: {
                  type: 'people',
                  id: '1'
                }
              }
            }
          },
          {
            type: 'comment',
            id: '2',
            attributes: {
              body: 'I Like !'
            },
            relationships: {
              author: {
                data: {
                  type: 'people',
                  id: '1'
                }
              }
            }
          }
        ]
      };

      const deserializedData = Serializer.deserialize('article', data);
      expect(deserializedData).to.have.property('id');
      expect(deserializedData).to.have.property('title');
      expect(deserializedData).to.have.property('body');
      expect(deserializedData).to.have.property('created');
      expect(deserializedData).to.have.property('author');
      expect(deserializedData.author).to.have.property('id');
      expect(deserializedData.author).to.have.property('firstName');
      expect(deserializedData.author).to.have.property('lastName');
      expect(deserializedData).to.have.property('comments').to.be.instanceof(Array).to.have.length(2);
      expect(deserializedData.comments[0]).to.have.property('id');
      expect(deserializedData.comments[0]).to.have.property('body');
      expect(deserializedData.comments[0]).to.have.property('author');
      expect(deserializedData.comments[0].author).to.have.property('id');
      expect(deserializedData.comments[0].author).to.have.property('firstName');
      expect(deserializedData.comments[0].author).to.have.property('lastName');
      expect(deserializedData.comments[1]).to.have.property('id');
      expect(deserializedData.comments[1]).to.have.property('body');
      expect(deserializedData.comments[1]).to.have.property('author');
      expect(deserializedData.comments[1].author).to.have.property('id');
      expect(deserializedData.comments[1].author).to.have.property('firstName');
      expect(deserializedData.comments[1].author).to.have.property('lastName');

      done();
    });

    it('should deserialize with missing included relationship', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        relationships: {
          author: {
            type: 'people',
          }
        }
      });
      Serializer.register('people', {});

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        },
        included: []
      }

      const deserializedData = Serializer.deserialize('articles', data);
      // People with id '1' is missing in included
      expect(deserializedData).to.have.property('author').to.eql('1');
      done();
    });

    it('should deserialize an array of data', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {});

      const data = {
        data: [{
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          }
        }, {
          type: 'article',
          id: '2',
          attributes: {
            title: 'JSON API still paints my bikeshed!',
            body: 'The second shortest article. Ever.',
            created: '2015-06-22T14:56:29.000Z'
          }
        }]
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.length(2);
      done();
    });

    it('should deserialize with \'id\' options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        id: '_id'
      });

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('_id');
      expect(deserializedData).to.not.have.property('id');
      done();
    });

    it('should return deserialized data with option afterDeserialize', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        afterDeserialize: (data) => {
          const { id, ...attributes } = data;
          const [pk1, pk2] = id.split('-');
          return {
            ...attributes,
            pk1,
            pk2,
          };
        },
      });

      const data = {
        data: {
          type: 'article',
          id: '1-2',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('pk1').to.eql('1');
      expect(deserializedData).to.have.property('pk2').to.eql('2');
      expect(deserializedData).to.not.have.property('id');
      done();
    });

    it('should deserialize with \'alternativeKey\' option and no included', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author_id'
          }
        }
      });

      Serializer.register('people', {});

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        }
      };

      const deserializedData = Serializer.deserialize('article', data);
      expect(deserializedData).to.have.property('author_id').to.eql('1');
      expect(deserializedData).to.not.have.property('author');
      done();
    });

    it('should deserialize with \'alternativeKey\' option and included', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author_id'
          }
        }
      });

      Serializer.register('people', {});

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        },
        included: [
          {
            type: 'people',
            id: '1',
            attributes: {
              firstName: 'Kaley',
              lastName: 'Maggio',
            }
          }
        ]
      };

      const deserializedData = Serializer.deserialize('article', data);
      expect(deserializedData).to.have.property('author_id').to.eql('1');
      expect(deserializedData).to.have.property('author').to.deep.equal({id: '1', firstName: 'Kaley', lastName: 'Maggio'});
      done();
    });

    it('should deserialize with a relationship array and \'alternativeKey\' option and no included', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author_id'
          }
        }
      });

      Serializer.register('people', {});

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: [{
                type: 'people',
                id: '1'
              }, {
                type: 'people',
                id: '2'
              }]
            }
          }
        }
      };

      const deserializedData = Serializer.deserialize('article', data);
      expect(deserializedData).to.have.property('author_id').to.eql(['1', '2']);
      expect(deserializedData).to.not.have.property('author');
      done();
    });

    it('should deserialize with a relationship array \'alternativeKey\' option and included', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author_id'
          }
        }
      });

      Serializer.register('people', {});

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: [{
                type: 'people',
                id: '1'
              }, {
                type: 'people',
                id: '2'
              }]
            }
          }
        },
        included: [
          {
            type: 'people',
            id: '1',
            attributes: {
              firstName: 'Kaley',
              lastName: 'Maggio',
            }
          },
          {
            type: 'people',
            id: '2',
            attributes: {
              firstName: 'Clarence',
              lastName: 'Davis',
            }
          }
        ]
      };

      const deserializedData = Serializer.deserialize('article', data);
      expect(deserializedData).to.have.property('author_id').to.eql(['1', '2']);
      expect(deserializedData).to.have.property('author').to.deep.equal([{id: '1', firstName: 'Kaley', lastName: 'Maggio'}, {id: '2', firstName: 'Clarence', lastName: 'Davis'}]);
      done();
    });

    it('should deserialize with \'alternativeKey\' option as a path', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author.id'
          }
        }
      });

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData.author).to.have.property('id');
      done();
    });

    it('should deserialize with \'deserialize\' option as a function', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        relationships: {
          author: {
            type: 'people',
            deserialize: (data) => ({id: data.id, type: data.type})
          }
        }
      });

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData.author).to.have.property('id');
      expect(deserializedData.author).to.have.property('type');
      done();
    })

    it('should deserialize with \'unconvertCase\' options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        unconvertCase: 'snake_case',
        relationships: {
          article_author: {
            type: 'people',
          },
        }
      });
      Serializer.register('people', {
        unconvertCase: 'snake_case',
      });

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            createdAt: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            articleAuthor: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        },
        included: [{
          type: 'people',
          id: '1',
          attributes: { firstName: 'Karl' }
        }]
      };

      const deserializedData = Serializer.deserialize('article', data);
      expect(deserializedData).to.have.property('created_at');
      expect(deserializedData.article_author).to.deep.equal({ id: '1', first_name: 'Karl' });
      done();
    });

    it('should deserialize with \'unconvertCase\' and \'deserialize\' options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        unconvertCase: 'snake_case',
        relationships: {
          article_author: {
            deserialize: data => ({ id: data.id, additionalProperty: `${data.type}-${data.id}` }),
            type: 'people',
          },
        }
      });

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            createdAt: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            articleAuthor: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        }
      };

      const deserializedData = Serializer.deserialize('article', data);
      expect(deserializedData).to.have.property('created_at');
      expect(deserializedData.article_author).to.deep.equal({ id: '1', additional_property: 'people-1' });
      done();
    });

    it('should deserialize with \'unconvertCase\' options with \'alternative_key\' relationship', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        unconvertCase: 'snake_case',
        relationships: {
          article_author: {
            alternativeKey: 'article_author_id',
            type: 'authors',
          },
        }
      });

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            createdAt: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            articleAuthor: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('created_at');
      expect(deserializedData).to.have.property('article_author_id');
      done();
    });

    it('should deserialize all attributes of data except for blacklisted attributes', function(done) {
      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'My First article',
            body: 'Content of my article',
          }
        }
      };

      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        blacklistOnDeserialize: ['body'],
      });

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('title');
      expect(deserializedData).to.not.have.property('body');
      done();
    });

    it('should deserialize only whitelisted attributes', function(done) {
      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'My First article',
            body: 'Content of my article',
          }
        }
      };

      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        whitelistOnDeserialize: ['body'],
      });

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('body');
      expect(deserializedData).to.not.have.property('title');
      done();
    });

    it('should deserialize with \'links\' and \'meta\' properties', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles');

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          links: {
            self: '/articles/1'
          },
          meta: {
            metadata: 'test'
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('links').to.eql(data.data.links);
      expect(deserializedData).to.have.property('meta').to.eql(data.data.meta);
      done();
    });

    it('should throw an error if type has not been registered', function(done) {
      expect(function() {
        const Serializer = new JSONAPISerializer();
        Serializer.deserialize('authors', {});
      }).to.throw(Error, 'No type registered for authors');
      done();
    });

    it('should throw an error if type has not been registered for included relationship', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people'
          }
        }
      });

      const data = {
        data: {
          id: '1',
          type: 'article',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            }
          }
        },
        included: [{
          type: 'people',
          id: '1',
          attributes: {
            firstName: 'Kaley',
            lastName: 'Maggio',
            email: 'Kaley-Maggio@example.com',
            age: '80',
            gender: 'male'
          }
        }]
      };

      expect(function() {
        Serializer.deserialize('article', data);
      }).to.throw(Error, 'No type registered for people');
      done();
    });

    it('should deserialize with a custom schema', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', 'custom');

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            createdAt: '2015-05-22T14:56:29.000Z'
          }
        }
      };

      const deserializedData = Serializer.deserialize('articles', data, 'custom');
      expect(deserializedData).to.have.property('createdAt');
      done();
    });

    it('should throw an error if custom schema has not been registered', function(done) {
      expect(function() {
        const Serializer = new JSONAPISerializer();
        Serializer.register('articles', {});
        Serializer.deserialize('articles', {}, 'custom');
      }).to.throw(Error, 'No schema custom registered for articles');
      done();
    });
  });

  describe('deserializeAsync', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('articles', {});
    const dataArray = {
      data: [
        {
          type: 'articles',
          id: '1',
          attributes: {
            title: 'Article 1',
          },
        },
        { type: 'articles',
          id: '2',
          attributes: {
            title: 'Article 2',
          },
        },
        { type: 'articles',
          id: '3',
          attributes: {
            title: 'Article 3',
          },
        },
      ],
    };

    it('should return a Promise', () => {
      const promise = Serializer.deserializeAsync('articles', { data: {} });
      expect(promise).to.be.instanceOf(Promise);
    });

    it('should deserialize simple data', () => {
      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          },
          relationships: {
            author: {
              data: {
                type: 'people',
                id: '1'
              }
            },
            comments: {
              data: [{
                type: 'comment',
                id: '1'
              }, {
                type: 'comment',
                id: '2'
              }]
            }
          }
        }
      };

      return Serializer.deserializeAsync('articles', data)
      .then((deserializedData) => {
        expect(deserializedData).to.have.property('id');
        expect(deserializedData).to.have.property('title');
        expect(deserializedData).to.have.property('body');
        expect(deserializedData).to.have.property('created');
        expect(deserializedData).to.have.property('author', '1');
        expect(deserializedData).to.have.property('comments').to.be.instanceof(Array).to.eql(['1', '2']);
      });
    });

    it('should deserialize an array of data', () =>
    Serializer.deserializeAsync('articles', dataArray)
      .then((deserializedData) => {
        expect(deserializedData.length).to.eql(3);
      })
    );

    it('should deserialize each array item on next tick', () => {
      const tickCounter = new TickCounter(5);
      return Serializer.deserializeAsync('articles', dataArray)
        .then(() => {
          expect(tickCounter.ticks).to.eql(4);
        })
    });

    it('should throw an error if type has not been registered', function(done) {
      expect(function() {
        Serializer.deserializeAsync('authors', {});
      }).to.throw(Error, 'No type registered for authors');
      done();
    });

    it('should deserialize with a custom schema', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', 'custom');

      const data = {
        data: {
          type: 'article',
          id: '1',
          attributes: {
            createdAt: '2015-05-22T14:56:29.000Z'
          }
        }
      };

      Serializer.deserializeAsync('articles', data, 'custom').then((deserializedData) => {
        expect(deserializedData).to.have.property('createdAt');
        done();
      });
    });

    it('should throw an error if custom schema has not been registered', function(done) {
      expect(function() {
        Serializer.deserializeAsync('articles', {}, 'custom');
      }).to.throw(Error, 'No schema custom registered for articles');
      done();
    });

    it('should throw an error if no type can be resolved from data', function(done) {
      const singleData = {
        data: {
          id: '1'
        }
      };
      const typeOption = {type: 'type'};

      Serializer.deserializeAsync(typeOption, singleData)
      .catch(err => {
        expect(err).to.be.a('error');
        done()
      })
    });

    it('should deserialize mixed data with a dynamic type option as the first argument', () => {
      const data = {
        data: {
          type: 'articles',
          id: '1',
          attributes: {
            type: 'articles',
            title: 'JSON API paints my bikeshed!',
            body: 'The shortest article. Ever.'
          }
        }
      };

      return Serializer.deserializeAsync({type: 'type'}, data)
        .then((deserializedData) => {
          expect(deserializedData).to.have.property('type', 'articles');
          expect(deserializedData).to.have.property('id', '1');
          expect(deserializedData).to.have.property('title');
          expect(deserializedData).to.have.property('body');
        });
    });
  });

  describe('deserializeMixedData', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('article');
    Serializer.register('people');
    const typeOption = {type: 'type'};

    it('should return error if no type can be resolved from data', function(done) {
      const singleData = {
        data: {
          id: '1'
        }
      };

      expect(function() {
        Serializer.deserialize(typeOption, singleData);
      }).to.throw(Error, 'No type can be resolved from data: {"id":"1"}');
      done();
    });

    it('should return error if type has not been registered', function(done) {
      const singleData = {
        data: {
          id: '1',
          type: 'book'
        }
      };

      expect(function() {
        Serializer.deserialize(typeOption, singleData);
      }).to.throw(Error, 'No type registered for book');
      done();
    });

    it('should return deserialized data for a single data', function(done) {
      const singleData = {
        data: {
          id: '1',
          type: 'article',
          attributes: {
            title: 'JSON API paints my bikeshed!',
          }
        }
      };
      const deserializedData = Serializer.deserialize(typeOption, singleData);

      expect(deserializedData).to.have.property('id').to.eql('1');
      expect(deserializedData).to.have.property('title').to.eql('JSON API paints my bikeshed!');
      done();
    });

    it('should return deserialized data for an array with mixed data', function(done) {
      const arrayData = {
        data: [{
          id: '1',
          type: 'article',
          attributes: {
            title: 'JSON API paints my bikeshed!',
          }
        }, {
          id: '1',
          type: 'people',
          attributes: {
            firstName: 'Kaley',
          }
        }]
      };
      const deserializedData = Serializer.deserialize(typeOption, arrayData);
      expect(deserializedData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(deserializedData[0]).to.have.property('id').to.eql('1');
      expect(deserializedData[0]).to.have.property('title').to.eql('JSON API paints my bikeshed!');
      expect(deserializedData[1]).to.have.property('id').to.eql('1');
      expect(deserializedData[1]).to.have.property('firstName').to.eql('Kaley');
      done();
    });

    it('should return deserialized data with a type resolved from a function deriving a type-string from data', function(done) {
      const data = {
        data: {
          id: '1',
          type: 'article',
          attributes: {
            title: 'JSON API paints my bikeshed!',
          }
        }
      };
      const typeFuncOption = {type: (data) => data.type ? 'article' : ''};
      const deserializedData = Serializer.deserialize(typeOption, data);

      expect(deserializedData).to.have.property('id').to.eql('1');
      expect(deserializedData).to.have.property('title').to.eql('JSON API paints my bikeshed!');

      done();
    });
  });

  describe('serializeError', function() {
    const Serializer = new JSONAPISerializer();

    it('should return serialized error with an instance of Error', function(done) {
      const error = new Error('An error occured');

      const serializedError = Serializer.serializeError(error);

      expect(serializedError).to.have.property('errors').to.be.instanceof(Array).to.have.lengthOf(1);
      expect(serializedError.errors[0]).to.have.property('title').to.eql('Error');
      expect(serializedError.errors[0]).to.have.property('detail').to.eql('An error occured');

      done();
    });

    it('should return serialized error with a custom Error class', function(done) {
      class CustomError extends Error { };
      const error = new CustomError('An error occured');

      const serializedError = Serializer.serializeError(error);

      expect(serializedError).to.have.property('errors').to.be.instanceof(Array).to.have.lengthOf(1);
      expect(serializedError.errors[0]).to.have.property('title').to.eql('CustomError');
      expect(serializedError.errors[0]).to.have.property('detail').to.eql('An error occured');

      done();
    });

    it('should return serialized error with an instance of Error including additional properties status, code and title', function(done) {
      const error = new Error('An error occured');
      error.status = 500;
      error.code = 'ERROR';
      error.title = 'Error title';

      const serializedError = Serializer.serializeError(error);

      expect(serializedError).to.have.property('errors').to.be.instanceof(Array).to.have.lengthOf(1);
      expect(serializedError.errors[0]).to.have.property('status').to.eql('500');
      expect(serializedError.errors[0]).to.have.property('code').to.eql('ERROR');
      expect(serializedError.errors[0]).to.have.property('title').to.eql('Error title');
      expect(serializedError.errors[0]).to.have.property('detail').to.eql('An error occured');

      done();
    });

    it('should return serialized errors with an array of Error', function(done) {
      const errors = [new Error('First Error'), new Error('Second Error')];

      const serializedErrors = Serializer.serializeError(errors);

      expect(serializedErrors).to.have.property('errors').to.be.instanceof(Array).to.have.lengthOf(2);

      expect(serializedErrors.errors[0]).to.have.property('title').to.eql('Error');
      expect(serializedErrors.errors[0]).to.have.property('detail').to.eql('First Error');
      expect(serializedErrors.errors[1]).to.have.property('title').to.eql('Error');
      expect(serializedErrors.errors[1]).to.have.property('detail').to.eql('Second Error');

      done();
    });

    it('should return a error with bad input', function(done) {
      const jsonapiError = 'error';

      expect(function() {
        Serializer.serializeError(jsonapiError);
      }).to.throw(Error, 'error must be an object');

      done();
    });

    it('should return a validation error with bad source', function(done) {
      const jsonapiError = {
        source: 'malformed attribute'
      };

      const jsonapiError2 = {
        source: {
          pointer : {}
        }
      };

      const jsonapiError3 = {
        source: {
          parameter : {}
        }
      };

      expect(function() {
        Serializer.serializeError(jsonapiError);
      }).to.throw(Error, 'error \'source\' property must be an object');

      expect(function() {
        Serializer.serializeError(jsonapiError2);
      }).to.throw(Error, 'error \'source.pointer\' property must be a string');

      expect(function() {
        Serializer.serializeError(jsonapiError3);
      }).to.throw(Error, 'error \'source.parameter\' property must be a string');

      done();
    });

    it('should return a validation error with bad links', function(done) {
      const jsonapiErrorBadLink1 = {
        links: 'malformed attribute'
      };

      const jsonapiErrorBadLink2 = {
        links: {
          self: {href: {}}
        }
      }

      const jsonapiErrorBadLink3 = {
        links: {
          self: {
            meta: 'test'
          }
        }
      };

      const jsonapiErrorBadLink4 = {
        links: {
          self: true
        }
      };

      expect(function() {
        Serializer.serializeError(jsonapiErrorBadLink1);
      }).to.throw(Error, 'error \'link\' property must be an object');

      expect(function() {
        Serializer.serializeError(jsonapiErrorBadLink2);
      }).to.throw(Error, '\'links.self.href\' property must be a string');

      expect(function() {
        Serializer.serializeError(jsonapiErrorBadLink3);
      }).to.throw(Error, '\'links.self.meta\' property must be an object');

      expect(function() {
        Serializer.serializeError(jsonapiErrorBadLink4);
      }).to.throw(Error, 'error \'links.self\' must be a string or an object');

      done();
    });

    it('should return serialized error with a JSON API error object', function(done) {
      const jsonapiError = {
        id: '1',
        status: '422',
        links: {
          about: {
            href: '/path/to/about'
          }
        },
        code: '1',
        title: 'Error',
        detail: 'An error occured',
        source: { pointer: '/data/attributes/error' },
        meta: {}
      };

      const serializedError = Serializer.serializeError(jsonapiError);

      expect(serializedError).to.have.property('errors').to.be.instanceof(Array).to.have.lengthOf(1);
      expect(serializedError.errors[0]).to.deep.eql(jsonapiError);

      done();
    });

    it('should return serialized error with an array of JSON API error object', function(done) {
      const jsonapiErrors = [{
        status: '422',
        source: { pointer: '/data/attributes/first-error' },
        title: 'First Error',
        detail: 'First Error'
      }, {
        status: '422',
        source: { pointer: '/data/attributes/second-error' },
        title: 'Second Error',
        detail: 'Second Error'
      }];

      const serializedError = Serializer.serializeError(jsonapiErrors);

      expect(serializedError).to.have.property('errors').to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedError.errors).to.deep.eql([{
        status: '422',
        source: { pointer: '/data/attributes/first-error' },
        title: 'First Error',
        detail: 'First Error'
      }, {
        status: '422',
        source: { pointer: '/data/attributes/second-error' },
        title: 'Second Error',
        detail: 'Second Error'
      }]);

      done();
    });
  })

 describe('convertCase', function() {
  it('should return null', function() {
    const jsonapiSerializer = new JSONAPISerializer();
    const converted = jsonapiSerializer._convertCase(null, 'kebab-case');

    expect(converted).to.equal(null);
  });

  it('should convert an array of object to kebab-case', function() {
    const jsonapiSerializer = new JSONAPISerializer();
    const converted = jsonapiSerializer._convertCase(
      [{
        arrayOfObject: [
          {
            firstProperty: 'test',
            secondProperty: null,
            thirdProperty: 0
          }
        ],
        arrayOfNumber: [1, 2, 3, 4, 5],
        arrayOfString: ['firstString', 'secondString'],
        normalProperty: 'normalProperty',
        nullProperty: null,
      }],
      'kebab-case'
    );

    expect(converted).to.deep.equal([{
      'array-of-object': [{ 'first-property': 'test', 'second-property': null, 'third-property': 0 }],
      'array-of-number': [1, 2, 3, 4, 5],
      'array-of-string': ['firstString', 'secondString'],
      'normal-property': 'normalProperty',
      'null-property': null
    }]);
  });

  it('should convert an object to kebab-case', function() {
    const jsonapiSerializer = new JSONAPISerializer();
    const converted = jsonapiSerializer._convertCase(
      {
        arrayOfObject: [
          {
            firstProperty: 'test',
            secondProperty: null,
            thirdProperty: 0
          }
        ],
        arrayOfNumber: [1, 2, 3, 4, 5],
        arrayOfString: ['firstString', 'secondString'],
        normalProperty: 'normalProperty',
        nullProperty: null,
        date: new Date()
      },
      'kebab-case'
    );

    expect(converted['array-of-object']).to.deep.equal([{ 'first-property': 'test', 'second-property': null, 'third-property': 0 }]);
    expect(converted['array-of-number']).to.deep.equal([1, 2, 3, 4, 5]);
    expect(converted['array-of-string']).to.deep.equal(['firstString', 'secondString']);
    expect(converted['normal-property']).to.equal('normalProperty');
    expect(converted['null-property']).to.equal(null);
    expect(converted.date).to.be.a('Date');
  });
 });
});
