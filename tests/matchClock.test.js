'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { initialClock } = require('../matchClock.js');

describe('initialClock', () => {
  it('returns zeroed state with nulls and zeros', () => {
    const c = initialClock();
    assert.equal(c.sessionStart, null);
    assert.equal(c.clockOffset, 0);
    assert.deepEqual(c.halfStarts,  { 1: null, 2: null });
    assert.deepEqual(c.halfOffsets, { 1: 0,    2: 0    });
  });

  it('returns a new object each call', () => {
    const a = initialClock();
    const b = initialClock();
    assert.notEqual(a, b);
    assert.notEqual(a.halfStarts,  b.halfStarts);
    assert.notEqual(a.halfOffsets, b.halfOffsets);
  });
});
