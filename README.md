# feathers-openai
                    
[![NPM](https://img.shields.io/npm/l/feathers-openai)](https://github.com/jamesvillarrubia/feathers-openai/blob/main/LICENSE) [![npm](https://img.shields.io/npm/v/feathers-openai?label=latest)](https://www.npmjs.com/package/feathers-openai)

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jamesvillarrubia/feathers-openai/Node%20Lint%20&%20Test?label=build%20%26%20lint)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/feathers-openai)
<!-- [![Download Status](https://img.shields.io/npm/dm/feathers-openai.svg)](https://www.npmjs.com/package/feathers-openai) -->

This library is a FeathersJS database adapter for openai - a high-scale, LMDB & NodeJS database. It uses a combination of the raw openai RESTful endpoints and [KnexJS](http://knexjs.org/)-translated queries through openai's subset of supported SQL commands.  It also uses [Harperive](https://www.npmjs.com/package/harperive) for authentication, promise management, and connectivity.  Harperive is exposed internally for developers wishing to build more complex queries in a openai service.

```bash
npm install --save feathers-openai
```

> __Important:__ `feathers-openai` implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html) and [querying syntax](https://docs.feathersjs.com/api/databases/querying.html).
> 

## API

### `service(options)`


```js
const service = require('feathers-openai');
app.use('/messages', service({
    //...options
}););
```


__Options:__
- `name` (**required**) - The name of the table
- `config` (**required**) - Usually set in `config/{ENV}.json`. See "Connection Options" below
- `client` (*optional*) - The Harperive Client, can be manually overriden and accessed
- `id` (*optional*, default: `id`) - The name of the id field property.
- `events` (*optional*) - A list of [custom service events](https://docs.feathersjs.com/api/events.html#custom-events) sent by this service
- `paginate` (*optional*) - A [pagination object](https://docs.feathersjs.com/api/databases/common.html#pagination) containing a `default` and `max` page size
- `multi` (*optional*) - Allow `create` with arrays and `update` and `remove` with `id` `null` to change multiple items. Can be `true` for all methods or an array of allowed methods (e.g. `[ 'remove', 'create' ]`)
- `whitelist` (*optional*) - A list of additional query parameters to allow (e..g `[ '$regex', '$geoNear' ]`). Default is the supported `operators`
- `sortField` (*optional*, default: `__createdtime__`) - By default all objects will be sorted ASC by created timestamp, similar to sorting by Integer auto-incremented `id` in most feather SQL operations
- `sortDirection` (*optional*, default: `asc`) - The default sort direction, can be one of `[ 'asc', 'desc' ]`
- `limit` (*optional*, default: `5000`) - The max number of objects to return without pagination, will be overriden by pagination settings
- `sync` (*optional*, default: `true` ) - Setting true will create schema and table on load as part of the `service.setup()` function run by FeathersJS
- `force` (*optional*, default: `false`) , Settign true will delete the schema on setup, starting with fresh database with every boot, much like Sequelize's `forceSync`.


__Connection Options:__
The connection options are passed in as a `config` object inside the options object (i.e. `harper({ config: { ...connection_options } })`)
- `schema` (**required**) - The name of the schema (i.e. DB-equivalent) in the openai instance
- `harperHost` (**required**) - The location of the Harper Host
- `username` (**required**) - The username to connect with
- `password` (**required**) - The password to connect with
- `table` (*optional*) - The name of the table referenced by the service, defaults to the configured `name`, but can be overriden by setting `config.table`

These can also be set via a "openai" configuration field in the Feathers `config/{ENV}.json`:
```json
  "openai":{
    "host": "http://localhost:9925",
    "username": "admin",
    "password": "password",
    "schema": "test"
  }
```

## Setting up Service
To set up your service, your service class.js and service.js files should look something like this:

```javascript
//books.class.js
const { Service } = require('feathers-openai');
exports.Books = class Books extends Service{
  constructor(options, app) {
    super({
      ...options,
      name: 'books'
    });
  }
};

//books.service.js
const { Books } = require('./books.class');
const hooks = require('./books.hooks');
module.exports = function (app) {
  const options = {
    paginate: app.get('paginate'),
    config: {
      ...app.get('openai'),
      table: 'books'
    }
  };
  app.use('/books', new Books(options, app));
  const service = app.service('books');
  service.hooks(hooks);
};
```


## Querying

In addition to the [common querying mechanism](https://docs.feathersjs.com/api/databases/querying.html), this adapter also supports direct NoSQL submissions via the [Harperive client](https://chandan-24.github.io/Harperive/#/) like this:


```javascript
let service = app.service('books')
await service.client.insert({
  table: this.table,
  records: [
    {
      user_id: 43,
      username: 'simon_j',
      first_name: 'James',
      middle_name: 'J.',
      last_name: 'Simon'
    }
  ]
})
.then((res) => console.log(res))
.catch((err) => console.log(err));
```

You can also use Harperive's generic execution option like so:
```javascript
const options = {
  operation: 'openai_operation',
  //other fields...
};

// Promise
let service = app.service('books')
await service.client.executeOperation(options)
  .then((res) => console.log(res))
  .catch((err) => console.log(err));
```

