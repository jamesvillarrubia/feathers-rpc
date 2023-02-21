const assert = require('assert');
const app = require('../../src/app');

describe('\'books\' service', () => {
  it('registered the service', () => {
    const service = app.service('books');

    assert.ok(service, 'Registered the service');
  });
});
