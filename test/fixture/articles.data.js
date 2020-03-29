module.exports = [
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
      gender: 'male',
    },
    tags: ['1', '2'],
    photos: [
      'ed70cf44-9a34-4878-84e6-0c0e4a450cfe',
      '24ba3666-a593-498c-9f5d-55a4ee08c72e',
      'f386492d-df61-4573-b4e3-54f6f5d08acf',
    ],
    comments: [
      {
        _id: '1',
        body: 'First !',
        created: '2015-08-14T18:42:16.475Z',
      },
      {
        _id: '2',
        body: 'I Like !',
        created: '2015-09-14T18:42:12.475Z',
      },
      {
        _id: '3',
        body: 'Awesome',
        created: '2015-09-15T18:42:12.475Z',
      },
    ],
    translations: [
      {
        id: '1',
        lang: 'es',
        title: '¡JSON API pinta la caseta de la bici!',
        body: 'El artículo más corto jamás escrito',
        created: '2015-06-07T18:01:02.123Z',
      },
      {
        id: '1',
        lang: 'pt',
        title: 'API JSON pinta a garagem da bicicleta!',
        body: 'O artículo más corto jamás escrito',
        created: '2015-06-07T20:01:02.123Z',
      },
      {
        id: '1',
        lang: 'de',
        title: 'JSON API malt meinen Fahrradschuppen!',
        body: 'Der kürzeste Artikel, der jemals geschrieben wurde',
        created: '2015-06-07T22:01:02.123Z',
      },
    ],
  },
  {
    id: '2',
    title: 'JSON API 1.0',
    body: 'JSON API specifications',
    created: '2015-05-23T14:56:29.000Z',
    updated: '2015-05-24T14:56:28.000Z',
    author: {
      id: '2',
      firstName: 'Harold',
      lastName: 'Marvin',
      email: 'Harold-Marvin@example.com',
      age: '30',
      gender: 'male',
    },
    tags: [
      {
        id: '3',
        title: 'Tag 3',
      },
      {
        id: '4',
        title: 'Tag 4',
      },
    ],
    photos: [
      'ed70cf44-9a34-4878-84e6-0c0e4a450cfe',
      '24ba3666-a593-498c-9f5d-55a4ee08c72e',
      'f386492d-df61-4573-b4e3-54f6f5d08acf',
    ],
    comments: [
      {
        _id: '4',
        body: 'Recommended',
        created: '2015-08-14T18:42:16.475Z',
      },
      {
        _id: '5',
        body: 'Really nice',
        created: '2015-09-14T18:42:12.475Z',
      },
      {
        _id: '6',
        body: 'Awesome',
        created: '2015-09-15T18:42:12.475Z',
      },
    ],
    translations: [
      {
        id: '2',
        lang: 'es',
        title: 'JSON API 1.0',
        body: 'Especificaciones de JSON API',
        created: '2015-06-07T18:01:02.123Z',
      },
      {
        id: '2',
        lang: 'pt',
        title: 'JSON API 1.0',
        body: 'Especificações de JSON API',
        created: '2015-06-07T20:01:02.123Z',
      },
      {
        id: '2',
        lang: 'de',
        title: 'JSON API 1.0',
        body: 'JSON API Spezifikationen',
        created: '2015-06-07T22:01:02.123Z',
      },
    ],
  },
];
