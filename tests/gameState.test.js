'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { initialState, recordPass, undoLast } = require('../gameState.js');

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

describe('recordPass', () => {
  it('success increments complete and streak', () => {
    const s0 = initialState();
    const s1 = recordPass(s0, 'success', 10, '2026-01-01T00:00:10.000Z');
    assert.equal(s1.complete, 1);
    assert.equal(s1.streak, 1);
    assert.equal(s1.fail, 0);
  });

  it('fail increments fail and resets streak', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'fail', 2, 'ts');
    assert.equal(s.fail, 1);
    assert.equal(s.streak, 0);
    assert.equal(s.complete, 1);
  });

  it('poss increments poss and resets streak without incrementing fail', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'poss', 2, 'ts');
    assert.equal(s.poss, 1);
    assert.equal(s.fail, 0);
    assert.equal(s.streak, 0);
  });

  it('best updates when streak exceeds it', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'success', 2, 'ts');
    assert.equal(s.best, 2);
    s = recordPass(s, 'fail', 3, 'ts');
    assert.equal(s.best, 2);
    s = recordPass(s, 'success', 4, 'ts');
    assert.equal(s.best, 2);
  });

  it('event appended with correct shape', () => {
    const s0 = initialState();
    const s1 = recordPass(s0, 'success', 65, '2026-01-01T00:01:05.000Z');
    assert.equal(s1.events.length, 1);
    const e = s1.events[0];
    assert.equal(e.type, 'success');
    assert.equal(e.elapsed, 65);
    assert.equal(e.elapsedFormatted, '1:05');
    assert.equal(e.ts, '2026-01-01T00:01:05.000Z');
    assert.equal(e.streakBefore, 0);
    assert.equal(e.streakAfter, 1);
    assert.equal(e.runningAccuracy, 100);
    assert.equal(e.period, null);
  });

  it('runningAccuracy is 0 when no complete+fail passes yet', () => {
    let s = initialState();
    s = recordPass(s, 'poss', 1, 'ts');
    assert.equal(s.events[0].runningAccuracy, 0);
  });

  it('history snapshot saved and does not include history array', () => {
    const s0 = initialState();
    const s1 = recordPass(s0, 'success', 1, 'ts');
    assert.equal(s1.history.length, 1);
    const snap = s1.history[0];
    assert.equal(snap.complete, 0);
    assert.equal('history' in snap, false);
  });
});

describe('undoLast', () => {
  it('restores previous counters and events', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'success', 2, 'ts');
    const restored = undoLast(s);
    assert.equal(restored.complete, 1);
    assert.equal(restored.streak, 1);
    assert.equal(restored.events.length, 1);
  });

  it('history shrinks by one after undo', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'fail', 2, 'ts');
    assert.equal(s.history.length, 2);
    const s2 = undoLast(s);
    assert.equal(s2.history.length, 1);
  });

  it('no-op on empty history', () => {
    const s = initialState();
    const s2 = undoLast(s);
    assert.equal(s2, s);
  });
});
