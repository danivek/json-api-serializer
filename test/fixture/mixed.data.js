module.exports = [{
  id: "1",
  type: 'article',
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
},
{
  id: "1",
  type: 'people',
  firstName: "Harold",
  lastName: "Marvin",
  email: "Harold-Marvin@example.com",
  age: "30",
  gender: "male"
}];
