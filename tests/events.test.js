'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { makePassEvent } = require('../events.js');

describe('makePassEvent', () => {
  it('returns all expected fields', () => {
    const e = makePassEvent('success', 90, '2026-01-01T00:00:00Z', 2, 3, 75, 1);
    assert.equal(e.type,             'success');
    assert.equal(e.elapsed,          90);
    assert.equal(e.elapsedFormatted, '1:30');
    assert.equal(e.ts,               '2026-01-01T00:00:00Z');
    assert.equal(e.streakBefore,     2);
    assert.equal(e.streakAfter,      3);
    assert.equal(e.runningAccuracy,  75);
    assert.equal(e.period,           1);
  });

  it('computes elapsedFormatted: 90s → "1:30"', () => {
    const e = makePassEvent('fail', 90, '', 0, 0, 0, null);
    assert.equal(e.elapsedFormatted, '1:30');
  });
});
