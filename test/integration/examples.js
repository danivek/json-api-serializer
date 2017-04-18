'use strict';
/* eslint-disable */

const expect = require('chai').expect;
const _ = require('lodash');
const JSONAPISerializer = require('../../');
const articlesData = require('../fixture/articles.data');
const mixedData = require('../fixture/mixed.data.js');

describe('Examples', function() {
  var Serializer = new JSONAPISerializer();
  Serializer.register('article', {
    id: 'id',
    blacklist: ['updated'],
    links: function(data) {
      return {
        self: '/articles/' + data.id
      }
    },
    relationships: {
      author: {
        type: 'people',
        links: function(data) {
          return {
            self: '/articles/' + data.id + '/relationships/author',
            related: '/articles/' + data.id + '/author'
          }
        }
      },
      tags: {
        type: 'tag'
      },
      photos: {
        type: 'photo'
      },
      comments: {
        type: 'comment',
        schema: 'only-body'
      }
    },
    topLevelMeta: function(extraOptions) {
      return {
        count: extraOptions.count
      }
    },
    topLevelLinks: {
      self: '/articles'
    }
  });
  Serializer.register('people', {
    id: 'id',
    links: function(data) {
      return {
        self: '/peoples/' + data.id
      }
    }
  });
  Serializer.register('tag', {
    id: 'id',
  });
  Serializer.register('photo', {
    id: 'id',
  });
  Serializer.register('comment', 'only-body', {
    id: '_id',
    whitelist: ['body']
  });

  it('should serialize articles data', function(done) {
    var serializedData = Serializer.serialize('article', articlesData, {
      count: 2
    });
    expect(serializedData).to.have.property('jsonapi').to.have.property('version');
    expect(serializedData).to.have.property('meta').to.have.property('count').to.eql(2);
    expect(serializedData).to.have.property('links').to.have.property('self').to.eql('/articles');
    expect(serializedData).to.have.property('data');
    expect(serializedData.data).to.be.instanceof(Array).to.have.lengthOf(2);
    expect(serializedData.data[0]).to.have.property('type').to.eql('article');
    expect(serializedData.data[0]).to.have.property('id').to.be.a('string').to.eql('1');
    expect(serializedData.data[0]).to.have.property('attributes');
    expect(serializedData.data[0].attributes).to.have.property('title');
    expect(serializedData.data[0].attributes).to.have.property('body');
    expect(serializedData.data[0].attributes).to.have.property('created');
    expect(serializedData.data[0].attributes).to.not.have.property('updated');
    expect(serializedData.data[0]).to.have.property('relationships');
    expect(serializedData.data[0].relationships).to.have.property('author');
    expect(serializedData.data[0].relationships.author).to.have.property('data');
    expect(serializedData.data[0].relationships.author.data).to.have.property('type').to.eql('people');
    expect(serializedData.data[0].relationships.author.data).to.have.property('id');
    expect(serializedData.data[0].relationships.author).to.have.property('links');
    expect(serializedData.data[0].relationships.author.links).to.have.property('self').to.eql('/articles/1/relationships/author');
    expect(serializedData.data[0].relationships.author.links).to.have.property('related').to.eql('/articles/1/author');
    expect(serializedData.data[0].relationships).to.have.property('tags');
    expect(serializedData.data[0].relationships.tags).to.have.property('data');
    expect(serializedData.data[0].relationships.tags.data).to.be.instanceof(Array).to.have.lengthOf(2);
    expect(serializedData.data[0].relationships.tags.data[0]).to.have.property('type').to.eql('tag');
    expect(serializedData.data[0].relationships.tags.data[0]).to.have.property('id').to.be.a('string');
    expect(serializedData.data[0].relationships).to.have.property('photos');
    expect(serializedData.data[0].relationships.photos).to.have.property('data');
    expect(serializedData.data[0].relationships.photos.data).to.be.instanceof(Array).to.have.lengthOf(3);
    expect(serializedData.data[0].relationships.photos.data[0]).to.have.property('type').to.eql('photo');
    expect(serializedData.data[0].relationships.photos.data[0]).to.have.property('id').to.be.a('string');
    expect(serializedData.data[0].relationships).to.have.property('comments');
    expect(serializedData.data[0].relationships.comments.data).to.be.instanceof(Array).to.have.lengthOf(3);
    expect(serializedData.data[0].relationships.comments.data[0]).to.have.property('type').to.eql('comment');
    expect(serializedData.data[0].relationships.comments.data[0]).to.have.property('id').to.be.a('string');
    expect(serializedData.data[0]).to.have.property('links');
    expect(serializedData.data[0].links).to.have.property('self').to.eql('/articles/1');
    expect(serializedData).to.have.property('included');
    expect(serializedData.included).to.be.instanceof(Array).to.have.lengthOf(10);
    var includedAuhor1 = _.find(serializedData.included, {
      'type': 'people',
      'id': '1'
    });
    expect(includedAuhor1).to.have.property('attributes');
    expect(includedAuhor1.attributes).to.have.property('firstName');
    expect(includedAuhor1.attributes).to.have.property('lastName');
    expect(includedAuhor1.attributes).to.have.property('email');
    expect(includedAuhor1.attributes).to.have.property('age');
    expect(includedAuhor1.attributes).to.have.property('gender');
    expect(includedAuhor1).to.have.property('links');
    expect(includedAuhor1.links).to.have.property('self').to.eql('/peoples/1');
    var includedComment1 = _.find(serializedData.included, {
      'type': 'comment',
      'id': '1'
    });
    expect(includedComment1).to.have.property('attributes');
    expect(includedComment1.attributes).to.have.property('body');
    expect(includedComment1.attributes).to.not.have.property('created');
    done();
  });

  it('should serialize articles data (async)', () => {
    var expected = Serializer.serialize('article', articlesData, {
      count: 2
    });
    return Serializer.serializeAsync('article', articlesData, { count: 2 })
      .then((actual) => {
        expect(actual).to.deep.equal(expected);
      })
  });

  it('should serialize with global options on \'JSONAPISerializer\' instance', (done) => {
    const SerializerWithGlobalOptions = new JSONAPISerializer({
      convertCase: 'kebab-case'
    });

    SerializerWithGlobalOptions.register('article');

    const serializedData = SerializerWithGlobalOptions.serialize('article', { id: '1', articleBody: 'JSON API specifications' });
    expect(serializedData.data.attributes).to.have.property('article-body');
    done();
  });

  it('should serialize mixed data', (done) => {
    const dynamicTypeOption = {
      type: 'type',
      topLevelMeta: function(extraOptions) {
        return {
          count: extraOptions.count
        }
      },
      topLevelLinks: {
        self: '/mixed'
      }
    }
    var serializedData = Serializer.serialize(dynamicTypeOption, mixedData, {
      count: 2
    });
    expect(serializedData).to.have.property('jsonapi').to.have.property('version');
    expect(serializedData).to.have.property('meta').to.have.property('count').to.eql(2);
    expect(serializedData).to.have.property('links').to.have.property('self').to.eql('/mixed');
    expect(serializedData).to.have.property('data');
    expect(serializedData.data).to.be.instanceof(Array).to.have.lengthOf(2);
    expect(serializedData.data[0]).to.have.property('type').to.eql('article');
    expect(serializedData.data[1]).to.have.property('type').to.eql('people');
    done();
   });

 it('should serialize mixed data (async)', () => {
   const dynamicTypeOption = {
     type: 'type',
     topLevelMeta: function(extraOptions) {
       return {
         count: extraOptions.count
       }
     },
     topLevelLinks: {
       self: '/mixed'
     }
   }
   var expected = Serializer.serialize(dynamicTypeOption, mixedData, {
     count: 2
   });
   return Serializer.serializeAsync(dynamicTypeOption, mixedData, { count: 2 })
     .then((actual) => {
       expect(actual).to.deep.equal(expected);
     })
  });
});
