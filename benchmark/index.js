/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

const Benchmark = require('benchmark');
const os = require('os');

const JSONAPISerializer = require('..');

const suite = new Benchmark.Suite();

const serializer = new JSONAPISerializer();
const serializerConvert = new JSONAPISerializer({
  convertCase: 'kebab-case',
  unconvertCase: 'camelCase'
});

const data = [
  {
    id: '1',
    title: 'JSON API paints my bikeshed!',
    body: 'The shortest article. Ever.',
    created: '2015-05-22T14:56:29.000Z',
    updated: '2015-05-22T14:56:28.000Z',
    author: {
      id: '1',
      firstName: 'Kaley',
      lastName: 'Maggio',
      email: 'Kaley-Maggio@example.com',
      age: '80',
      gender: 'male'
    },
    tags: ['1', '2'],
    photos: [
      'ed70cf44-9a34-4878-84e6-0c0e4a450cfe',
      '24ba3666-a593-498c-9f5d-55a4ee08c72e',
      'f386492d-df61-4573-b4e3-54f6f5d08acf'
    ],
    comments: [
      {
        _id: '1',
        body: 'First !',
        created: '2015-08-14T18:42:16.475Z'
      },
      {
        _id: '2',
        body: 'I Like !',
        created: '2015-09-14T18:42:12.475Z'
      },
      {
        _id: '3',
        body: 'Awesome',
        created: '2015-09-15T18:42:12.475Z'
      }
    ]
  }
];

const articleSchema = {
  id: 'id',
  links: {
    // An object or a function that describes links.
    self(d) {
      // Can be a function or a string value ex: { self: '/articles/1'}
      return `/articles/${d.id}`;
    }
  },
  relationships: {
    // An object defining some relationships.
    author: {
      type: 'people',
      links(d) {
        // An object or a function that describes Relationships links
        return {
          self: `/articles/${d.id}/relationships/author`,
          related: `/articles/${d.id}/author`
        };
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
      schema: 'only-body' // A custom schema
    }
  },
  topLevelMeta(d, extraData) {
    // An object or a function that describes top level meta.
    return {
      count: extraData.count,
      total: d.length
    };
  },
  topLevelLinks: {
    // An object or a function that describes top level links.
    self: '/articles'
  }
};
serializer.register('article', articleSchema);
serializerConvert.register('article', articleSchema);

// Register 'people' type
const peopleSchema = {
  id: 'id',
  links: {
    self(d) {
      return `/peoples/${d.id}`;
    }
  }
};
serializer.register('people', peopleSchema);
serializerConvert.register('people', peopleSchema);

// Register 'tag' type
const tagSchema = {
  id: 'id'
};
serializer.register('tag', tagSchema);
serializerConvert.register('tag', tagSchema);

// Register 'photo' type
const photoSchema = {
  id: 'id'
};
serializer.register('photo', photoSchema);
serializerConvert.register('photo', photoSchema);

// Register 'comment' type with a custom schema
const commentSchema = {
  id: '_id'
};
serializer.register('comment', 'only-body', commentSchema);
serializerConvert.register('comment', 'only-body', commentSchema);

let serialized;
let serializedConvert;

// Plateform
console.log('Platform info:');
console.log('==============');

console.log(`${os.type()} ${os.release()} ${os.arch()}`);
console.log('Node.JS:', process.versions.node);
console.log('V8:', process.versions.v8);

let cpus = os
  .cpus()
  .map(cpu => cpu.model)
  .reduce((o, model) => {
    if (!o[model]) o[model] = 0;
    o[model] += 1;
    return o;
  }, {});

cpus = Object.keys(cpus)
  .map(key => `${key} \u00d7 ${cpus[key]}`)
  .join('\n');

console.info(cpus);

console.log('\nSuite:');
console.log('==============');
suite
  .add('serializeAsync', {
    defer: true,
    fn(deferred) {
      serializer.serializeAsync('article', data, { count: 2 }).then(() => {
        deferred.resolve();
      });
    }
  })
  .add('serialize', () => {
    serialized = serializer.serialize('article', data, { count: 2 });
  })
  .add('serializeConvertCase', () => {
    serializedConvert = serializerConvert.serialize('article', data, { count: 2 });
  })
  .add('deserializeAsync', {
    defer: true,
    fn(deferred) {
      serializer.deserializeAsync('article', serialized).then(() => {
        deferred.resolve();
      });
    }
  })
  .add('deserialize', () => {
    serializer.deserialize('article', serialized);
  })
  .add('deserializeConvertCase', () => {
    serializerConvert.deserialize('article', serializedConvert);
  })
  .add('serializeError', () => {
    const error = new Error('An error occured');
    error.status = 500;
    error.code = 'ERROR';

    serializer.serializeError(error);
  })
  .add('serializeError with a JSON API error object', () => {
    const jsonapiError = {
      status: '422',
      source: { pointer: '/data/attributes/error' },
      title: 'Error',
      detail: 'An error occured'
    };

    serializer.serializeError(jsonapiError);
  })
  // add listeners
  .on('cycle', event => {
    console.log(String(event.target));
  })
  .on('complete', () => {})
  // run  async
  .run({ async: false });
