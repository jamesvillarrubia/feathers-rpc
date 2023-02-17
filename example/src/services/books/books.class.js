/* eslint-disable no-unused-vars */
const { Service } = require('feathers-harperdb');

exports.Books = class Books extends Service {
  constructor (options, app) {
    super({
      ...options,
      name: 'books'
    });
  }
};
