# Goal Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add goal-for / goal-against logging to the pass tracker, with live score display and stats viewer integration.

**Architecture:** Two new event types (`goal_for`, `goal_against`) extend the existing pass-family event model. Goals reset the streak, increment dedicated counters on state, and are stored inline in `events[]` like all other events. The tracker shows a live score in the header and small goal buttons below the streak-reset row. The stats viewer gains two summary cards and goal markers on the timeline.

**Tech Stack:** Vanilla JS (UMD modules), HTML/CSS, node:test for unit tests.

---

## File Map

| File | Change |
|------|--------|
| `events.js` | Add `makeGoalEvent` factory |
| `gameState.js` | Add `goalsFor`/`goalsAgainst` to state; handle `goal_for`/`goal_against` in `recordPass` |
| `tests/events.test.js` | Add tests for `makeGoalEvent` |
| `tests/gameState.test.js` | Add tests for goal types in `recordPass`; update `initialState` shape test |
| `pass-tracker.html` | Add score display to header; add goal button row; add diamond trail shapes; update `count()`, `render()`, `exportData()`, `share()` |
| `stats-viewer.html` | Add Goals For / Goals Against summary cards; add goal markers to timeline; update `prepareStats` |

---

## Task 1: `makeGoalEvent` in `events.js`

**Files:**
- Modify: `events.js`
- Test: `tests/events.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/events.test.js` after the existing `makeHalftimeEvent` describe block:

```js
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
```

Also update the destructure on line 5 to include `makeGoalEvent`:

```js
const { makePassEvent, makePeriodEvent, makeHalftimeEvent, makeGoalEvent } = require('../events.js');
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/events.test.js
```

Expected: FAIL — `makeGoalEvent is not a function` (or similar)

- [ ] **Step 3: Implement `makeGoalEvent` in `events.js`**

Add after the `makeHalftimeEvent` function (before the `return` statement):

```js
function makeGoalEvent(type, elapsed, ts) {
  return { type, elapsed, elapsedFormatted: formatClock(elapsed), ts };
}
```

Update the `return` statement to export it:

```js
return { makePassEvent, makePeriodEvent, makeHalftimeEvent, makeGoalEvent };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test tests/events.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add events.js tests/events.test.js
git commit -m "feat: add makeGoalEvent factory to events.js"
```

---

## Task 2: Goal state in `gameState.js`

**Files:**
- Modify: `gameState.js`
- Test: `tests/gameState.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/gameState.test.js`:

After the existing `initialState` describe block, update the shape test to assert the new counters exist. Add inside `describe('initialState', ...)`:

```js
it('includes goalsFor and goalsAgainst counters', () => {
  const s = initialState();
  assert.equal(s.goalsFor, 0);
  assert.equal(s.goalsAgainst, 0);
});
```

Add a new `describe` block after the `recordPass` block:

```js
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
```

Also add `undoLast` to the import on line 5 (it's already there — no change needed).

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/gameState.test.js
```

Expected: FAIL — `s.goalsFor` is `undefined`

- [ ] **Step 3: Add `goalsFor`/`goalsAgainst` to `initialState`**

In `gameState.js`, update `initialState()`:

```js
function initialState() {
  return {
    complete:     0,
    fail:         0,
    poss:         0,
    streak:       0,
    best:         0,
    goalsFor:     0,
    goalsAgainst: 0,
    period:       null,
    htActive:     false,
    events:       [],
    history:      [],
  };
}
```

- [ ] **Step 4: Handle `goal_for` and `goal_against` in `recordPass`**

In `gameState.js`, update `recordPass` to add after the `poss` branch (before computing `totalPasses`):

```js
let newGoalsFor     = state.goalsFor;
let newGoalsAgainst = state.goalsAgainst;

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
} else if (type === 'goal_for') {
  newGoalsFor += 1;
  newStreak    = 0;
} else if (type === 'goal_against') {
  newGoalsAgainst += 1;
  newStreak        = 0;
}
```

For goal types, use `makeGoalEvent` instead of `makePassEvent`. Replace the single `const event = ...` line with:

```js
const isGoal = type === 'goal_for' || type === 'goal_against';
const event  = isGoal
  ? Events.makeGoalEvent(type, elapsed, ts)
  : Events.makePassEvent(type, elapsed, ts, streakBefore, newStreak, runningAccuracy, state.period);
