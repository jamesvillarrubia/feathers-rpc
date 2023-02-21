// Initializes the `books` service on path `/books`
const { Books } = require('./books.class');
const hooks = require('./books.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate'),
    config: {
      ...app.get('harperdb'),
      table: 'books'
    }
  };

  // Initialize our service with any options it requires
  app.use('/books', new Books(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('books');

  service.hooks(hooks);
};
