'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { prepareStats, slidingAccuracy, findBestStreak } = require('../prepareStats.js');
const { makePassEvent, makeHalftimeEvent } = require('../events.js');

// ---------------------------------------------------------------------------
// Helpers to build minimal event objects
// ---------------------------------------------------------------------------

function makeSummary(overrides = {}) {
  return {
    complete: 0,
    fail: 0,
    accuracy: '0%',
    bestStreak: 0,
    duration: '0:00',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// slidingAccuracy — correct slideData for a known pass sequence
// ---------------------------------------------------------------------------

describe('slidingAccuracy', () => {
  test('single success → 100%', () => {
    const events = [makePassEvent('success', 1, '', 0, 0, 0, 1)];
    assert.deepEqual(slidingAccuracy(events), [100]);
  });

  test('single fail → 0%', () => {
    const events = [makePassEvent('fail', 1, '', 0, 0, 0, 1)];
    assert.deepEqual(slidingAccuracy(events), [0]);
  });

  test('window of 4: [S,S,F,S] → [100, 100, 67, 75]', () => {
    const events = [
      makePassEvent('success', 1, '', 0, 0, 0, 1),
      makePassEvent('success', 2, '', 0, 0, 0, 1),
      makePassEvent('fail',    3, '', 0, 0, 0, 1),
      makePassEvent('success', 4, '', 0, 0, 0, 1),
    ];
    assert.deepEqual(slidingAccuracy(events), [100, 100, 67, 75]);
  });

  test('window caps at WINDOW(15): 20 successes then 1 fail → last value is 93%', () => {
    const events = [];
    for (let i = 0; i < 20; i++) events.push(makePassEvent('success', i + 1, '', 0, 0, 0, 1));
    events.push(makePassEvent('fail', 21, '', 0, 0, 0, 1));

    const result = slidingAccuracy(events);
    // Last window = indices 6..20 = 14 successes + 1 fail = 15 events → 14/15 = 93%
    assert.equal(result[result.length - 1], 93);
  });

  test('sequence of 15: first 10 success, last 5 fail → last value is 67%', () => {
    const events = [];
    for (let i = 0; i < 10; i++) events.push(makePassEvent('success', i + 1, '', 0, 0, 0, 1));
    for (let i = 0; i < 5; i++)  events.push(makePassEvent('fail',    i + 11, '', 0, 0, 0, 1));

    const result = slidingAccuracy(events);
    // Full window at index 14: 10 successes, 5 fails → 10/15 = 67%
    assert.equal(result[14], 67);
  });
});

// ---------------------------------------------------------------------------
// findBestStreak — correct bestStreakLen and streak indices
// ---------------------------------------------------------------------------

describe('findBestStreak', () => {
  test('returns null when streakAfter never matches bestLen', () => {
    const events = [
      makePassEvent('success', 1, '', 0, 1, 0, 1),
      makePassEvent('success', 2, '', 1, 2, 0, 1),
    ];
    assert.equal(findBestStreak(events, 5), null);
  });

  test('finds the start and end of a 3-pass streak', () => {
    // streak of 3: indices 1,2,3
    const events = [
      makePassEvent('fail',    1, '', 0, 0, 0, 1),
      makePassEvent('success', 2, '', 0, 1, 0, 1),
      makePassEvent('success', 3, '', 1, 2, 0, 1),
      makePassEvent('success', 4, '', 2, 3, 0, 1),
      makePassEvent('fail',    5, '', 0, 0, 0, 1),
    ];
    const result = findBestStreak(events, 3);
    assert.deepEqual(result, { start: 1, end: 3 });
  });

  test('streak starting at index 0', () => {
    const events = [
      makePassEvent('success', 1, '', 0, 1, 0, 1),
      makePassEvent('success', 2, '', 1, 2, 0, 1),
    ];
    const result = findBestStreak(events, 2);
    assert.deepEqual(result, { start: 0, end: 1 });
  });
});

// ---------------------------------------------------------------------------
// prepareStats — quarter splits
// ---------------------------------------------------------------------------

describe('prepareStats quarters', () => {
  test('passes are split into correct quarters', () => {
    // Period 1: elapsed 10..40 → mid = 25 → q1 ≤25, q2 >25
    // Period 2: elapsed 60..90 → mid = 75 → q3 ≤75, q4 >75
    const events = [
      // q1 (p1, elapsed ≤ 25)
      makePassEvent('success', 10, '', 0, 0, 0, 1),
      makePassEvent('success', 20, '', 0, 0, 0, 1),
      // q2 (p1, elapsed > 25)
      makePassEvent('fail',    30, '', 0, 0, 0, 1),
      makePassEvent('success', 40, '', 0, 0, 0, 1),
      // q3 (p2, elapsed ≤ 75)
      makePassEvent('success', 60, '', 0, 0, 0, 2),
      makePassEvent('fail',    70, '', 0, 0, 0, 2),
      // q4 (p2, elapsed > 75)
      makePassEvent('success', 80, '', 0, 0, 0, 2),
      makePassEvent('success', 90, '', 0, 0, 0, 2),
    ];

    const { quarters } = prepareStats({ summary: makeSummary(), events });

    assert.deepEqual(quarters.q1, { ok: 2, fail: 0, total: 2, pct: 100 });
    assert.deepEqual(quarters.q2, { ok: 1, fail: 1, total: 2, pct: 50  });
    assert.deepEqual(quarters.q3, { ok: 1, fail: 1, total: 2, pct: 50  });
    assert.deepEqual(quarters.q4, { ok: 2, fail: 0, total: 2, pct: 100 });
  });

  test('all passes in one period → opposite period quarters are zero', () => {
    const events = [
      makePassEvent('success', 10, '', 0, 0, 0, 1),
      makePassEvent('success', 20, '', 0, 0, 0, 1),
    ];
    const { quarters } = prepareStats({ summary: makeSummary(), events });

    assert.deepEqual(quarters.q3, { ok: 0, fail: 0, total: 0, pct: 0 });
    assert.deepEqual(quarters.q4, { ok: 0, fail: 0, total: 0, pct: 0 });
  });
});

// ---------------------------------------------------------------------------
// prepareStats — missing halftime events → htStart/htEnd are null
// ---------------------------------------------------------------------------

describe('prepareStats timeline halftime', () => {
  test('no halftime events → htStart and htEnd are null', () => {
    const events = [makePassEvent('success', 10, '', 0, 0, 0, 1)];
    const { timeline } = prepareStats({ summary: makeSummary(), events });
    assert.equal(timeline.htStart, null);
    assert.equal(timeline.htEnd,   null);
  });

  test('halftime events present → htStart and htEnd are populated', () => {
    const htStartEvt = makeHalftimeEvent('start', 50, '');
    const htEndEvt   = makeHalftimeEvent('end',   60, '');
    const events     = [makePassEvent('success', 10, '', 0, 0, 0, 1), htStartEvt, htEndEvt];
    const { timeline } = prepareStats({ summary: makeSummary(), events });
    assert.deepEqual(timeline.htStart, htStartEvt);
    assert.deepEqual(timeline.htEnd,   htEndEvt);
  });

  test('only htStart present → htEnd is null', () => {
    const htStartEvt = makeHalftimeEvent('start', 50, '');
    const events     = [makePassEvent('success', 10, '', 0, 0, 0, 1), htStartEvt];
    const { timeline } = prepareStats({ summary: makeSummary(), events });
    assert.deepEqual(timeline.htStart, htStartEvt);
    assert.equal(timeline.htEnd, null);
  });
});

// ---------------------------------------------------------------------------
// prepareStats — empty events array → zero-value stats without throwing
// ---------------------------------------------------------------------------

describe('prepareStats empty events', () => {
  test('returns zero/default stats and does not throw', () => {
    const result = prepareStats({ summary: makeSummary(), events: [] });

    assert.deepEqual(result.stats, {
      complete: 0,
      fail: 0,
      accuracy: '0%',
      bestStreak: 0,
      duration: '0:00',
    });
    assert.deepEqual(result.accuracy.passEvents, []);
    assert.deepEqual(result.accuracy.slideData,  []);
    assert.deepEqual(result.accuracy.cumData,    []);
    assert.equal(result.accuracy.streak, null);
    assert.deepEqual(result.quarters.q1, { ok: 0, fail: 0, total: 0, pct: 0 });
    assert.deepEqual(result.quarters.q2, { ok: 0, fail: 0, total: 0, pct: 0 });
    assert.deepEqual(result.quarters.q3, { ok: 0, fail: 0, total: 0, pct: 0 });
    assert.deepEqual(result.quarters.q4, { ok: 0, fail: 0, total: 0, pct: 0 });
  });

  test('events key absent (only summary) → does not throw', () => {
    assert.doesNotThrow(() => prepareStats({ summary: makeSummary() }));
  });
});

// ---------------------------------------------------------------------------
// prepareStats — streakAfter values never reach bestStreak length → streak is null
// ---------------------------------------------------------------------------

describe('prepareStats old export format', () => {
  test('bestStreak > 0 but streakAfter never reaches bestLen → streak is null', () => {
    const events = [
      makePassEvent('success', 10, '', 0, 0, 0, 1),
      makePassEvent('success', 20, '', 0, 0, 0, 1),
      makePassEvent('success', 30, '', 0, 0, 0, 1),
    ];
    const summary = makeSummary({ bestStreak: 3 });
    const { accuracy } = prepareStats({ summary, events });
    assert.equal(accuracy.streak, null);
  });

  test('bestStreak 0 → streak is null regardless of event fields', () => {
    const events = [
      makePassEvent('success', 10, '', 0, 1, 0, 1),
    ];
    const summary = makeSummary({ bestStreak: 0 });
    const { accuracy } = prepareStats({ summary, events });
    assert.equal(accuracy.streak, null);
  });
});
