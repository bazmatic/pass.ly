'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { makePassEvent, makePeriodEvent, makeHalftimeEvent, makeGoalEvent, makeFullTimeEvent } = require('../events.js');

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

describe('makePeriodEvent', () => {
  it('returns correct shape', () => {
    const e = makePeriodEvent(2, 1800, '2026-01-01T00:30:00Z');
    assert.deepEqual(e, { type: 'period', period: 2, elapsed: 1800, ts: '2026-01-01T00:30:00Z' });
  });
});

describe('makeHalftimeEvent', () => {
  it('start phase returns correct shape', () => {
    const e = makeHalftimeEvent('start', 1800, '2026-01-01T00:30:00Z');
    assert.deepEqual(e, { type: 'halftime', phase: 'start', elapsed: 1800, ts: '2026-01-01T00:30:00Z' });
  });

  it('end phase returns correct shape', () => {
    const e = makeHalftimeEvent('end', 2700, '2026-01-01T00:45:00Z');
    assert.deepEqual(e, { type: 'halftime', phase: 'end', elapsed: 2700, ts: '2026-01-01T00:45:00Z' });
  });

  it('returns a new object each call', () => {
    const a = makeHalftimeEvent('start', 0, '');
    const b = makeHalftimeEvent('start', 0, '');
    assert.notEqual(a, b);
  });
});

describe('makeGoalEvent', () => {
  it('goal_for returns correct shape', () => {
    const e = makeGoalEvent('goal_for', 900, '2026-01-01T00:15:00Z');
    assert.deepEqual(e, {
      type: 'goal_for',
      elapsed: 900,
      elapsedFormatted: '15:00',
      ts: '2026-01-01T00:15:00Z',
    });
  });

  it('goal_against returns correct shape', () => {
    const e = makeGoalEvent('goal_against', 1200, '2026-01-01T00:20:00Z');
    assert.equal(e.type, 'goal_against');
    assert.equal(e.elapsed, 1200);
    assert.equal(e.elapsedFormatted, '20:00');
  });

  it('returns a new object each call', () => {
    const a = makeGoalEvent('goal_for', 0, '');
    const b = makeGoalEvent('goal_for', 0, '');
    assert.notEqual(a, b);
  });
});

describe('makeFullTimeEvent', () => {
  it('returns correct shape', () => {
    const e = makeFullTimeEvent(5400, '2026-01-01T01:30:00Z');
    assert.deepEqual(e, {
      type: 'fulltime',
      elapsed: 5400,
      elapsedFormatted: '90:00',
      ts: '2026-01-01T01:30:00Z',
    });
  });
});
