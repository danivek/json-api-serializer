# json-api-serializer
[![Build Status](https://travis-ci.org/danivek/json-api-serializer.svg?branch=master)](https://travis-ci.org/danivek/json-api-serializer)
[![Coverage Status](https://coveralls.io/repos/github/danivek/json-api-serializer/badge.svg?branch=master)](https://coveralls.io/github/danivek/json-api-serializer?branch=master)
[![npm](https://img.shields.io/npm/v/json-api-serializer.svg)](https://www.npmjs.org/package/json-api-serializer)

A Node.js framework agnostic library for serializing your data to [JSON API](http://jsonapi.org/) compliant responses (a specification for building APIs in JSON).

***Why another library for serializing data to JSON API ?***

Simply because others libraries are not as flexible as i need.


## Installation
```bash
npm install --save json-api-serializer
```

## Documentation

#### Register

```javascript
var JSONAPISerializer = require('json-api-serializer');
var Serializer = new JSONAPISerializer();
Serializer.register(type, options);
```
**Serialization options :**

- **id** (optional): The attributes to use as the reference. Default = 'id'.
- **blacklist** (optional): An array of blacklisted attributes. Default = [].
- **whitelist** (optional): An array of whitelisted attributes. Default = [].
- **links** (optional): An *object* or a *function* that describes the links inside data. (If it is an object values can be string or function).
- **topLevelMeta** (optional): An *object* or a *function* that describes the top-level meta. (If it is an object values can be string or function).
- **topLevelLinks** (optional): An *object* or a *function* that describes the top-level links. (If it is an object values can be string or function).
- **relationships** (optional): An object defining some relationships
    - relationship: The property in data to use as a relationship
        - **type**: The type to use for serializing the relationship (type need to be register)
        - **alternativeKey** (optional): An alternative key to use if relationship key not exist (example: 'author_id' as an alternative key for 'author' relationship). See [issue #12](https://github.com/danivek/json-api-serializer/issues/12).
        - **schema** (optional): A custom schema for serializing the relationship. If no schema define, it use the default one.
        - **links** (optional): An *object* or a *function* that describes the links for the relationship. (If it is an object values can be string or function).
- **convertCase** (optional): Case conversion for serializing data. Value can be : `kebab-case`, `snake_case`, `camelCase`

**Deserialization options :**

- **unconvertCase** (optional): Case conversion for deserializing data. Value can be : `kebab-case`, `snake_case`, `camelCase`
- **blacklistOnDeserialize** (optional): An array of blacklisted attributes. Default = [].
- **whitelistOnDeserialize** (optional): An array of whitelisted attributes. Default = [].


## Usage

input data (can be an object or an array of objects)
```javascript
// Data
var data = [{
  id: "1",
  title: "JSON API paints my bikeshed!",
  body: "The shortest article. Ever.",
  created: "2015-05-22T14:56:29.000Z",
  updated: "2015-05-22T14:56:28.000Z",
  author: {
    id: "1",
    firstName: "Kaley",
    lastName: "Maggio",
    email: "Kaley-Maggio@example.com",
    age: "80",
    gender: "male"
  },
  tags: ["1", "2"],
  photos: ["ed70cf44-9a34-4878-84e6-0c0e4a450cfe", "24ba3666-a593-498c-9f5d-55a4ee08c72e", "f386492d-df61-4573-b4e3-54f6f5d08acf"],
  comments: [{
    _id: "1",
    body: "First !",
    created: "2015-08-14T18:42:16.475Z"
  }, {
    _id: "2",
    body: "I Like !",
    created: "2015-09-14T18:42:12.475Z"
  }, {
    _id: "3",
    body: "Awesome",
    created: "2015-09-15T18:42:12.475Z"
  }]
}]
```

### Register
Register your resources types :
```javascript
var JSONAPISerializer = require('json-api-serializer');
var Serializer = new JSONAPISerializer();

// Register 'article' type
Serializer.register('article', {
  id: 'id', // The attributes to use as the reference. Default = 'id'.
  blacklist: ['updated'], // An array of blacklisted attributes. Default = []
  links: { // An object or a function that describes links.
    self: function(data) { // Can be a function or a string value ex: { self: '/articles/1'}
      return '/articles/' + data.id;
    }
  },
  relationships: { // An object defining some relationships.
    author: {
      type: 'people', // The type of the resource
      links: function(data) { // An object or a function that describes Relationships links
        return {
          self: '/articles/' + data.id + '/relationships/author',
          related: '/articles/' + data.id + '/author'
        }
      },
    },
    tags: {
      type: 'tag'
    },
    photos: {
      type: 'photo'
    },
    comments: {
      type: 'comment',
      schema: 'only-body' // A custom schema
    }
  },
  topLevelMeta: function(extraOptions) { // An object or a function that describes top level meta.
    return {
      count: extraOptions.count,
      total: extraOptions.total
    }
  },
  topLevelLinks: { // An object or a function that describes top level links.
    self: '/articles' // Can be a function (with extra options argument) or a string value
  }
});

// Register 'people' type
Serializer.register('people', {
  id: 'id',
  links: {
    self: function(data) {
      return '/peoples/' + data.id;
    }
  }
});

// Register 'tag' type
Serializer.register('tag', {
  id: 'id',
});

// Register 'photo' type
Serializer.register('photo', {
  id: 'id',
});

// Register 'comment' type with a custom schema
Serializer.register('comment', 'only-body', {
  id: '_id',
});
```

### Serialize

Serialize it with the corresponding resource type, data and optional extra options :

```javascript
Serializer.serialize('article', data, {count: 2});
```

The output data will be :
```JSON
{
  "jsonapi": {
    "version": "1.0"
  },
  "meta": {
    "count": 2
  },
  "links": {
    "self": "/articles"
  },
  "data": [{
    "type": "article",
    "id": "1",
    "attributes": {
      "title": "JSON API paints my bikeshed!",
      "body": "The shortest article. Ever.",
      "created": "2015-05-22T14:56:29.000Z"
    },
    "relationships": {
      "author": {
        "data": {
          "type": "people",
          "id": "1"
        },
        "links": {
          "self": "/articles/1/relationships/author",
          "related": "/articles/1/author"
        }
      },
      "tags": {
        "data": [{
          "type": "tag",
          "id": "1"
        }, {
          "type": "tag",
          "id": "2"
        }]
      },
      "photos": {
        "data": [{
          "type": "photo",
          "id": "ed70cf44-9a34-4878-84e6-0c0e4a450cfe"
        }, {
          "type": "photo",
          "id": "24ba3666-a593-498c-9f5d-55a4ee08c72e"
        }, {
          "type": "photo",
          "id": "f386492d-df61-4573-b4e3-54f6f5d08acf"
        }]
      },
      "comments": {
        "data": [{
          "type": "comment",
          "id": "1"
        }, {
          "type": "comment",
          "id": "2"
        }, {
          "type": "comment",
          "id": "3"
        }]
      }
    },
    "links": {
      "self": "/articles/1"
    }
  }],
  "included": [{
    "type": "people",
    "id": "1",
    "attributes": {
      "firstName": "Kaley",
      "lastName": "Maggio",
      "email": "Kaley-Maggio@example.com",
      "age": "80",
      "gender": "male"
    },
    "links": {
      "self": "/peoples/1"
    }
  }, {
    "type": "comment",
    "id": "1",
    "attributes": {
      "body": "First !"
    }
  }, {
    "type": "comment",
    "id": "2",
    "attributes": {
      "body": "I Like !"
    }
  }, {
    "type": "comment",
    "id": "3",
    "attributes": {
      "body": "Awesome"
    }
  }]
}
```
Some others examples are available in [ tests folders](https://github.com/danivek/json-api-serializer/blob/master/test/)

### Deserialize

input data (can be an simple object or an array of objects)

```javascript
var data = {
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

Serializer.deserialize('article', data);
```

```JSON
{
  "id": "1",
  "title": "JSON API paints my bikeshed!",
  "body": "The shortest article. Ever.",
  "created": "2015-05-22T14:56:29.000Z",
  "author": "1",
  "comments": [
    "1",
    "2"
  ]
}
```


## Custom schemas

It is possible to define multiple custom schemas for a resource type :

```javascript
Serializer.register(type, 'customSchema', options);
```

Then you can apply this schema on the primary data when serialize or deserialize :

```javascript
Serializer.serialize('article', data, 'customSchema', {count: 2});
Serializer.deserialize('article', jsonapiData, 'customSchema');
```

Or if you want to apply this schema on a relationship data, define this schema on relationships options with the key `schema` :

Example :
```javascript
relationships: {
  comments: {
  type: 'comment'
  schema: 'customSchema'
  }
}
```

## Requirements

json-api-serializer only use ECMAScript 2015 (ES6) features supported natively by Node.js 4 and above ([ECMAScript 2015 (ES6) | Node.js](https://nodejs.org/en/docs/es6/)). Make sure that you have Node.js 4+ or above.

## License

[MIT](https://github.com/danivek/json-api-serializer/blob/master/LICENSE)
