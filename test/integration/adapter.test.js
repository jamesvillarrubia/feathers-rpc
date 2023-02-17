/* eslint-disable no-unused-vars */
const adapterTests = require('@feathersjs/adapter-tests');
const errors = require('@feathersjs/errors');
const feathers = require('@feathersjs/feathers');

const serviceLib = require('../../lib');
// const describeFixture = require('mocha-nock');
// const opts = {
//   // Don't record any requests to this scope
//   // It can be an array or string
//   excludeScope: [],

//   // Re-record and overwrite your current fixtures
//   overwrite: true,

//   // Record fixtures when test fails
//   recordOnFailure: false,

//   // These options are passed to the nock recorder that runs behind the scenes
//   // to capture requests
//   recorder: {
//     output_objects: true,
//     dont_print: true,
//     enable_reqheaders_recording: true
//   }
// };
// describeFixture.setDefaultConfig(opts);

const testSuite = adapterTests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + NotFound',
  '.get + id + query id',
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.remove + id + query id',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + NotFound',
  '.update + id + query id',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.update + query + NotFound',
  '.patch multiple',
  '.patch multi query same',
  '.patch multi query changed',
  '.patch + query + NotFound',
  '.patch + NotFound',
  '.patch + id + query id',
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params'
]);

const name = 'books';
const DB_CONFIG = {
  harperHost: 'http://localhost:9925',
  username: 'admin',
  password: 'password',
  schema: 'test',
  table: name
};
const events = ['testing']; // not sure why this is needed
const service = serviceLib({ name, events, config: DB_CONFIG });

describe('Feathers HarperDB - Adapter Tests', async () => {
  const app = feathers();

  app.use(`/${name}`, service);
  app.service(`${name}`).hooks({});

  // Creates the necessary tables if they don't exist already
  it('creates the schema and table', async () => {
    const db = await service.createDB().catch(e => {});
    const table = await service.createTable(`${name}`).catch(e => {});
  });

  testSuite(app, errors, name);

  // Cleans up any remaining elements
  after(async () => {
    await service.client.dropSchema(DB_CONFIG).catch(e => {});
  });
});
