const assert = require('assert');
const app = require('../../src/app');

describe('\'coal\' service', () => {
  it('registered the service', () => {
    const service = app.service('coal');

    assert.ok(service, 'Registered the service');
  });
});
