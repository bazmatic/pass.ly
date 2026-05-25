'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { initialClock, startPeriod } = require('../matchClock.js');

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

describe('startPeriod', () => {
  it('starting period 1 from fresh clock sets sessionStart and halfStarts', () => {
    const c0 = initialClock();
    const c1 = startPeriod(c0, null, 1, 1000);
    assert.equal(c1.sessionStart,  1000);
    assert.equal(c1.halfStarts[1], 1000);
    assert.equal(c1.clockOffset,   0);
  });

  it('starting period 2 accumulates clockOffset and halfOffsets[1]', () => {
    const t0 = 0;
    const t1 = 30 * 60 * 1000;
    let c = initialClock();
    c = startPeriod(c, null, 1, t0);
    c = startPeriod(c, 1,    2, t1);
    assert.equal(c.clockOffset,    t1);
    assert.equal(c.halfOffsets[1], t1);
    assert.equal(c.sessionStart,   t1);
    assert.equal(c.halfStarts[2],  t1);
  });

  it('does not mutate the input clock', () => {
    const c0 = initialClock();
    startPeriod(c0, null, 1, 1000);
    assert.equal(c0.sessionStart, null);
  });
});
