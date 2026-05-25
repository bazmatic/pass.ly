# Event Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the three implicit event object shapes from `gameState.js` into a pure `events.js` module with named constructor functions, giving both `gameState.js` and tests a canonical schema reference.

**Architecture:** New `events.js` UMD module exports `makePassEvent`, `makePeriodEvent`, `makeHalftimeEvent`. It owns `formatClock` (previously a private helper in `gameState.js`). `gameState.js` requires `events.js` via an updated UMD wrapper and calls the constructors instead of building inline object literals. The local `makePass` test helper in `prepareStats.test.js` is replaced with the canonical `makePassEvent`.

**Tech Stack:** Vanilla JS, UMD module, `node:test` + `node:assert/strict` (Node 22), no DOM in tests.

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `events.js` | **Create** | Three event constructors + private `formatClock` |
| `tests/events.test.js` | **Create** | 6 tests for the constructors |
| `gameState.js` | **Modify** | Require `events.js`, replace inline literals, remove `formatClock` |
| `tests/prepareStats.test.js` | **Modify** | Replace local `makePass` helper with `makePassEvent` |
| `pass-tracker.html` | **Modify** | Add `<script src="events.js"></script>` before `matchClock.js` |
| `index.html` | **Modify** | Same script tag addition |

---

### Task 1: Scaffold `events.js` with `makePassEvent`

**Files:**
- Create: `events.js`
- Create: `tests/events.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/events.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: `Cannot find module '../events.js'`

- [ ] **Step 3: Create `events.js`**

```js
(function(global, factory) {
  typeof module !== 'undefined' ? module.exports = factory() : global.Events = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function formatClock(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function makePassEvent(type, elapsed, ts, streakBefore, streakAfter, runningAccuracy, period) {
    return {
      type,
      elapsed,
      elapsedFormatted: formatClock(elapsed),
      ts,
      streakBefore,
      streakAfter,
      runningAccuracy,
      period,
    };
  }

  return { makePassEvent };
}));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 49 pass, 0 fail (47 existing + 2 new)

- [ ] **Step 5: Commit**

```bash
git add events.js tests/events.test.js
git commit -m "Add events module scaffold with makePassEvent"
```

---

### Task 2: Add `makePeriodEvent` and `makeHalftimeEvent`

**Files:**
- Modify: `events.js`
- Modify: `tests/events.test.js`

- [ ] **Step 1: Add 4 failing tests**

Add `makePeriodEvent` and `makeHalftimeEvent` to the require destructuring in `tests/events.test.js`:

```js
const { makePassEvent, makePeriodEvent, makeHalftimeEvent } = require('../events.js');
```

Then add these three `describe` blocks after the existing `makePassEvent` block:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 4 failures — `makePeriodEvent is not a function` (and similar)

- [ ] **Step 3: Implement both functions in `events.js`**

Add before the `return` statement:

```js
  function makePeriodEvent(n, elapsed, ts) {
    return { type: 'period', period: n, elapsed, ts };
  }

  function makeHalftimeEvent(phase, elapsed, ts) {
    return { type: 'halftime', phase, elapsed, ts };
  }
```

Update the exports:

