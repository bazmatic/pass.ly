# Game State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all game state logic from `pass-tracker.html` into a pure `gameState.js` module, tested with `node:test`, then wire the tracker to use it.

**Architecture:** `gameState.js` is a UMD module — CJS in Node (for tests), global `GameState` namespace in the browser (loaded via `<script src>`). All functions are pure: they take a state object and return a new one. The tracker retains clock side effects (`Date.now()`, `setInterval`) and all DOM/audio calls; it holds a single `let state` variable and replaces it after each module call.

**Tech Stack:** Vanilla JS, Node 22 `node:test` + `node:assert/strict`, no build tool.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `gameState.js` | **Create** | Pure state transitions — `initialState`, `recordPass`, `undoLast`, `activatePeriod`, `toggleHT`, `resetState` |
| `tests/gameState.test.js` | **Create** | `node:test` tests for all module functions |
| `pass-tracker.html` | **Modify** | Add `<script src="gameState.js">`, remove flat globals, wire handlers to module |
| `index.html` | **Modify** | Copy of `pass-tracker.html` — update after tracker changes are verified |

---

## Task 1: Scaffold `gameState.js` and test `initialState`

**Files:**
- Create: `gameState.js`
- Create: `tests/gameState.test.js`

- [ ] **Step 1: Create `gameState.js` with UMD wrapper and `initialState`**

```js
// gameState.js
(function(global, factory) {
  typeof module !== 'undefined' ? module.exports = factory() : global.GameState = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
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

  return { initialState };
}));
```

- [ ] **Step 2: Write failing test**

