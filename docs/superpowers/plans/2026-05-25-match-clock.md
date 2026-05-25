# Match Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the four clock variables and all time-math from `pass-tracker.html` into a pure `matchClock.js` module that never calls `Date.now()`, enabling full scenario tests without real timers.

**Architecture:** Same UMD pattern as `gameState.js` — plain objects in, plain objects out, caller passes `now` as a ms timestamp. The tracker replaces its four flat clock variables with `let clock = MatchClock.initialClock()` and passes `Date.now()` at every call site. `clockInterval` stays flat (it's a browser handle, not testable or serializable).

**Tech Stack:** Vanilla JS, UMD module, `node:test` + `node:assert/strict` (Node 22), no DOM in tests.

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `matchClock.js` | **Create** | Pure clock state + time math |
| `tests/matchClock.test.js` | **Create** | 13 tests for the module |
| `pass-tracker.html` | **Modify** | Wire up MatchClock, remove flat clock vars |

---

### Task 1: Scaffold `matchClock.js` and test `initialClock`

**Files:**
- Create: `matchClock.js`
- Create: `tests/matchClock.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/matchClock.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: `ReferenceError` or `Cannot find module '../matchClock.js'`

- [ ] **Step 3: Create `matchClock.js`**

```js
(function(global, factory) {
  typeof module !== 'undefined' ? module.exports = factory() : global.MatchClock = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function initialClock() {
    return {
      sessionStart: null,
      clockOffset:  0,
      halfStarts:   { 1: null, 2: null },
      halfOffsets:  { 1: 0,    2: 0    },
    };
  }

  return { initialClock };
}));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 36 pass, 0 fail (34 existing + 2 new)

- [ ] **Step 5: Commit**

```bash
git add matchClock.js tests/matchClock.test.js
git commit -m "Add matchClock module scaffold with initialClock"
```

---

### Task 2: Implement `startPeriod` and tests

**Files:**
- Modify: `matchClock.js`
- Modify: `tests/matchClock.test.js`

- [ ] **Step 1: Add 3 failing tests**

Add this `describe` block to `tests/matchClock.test.js` (add `startPeriod` to the require destructuring first):

```js
const { initialClock, startPeriod } = require('../matchClock.js');
```

```js
describe('startPeriod', () => {
  it('starting period 1 from fresh clock sets sessionStart and halfStarts', () => {
    const c0 = initialClock();
    const c1 = startPeriod(c0, null, 1, 1000);
    assert.equal(c1.sessionStart,   1000);
    assert.equal(c1.halfStarts[1],  1000);
    assert.equal(c1.clockOffset,    0);
  });

  it('starting period 2 accumulates clockOffset and halfOffsets[1]', () => {
    const t0 = 0;
    const t1 = 30 * 60 * 1000;   // 30 min later
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 3 failures — `startPeriod is not a function`

- [ ] **Step 3: Implement `startPeriod` in `matchClock.js`**

Add before the `return` statement:

```js
  function startPeriod(clock, outgoing, n, now) {
    let newClockOffset  = clock.clockOffset;
    const newHalfOffsets = { ...clock.halfOffsets };

    if (clock.sessionStart !== null) {
      newClockOffset += now - clock.sessionStart;
      if (outgoing !== null) {
        newHalfOffsets[outgoing] += now - clock.halfStarts[outgoing];
      }
    }

    return {
      ...clock,
      sessionStart: now,
      clockOffset:  newClockOffset,
      halfStarts:   { ...clock.halfStarts,  [n]: now },
      halfOffsets:  newHalfOffsets,
    };
  }
```

Add `startPeriod` to the exports:

```js
  return { initialClock, startPeriod };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 39 pass, 0 fail (36 existing + 3 new)

- [ ] **Step 5: Commit**

```bash
git add matchClock.js tests/matchClock.test.js
git commit -m "Add startPeriod to matchClock module"
```

---

### Task 3: Implement `totalElapsed`, `halfElapsed`, `resetClock` and tests

**Files:**
- Modify: `matchClock.js`
- Modify: `tests/matchClock.test.js`

- [ ] **Step 1: Add 8 failing tests**

Update the require line to import all functions:

```js
const { initialClock, startPeriod, totalElapsed, halfElapsed, resetClock } = require('../matchClock.js');
```

Add these three `describe` blocks:

```js
describe('totalElapsed', () => {
  it('returns 0 when clock has not started', () => {
    const c = initialClock();
    assert.equal(totalElapsed(c, 99999), 0);
  });

  it('returns running seconds when clock is ticking', () => {
    let c = initialClock();
    c = startPeriod(c, null, 1, 0);
    assert.equal(totalElapsed(c, 10000), 10);
  });

  it('full scenario: P1 30min + P2 20min = 50min total', () => {
    let c = initialClock();
    c = startPeriod(c, null, 1, 0);
    c = startPeriod(c, 1,    2, 30 * 60 * 1000);
    assert.equal(totalElapsed(c, 50 * 60 * 1000), 50 * 60);
  });
});

describe('halfElapsed', () => {
  it('returns 0 when half never started', () => {
    const c = initialClock();
    assert.equal(halfElapsed(c, 1, null, 99999), 0);
  });

  it('returns running seconds for the active half', () => {
    let c = initialClock();
    c = startPeriod(c, null, 1, 0);
    assert.equal(halfElapsed(c, 1, 1, 45 * 1000), 45);
  });

  it('returns only accumulated offset for a completed half', () => {
    let c = initialClock();
    c = startPeriod(c, null, 1, 0);
    c = startPeriod(c, 1,    2, 30 * 60 * 1000);
    assert.equal(halfElapsed(c, 1, 2, 50 * 60 * 1000), 30 * 60);
  });

  it('full scenario: P1=30min, P2=20min and counting', () => {
    let c = initialClock();
    c = startPeriod(c, null, 1, 0);
    c = startPeriod(c, 1,    2, 30 * 60 * 1000);
    const t = 50 * 60 * 1000;
    assert.equal(halfElapsed(c, 1, 2, t), 30 * 60);
    assert.equal(halfElapsed(c, 2, 2, t), 20 * 60);
  });
});

describe('resetClock', () => {
  it('returns zeroed state matching initialClock', () => {
    let c = initialClock();
    c = startPeriod(c, null, 1, 0);
    assert.deepEqual(resetClock(), initialClock());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 8 failures — `totalElapsed is not a function` (and similar)

- [ ] **Step 3: Implement the three functions in `matchClock.js`**

Add before the `return` statement:

```js
  function totalElapsed(clock, now) {
    const running = clock.sessionStart !== null ? now - clock.sessionStart : 0;
    return Math.floor((clock.clockOffset + running) / 1000);
  }

  function halfElapsed(clock, h, activePeriod, now) {
    if (clock.halfStarts[h] === null) return 0;
    const running = activePeriod === h ? now - clock.halfStarts[h] : 0;
    return Math.floor((clock.halfOffsets[h] + running) / 1000);
  }

  function resetClock() {
    return initialClock();
  }
```

Update the exports:

```js
  return { initialClock, startPeriod, totalElapsed, halfElapsed, resetClock };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 47 pass, 0 fail (39 existing + 8 new)

- [ ] **Step 5: Commit**

```bash
git add matchClock.js tests/matchClock.test.js
git commit -m "Add totalElapsed, halfElapsed, resetClock to matchClock module"
```

---

### Task 4: Wire `matchClock.js` into `pass-tracker.html`

**Files:**
- Modify: `pass-tracker.html`

Read the file before editing. Make each change below in order.

- [ ] **Step 1: Add the script tag**

Before the existing `<script src="gameState.js"></script>` line (currently line 248), add:

```html
<script src="matchClock.js"></script>
```

So the two tags read:

```html
<script src="matchClock.js"></script>
<script src="gameState.js"></script>
```

- [ ] **Step 2: Replace the global declarations**

Replace:

```js
  let state = GameState.initialState();
  let sessionStart = null, clockInterval = null, clockOffset = 0;
  let halfStarts = {1:null,2:null}, halfOffsets = {1:0,2:0};
  let pendingHalf = null;
```

With:

```js
  let state = GameState.initialState();
  let clock = MatchClock.initialClock();
  let clockInterval = null, pendingHalf = null;
```

- [ ] **Step 3: Replace `activatePeriod`**

Replace the entire `activatePeriod` function with:

```js
  function activatePeriod(n) {
    clock = MatchClock.startPeriod(clock, state.period, n, Date.now());
    if (clockInterval) clearInterval(clockInterval);
    state = GameState.activatePeriod(state, n, elapsedSecs(), isoNow());
    clockInterval = setInterval(tickClock, 1000);
    tickClock();
    updatePeriodButtons();
    saveState();
  }
```