```js
  return { makePassEvent, makePeriodEvent, makeHalftimeEvent };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 53 pass, 0 fail (49 existing + 4 new)

- [ ] **Step 5: Commit**

```bash
git add events.js tests/events.test.js
git commit -m "Add makePeriodEvent and makeHalftimeEvent to events module"
```

---

### Task 3: Wire `events.js` into `gameState.js`

**Files:**
- Modify: `gameState.js`

Read `gameState.js` before editing. Replace the entire file with:

- [ ] **Step 1: Update `gameState.js`**

```js
(function(global, factory) {
  if (typeof module !== 'undefined') {
    module.exports = factory(require('./events.js'));
  } else {
    global.GameState = factory(global.Events);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function(Events) {
  'use strict';

  function initialState() {
    return {
      complete: 0,
      fail:     0,
      poss:     0,
      streak:   0,
      best:     0,
      period:   null,
      htActive: false,
      events:   [],
      history:  [],
    };
  }

  function recordPass(state, type, elapsed, ts) {
    const { history: _, ...snap } = state;
    const newHistory = [...state.history, snap];

    const streakBefore = state.streak;

    let newComplete = state.complete;
    let newFail     = state.fail;
    let newPoss     = state.poss;
    let newStreak   = state.streak;
    let newBest     = state.best;

    if (type === 'success') {
      newComplete += 1;
      newStreak   += 1;
      if (newStreak > newBest) newBest = newStreak;
    } else if (type === 'fail') {
      newFail   += 1;
      newStreak  = 0;
    } else if (type === 'poss') {
      newPoss   += 1;
      newStreak  = 0;
    }

    const totalPasses    = newComplete + newFail;
    const runningAccuracy = totalPasses === 0 ? 0 : Math.round((newComplete / totalPasses) * 100);

    const event = Events.makePassEvent(type, elapsed, ts, streakBefore, newStreak, runningAccuracy, state.period);

    return {
      ...state,
      complete: newComplete,
      fail:     newFail,
      poss:     newPoss,
      streak:   newStreak,
      best:     newBest,
      events:   [...state.events, event],
      history:  newHistory,
    };
  }

  function undoLast(state) {
    if (state.history.length === 0) return state;
    const snap = state.history[state.history.length - 1];
    return { ...snap, history: state.history.slice(0, -1) };
  }

  function activatePeriod(state, n, elapsed, ts) {
    return {
      ...state,
      period: n,
      events: [...state.events, Events.makePeriodEvent(n, elapsed, ts)],
    };
  }

  function toggleHT(state, elapsed, ts) {
    const phase = state.htActive ? 'end' : 'start';
    return {
      ...state,
      htActive: !state.htActive,
      events: [...state.events, Events.makeHalftimeEvent(phase, elapsed, ts)],
    };
  }

  function resetState() {
    return initialState();
  }

  return { initialState, recordPass, undoLast, activatePeriod, toggleHT, resetState };
}));
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test
```

Expected: 53 pass, 0 fail (no new tests — existing `gameState.test.js` verifies event shapes)

- [ ] **Step 3: Commit**

```bash
git add gameState.js
git commit -m "Wire events.js into gameState.js: replace inline event literals"
```

---

### Task 4: Update `prepareStats.test.js` fixtures

**Files:**
- Modify: `tests/prepareStats.test.js`

Read the file before editing. Make the changes below in order.

- [ ] **Step 1: Update the require line and remove `makePass` helper**

Replace:

```js
const { prepareStats, slidingAccuracy, findBestStreak } = require('../prepareStats.js');
```

With:

```js
const { prepareStats, slidingAccuracy, findBestStreak } = require('../prepareStats.js');
const { makePassEvent, makeHalftimeEvent } = require('../events.js');
```

Then delete the entire `makePass` helper function (lines ~14–21):

```js
function makePass(type, elapsed, period = 1, extra = {}) {
  return {
    type,
    elapsed,
    period,
    elapsedFormatted: String(elapsed),
    runningAccuracy: 0,
    ...extra,
  };
}
```

- [ ] **Step 2: Replace all `makePass` calls**

Use this mapping for every `makePass` call in the file:

| Old call | New call |
|----------|----------|
| `makePass(type, elapsed)` | `makePassEvent(type, elapsed, '', 0, 0, 0, 1)` |
| `makePass(type, elapsed, period)` | `makePassEvent(type, elapsed, '', 0, 0, 0, period)` |
| `makePass(type, elapsed, period, { streakBefore: X, streakAfter: Y })` | `makePassEvent(type, elapsed, '', X, Y, 0, period)` |

Full list of substitutions:

```
// slidingAccuracy tests
makePass('success', 1)                                     → makePassEvent('success', 1, '', 0, 0, 0, 1)
makePass('fail', 1)                                        → makePassEvent('fail', 1, '', 0, 0, 0, 1)
makePass('success', 1) [window test ×4]                    → makePassEvent('success'|'fail', N, '', 0, 0, 0, 1)
makePass('success', i + 1) [loop ×2]                       → makePassEvent('success', i + 1, '', 0, 0, 0, 1)
makePass('fail', 21)                                       → makePassEvent('fail', 21, '', 0, 0, 0, 1)
makePass('fail', i + 11) [loop]                            → makePassEvent('fail', i + 11, '', 0, 0, 0, 1)

// findBestStreak tests
makePass('success', 1, 1, { streakBefore: 0, streakAfter: 1 }) → makePassEvent('success', 1, '', 0, 1, 0, 1)
makePass('success', 2, 1, { streakBefore: 1, streakAfter: 2 }) → makePassEvent('success', 2, '', 1, 2, 0, 1)
makePass('fail',    1, 1, { streakBefore: 0, streakAfter: 0 }) → makePassEvent('fail', 1, '', 0, 0, 0, 1)
makePass('success', 2, 1, { streakBefore: 0, streakAfter: 1 }) → makePassEvent('success', 2, '', 0, 1, 0, 1)
makePass('success', 3, 1, { streakBefore: 1, streakAfter: 2 }) → makePassEvent('success', 3, '', 1, 2, 0, 1)
makePass('success', 4, 1, { streakBefore: 2, streakAfter: 3 }) → makePassEvent('success', 4, '', 2, 3, 0, 1)
makePass('fail',    5, 1, { streakBefore: 0, streakAfter: 0 }) → makePassEvent('fail', 5, '', 0, 0, 0, 1)
makePass('success', 1, 1, { streakBefore: 0, streakAfter: 1 }) → makePassEvent('success', 1, '', 0, 1, 0, 1)
makePass('success', 2, 1, { streakBefore: 1, streakAfter: 2 }) → makePassEvent('success', 2, '', 1, 2, 0, 1)

// quarters tests
makePass('success', 10, 1) → makePassEvent('success', 10, '', 0, 0, 0, 1)
makePass('success', 20, 1) → makePassEvent('success', 20, '', 0, 0, 0, 1)
makePass('fail',    30, 1) → makePassEvent('fail', 30, '', 0, 0, 0, 1)
makePass('success', 40, 1) → makePassEvent('success', 40, '', 0, 0, 0, 1)
makePass('success', 60, 2) → makePassEvent('success', 60, '', 0, 0, 0, 2)
makePass('fail',    70, 2) → makePassEvent('fail', 70, '', 0, 0, 0, 2)
makePass('success', 80, 2) → makePassEvent('success', 80, '', 0, 0, 0, 2)
makePass('success', 90, 2) → makePassEvent('success', 90, '', 0, 0, 0, 2)
makePass('success', 10, 1) → makePassEvent('success', 10, '', 0, 0, 0, 1)  [×2 more]

// timeline/halftime tests
makePass('success', 10, 1) → makePassEvent('success', 10, '', 0, 0, 0, 1)  [×3 more]

// old export format tests
makePass('success', 10, 1) → makePassEvent('success', 10, '', 0, 0, 0, 1)
makePass('success', 20, 1) → makePassEvent('success', 20, '', 0, 0, 0, 1)
makePass('success', 30, 1) → makePassEvent('success', 30, '', 0, 0, 0, 1)
makePass('success', 10, 1, { streakBefore: 0, streakAfter: 1 }) → makePassEvent('success', 10, '', 0, 1, 0, 1)
```

- [ ] **Step 3: Replace inline halftime event objects**

In the `'prepareStats timeline halftime'` describe block, replace the three inline object literals with constructor calls:

```js
// Replace this:
const htStartEvt = { type: 'halftime', phase: 'start', elapsed: 50 };
const htEndEvt   = { type: 'halftime', phase: 'end',   elapsed: 60 };

// With this:
const htStartEvt = makeHalftimeEvent('start', 50, '');
const htEndEvt   = makeHalftimeEvent('end',   60, '');
```

And in the `'only htStart present'` test:

```js
// Replace this:
const htStartEvt = { type: 'halftime', phase: 'start', elapsed: 50 };

// With this:
const htStartEvt = makeHalftimeEvent('start', 50, '');
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 53 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add tests/prepareStats.test.js
git commit -m "Replace makePass test helper with canonical makePassEvent from events.js"
```

---

### Task 5: Add script tags to HTML files and final verification

**Files:**
- Modify: `pass-tracker.html`
- Modify: `index.html`

- [ ] **Step 1: Add script tag to `pass-tracker.html`**

Before the existing `<script src="matchClock.js"></script>` line (currently line 248), add:

```html
<script src="events.js"></script>
```

So the three tags read:

```html
<script src="events.js"></script>
<script src="matchClock.js"></script>
<script src="gameState.js"></script>
```

- [ ] **Step 2: Add the same script tag to `index.html`**

Apply the identical change to `index.html` — add `<script src="events.js"></script>` immediately before `<script src="matchClock.js"></script>`.

- [ ] **Step 3: Verify no remaining bare `formatClock` references**

Scan `gameState.js` for any remaining reference to `formatClock`. There should be none.

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
npm test
```

Expected: 53 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add pass-tracker.html index.html
git commit -m "Add events.js script tag to HTML files"
```
