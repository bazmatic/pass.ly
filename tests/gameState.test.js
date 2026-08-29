'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { initialState, recordPass, undoLast, activatePeriod, toggleHT, endGame, resetState } = require('../gameState.js');

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
    assert.equal(s.fullTimeActive, false);
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

  it('includes goalsFor and goalsAgainst counters', () => {
    const s = initialState();
    assert.equal(s.goalsFor, 0);
    assert.equal(s.goalsAgainst, 0);
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

describe('recordPass — goals', () => {
  it('goal_for increments goalsFor and resets streak', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'success', 2, 'ts');
    s = recordPass(s, 'goal_for', 60, 'ts');
    assert.equal(s.goalsFor, 1);
    assert.equal(s.goalsAgainst, 0);
    assert.equal(s.streak, 0);
    assert.equal(s.complete, 2);
    assert.equal(s.fail, 0);
  });

  it('goal_against increments goalsAgainst and resets streak', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'goal_against', 60, 'ts');
    assert.equal(s.goalsAgainst, 1);
    assert.equal(s.goalsFor, 0);
    assert.equal(s.streak, 0);
  });

  it('goal event appended with correct shape (no streakBefore/After/runningAccuracy)', () => {
    let s = initialState();
    s = recordPass(s, 'goal_for', 300, '2026-01-01T00:05:00Z');
    assert.equal(s.events.length, 1);
    const e = s.events[0];
    assert.equal(e.type, 'goal_for');
    assert.equal(e.elapsed, 300);
    assert.equal(e.elapsedFormatted, '5:00');
    assert.equal(e.ts, '2026-01-01T00:05:00Z');
    assert.equal('streakBefore' in e, false);
    assert.equal('runningAccuracy' in e, false);
  });

  it('goal does not affect accuracy calculation', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'success', 2, 'ts');
    s = recordPass(s, 'goal_for', 3, 'ts');
    s = recordPass(s, 'success', 4, 'ts');
    const passEvt = s.events.filter(e => e.type === 'success').pop();
    assert.equal(passEvt.runningAccuracy, 100);
  });

  it('undo restores goalsFor counter', () => {
    let s = initialState();
    s = recordPass(s, 'goal_for', 60, 'ts');
    assert.equal(s.goalsFor, 1);
    s = undoLast(s);
    assert.equal(s.goalsFor, 0);
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

  it('restores fail and streak after undoing a fail', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'success', 2, 'ts');
    s = recordPass(s, 'fail', 3, 'ts');
    assert.equal(s.fail, 1);
    assert.equal(s.streak, 0);
    const s2 = undoLast(s);
    assert.equal(s2.fail, 0);
    assert.equal(s2.streak, 2);
    assert.equal(s2.complete, 2);
    assert.equal(s2.events.length, 2);
  });

  it('multiple consecutive undos restore state correctly', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    s = recordPass(s, 'success', 2, 'ts');
    s = recordPass(s, 'fail', 3, 'ts');
    s = undoLast(s); // undo fail
    s = undoLast(s); // undo second success
    assert.equal(s.complete, 1);
    assert.equal(s.fail, 0);
    assert.equal(s.streak, 1);
    assert.equal(s.events.length, 1);
    assert.equal(s.history.length, 1);
  });
});

describe('activatePeriod', () => {
  it('sets period and appends a period event', () => {
    const s0 = initialState();
    const s1 = activatePeriod(s0, 1, 0, 'ts');
    assert.equal(s1.period, 1);
    assert.equal(s1.events.length, 1);
    assert.equal(s1.events[0].type, 'period');
    assert.equal(s1.events[0].period, 1);
    assert.equal(s1.events[0].elapsed, 0);
  });

  it('can activate period 2', () => {
    const s0 = initialState();
    const s1 = activatePeriod(s0, 2, 45 * 60, 'ts');
    assert.equal(s1.period, 2);
    assert.equal(s1.events[0].period, 2);
  });

  it('clears htActive and appends a halftime end event when starting 2nd half while HT is still active', () => {
    let s = initialState();
    s = activatePeriod(s, 1, 0, 'ts');
    s = toggleHT(s, 45 * 60, 'ts'); // HT starts, forgot to toggle off
    assert.equal(s.htActive, true);
    s = activatePeriod(s, 2, 46 * 60, 'ts');
    assert.equal(s.htActive, false);
    assert.equal(s.events.length, 4);
    assert.equal(s.events[2].type, 'halftime');
    assert.equal(s.events[2].phase, 'end');
    assert.equal(s.events[3].type, 'period');
    assert.equal(s.events[3].period, 2);
  });

  it('does not touch htActive when starting period 2 with HT already off', () => {
    let s = initialState();
    s = activatePeriod(s, 1, 0, 'ts');
    s = activatePeriod(s, 2, 45 * 60, 'ts');
    assert.equal(s.htActive, false);
    assert.equal(s.events.length, 2);
  });
});

describe('toggleHT', () => {
  it('sets htActive true and appends halftime start event', () => {
    const s0 = initialState();
    const s1 = toggleHT(s0, 45 * 60, 'ts');
    assert.equal(s1.htActive, true);
    assert.equal(s1.events[0].type, 'halftime');
    assert.equal(s1.events[0].phase, 'start');
  });

  it('sets htActive false and appends halftime end event on second call', () => {
    let s = initialState();
    s = toggleHT(s, 45 * 60, 'ts');
    s = toggleHT(s, 47 * 60, 'ts');
    assert.equal(s.htActive, false);
    assert.equal(s.events[1].phase, 'end');
  });
});

describe('endGame', () => {
  it('sets fullTimeActive true and appends a fulltime event', () => {
    const s0 = initialState();
    const s1 = endGame(s0, 90 * 60, 'ts');
    assert.equal(s1.fullTimeActive, true);
    assert.equal(s1.events.length, 1);
    assert.equal(s1.events[0].type, 'fulltime');
    assert.equal(s1.events[0].elapsed, 90 * 60);
  });

  it('is a no-op when called again', () => {
    let s = initialState();
    s = endGame(s, 90 * 60, 'ts');
    const s2 = endGame(s, 95 * 60, 'ts');
    assert.equal(s2, s);
    assert.equal(s2.events.length, 1);
  });
});

describe('resetState', () => {
  it('returns a zeroed state identical in shape to initialState', () => {
    let s = initialState();
    s = recordPass(s, 'success', 1, 'ts');
    const r = resetState();
    assert.deepEqual(r, initialState());
    assert.equal(r.complete, 0);
    assert.equal(r.events.length, 0);
  });
});