- [ ] **Step 4: Replace `tickClock`**

Replace the entire `tickClock` function with:

```js
  function tickClock() {
    document.getElementById('clock').textContent = formatClock(elapsedSecs());
    if (clock.halfStarts[1]) document.getElementById('clock-h1').textContent = formatClock(halfElapsedSecs(1));
    if (clock.halfStarts[2]) document.getElementById('clock-h2').textContent = formatClock(halfElapsedSecs(2));
  }
```

- [ ] **Step 5: Replace `elapsedSecs` and `halfElapsedSecs`**

Replace the entire `elapsedSecs` function with:

```js
  function elapsedSecs() { return MatchClock.totalElapsed(clock, Date.now()); }
```

Replace the entire `halfElapsedSecs` function with:

```js
  function halfElapsedSecs(h) { return MatchClock.halfElapsed(clock, h, state.period, Date.now()); }
```

- [ ] **Step 6: Update `confirmReset`**

Inside `confirmReset`, replace:

```js
    clockOffset = 0; sessionStart = null;
    halfStarts = {1:null,2:null}; halfOffsets = {1:0,2:0};
```

With:

```js
    clock = MatchClock.resetClock();
```

- [ ] **Step 7: Update `saveState`**

Replace the entire `saveState` function with:

```js
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ...clock }));
  }
```

- [ ] **Step 8: Update `loadState`**

Inside `loadState`, replace:

```js
    const { clockOffset: co, sessionStart: ss, halfStarts: hs, halfOffsets: ho, ...stateFields } = saved;
    state        = stateFields;
    clockOffset  = co ?? 0;
    sessionStart = ss ?? null;
    halfStarts   = hs ?? {1:null, 2:null};
    halfOffsets  = ho ?? {1:0, 2:0};
```

With:

```js
    const { sessionStart, clockOffset, halfStarts, halfOffsets, ...stateFields } = saved;
    state = stateFields;
    clock = {
      sessionStart: sessionStart ?? null,
      clockOffset:  clockOffset  ?? 0,
      halfStarts:   halfStarts   ?? { 1: null, 2: null },
      halfOffsets:  halfOffsets  ?? { 1: 0,    2: 0    },
    };
```

- [ ] **Step 9: Verify no remaining flat clock references**

Scan the `<script>` block for any remaining references to `sessionStart`, `clockOffset`, `halfStarts`, `halfOffsets` used as bare variables (not as `clock.*`). There should be none.

- [ ] **Step 10: Run tests to confirm no regressions**

```bash
npm test
```

Expected: 47 pass, 0 fail

- [ ] **Step 11: Commit**

```bash
git add pass-tracker.html
git commit -m "Wire matchClock.js into tracker: remove flat clock vars"
```

---

### Task 5: Browser verification and final sync

**Files:**
- Modify: `index.html` (copy of `pass-tracker.html`)

- [ ] **Step 1: Serve the project locally**

```bash
npx serve . -p 4321
```

Open `http://localhost:4321/pass-tracker.html` in a browser.

- [ ] **Step 2: Verify the golden path**

In the browser:
1. Tap **▶ 1ST** — clock starts ticking, button turns green
2. Tap **✓** three times — Complete shows 3, Streak shows 3
3. Tap **HT** — button turns amber/active
4. Tap **HT** again — button deactivates
5. Tap **▶ 2ND** and confirm — clock continues, 2nd button turns amber
6. Tap **✗** — Fail shows 1, Streak resets to 0
7. Tap undo — Fail back to 0, Streak back to 3
8. Tap **🗑** → Confirm reset — all counters zero, clock resets to 00:00
9. Check browser console — no errors

- [ ] **Step 3: Verify localStorage format**

In browser DevTools console:

```js
JSON.parse(localStorage.getItem('passTrackerState'))
```

Expected: object with `complete`, `fail`, `poss`, `sessionStart`, `clockOffset`, `halfStarts`, `halfOffsets` — no old flat vars (`s`, `f`, `p`, etc.)

- [ ] **Step 4: Copy to `index.html`**

```bash
cp pass-tracker.html index.html
```

- [ ] **Step 5: Final commit**

```bash
git add pass-tracker.html index.html
git commit -m "Browser-verified: sync index.html from pass-tracker.html"
```
