'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { initialState } = require('../gameState.js');

describe('initialState', () => {
  it('returns zeroed state with empty arrays', () => {
    const s = initialState();
    assert.equal(s.complete, 0);
    assert.equal(s.fail, 0);
    assert.equal(s.poss, 0);
    assert.equal(s.streak, 0);
    assert.equal(s.best, 0);
    assert.equal(s.period, null);
    assert.equal(s.htActive, false);
    assert.deepEqual(s.events, []);
    assert.deepEqual(s.history, []);
  });

  it('returns a new object each call', () => {
    const a = initialState();
    const b = initialState();
    assert.notEqual(a, b);
    assert.notEqual(a.events, b.events);
    assert.notEqual(a.history, b.history);
  });
});
