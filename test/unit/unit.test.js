
// mocha --watch flag requires CJS imports
// See here: https://github.com/mochajs/mocha/issues/4374
const assert = require('assert');
const parseRpcVerb = require('../../lib/index.js');

describe('Feather params modifications', () => {
  it('gets the rpcVerb with id and no query parameters', () => {
    const url = '/contacts/1:request-opt-in';
    const requestObject = {
      url,
      feathers: {},
      headers: {},
      rawHeaders: []
    };

    parseRpcVerb()(requestObject, {}, () => { });

    const rpcVerb = requestObject.feathers.rpcVerb;
    const trimmedUrl = requestObject.url;

    assert.strictEqual(rpcVerb, 'request-opt-in');
    assert.strictEqual(trimmedUrl, '/contacts/1');
  });

  it('gets the rpcVerb with and re-attaches query parameters', () => {
    const url = '/contacts/1:request-opt-in?firstname=Philip&lastname=Fry';
    const requestObject = {
      url,
      feathers: {},
      headers: {},
      rawHeaders: []
    };

    parseRpcVerb()(requestObject, {}, () => { });

    const rpcVerb = requestObject.feathers.rpcVerb;
    const trimmedUrl = requestObject.url;

    assert.strictEqual(rpcVerb, 'request-opt-in');
    assert.strictEqual(trimmedUrl, '/contacts/1?firstname=Philip&lastname=Fry');
  });

  it('parses only after the first colon in the url', () => {
    const url = '/contacts/1:request-opt-in?firstname:Philip&lastname=Fry';
    const requestObject = {
      url,
      feathers: {},
      headers: {},
      rawHeaders: []
    };

    parseRpcVerb()(requestObject, {}, () => { });

    const rpcVerb = requestObject.feathers.rpcVerb;
    const trimmedUrl = requestObject.url;

    assert.strictEqual(rpcVerb, 'request-opt-in');
    assert.strictEqual(trimmedUrl, '/contacts/1?firstname:Philip&lastname=Fry');
  });

  it('does nothing when no RPC verb is provided with no query parameters', () => {
    const url = '/contacts/1';
    const requestObject = {
      url,
      feathers: {}
    };

    parseRpcVerb()(requestObject, {}, () => { });

    const rpcVerb = requestObject.feathers.rpcVerb;
    const trimmedUrl = requestObject.url;

    assert.strictEqual(rpcVerb, undefined);
    assert.strictEqual(trimmedUrl, '/contacts/1');
  });

  it('does nothing when no RPC verb is provided with query parameters', () => {
    const url = '/contacts/1?firstname=Philip&lastname=Fry';
    const requestObject = {
      url,
      feathers: {}
    };

    parseRpcVerb()(requestObject, {}, () => { });

    const rpcVerb = requestObject.feathers.rpcVerb;
    const trimmedUrl = requestObject.url;

    assert.strictEqual(rpcVerb, undefined);
    assert.strictEqual(trimmedUrl, '/contacts/1?firstname=Philip&lastname=Fry');
  });

  it('should disallow all with empty options', () => {
    const invalidRpcVerbs = [
      '/contacts/1:REQUEST-OPT-IN',
      '/contacts/1:requestoptin'
    ];
    invalidRpcVerbs.forEach(url => {
      const requestObject = { url, feathers: {} };
      assert.rejects(
        () => parseRpcVerb({ allowedRpcVerbs: [] })(requestObject, {}, () => {}),
        (err) => {
          assert.strictEqual(err.name, 'Unprocessable');
          assert.strictEqual(err.code, 422);
          return true;
        }
      );
    });
  });
  it('should accept a single string option', () => {
    const url = '/contacts/1:request-opt-in';
    const requestObject = {
      url,
      feathers: {},
      headers: {},
      rawHeaders: []
    };

    parseRpcVerb({allowedRpcVerbs:'request-opt-in'})(requestObject, {}, () => { });
    const rpcVerb = requestObject.feathers.rpcVerb;
    const trimmedUrl = requestObject.url;
    assert.strictEqual(rpcVerb, 'request-opt-in');
    assert.strictEqual(trimmedUrl, '/contacts/1');
  });

  it('should accept an array string option', () => {
    const url = '/contacts/1:request-opt-in';
    const requestObject = {
      url,
      feathers: {},
      headers: {},
      rawHeaders: []
    };

    parseRpcVerb({allowedRpcVerbs:['request-opt-in']})(requestObject, {}, () => { });
    const rpcVerb = requestObject.feathers.rpcVerb;
    const trimmedUrl = requestObject.url;
    assert.strictEqual(rpcVerb, 'request-opt-in');
    assert.strictEqual(trimmedUrl, '/contacts/1');
  });


  
  it('should disable headers when setting is true', () => {
    const url = '/contacts/1:request-opt-in';
    const requestObject = {
      url,
      feathers: {},
      headers: {},
      rawHeaders: []
    };
    parseRpcVerb({disableHeader:true})(requestObject, {}, () => { });
    assert.strictEqual(requestObject.headers['x-service-method'],undefined);
  });

  it('should enable headers when setting is empty', () => {
    const url = '/contacts/1:request-opt-in';
    const requestObject = {
      url,
      feathers: {},
      headers: {},
      rawHeaders: []
    };
    parseRpcVerb({})(requestObject, {}, () => { });
    assert.strictEqual(requestObject.headers['x-service-method'],'request-opt-in');
  });

  it('should return Unprocessable error if RPC is invalid', async () => {
    const invalidRpcVerbs = [
      '/contacts/1:REQUEST-OPT-IN',
      '/contacts/1:requestoptin',
      '/contacts/1:requestopt-in',
      '/contacts/1:request-opt-inn',
      '/contacts/1:rpc',
      '/contacts/1:opt-in'
    ];
    invalidRpcVerbs.forEach(url => {
      const requestObject = { url, feathers: {} };
      assert.rejects(
        () => parseRpcVerb(['callRpcVerb'])(requestObject, {}, () => {}),
        (err) => {
          assert.strictEqual(err.name, 'Unprocessable');
          assert.strictEqual(err.code, 422);
          return true;
        }
      );
    });
  });
});
