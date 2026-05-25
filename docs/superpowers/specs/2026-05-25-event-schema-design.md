# Event Schema — Design Spec

**Date:** 2026-05-25  
**Status:** Approved

## Problem

`gameState.js` creates three event types (pass, period, halftime) as inline object literals. `prepareStats.js` consumes them by field name. The schema is implicit — no canonical definition exists. Adding or renaming a field in `gameState.js` silently breaks `prepareStats.js`. Test helpers in `tests/prepareStats.test.js` duplicate a partial schema definition locally.

## Design

Extract the three event types into constructor functions in a new `events.js` module. Both `gameState.js` (producer) and tests (fixtures) reference the same constructors. `prepareStats.js` itself does not call constructors but benefits indirectly: its tests use the canonical constructors instead of a local approximation, catching field mismatches earlier.

`formatClock` moves from `gameState.js` to `events.js` as a private helper — event formatting belongs with event construction, and `recordPass` was its only caller.

## Module Interface

```js
// events.js

makePassEvent(type, elapsed, ts, streakBefore, streakAfter, runningAccuracy, period)
// type:             'success' | 'fail' | 'poss'
// elapsed:          seconds (number)
// ts:               ISO string
// streakBefore:     number
// streakAfter:      number
// runningAccuracy:  0–100 integer
// period:           null | 1 | 2
// Returns: { type, elapsed, elapsedFormatted, ts, streakBefore, streakAfter, runningAccuracy, period }
// elapsedFormatted is computed internally: Math.floor(elapsed/60) + ':' + (elapsed%60).padStart(2,'0')

makePeriodEvent(n, elapsed, ts)
// n: 1 | 2
// Returns: { type: 'period', period: n, elapsed, ts }

makeHalftimeEvent(phase, elapsed, ts)
// phase: 'start' | 'end'
// Returns: { type: 'halftime', phase, elapsed, ts }
```

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `events.js` | **Create** | Three event constructors + private `formatClock` |
| `tests/events.test.js` | **Create** | 6 tests for the constructors |
| `gameState.js` | **Modify** | Require `events.js`, replace inline literals, remove `formatClock` |
| `tests/prepareStats.test.js` | **Modify** | Replace local `makePass` helper with `makePassEvent` |
| `pass-tracker.html` | **Modify** | Add `<script src="events.js"></script>` before `matchClock.js` |
| `index.html` | **Modify** | Same script tag addition |

## UMD Pattern

Same wrapper as `gameState.js` and `matchClock.js`:

```js
(function(global, factory) {
  typeof module !== 'undefined' ? module.exports = factory() : global.Events = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  // ...
  return { makePassEvent, makePeriodEvent, makeHalftimeEvent };
}));
```

In the browser, `events.js` must load before `matchClock.js` and `gameState.js`.

## Integration

`gameState.js` call sites after the change:

```js
// recordPass
const event = Events.makePassEvent(type, elapsed, ts, streakBefore, newStreak, runningAccuracy, state.period);

// activatePeriod
events: [...state.events, Events.makePeriodEvent(n, elapsed, ts)]

// toggleHT
events: [...state.events, Events.makeHalftimeEvent(phase, elapsed, ts)]
```

`gameState.js` drops its `formatClock` function entirely.

In Node (tests), `gameState.js` requires `events.js` via:

```js
const Events = require('./events.js');
```

## Testing Strategy

`tests/events.test.js` — 6 tests, `node:test`, no DOM:
- `makePassEvent` returns all expected fields
- `makePassEvent` computes `elapsedFormatted` correctly (90s → `"1:30"`)
- `makePeriodEvent` returns correct shape with `type: 'period'`
- `makeHalftimeEvent` with `'start'` returns correct shape
- `makeHalftimeEvent` with `'end'` returns correct shape
- `makePassEvent` does not mutate arguments (sanity check)

`tests/prepareStats.test.js` — local `makePass` replaced with `makePassEvent`. `makeSummary` unchanged. No new test cases.

`tests/gameState.test.js` — no changes. Existing 17 tests continue to pass.

Total: 47 existing + 6 new = **53 tests**.