```js
// tests/gameState.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const GS = require('../gameState.js');

describe('initialState', () => {
  it('returns zeroed state with empty arrays', () => {
    const s = GS.initialState();
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
    const a = GS.initialState();
    const b = GS.initialState();
    assert.notStrictEqual(a, b);
    assert.notStrictEqual(a.events, b.events);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 2 passing tests in `initialState` suite.

- [ ] **Step 4: Commit**

```bash
git add gameState.js tests/gameState.test.js
git commit -m "Add gameState module scaffold with initialState"
```

---

## Task 2: Implement `recordPass`

**Files:**
- Modify: `gameState.js`
- Modify: `tests/gameState.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/gameState.test.js`:

```js
describe('recordPass', () => {
  it('success increments complete and streak', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 60, '2026-01-01T00:01:00Z');
    assert.equal(s.complete, 1);
    assert.equal(s.fail, 0);
    assert.equal(s.streak, 1);
    assert.equal(s.best, 1);
  });

  it('fail increments fail and resets streak, preserves best', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 10, 'ts');
    s = GS.recordPass(s, 'success', 20, 'ts');
    s = GS.recordPass(s, 'fail',    30, 'ts');
    assert.equal(s.fail, 1);
    assert.equal(s.streak, 0);
    assert.equal(s.best, 2);
  });

  it('poss increments poss and resets streak, does not increment fail', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 10, 'ts');
    s = GS.recordPass(s, 'poss',    20, 'ts');
    assert.equal(s.poss, 1);
    assert.equal(s.fail, 0);
    assert.equal(s.streak, 0);
    assert.equal(s.best, 1);
  });

  it('appends event with correct fields', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 90, '2026-01-01T00:01:30Z');
    const ev = s.events[0];
    assert.equal(ev.type, 'success');
    assert.equal(ev.elapsed, 90);
    assert.equal(ev.elapsedFormatted, '01:30');
    assert.equal(ev.ts, '2026-01-01T00:01:30Z');
    assert.equal(ev.streakBefore, 0);
    assert.equal(ev.streakAfter, 1);
    assert.equal(ev.runningAccuracy, 100);
    assert.equal(ev.period, null);
  });

  it('runningAccuracy is null when no pass/fail events yet', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'poss', 10, 'ts');
    assert.equal(s.events[0].runningAccuracy, null);
  });

  it('pushes snapshot to history before applying change', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 10, 'ts');
    assert.equal(s.history.length, 1);
    assert.equal(s.history[0].complete, 0);
  });

  it('does not mutate the original state', () => {
    const s = GS.initialState();
    GS.recordPass(s, 'success', 10, 'ts');
    assert.equal(s.complete, 0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: `recordPass` tests fail with `GS.recordPass is not a function`.

- [ ] **Step 3: Implement `recordPass` in `gameState.js`**

Add `formatClock` helper and `recordPass` inside the factory function, and add both to the return object:

```js
function formatClock(secs) {
  return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
}

function recordPass(state, type, elapsed, ts) {
  // Snapshot current state (excluding history to avoid deep nesting)
  const snapshot = {
    complete: state.complete, fail: state.fail, poss: state.poss,
    streak: state.streak, best: state.best, period: state.period,
    htActive: state.htActive, events: state.events.slice(),
  };

  const ev = {
    type,
    period:          state.period,
    ts,
    elapsed,
    elapsedFormatted: formatClock(elapsed),
    streakBefore:    state.streak,
  };

  let { complete, fail, poss, streak, best } = state;
  if (type === 'success') { complete++; streak++; if (streak > best) best = streak; }
  else if (type === 'fail') { fail++; streak = 0; }
  else { poss++; streak = 0; }

  ev.streakAfter     = streak;
  ev.runningAccuracy = (complete + fail) ? Math.round(complete / (complete + fail) * 100) : null;

  return {
    ...state,
    complete, fail, poss, streak, best,
    events:  [...state.events, ev],
    history: [...state.history, snapshot],
  };
}
```

Update the return object:

```js
return { initialState, recordPass };
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add gameState.js tests/gameState.test.js
git commit -m "Add recordPass to gameState module"
```

---

## Task 3: Implement `undoLast`

**Files:**
- Modify: `gameState.js`
- Modify: `tests/gameState.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/gameState.test.js`:

```js
describe('undoLast', () => {
  it('restores previous counters and events', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 10, 'ts');
    s = GS.recordPass(s, 'success', 20, 'ts');
    s = GS.undoLast(s);
    assert.equal(s.complete, 1);
    assert.equal(s.streak, 1);
    assert.equal(s.events.length, 1);
  });

  it('returns state unchanged when history is empty', () => {
    const s = GS.initialState();
    const result = GS.undoLast(s);
    assert.strictEqual(result, s);
  });

  it('history shrinks after undo', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 10, 'ts');
    s = GS.recordPass(s, 'fail',    20, 'ts');
    s = GS.undoLast(s);
    assert.equal(s.history.length, 1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: `undoLast` tests fail with `GS.undoLast is not a function`.

- [ ] **Step 3: Implement `undoLast` in `gameState.js`**

Add inside the factory function:

```js
function undoLast(state) {
  if (!state.history.length) return state;
  const prev = state.history[state.history.length - 1];
  return { ...prev, history: state.history.slice(0, -1) };
}
```

Update return object:

```js
return { initialState, recordPass, undoLast };
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add gameState.js tests/gameState.test.js
git commit -m "Add undoLast to gameState module"
```

---

## Task 4: Implement `activatePeriod` and `toggleHT`

**Files:**
- Modify: `gameState.js`
- Modify: `tests/gameState.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/gameState.test.js`:

```js
describe('activatePeriod', () => {
  it('sets period and appends a period event', () => {
    let s = GS.initialState();
    s = GS.activatePeriod(s, 1, 0, '2026-01-01T00:00:00Z');
    assert.equal(s.period, 1);
    assert.equal(s.events.length, 1);
    assert.equal(s.events[0].type, 'period');
    assert.equal(s.events[0].period, 1);
    assert.equal(s.events[0].elapsed, 0);
  });

  it('can transition from period 1 to period 2', () => {
    let s = GS.initialState();
    s = GS.activatePeriod(s, 1, 0, 'ts');
    s = GS.activatePeriod(s, 2, 1800, 'ts');
    assert.equal(s.period, 2);
    assert.equal(s.events.filter(e => e.type === 'period').length, 2);
  });
});

describe('toggleHT', () => {
  it('sets htActive to true and records halftime start on first call', () => {
    let s = GS.initialState();
    s = GS.toggleHT(s, 1800, '2026-01-01T00:30:00Z');
    assert.equal(s.htActive, true);
    assert.equal(s.events[0].type, 'halftime');
    assert.equal(s.events[0].phase, 'start');
    assert.equal(s.events[0].elapsed, 1800);
  });

  it('sets htActive to false and records halftime end on second call', () => {
    let s = GS.initialState();
    s = GS.toggleHT(s, 1800, 'ts');
    s = GS.toggleHT(s, 2700, 'ts');
    assert.equal(s.htActive, false);
    assert.equal(s.events[1].phase, 'end');
    assert.equal(s.events[1].elapsed, 2700);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: `activatePeriod` and `toggleHT` tests fail with function-not-found errors.

- [ ] **Step 3: Implement both functions in `gameState.js`**

Add inside the factory function:

```js
function activatePeriod(state, n, elapsed, ts) {
  return {
    ...state,
    period: n,
    events: [...state.events, { type: 'period', period: n, ts, elapsed }],
  };
}

function toggleHT(state, elapsed, ts) {
  const htActive = !state.htActive;
  return {
    ...state,
    htActive,
    events: [...state.events, { type: 'halftime', phase: htActive ? 'start' : 'end', ts, elapsed }],
  };
}
```

Update return object:

```js
return { initialState, recordPass, undoLast, activatePeriod, toggleHT };
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add gameState.js tests/gameState.test.js
git commit -m "Add activatePeriod and toggleHT to gameState module"
```

---

## Task 5: Implement `resetState`

**Files:**
- Modify: `gameState.js`
- Modify: `tests/gameState.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/gameState.test.js`:

```js
describe('resetState', () => {
  it('returns a zeroed initial state regardless of prior state', () => {
    let s = GS.initialState();
    s = GS.recordPass(s, 'success', 10, 'ts');
    s = GS.activatePeriod(s, 1, 0, 'ts');
    s = GS.resetState();
    assert.equal(s.complete, 0);
    assert.equal(s.fail, 0);
    assert.equal(s.period, null);
    assert.equal(s.htActive, false);
    assert.deepEqual(s.events, []);
    assert.deepEqual(s.history, []);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: `resetState` test fails with `GS.resetState is not a function`.

- [ ] **Step 3: Implement `resetState` in `gameState.js`**

Add inside factory:

```js
function resetState() {
  return initialState();
}
```

Update return object:

```js
return { initialState, recordPass, undoLast, activatePeriod, toggleHT, resetState };
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests passing (should be 20+ tests across all suites).

- [ ] **Step 5: Commit**

```bash
git add gameState.js tests/gameState.test.js
git commit -m "Add resetState — gameState module complete"
```

---

## Task 6: Wire `gameState.js` into `pass-tracker.html` — globals and core handlers

**Files:**
- Modify: `pass-tracker.html`

This task removes all flat globals and updates `count()`, `undo()`, `clearAll()`, and `render()` (renamed from `update()`).

- [ ] **Step 1: Add `<script src="gameState.js">` before the main script block**

In `pass-tracker.html`, find the line:

```html
<script>
  let s = 0, f = 0, p = 0, streak = 0, best = 0;
```

Replace with:

```html
<script src="gameState.js"></script>
<script>
  let state = GameState.initialState();
```

- [ ] **Step 2: Remove the flat globals**

Remove these lines entirely from the script block:

```js
  let s = 0, f = 0, p = 0, streak = 0, best = 0;
  let history = [], events = [];
```

Also remove `htActive` from the `pendingHalf` line — it becomes just:

```js
  let pendingHalf = null;
```

- [ ] **Step 3: Update `count()`**

Replace the existing `count` function:

```js
  function count(type, btn) {
    if (type === 'success') soundSuccess();
    else if (type === 'fail') soundFail();
    else if (type === 'poss') soundReset();
    state = GameState.recordPass(state, type, elapsedSecs(), isoNow());
    render();
    saveState();
    bump(type === 'success' ? 'val-s' : 'val-f');
    ripple(btn, type === 'success' ? 'rgba(100,255,150,0.35)' : type === 'fail' ? 'rgba(255,80,80,0.35)' : 'rgba(240,160,0,0.35)');
  }
```

- [ ] **Step 4: Update `undo()`**

Replace:

```js
  function undo() {
    if (!state.history.length) return;
    state = GameState.undoLast(state);
    render();
    saveState();
  }
```

- [ ] **Step 5: Update `clearAll()`**

Replace:

```js
  function clearAll() {
    if (!state.events.length) return;
    document.getElementById('reset-modal').classList.add('show');
  }
```

- [ ] **Step 6: Rename `update()` to `render()` and rewrite to read from `state`**

Replace the existing `update` function:

```js
  function render() {
    document.getElementById('val-s').textContent = state.complete;
    document.getElementById('val-f').textContent = state.fail;
    document.getElementById('streak-cur').textContent = state.streak;
    document.getElementById('streak-best').textContent = state.best;
    document.getElementById('undo-btn').disabled = state.history.length === 0;
    const total = state.complete + state.fail;
    const acc = document.getElementById('accuracy-bar');
    acc.innerHTML = total
      ? `Accuracy — <span>${Math.round(state.complete / total * 100)}%</span> &nbsp;·&nbsp; ${total} passes${state.poss ? ` &nbsp;·&nbsp; ${state.poss} lost poss.` : ''}`
      : 'Accuracy — <span>—</span>';
  }
```

- [ ] **Step 7: Commit**

```bash
git add pass-tracker.html
git commit -m "Wire gameState module into tracker — globals and core handlers"
```

---

## Task 7: Update period, HT, reset, save/load handlers

**Files:**
- Modify: `pass-tracker.html`

- [ ] **Step 1: Update `activatePeriod()` to call module and read `state.period`**

Replace the existing `activatePeriod` function:

```js
  function activatePeriod(n) {
    if (clockInterval) {
      clockOffset += Date.now() - sessionStart;
      if (state.period) halfOffsets[state.period] += Date.now() - halfStarts[state.period];
      clearInterval(clockInterval);
    }
    state = GameState.activatePeriod(state, n, elapsedSecs(), isoNow());
    sessionStart = Date.now();
    halfStarts[n] = Date.now();
    clockInterval = setInterval(tickClock, 1000);
    tickClock();
    updatePeriodButtons();
    saveState();
  }
```

- [ ] **Step 2: Update `setPeriod()` to read `state.period`**

Replace:

```js
  function setPeriod(n) {
    if (state.period === n) return;
    if (n === 1 && state.period === 2) { toast('1st Half is locked'); return; }
    if (n === 2 && state.period === null) { toast('Start 1st Half first'); return; }
    if (n === 2 && state.period === 1) {
      pendingHalf = n;
      document.getElementById('confirm-box').classList.add('show');
      return;
    }
    activatePeriod(n);
  }
```

- [ ] **Step 3: Update `toggleHT()` to call module**

Replace:

```js
  function toggleHT() {
    state = GameState.toggleHT(state, elapsedSecs(), isoNow());
    document.getElementById('btn-ht').classList.toggle('active', state.htActive);
    saveState();
  }
```

- [ ] **Step 4: Update `updatePeriodButtons()` to read `state.period`**

Replace:

```js
  function updatePeriodButtons() {
    const h1 = document.getElementById('btn-h1');
    const h2 = document.getElementById('btn-h2');
    if (state.period === 1) {
      h1.style.cssText = 'background:#00dd55;color:#000;border:3px solid #fff;';
      h2.style.cssText = '';
    } else if (state.period === 2) {
      h1.style.cssText = 'opacity:0.3;cursor:not-allowed;';
      h2.style.cssText = 'background:#ffaa00;color:#000;border:3px solid #fff;';
    }
  }
```

- [ ] **Step 5: Update `halfElapsedSecs()` to read `state.period`**

Replace:

```js
  function halfElapsedSecs(h) {
    if (!halfStarts[h]) return 0;
    const running = state.period === h ? Date.now() - halfStarts[h] : 0;
    return Math.floor((halfOffsets[h] + running) / 1000);
  }
```

- [ ] **Step 6: Update `confirmReset()` to use `GameState.resetState()`**

Replace:

```js
  function confirmReset(yes) {
    document.getElementById('reset-modal').classList.remove('show');
    if (!yes) return;
    state = GameState.resetState();
    clockOffset = 0; sessionStart = null;
    halfStarts = {1: null, 2: null}; halfOffsets = {1: 0, 2: 0};
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    document.getElementById('clock').textContent = '00:00';
    document.getElementById('clock-h1').textContent = '';
    document.getElementById('clock-h2').textContent = '';
    document.getElementById('btn-h1').style.cssText = '';
    document.getElementById('btn-h2').style.cssText = '';
    document.getElementById('btn-ht').classList.remove('active');
    render();
    localStorage.removeItem(STORAGE_KEY);
  }
```

- [ ] **Step 7: Update `saveState()` and `loadState()`**

Replace `saveState`:

```js
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
```

Replace `loadState`:

```js
  function loadState() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return; }
    if (!saved || saved.complete === undefined) return; // drop old format
    state = { ...GameState.initialState(), ...saved };
    render();
    if (state.htActive) document.getElementById('btn-ht').classList.add('active');
    if (state.period) { updatePeriodButtons(); tickClock(); clockInterval = setInterval(tickClock, 1000); }
  }
```

- [ ] **Step 8: Commit**

```bash
git add pass-tracker.html
git commit -m "Update period/HT/reset/save handlers to use gameState module"
```

---

## Task 8: Update `exportData` and `share`

**Files:**
- Modify: `pass-tracker.html`

- [ ] **Step 1: Update `exportData()` to read from `state`**

Replace the existing `exportData` function:

```js
  function exportData() {
    if (!state.events.length) { toast('No data to export yet'); return; }
    const total = state.complete + state.fail;
    const summary = {
      complete:       state.complete,
      fail:           state.fail,
      lostPossession: state.poss,
      total,
      accuracy:       total ? Math.round(state.complete / total * 100) + '%' : '—',
      bestStreak:     state.best,
      duration:       formatClock(elapsedSecs()),
    };
    const jsonData = JSON.stringify({ summary, events: state.events }, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pass-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported as JSON');
  }
```

- [ ] **Step 2: Update `share()` to read from `state`**

Replace the existing `share` function:

```js
  function share() {
    const total = state.complete + state.fail;
    const text =
`⚽ Pass Tracker Stats
──────────────────
✅ Complete:  ${state.complete}
❌ Fail:      ${state.fail}
⚠️  Lost Poss: ${state.poss}
🎯 Accuracy:  ${total ? Math.round(state.complete / total * 100) + '%' : '—'}
🔥 Streak:    ${state.streak}
⭐ Best:      ${state.best}
⏱ Duration:  ${formatClock(elapsedSecs())}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => toast('Stats copied!')).catch(() => toast('Could not copy'));
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add pass-tracker.html
git commit -m "Update exportData and share to read from state object"
```

---

## Task 9: Verify and sync `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Open the tracker in a browser and verify manually**

Open `pass-tracker.html` directly in a browser (file://) or via a local server. Check:
- Tapping ✓ increments Complete, increments streak
- Tapping ✗ increments Fail, resets streak, preserves Best
- Tapping Streak Reset increments Lost Poss, resets streak, does not affect Fail
- Undo reverses the last tap
- Tapping ▶ 1st starts the clock, button highlights green
- Tapping HT toggles amber active state
- Tapping ▶ 2nd shows confirmation, then starts P2 on confirm
- Export produces valid JSON that loads in `stats-viewer.html`
- Reset clears everything after confirmation
- Reload the page — state restores correctly

- [ ] **Step 2: Run unit tests one final time**

```bash
npm test
```

Expected: all tests passing.

- [ ] **Step 3: Copy to `index.html`**

```bash
cp pass-tracker.html index.html
```

- [ ] **Step 4: Final commit**

```bash
git add index.html
git commit -m "Sync index.html with pass-tracker.html after gameState refactor"
```
