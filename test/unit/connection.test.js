/* eslint-disable no-unused-vars */
const assert = require('assert');
const Service = require('../../lib');
const nock = require('nock');
// // const scope = nock('http://www.example.com');
// const describeFixture = require('mocha-nock');
// // const request         = require('request-promise-native');
// const opts = {
//   // Don't record any requests to this scope
//   // It can be an array or string
//   excludeScope: [],

//   // Re-record and overwrite your current fixtures
//   overwrite: true,

//   // Record fixtures when test fails
//   recordOnFailure: true,

//   // These options are passed to the nock recorder that runs behind the scenes
//   // to capture requests
//   recorder: {
//     output_objects:  false,
//     dont_print:      true,
//     enable_reqheaders_recording: true
//   }
// };
// describeFixture.setDefaultConfig(opts);

describe('Initialization', () => {
  describe('when missing a config', () => {
    it('throws an error', () => {
      try {
        Service();
        throw new Error('Should never get here');
      } catch (e) {
        assert.equal(e.name, 'GeneralError');
        assert.ok(e.message.includes('harperHost'));
        assert.equal(e.code, 500);
        assert.equal(e.className, 'general-error');
      }
    });
  });

  describe('when missing a host', () => {
    it('throws an error', () => {
      try {
        Service({ config: {} });
        throw new Error('Should never get here');
      } catch (e) {
        assert.equal(e.name, 'GeneralError');
        assert.ok(e.message.includes('harperHost'));
        assert.equal(e.code, 500);
        assert.equal(e.className, 'general-error');
      }
    });
  });

  describe('when missing a schema', () => {
    it('throws an error', () => {
      try {
        Service({ config: { harperHost: 'host' } });
        throw new Error('Should never get here');
      } catch (e) {
        assert.equal(e.name, 'GeneralError');
        assert.ok(e.message.includes('schema'));
        assert.equal(e.code, 500);
        assert.equal(e.className, 'general-error');
      }
    });
  });

  describe('when missing a table', () => {
    it('throws an error', () => {
      try {
        Service({ config: { harperHost: 'host', schema: 'test' } });
        throw new Error('Should never get here');
      } catch (e) {
        assert.equal(e.name, 'GeneralError');
        assert.ok(e.message.includes('table'));
        assert.equal(e.code, 500);
        assert.equal(e.className, 'general-error');
      }
    });
  });

  describe('when missing username or password', () => {
    it('throws an error', () => {
      try {
        Service({ config: { harperHost: 'host', schema: 'test', table: 'table' } });
        throw new Error('Should never get here');
      } catch (e) {
        assert.equal(e.name, 'NotAuthenticated');
        assert.ok(e.message.includes('username'));
        assert.equal(e.code, 401);
        assert.equal(e.className, 'not-authenticated');
      }
    });
  });

  describe('when authentication is incorrect', () => {
    it('login fails', async () => {
      nock('http://localhost:9925', { encodedQueryParams: true })
        .post('/', { operation: 'create_schema', schema: 'test' })
        .reply(401, { error: 'Login failed' });

      try {
        const harperHost = 'http://localhost:9925';
        const username = 'username';
        const password = 'password';
        const schema = 'test';
        const service = Service({ config: { harperHost, schema, table: 'test', username, password } });
        const db = await service.createDB();
        throw new Error('Should never get here');
      } catch (e) {
        assert.equal(e.name, 'NotAuthenticated');
        assert.ok(e.message.includes('authenticate'));
        assert.equal(e.code, 401);
        assert.equal(e.className, 'not-authenticated');
      }
    });
  });

  describe('when DB does not exist', () => {
    it('creates DB', async () => {
      nock('http://localhost:9925', { encodedQueryParams: true })
        .post('/', { operation: 'create_schema', schema: 'test' })
        .matchHeader('authorization', 'Basic YWRtaW46cGFzc3dvcmQ=')
        .reply(200, { message: 'schema \'test\' successfully created' });

      const harperHost = 'http://localhost:9925';
      const username = 'admin';
      const password = 'password';
      const schema = 'test';
      const table = 'test';
      const service = Service({ config: { harperHost, schema, table, username, password } });
      // await service.client.dropSchema({schema}).catch(e=>{});
      const db = await service.createDB();
      assert.equal(db.status, 'SUCCESS');
    });

    it('creates Table', async () => {
      nock('http://localhost:9925', { encodedQueryParams: true })
        .post('/', { operation: 'create_table', schema: 'test', table: 'test', hash_attribute: 'id' })
        .matchHeader('authorization', 'Basic YWRtaW46cGFzc3dvcmQ=')
        .reply(200, { message: 'table \'test.test\' successfully created.' });
      const harperHost = 'http://localhost:9925';
      const username = 'admin';
      const password = 'password';
      const schema = 'test';
      const table = 'test';
      const service = Service({ config: { harperHost, schema, table, username, password } });
      const db = await service.createTable();
      assert.equal(db.status, 'SUCCESS');
    });
  });
});
