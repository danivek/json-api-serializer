# json-api-serializer

[![Build Status](https://travis-ci.org/danivek/json-api-serializer.svg?branch=master)](https://travis-ci.org/danivek/json-api-serializer)
[![Coverage Status](https://coveralls.io/repos/github/danivek/json-api-serializer/badge.svg?branch=master)](https://coveralls.io/github/danivek/json-api-serializer?branch=master)
[![npm](https://img.shields.io/npm/v/json-api-serializer.svg)](https://www.npmjs.org/package/json-api-serializer)

A Node.js/browser framework agnostic library for serializing your data to [JSON API](http://jsonapi.org/) compliant responses (a specification for building APIs in JSON).

## Installation

```bash
npm install --save json-api-serializer
```

## Documentation

### Register

```javascript
var JSONAPISerializer = require("json-api-serializer");
var Serializer = new JSONAPISerializer();
Serializer.register(type, options);
```

**Serialization options:**

* **id** (optional): The key to use as the reference. Default = 'id'.
* **blacklist** (optional): An array of blacklisted attributes. Default = [].
* **whitelist** (optional): An array of whitelisted attributes. Default = [].
* **jsonapiObject** (optional): Enable/Disable [JSON API Object](http://jsonapi.org/format/#document-jsonapi-object). Default = true.
* **links** (optional): Describes the links inside data. It can be:
  * An _object_ (values can be string or function).
  * A _function_ with one argument `function(data) { ... }` or with two arguments `function(data, extraData) { ... }`
* **topLevelMeta** (optional): Describes the top-level meta. It can be:
  * An _object_ (values can be string or function).
  * A _function_ with one argument `function(extraData) { ... }` or with two arguments `function(data, extraData) { ... }`
* **topLevelLinks** (optional): Describes the top-level links. It can be:
  * An _object_ (values can be string or function).
  * A _function_ with one argument `function(extraData) { ... }` or with two arguments `function(data, extraData) { ... }`
* **meta** (optional): Describes resource-level meta. It can be:
  * An _object_ (values can be string or function).
  * A _function_ with one argument `function(data) { ... }` or with two arguments `function(data, extraData) { ... }`
* **relationships** (optional): An object defining some relationships
  * relationship: The property in data to use as a relationship
    * **type**: A _string_ or a _function_ `function(relationshipData, data) { ... }` for the type to use for serializing the relationship (type need to be register).
    * **alternativeKey** (optional): An alternative key (string or path) to use if relationship key not exist (example: 'author_id' as an alternative key for 'author' relationship). See [issue #12](https://github.com/danivek/json-api-serializer/issues/12).
    * **schema** (optional): A custom schema for serializing the relationship. If no schema define, it use the default one.
    * **links** (optional): Describes the links for the relationship. It can be:
      * An _object_ (values can be string or function).
      * A _function_ with one argument `function(data) { ... }` or with two arguments `function(data, extraData) { ... }`
    * **meta** (optional): Describes meta that contains non-standard meta-information about the relationship. It can be:
      * An _object_ (values can be string or function).
      * A _function_ with one argument `function(data) { ... }` or with two arguments `function(data, extraData) { ... }`
    * **deserialize** (optional): Describes the function which should be used to deserialize a related property which is not included in the JSON:API document. It should be:
      * A _function_ with one argument `function(data) { ... }`which defines the format to which a relation should be deserialized. By default, the ID of the related object is returned, which would be equal to `function(data) {return data.id}`. See [issue #65](https://github.com/danivek/json-api-serializer/issues/65).
* **convertCase** (optional): Case conversion for serializing data. Value can be : `kebab-case`, `snake_case`, `camelCase`
* **beforeSerialize** (optional): A _function_ with one argument `beforeSerialize(data) => newData` to transform data before serialization.

**Deserialization options:**

* **unconvertCase** (optional): Case conversion for deserializing data. Value can be : `kebab-case`, `snake_case`, `camelCase`
* **blacklistOnDeserialize** (optional): An array of blacklisted attributes. Default = [].
* **whitelistOnDeserialize** (optional): An array of whitelisted attributes. Default = [].
* **afterDeserialize** (optional): A _function_ with one argument `afterDeserialize(data) => newData` to transform data after deserialization.

**Global options:**

To avoid repeating the same options for each type, it's possible to add global options on `JSONAPISerializer` instance:

When using convertCase, a LRU cache is utilized for optimization. The default size of the cache is 5000 per conversion type. The size of the cache can be set with the `convertCaseCacheSize` option. Passing in 0 will result in a LRU cache of infinite size.

```javascript
var JSONAPISerializer = require("json-api-serializer");
var Serializer = new JSONAPISerializer({
  convertCase: "kebab-case",
  unconvertCase: "camelCase",
  convertCaseCacheSize: 0
});
```

## Usage

input data (can be an object or an array of objects)

```javascript
// Data
var data = [
  {
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
    photos: [
      "ed70cf44-9a34-4878-84e6-0c0e4a450cfe",
      "24ba3666-a593-498c-9f5d-55a4ee08c72e",
      "f386492d-df61-4573-b4e3-54f6f5d08acf"
    ],
    comments: [
      {
        _id: "1",
        body: "First !",
        created: "2015-08-14T18:42:16.475Z"
      },
      {
        _id: "2",
        body: "I Like !",
        created: "2015-09-14T18:42:12.475Z"
      },
      {
        _id: "3",
        body: "Awesome",
        created: "2015-09-15T18:42:12.475Z"
      }
    ]
  }
];
```

### Register

Register your resources types :

```javascript
var JSONAPISerializer = require("json-api-serializer");
var Serializer = new JSONAPISerializer();

// Register 'article' type
Serializer.register("article", {
  id: "id", // The attributes to use as the reference. Default = 'id'.
  blacklist: ["updated"], // An array of blacklisted attributes. Default = []
  links: {
    // An object or a function that describes links.
    self: function(data) {
      // Can be a function or a string value ex: { self: '/articles/1'}
      return "/articles/" + data.id;
    }
  },
  relationships: {
    // An object defining some relationships.
    author: {
      type: "people", // The type of the resource
      links: function(data) {
        // An object or a function that describes Relationships links
        return {
          self: "/articles/" + data.id + "/relationships/author",
          related: "/articles/" + data.id + "/author"
        };
      }
    },
    tags: {
      type: "tag"
    },
    photos: {
      type: "photo"
    },
    comments: {
      type: "comment",
      schema: "only-body" // A custom schema
    }
  },
  topLevelMeta: function(data, extraData) {
    // An object or a function that describes top level meta.
    return {
      count: extraData.count,
      total: data.length
    };
  },
  topLevelLinks: {
    // An object or a function that describes top level links.
    self: "/articles" // Can be a function (with extra data argument) or a string value
  }
});

// Register 'people' type
Serializer.register("people", {
  id: "id",
  links: {
    self: function(data) {
      return "/peoples/" + data.id;
    }
  }
});

// Register 'tag' type
Serializer.register("tag", {
  id: "id"
});

// Register 'photo' type
Serializer.register("photo", {
  id: "id"
});

// Register 'comment' type with a custom schema
Serializer.register("comment", "only-body", {
  id: "_id"
});
```

### Serialize

Serialize it with the corresponding resource type, data and optional extra data :

```javascript
// Synchronously (blocking)
const result = Serializer.serialize('article', data, {count: 2});

// Asynchronously (non-blocking)
Serializer.serializeAsync('article', data, {count: 2})
  .then((result) => {
    ...
  });
```

The output data will be :

```JSON
{
  "jsonapi": {
    "version": "1.0"
  },
  "meta": {
    "count": 2,
    "total": 1
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

There is an available argument `excludeData` that will exclude the `data`
property from the serialized object. This can be used in cases where you may
want to only include the `topLevelMeta` in your response, such as a `DELETE`
response with only a `meta` property, or other cases defined in the
JSON:API spec.

```javascript
// Synchronously (blocking)
const result = Serializer.serialize('article', data, 'default', {count: 2}, true);

// Asynchronously (non-blocking)
Serializer.serializeAsync('article', data, 'default', {count: 2}, true)
  .then((result) => {
    ...
  });
```

#### Override schema options

On each individual call to `serialize` or `serializeAsync`, there is an parameter to override the options of any registered type. For example on a call to serialize, if a whitelist was not defined on the registered schema options, a whitelist (or any other options) for that type can be provided. This parameter is an object, where the key are the registered type names, and the values are the objects to override the registered schema.

In the following example, only the attribute `name` will be serialized on the article, and if there is a relationship for `person`, it will be serialized with `camelCase` even if the registered schema has a different value.
```
const result = Serializer.serialize('article', data, 'default', {count: 2}, true), {
  article: {
    whitelist: ['name']
  },
  person: {
    convertCase: 'camelCase'
  }
};
```


Some others examples are available in [tests folders](https://github.com/danivek/json-api-serializer/blob/master/test/)

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

// Synchronously (blocking)
Serializer.deserialize('article', data);

// Asynchronously (non-blocking)
Serializer.deserializeAsync('article', data)
  .then((result) => {
    // ...
  });
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

### serializeError

Serializes any error into a JSON API error document.

Input data can be:
  - An instance of `Error` or an array of `Error` instances.
  - A [JSON API error object](http://jsonapi.org/format/#error-objects) or an array of [JSON API error objects](http://jsonapi.org/format/#error-objects).

Using an instance of `Error`:

```javascript
const error = new Error('An error occurred');
error.id = 123
error.links = { about: 'https://example.com/errors/123' }
error.status = 500; // or `statusCode`
error.code = 'xyz'
error.meta = { time: Date.now() }

Serializer.serializeError(error);
```

The result will be:

```JSON
{
  "errors": [
    {
      "id": 123,
      "links": {
        "about": "https://example.com/errors/123"
      },
      "status": "500",
      "code": "xyz",
      "title": "Error",
      "detail": "An error occurred",
      "meta": {
        "time": 1593561258853
      }
    }
  ]
}
```

Using an instance of a class that inherits from `Error`:

```js
class MyCustomError extends Error {
  constructor(message = 'Something went wrong') {
    super(message)
    this.id = 123
    this.links = {
      about: 'https://example.com/errors/123'
    }
    this.status = 500 // or `statusCode`
    this.code = 'xyz'
    this.meta = {
      time: Date.now()
    }
  }
}

Serializer.serializeError(new MyCustomError());
```

The result will be:

```JSON
{
  "errors": [
    {
      "id": 123,
      "links": {
        "about": "https://example.com/errors/123"
      },
      "status": "500",
      "code": "xyz",
      "title": "MyCustomError",
      "detail": "Something went wrong",
      "meta": {
        "time": 1593561258853
      }
    }
  ]
}
```

Using a POJO:

```js
Serializer.serializeError({
  id: 123,
  links: {
    about: 'https://example.com/errors/123'
  },
  status: 500, // or `statusCode`
  code: 'xyz',
  title: 'UserNotFound',
  detail: 'Unable to find a user with the provided ID',
  meta: {
    time: Date.now()
  }
});
```

The result will be:

```JSON
{
  "errors": [
    {
      "id": 123,
      "links": {
        "about": "https://example.com/errors/123"
      },
      "status": "500",
      "code": "xyz",
      "title": "UserNotFound",
      "detail": "Unable to find a user with the provided ID",
      "meta": {
        "time": 1593561258853
      }
    }
  ]
}
```

## Custom schemas

It is possible to define multiple custom schemas for a resource type :

```javascript
Serializer.register(type, "customSchema", options);
```

Then you can apply this schema on the primary data when serialize or deserialize :

```javascript
Serializer.serialize("article", data, "customSchema", { count: 2 });
Serializer.serializeAsync("article", data, "customSchema", { count: 2 });
Serializer.deserialize("article", jsonapiData, "customSchema");
Serializer.deserializeAsync("article", jsonapiData, "customSchema");
```

Or if you want to apply this schema on a relationship data, define this schema on relationships options with the key `schema` :

Example :

```javascript
relationships: {
  comments: {
    type: "comment";
    schema: "customSchema";
  }
}
```

## Mixed data (dynamic type)

### Serialize

If your data contains one or multiple objects of different types, it's possible to define a configuration object instead of the type-string as the first argument of `serialize` and `serializeAsync` with these options:

* **type** (required): A _string_ for the path to the key to use to determine type or a _function_ deriving a type-string from each data-item.
* **jsonapiObject** (optional): Enable/Disable [JSON API Object](http://jsonapi.org/format/#document-jsonapi-object). Default = true.
* **topLevelMeta** (optional): Describes the top-level meta. It can be:
  * An _object_ (values can be string or function).
  * A _function_ with one argument `function(extraData) { ... }` or with two arguments `function(data, extraData) { ... }`
* **topLevelLinks** (optional): Describes the top-level links. It can be:
  * An _object_ (values can be string or function).
  * A _function_ with one argument `function(extraData) { ... }` or with two arguments `function(data, extraData) { ... }`

Example :

```javascript
const typeConfig = {
  // Same as type: 'type'
  type: data => data.type // Can be very complex to determine different types of items.
};

Serializer.serializeAsync(typeConfig, data, { count: 2 }).then(result => {
  // ...
});
```

### Deserialize

If your data contains one or multiple objects of different types, it's possible to define a configuration object instead of the type-string as the first argument of `deserialize` with these options:

* **type** (required): A _string_ for the path to the key to use to determine type or a _function_ deriving a type-string from each data-item.

Example :

```javascript
const typeConfig = {
  // Same as type: 'type'
  type: data => data.type // Can be very complex to determine different types of items.
};

const deserialized = Serializer.deserializeAsync(typeConfig, data).then(result => {
  // ...
});
```

## Custom serialization and deserialization

If your data requires some specific transformations, those can be applied using `beforeSerialize` and `afterDeserialize`

Example for composite primary keys:

```javascript
Serializer.register('translation', {
    beforeSerialize: (data) => {
      // Exclude pk1 and pk2 from data
      const { pk1, pk2, ...attributes } = data;

      // Compute external id
      const id = `${pk1}-${pk2}`;

      // Return data with id
      return {
        ...attributes,
        id
      };
    },
    afterDeserialize: (data) => {
      // Exclude id from data
      const { id, ...attributes } = data;

      // Recover PKs
      const [pk1, pk2] = id.split('-');

      // Return data with PKs
      return {
        ...attributes,
        pk1,
        pk2,
      };
    },
});
```

## Benchmark

```bash
Platform info:
==============
Darwin 18.7.0 x64
Node.JS: 10.16.3
V8: 6.8.275.32-node.54
Intel(R) Core(TM) i7-4770HQ CPU @ 2.20GHz × 8

Suite:
==============
serializeAsync x 80,043 ops/sec ±0.74% (78 runs sampled)
serialize x 135,669 ops/sec ±1.12% (88 runs sampled)
serializeConvertCase x 98,785 ops/sec ±2.34% (88 runs sampled)
deserializeAsync x 172,832 ops/sec ±0.41% (82 runs sampled)
deserialize x 393,979 ops/sec ±0.32% (91 runs sampled)
deserializeConvertCase x 119,021 ops/sec ±1.76% (95 runs sampled)
serializeError x 276,346 ops/sec ±1.07% (86 runs sampled)
serializeError with a JSON API error object x 15,783,113 ops/sec ±1.74% (88 runs sampled)
```

## License

[MIT](https://github.com/danivek/json-api-serializer/blob/master/LICENSE)
