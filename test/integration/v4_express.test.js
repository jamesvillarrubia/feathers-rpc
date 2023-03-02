
// mocha --watch flag requires CJS imports
// See here: https://github.com/mochajs/mocha/issues/4374
const assert = require('assert');
const request = require('supertest');
const parseRpcVerb = require('../../src/index.js');
const feathers = require('f4');
const express = require('f4_exp');

const cors = express.cors ? express.cors : require('cors'); // v4 and v5 compatability
const services = app => {
  class MessageService {
    async find (params) { return { data: 'find', params }; }
    async create (data, params) { return { data: 'create', params }; }
    async callRpcMethod (data, params) { return { data: 'rpc', params }; }
  }
  app.use('messages', new MessageService());
};

describe(`Express Feathers Parser - ${feathers.version}`, () => {
  it('middleware should not interrupt normal requests', async () => {
    const app = express(feathers());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(parseRpcVerb());
    app.configure(express.rest());
    app.configure(services);

    request(app)
      .post('/messages')
      .expect(201)
      .end((err, res) => {
        if (err) console.log(err);
        assert.strictEqual(res.body.data, 'create');
      });
  });

  it('should parse the RPC verb and add to feathers ctx', () => {
    const app = express(feathers());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(parseRpcVerb());
    app.configure(express.rest());
    app.configure(services);

    request(app)
      .post('/messages:callRpcMethod')
      .expect(201)
      .end((err, res) => {
        if (err) console.log(err);
        assert.strictEqual(res.body.params.rpcVerb, 'callRpcMethod');
      });
  });
});