```

Note: `runningAccuracy` still needs to be computed before this line. Move the `totalPasses` / `runningAccuracy` computation to before the `isGoal` check, so it's always available for pass events.

The full updated `recordPass` function:

```js
function recordPass(state, type, elapsed, ts) {
  const { history: _, ...snap } = state;
  const newHistory = [...state.history, snap];

  const streakBefore = state.streak;

  let newComplete     = state.complete;
  let newFail         = state.fail;
  let newPoss         = state.poss;
  let newStreak       = state.streak;
  let newBest         = state.best;
  let newGoalsFor     = state.goalsFor;
  let newGoalsAgainst = state.goalsAgainst;

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
  } else if (type === 'goal_for') {
    newGoalsFor += 1;
    newStreak    = 0;
  } else if (type === 'goal_against') {
    newGoalsAgainst += 1;
    newStreak        = 0;
  }

  const totalPasses     = newComplete + newFail;
  const runningAccuracy = totalPasses === 0 ? 0 : Math.round((newComplete / totalPasses) * 100);

  const isGoal = type === 'goal_for' || type === 'goal_against';
  const event  = isGoal
    ? Events.makeGoalEvent(type, elapsed, ts)
    : Events.makePassEvent(type, elapsed, ts, streakBefore, newStreak, runningAccuracy, state.period);

  return {
    ...state,
    complete:     newComplete,
    fail:         newFail,
    poss:         newPoss,
    streak:       newStreak,
    best:         newBest,
    goalsFor:     newGoalsFor,
    goalsAgainst: newGoalsAgainst,
    events:       [...state.events, event],
    history:      newHistory,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
node --test tests/gameState.test.js
```

Expected: all tests PASS

- [ ] **Step 6: Run full test suite**

```bash
node --test tests/*.test.js
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add events.js gameState.js tests/events.test.js tests/gameState.test.js
git commit -m "feat: add goal_for/goal_against event types to gameState"
```

---

## Task 3: Goal buttons and score display in `pass-tracker.html`

**Files:**
- Modify: `pass-tracker.html`

- [ ] **Step 1: Add CSS for goal buttons, score display, and diamond trail shapes**

In the `<style>` block, add after the `.streak-row` / `.streak-box` rules:

```css
/* Score display */
.match-score {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1rem; letter-spacing: 0.1em;
  color: var(--text);
  margin-left: auto;
}
.match-score + .match-clock { margin-left: 0.75rem; }

/* Goal buttons */
.goal-btns {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.6rem; flex-shrink: 0;
}
.btn-goal {
  font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 0.15em;
  padding: 0.5rem 0.5rem; border-radius: 3px; cursor: pointer;
  -webkit-tap-highlight-color: transparent; user-select: none;
  transition: color 0.15s, background 0.15s, transform 0.08s;
}
.btn-goal:active { transform: scale(0.95); }
.btn-goal-for {
  background: rgba(34,168,84,0.08); color: var(--green-bright);
  border: 1px solid rgba(34,168,84,0.25);
}
.btn-goal-against {
  background: rgba(232,37,64,0.08); color: var(--red-bright);
  border: 1px solid rgba(232,37,64,0.25);
}

/* Diamond trail shape for goals */
.trail-dot.goal_for,
.trail-dot.goal_against {
  border-radius: 2px;
  transform: rotate(45deg);
  width: 9px; height: 9px;
}
.trail-dot.goal_for    { background: var(--green-bright); box-shadow: 0 0 5px rgba(34,168,84,0.5); }
.trail-dot.goal_against { background: var(--red-bright);  box-shadow: 0 0 5px rgba(232,37,64,0.5); }
.trail-dot.goal_for.new,
.trail-dot.goal_against.new { animation: dotPop 0.2s ease; }
```

- [ ] **Step 2: Update the header HTML to add the score display**

Replace the existing header div:

```html
<div class="header">
  <div class="header-dot"></div>
  <div class="header-title">⚽ Pass Tracker</div>
  <div class="match-score" id="match-score">0 – 0</div>
  <div class="match-clock" id="clock">00:00</div>
</div>
```

Also remove `margin-left: auto` from `.match-clock` in the CSS (the score now takes that role). Update:

```css
.match-clock { font-size:1rem; letter-spacing:.12em; color:var(--text); }
```

- [ ] **Step 3: Add the goal buttons row HTML**

Insert the following after the `</div>` closing the `.main-btns` div and before the `.util-btns` div:

```html
<div class="goal-btns">
  <button class="btn-goal btn-goal-for"     onclick="recordGoal('goal_for',    this)">⚽ FOR</button>
  <button class="btn-goal btn-goal-against" onclick="recordGoal('goal_against', this)">⚽ AGT</button>
</div>
```

- [ ] **Step 4: Add `recordGoal` function to the script**

Add after the `undo()` function:

```js
function recordGoal(type, btn) {
  state = GameState.recordPass(state, type, elapsedSecs(), isoNow());
  render();
  saveState();
  ripple(btn, type === 'goal_for' ? 'rgba(34,168,84,0.35)' : 'rgba(232,37,64,0.35)');
}
```

- [ ] **Step 5: Update `render()` to update the score display**

In the `render()` function, add after the existing stat updates:

```js
document.getElementById('match-score').textContent =
  state.goalsFor + ' – ' + state.goalsAgainst;
```

- [ ] **Step 6: Update `renderTrail()` to include goal events**

The trail currently filters for `success`, `fail`, `poss`. Update the filter to include goals:

```js
const passEvents = state.events.filter(e =>
  e.type === 'success' || e.type === 'fail' || e.type === 'poss' ||
  e.type === 'goal_for' || e.type === 'goal_against'
);
```

The `trail-dot` class name uses `e.type` as the CSS class, so `goal_for` and `goal_against` will pick up the diamond styles automatically (CSS classes use underscores in the selector above).

- [ ] **Step 7: Update `exportData()` to include goals in summary**

In `exportData()`, update the destructure and summary object:

```js
const { complete, fail, poss, best, goalsFor, goalsAgainst } = state;
const total = complete + fail;
const summary = {
  complete,
  fail,
  lostPossession: poss,
  total,
  accuracy: total ? Math.round(complete / total * 100) + '%' : '—',
  bestStreak: best,
  goalsFor,
  goalsAgainst,
  duration: formatClock(elapsedSecs()),
};
```

- [ ] **Step 8: Update `share()` to include goals in shared text**

In `share()`, update the destructure and text:

```js
const { complete, fail, poss, streak, best, goalsFor, goalsAgainst } = state;
const total = complete + fail;
const text =
`⚽ Pass Tracker Stats
──────────────────
✅ Complete:  ${complete}
❌ Fail:      ${fail}
⚠️  Lost Poss: ${poss}
🎯 Accuracy:  ${total ? Math.round(complete / total * 100) + '%' : '—'}
🔥 Streak:    ${streak}
⭐ Best:      ${best}
⚽ Score:     ${goalsFor} – ${goalsAgainst}
⏱ Duration:  ${formatClock(elapsedSecs())}`;
```

- [ ] **Step 9: Update `loadState()` to handle missing goalsFor/goalsAgainst (backwards compat)**

In `loadState()`, after the destructure of `saved`, ensure old saved states without goal counters still load cleanly. The spread `state = stateFields` will just be missing those keys. Since `render()` and `recordGoal` rely on `state.goalsFor`, add defaults:

```js
state = {
  goalsFor:     0,
  goalsAgainst: 0,
  ...stateFields,
};
```

- [ ] **Step 10: Manual smoke test**

Open `pass-tracker.html` in a browser. Verify:
- Header shows `0 – 0` score
- Goal buttons appear below Streak Reset, are visually small
- Tapping ⚽ FOR increments score to `1 – 0`
- Tapping ⚽ AGT increments score to `1 – 1`
- Trail shows diamond shapes for goal events
- Undo reverses the last goal and corrects the score
- Export JSON includes `goalsFor`/`goalsAgainst` in summary

- [ ] **Step 11: Commit**

```bash
git add pass-tracker.html
git commit -m "feat: add goal buttons, score display, and diamond trail shapes to pass tracker"
```

---

## Task 4: Goals in `stats-viewer.html`

**Files:**
- Modify: `stats-viewer.html`

- [ ] **Step 1: Add CSS for goal summary cards**

The existing `.stat-card` already supports color variants via `c-green` / `c-red`. No new CSS needed for the cards. The goal markers on the timeline need new CSS — add to the `<style>` block:

No additional CSS needed — goal markers are drawn directly on the canvas.

- [ ] **Step 2: Add Goals For and Goals Against summary card HTML**

In the summary grid, add two new cards after the Duration card:

```html
<div class="stat-card c-green">
  <div class="stat-label">Goals For</div>
  <div class="stat-value" id="s-goals-for">—</div>
</div>
<div class="stat-card c-red">
  <div class="stat-label">Goals Ag.</div>
  <div class="stat-value" id="s-goals-against">—</div>
</div>
```

Update the summary grid style from `repeat(5, 1fr)` to `repeat(7, 1fr)`:

```css
.summary-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}
@media (max-width: 600px) { .summary-grid { grid-template-columns: repeat(3, 1fr); } }
```

- [ ] **Step 3: Update `prepareStats` to extract goal data**

In the `prepareStats` function, add goal extraction after the existing variable declarations:

```js
const goalEvents  = events.filter(e => e.type === 'goal_for' || e.type === 'goal_against');
const goalsFor    = goalEvents.filter(e => e.type === 'goal_for').length;
const goalsAgainst = goalEvents.filter(e => e.type === 'goal_against').length;
```

Also prefer the summary counts if present (exported files have them), falling back to counting from events:

```js
const goalsFor     = summary.goalsFor     ?? goalEvents.filter(e => e.type === 'goal_for').length;
const goalsAgainst = summary.goalsAgainst ?? goalEvents.filter(e => e.type === 'goal_against').length;
```

Add to the `return` object:

```js
stats: {
  complete:      summary.complete     ?? 0,
  fail:          summary.fail         ?? 0,
  accuracy:      summary.accuracy     ?? '—',
  bestStreak:    summary.bestStreak   ?? 0,
  duration:      summary.duration     ?? '—',
  goalsFor,
  goalsAgainst,
},
// Also pass goal events for the timeline:
goals: goalEvents,
```

- [ ] **Step 4: Update `renderStats` to populate goal cards**

In `renderStats`, add after the existing `document.getElementById` calls:

```js
document.getElementById('s-goals-for').textContent     = prepared.stats.goalsFor;
document.getElementById('s-goals-against').textContent = prepared.stats.goalsAgainst;
```

Also pass goals to the timeline renderer — update the `renderPassTimeline` call:

```js
renderPassTimeline({ ...prepared.timeline, goals: prepared.goals });
```

- [ ] **Step 5: Update `renderPassTimeline` and `drawTL` to accept and store goals**

Add `goals` to the `_tl*` module-level variables:

```js
let _tlGoals = null;
```

In `renderPassTimeline`, destructure and store goals:

```js
function renderPassTimeline({ passEvents, p2Mark, htStart, htEnd, goals }) {
  _tlEvents  = passEvents;
  _tlP2Mark  = p2Mark;
  _tlHtStart = htStart;
  _tlHtEnd   = htEnd;
  _tlGoals   = goals || [];
  // ... rest unchanged
}
```

- [ ] **Step 6: Draw goal markers in `drawTL`**

In `drawTL`, add a goal markers section after the "HT line" section and before the "Time axis" section:

```js
// Goal markers
(_tlGoals || []).forEach(g => {
  const x     = xOf(g.elapsed);
  const isFor = g.type === 'goal_for';
  const color = isFor ? 'rgba(34,168,84,0.85)' : 'rgba(232,37,64,0.85)';
  const label = isFor ? 'F' : 'A';

  // Short vertical tick above the track
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(x, ty - 8);
  ctx.lineTo(x, ty + th);
  ctx.stroke();

  // Small label
  ctx.fillStyle  = color;
  ctx.font       = `bold 8px 'DM Mono', monospace`;
  ctx.textAlign  = 'center';
  ctx.fillText('⚽' + label, x, ty - 10);
});
```

- [ ] **Step 7: Update legend in `drawTL` to include goal entries**

In `drawTL`, update the `items` array used to draw the legend:

```js
const items = [
  { color: 'rgba(34,168,84,0.7)',  label: 'Complete'  },
  { color: 'rgba(232,37,64,0.65)', label: 'Failed'    },
  { color: 'rgba(34,168,84,0.85)', label: '⚽ For'    },
  { color: 'rgba(232,37,64,0.85)', label: '⚽ Ag.'    },
];
```

- [ ] **Step 8: Manual smoke test**

Open `stats-viewer.html` in a browser. Load one of the existing JSON files (`pass-tracker-2026-05-24.json` via `?data=pass-tracker-2026-05-24.json`). Verify:
- Goals For and Goals Against cards appear (will show 0 for old files — correct)
- No JS errors in console

Then export a new session from `pass-tracker.html` that includes some goals, load that file, and verify:
- Goal cards show correct counts
- Goal markers appear on the timeline with `⚽F` / `⚽A` labels

- [ ] **Step 9: Commit**

```bash
git add stats-viewer.html
git commit -m "feat: add goal summary cards and timeline markers to stats viewer"
```
