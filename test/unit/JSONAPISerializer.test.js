'use strict';
/* eslint-disable */

const expect = require('chai').expect;
const _ = require('lodash');
const ObjectID = require('bson-objectid');

const TickCounter = require('../helpers/tick-counter');

const JSONAPISerializer = require('../../');

describe('JSONAPISerializer', function() {
  describe('register', function() {
    it('should register an empty schema with the \'default\' schema name and default options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles');
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('default');
      expect(Serializer.schemas.articles.default).to.eql(Serializer.validateOptions({}));
      done();
    });

    it('should register a schema with the \'default\' schema name', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        id: 'id',
      });
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('default');
      expect(Serializer.schemas.articles.default).to.eql(Serializer.validateOptions({
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

  describe('serializeData', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('articles');
    const defaultOptions = Serializer.validateOptions({});

    it('should return null for an empty single data', function(done) {
      const serializedData = Serializer.serializeData('articles', {});
      expect(serializedData).to.eql(null);
      done();
    });

    it('should return empty array for an empty array data', function(done) {
      const serializedData = Serializer.serializeData('articles', []);
      expect(serializedData).to.eql([]);
      done();
    });

    it('should return serialized data for a single data', function(done) {
      const singleData = {
        id: '1',
        body: 'test body',
      };
      const serializedData = Serializer.serializeData('articles', singleData, defaultOptions);

      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData).to.have.property('attributes').to.have.property('body').to.eql('test body');
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;

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
      const serializedData = Serializer.serializeData('articles', arrayData, defaultOptions);
      expect(serializedData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedData[0]).to.have.property('type').to.eql('articles');
      expect(serializedData[0]).to.have.property('id').to.eql('1');
      expect(serializedData[0]).to.have.property('attributes').to.have.property('body').to.eql('test body 1');
      expect(serializedData[0].relationships).to.be.undefined;
      expect(serializedData[0].links).to.be.undefined;
      expect(serializedData[1]).to.have.property('type').to.eql('articles');
      expect(serializedData[1]).to.have.property('id').to.eql('2');
      expect(serializedData[1]).to.have.property('attributes').to.have.property('body').to.eql('test body 2');
      expect(serializedData[1].relationships).to.be.undefined;
      expect(serializedData[1].links).to.be.undefined;
      done();
    });

    it('should return serialized data with option id', function(done) {
      const singleData = {
        _id: '1',
      };
      const serializedData = Serializer.serializeData('articles', singleData, _.merge(defaultOptions, {
        id: '_id',
      }));
      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;

      done();
    });

    it('should return type of string for a non string id in input', function(done) {
      const singleData = {
        id: 1,
      };
      const serializedData = Serializer.serializeData('articles', singleData, _.merge(defaultOptions, {
        id: 'id',
      }));
      expect(serializedData).to.have.property('type').to.eql('articles');
      expect(serializedData).to.have.property('id').to.be.a('string').to.eql('1');
      done();
    });
  });

  describe('serializeMixedData', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('article');
    Serializer.register('people');
    const typeOption = {type: 'type'};
    const defaultTypeOption = Serializer.validateDynamicTypeOptions(typeOption);

    it('should return null for an empty single data', function(done) {
      const serializedData = Serializer.serializeMixedData(defaultTypeOption, {});
      expect(serializedData).to.eql(null);
      done();
    });

    it('should return empty array for an empty array data', function(done) {
      const serializedData = Serializer.serializeMixedData(defaultTypeOption, []);
      expect(serializedData).to.eql([]);
      done();
    });

    it('should return error if no type can be resolved from data', function(done) {
      const singleData = {
        id: '1',
        body: 'test body',
      };

      expect(function() {
        Serializer.serializeMixedData(defaultTypeOption, singleData);
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
        Serializer.serializeMixedData(defaultTypeOption, singleData);
      }).to.throw(Error, 'No type registered for book');
      done();
    });

    it('should return serialized data for a single data', function(done) {
      const singleData = {
        id: '1',
        type: 'article',
        body: 'test body',
      };
      const serializedData = Serializer.serializeMixedData(defaultTypeOption, singleData);

      expect(serializedData).to.have.property('type').to.eql('article');
      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData).to.have.property('attributes').to.have.property('body').to.eql('test body');
      expect(serializedData.relationships).to.be.undefined;
      expect(serializedData.links).to.be.undefined;

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
      const serializedData = Serializer.serializeMixedData(defaultTypeOption, arrayData);
      expect(serializedData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedData[0]).to.have.property('type').to.eql('article');
      expect(serializedData[0]).to.have.property('id').to.eql('1');
      expect(serializedData[0]).to.have.property('attributes').to.have.property('body').to.eql('article body');
      expect(serializedData[0].relationships).to.be.undefined;
      expect(serializedData[0].links).to.be.undefined;
      expect(serializedData[1]).to.have.property('type').to.eql('people');
      expect(serializedData[1]).to.have.property('id').to.eql('1');
      expect(serializedData[1]).to.have.property('attributes').to.have.property('body').to.eql('people body');
      expect(serializedData[1].relationships).to.be.undefined;
      expect(serializedData[1].links).to.be.undefined;
      done();
    });

    it('should return serialized data with a type resolved from a function deriving a type-string from data', function(done) {
      const singleData = {
        id: '1',
        type: 'article',
        body: 'test body',
      };
      const typeFuncOption = {type: (data) => data.type ? 'article' : ''};
      const defaultTypeFuncOption = Serializer.validateDynamicTypeOptions(typeFuncOption);
      const serializedData = Serializer.serializeMixedData(defaultTypeFuncOption, singleData);

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

    it('should return undefined for an undefined relationship data', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('articles', undefined);
      expect(serializedRelationshipData).to.eql(undefined);
      done();
    });

    it('should return null for an empty single relationship data', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('articles', {});
      expect(serializedRelationshipData).to.eql(null);
      done();
    });

    it('should return empty array for an empty array of relationship data', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('articles', []);
      expect(serializedRelationshipData).to.eql([]);
      done();
    });

    it('should return serialized relationship data and populated included for a to one populated relationship', function(done) {
      const included = [];
      const serializedRelationshipData = Serializer.serializeRelationship('authors', {
        id: '1',
        name: 'Author 1',
      }, Serializer.schemas.authors.default, included);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      expect(included).to.have.lengthOf(1);
      done();
    });

    it('should return serialized relationship data and populated included for a to many populated relationships', function(done) {
      const included = [];
      const serializedRelationshipData = Serializer.serializeRelationship('authors', [{
        id: '1',
        name: 'Author 1',
      }, {
        id: '2',
        name: 'Author 2',
      }], Serializer.schemas.authors.default, included);
      expect(serializedRelationshipData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedRelationshipData[0]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[0]).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationshipData[1]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[1]).to.have.property('id').to.be.a('string').to.eql('2');
      expect(included).to.have.lengthOf(2);
      done();
    });

    it('should return type of string for a to one populated relationship with non string id', function(done) {
      const included = [];
      const serializedRelationshipData = Serializer.serializeRelationship('authors', {
        id: 1
      }, Serializer.schemas.authors.default, included);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      done();
    });

    it('should return serialized relationship data and empty included for a to one unpopulated relationship', function(done) {
      const included = [];
      const serializedRelationshipData = Serializer.serializeRelationship('authors', '1', Serializer.schemas.authors.default, included);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      expect(included).to.have.lengthOf(0);
      done();
    });

    it('should return serialized relationship data and empty included for a to many unpopulated relationship', function(done) {
      const included = [];
      const serializedRelationshipData = Serializer.serializeRelationship('authors', ['1', '2'], Serializer.schemas.authors.default, included);
      expect(serializedRelationshipData).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedRelationshipData[0]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[0]).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationshipData[1]).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData[1]).to.have.property('id').to.be.a('string').to.eql('2');
      expect(included).to.have.lengthOf(0);
      done();
    });

    it('should return type of string for a to one unpopulated relationship with non string id', function(done) {
      const included = [];
      const serializedRelationshipData = Serializer.serializeRelationship('authors', 1, Serializer.schemas.authors.default, included);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string').to.eql('1');
      done();
    });

    it('should return serialized relationship with unpopulated relationship with mongoDB BSON ObjectID', function(done) {
      const serializedRelationshipData = Serializer.serializeRelationship('authors', new ObjectID(), Serializer.schemas.authors.default, []);
      expect(serializedRelationshipData).to.have.property('type').to.eql('authors');
      expect(serializedRelationshipData).to.have.property('id').to.be.a('string');
      done();
    });

    it('should return serialized relationship data and populated included with a custom schema', function(done) {
      const Serializer2 = new JSONAPISerializer();
      // Custom schema 'only-name' for authors resource
      Serializer2.register('authors', 'only-name', {
        whitelist: ['name']
      });

      const included = [];
      const serializedRelationshipData = Serializer2.serializeRelationship('authors', {
        id: '1',
        name: 'Author 1',
        gender: 'male'
      }, Serializer2.schemas.authors['only-name'], included);
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
      const included = [];
      const serializedRelationships = Serializer.serializeRelationships({
        id: '1',
        name: 'Author 1',
      }, Serializer.schemas.authors.default, included);
      expect(serializedRelationships).to.be.undefined;
      done();
    });

    it('should return relationships for author and comments', function(done) {
      const included = [];
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
      }, Serializer.schemas.articles.default, included);
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
      const included = [];
      const serializedRelationships = Serializer.serializeRelationships({
        id: '1',
        articleAuthors: {
          id: '1'
        },
      }, Serializer.schemas.articles.default, included);
      expect(serializedRelationships).to.have.property('article-authors');
      done();
    });

    it('should return relationships with alternativeKey option if relationship key not exist', function(done) {
      const included = [];
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
      }, Serializer.schemas.article.default, included);
      expect(serializedRelationships).to.have.property('author');
      expect(serializedRelationships.author).to.have.property('data');
      expect(serializedRelationships.author.data).to.have.property('type').to.eql('people');
      expect(serializedRelationships.author.data).to.have.property('id').to.be.a('string').to.eql('1');
      expect(serializedRelationships.author).to.have.property('links').to.be.undefined;
      done();
    });

    it('should throw an error if type as not been registered on a relationship', function(done) {
      const included = [];
      const Serializer = new JSONAPISerializer();

      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
          }
        }
      });

      expect(function() {
        Serializer.serializeRelationships({
          id: '1',
          author: '1'
        }, Serializer.schemas.article.default, included);
      }).to.throw(Error, 'No type registered for "people" on "author" relationship');
      done();
    });

    it('should throw an error if custom schema as not been registered on a relationship', function(done) {
      const included = [];
      const Serializer = new JSONAPISerializer();

      Serializer.register('article', {
        relationships: {
          author: {
            type: 'people',
            schema: 'custom'
          }
        }
      });

      Serializer.register('people');

      expect(function() {
        Serializer.serializeRelationships({
          id: '1',
          author: '1'
        }, Serializer.schemas.article.default, included);
      }).to.throw(Error, 'No schema "custom" registered for type "people" on "author" relationship');
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

  describe('serializeIncluded', function() {
    const Serializer = new JSONAPISerializer();
    it('should return undefined for empty included', function(done) {
      const serializedIncluded = Serializer.serializeIncluded([]);
      expect(serializedIncluded).to.be.undefined;
      done();
    });

    it('should return unique values', function(done) {
      const included = [{
        type: 'author',
        id: '1',
        name: 'Author 1',
      }, {
        type: 'author',
        id: '1',
        name: 'Author 1',
      }];
      const serializedIncluded = Serializer.serializeIncluded(included);
      expect(serializedIncluded).to.have.lengthOf(1);
      done();
    });
  });

  describe('serializeIncludedAsync', function() {
    const Serializer = new JSONAPISerializer();

    it('should return a Promise', () => {
      const promise = Serializer.serializeIncludedAsync([]);
      expect(promise).to.be.instanceOf(Promise);
    });

    it('should return undefined for empty included', () =>
      Serializer.serializeIncludedAsync([])
        .then((serializedIncluded) => {
          expect(serializedIncluded).to.be.undefined;
        })
    );

    it('should return unique values', () => {
      const included = [{
        type: 'author',
        id: '1',
        name: 'Author 1',
      }, {
        type: 'author',
        id: '1',
        name: 'Author 1',
      }];
      return Serializer.serializeIncludedAsync(included)
        .then((serializedIncluded) => {
          expect(serializedIncluded).to.have.lengthOf(1);
        })
    });

    it('should serialize each array item on next tick', () => {
      const included = [{
        type: 'author',
        id: '1',
        name: 'Author 1',
      }, {
        type: 'author',
        id: '1',
        name: 'Author 1',
      }];
      const tickCounter = new TickCounter(5);
      return Serializer.serializeIncludedAsync(included)
        .then(() => {
          expect(tickCounter.ticks).to.eql(3);
        })
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
  });

  describe('serialize', function() {
    const Serializer = new JSONAPISerializer();
    Serializer.register('articles', {
      topLevelMeta: {
        count: function(options) {
          return options.count
        }
      }
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
      }).to.throw(Error, 'ValidationError');
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
      topLevelMeta: {
        count: function(options) {
          return options.count
        }
      }
    });

    it('should return a Promise', () => {
      const promise = Serializer.serializeAsync('articles', {});
      expect(promise).to.be.instanceOf(Promise);
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
      }).to.throw(Error, 'ValidationError');
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

    it('should deserialize with \'alternativeKey\' options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        relationships: {
          author: {
            type: 'people',
            alternativeKey: 'author_id'
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
      expect(deserializedData).to.have.property('author_id');
      expect(deserializedData).to.not.property('author');
      done();
    });

    it('should deserialize with \'unconvertCase\' options', function(done) {
      const Serializer = new JSONAPISerializer();
      Serializer.register('articles', {
        unconvertCase: 'snake_case'
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
      expect(deserializedData).to.have.property('article_author');
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

    it('should throw an error if type has not been registered', function(done) {
      expect(function() {
        const Serializer = new JSONAPISerializer();
        Serializer.deserialize('authors', {});
      }).to.throw(Error, 'No type registered for authors');
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
});
