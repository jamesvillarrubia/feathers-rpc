
// mocha --watch flag requires CJS imports
// See here: https://github.com/mochajs/mocha/issues/4374
const assert = require('assert');
const request = require('supertest');
const parseRpcVerb = require('../../lib/index.js');
const feathers = require('../../node_modules/@feathersjs/koa/node_modules/@feathersjs/feathers');
const koa = require('@feathersjs/koa');

const services = app => {
  class MessageService {
    async find (params) { return { data: 'find', params }; }
    async create (data, params) { return { data: 'create', params }; }
    async callRpcMethod (data, params) { return { data: 'rpc', params }; }
  }

  app.use('/messages', new MessageService(), {
    methods: ['find', 'create', 'callRpcMethod']
  });
};

describe(`Koa Feathers Parser - ${feathers.version}`, () => {
  it('middleware should not interrupt normal requests', async () => {
    const app = koa.koa(feathers());
    app.use(koa.errorHandler());
    app.use(koa.bodyParser());
    app.use(parseRpcVerb());
    app.configure(koa.rest());
    app.configure(services);

    request(app.callback())
      .post('/messages')
      .expect(201)
      .end((err, res) => {
        if (err) console.log(err);
        assert.strictEqual(res.body.data, 'create');
      });
  });

  it('should parse the RPC verb and add to feathers ctx', async () => {
    const app = koa.koa(feathers());
    app.use(koa.errorHandler());
    app.use(koa.bodyParser());
    app.use(parseRpcVerb());
    app.configure(koa.rest());
    app.configure(services);

    request(app.callback())
      .post('/messages:callRpcMethod')
      .expect(200)
      .end((err, res) => {
        if (err) console.log(err);
        assert.strictEqual(res.body.data, 'rpc');
      });
  });
});
