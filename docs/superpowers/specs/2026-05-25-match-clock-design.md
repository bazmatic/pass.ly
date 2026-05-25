# Match Clock — Design Spec

**Date:** 2026-05-25  
**Status:** Approved

## Problem

`pass-tracker.html` manages match timing through four flat variables (`sessionStart`, `clockOffset`, `halfStarts`, `halfOffsets`) spread across `activatePeriod()`, `elapsedSecs()`, `halfElapsedSecs()`, `confirmReset()`, `saveState()`, and `loadState()`. The time calculations are untestable because they call `Date.now()` directly. Verifying "after P1 runs 30 min and P2 runs 20 min, total elapsed is 50 min" requires real timers or monkey-patching.

## Design

Extract all clock state and time math into a pure `matchClock.js` module. The module accepts clock state and a `now` timestamp (ms), returns new state or computed values. No `Date.now()`, no `setInterval`, no DOM access.

The tracker keeps one additional variable — `let clock = MatchClock.initialClock()` — and passes `Date.now()` at call sites. `clockInterval` stays flat in the tracker (it's a browser handle, not serializable).

## State Shape

```js
{
  sessionStart: null,              // ms timestamp when current segment started; null if stopped
  clockOffset:  0,                 // accumulated ms from all completed segments
  halfStarts:   { 1: null, 2: null }, // ms timestamp when each half started
  halfOffsets:  { 1: 0,    2: 0   },  // accumulated ms per half when paused
}
```

## Module Interface

```js
// matchClock.js

export function initialClock()
// Returns a fresh zeroed clock state object.

export function startPeriod(clock, outgoing, n, now)
// outgoing: null | 1 | 2  — the period that was active before this call (state.period)
// n: 1 | 2                — the period being started
// now: ms timestamp
// If a segment is running (clock.sessionStart !== null):
//   clockOffset += now - sessionStart
//   if outgoing: halfOffsets[outgoing] += now - halfStarts[outgoing]
// Sets sessionStart = now, halfStarts[n] = now.
// Returns new clock state. Does not mutate input.

export function totalElapsed(clock, now)
// Returns total elapsed seconds.
// running = clock.sessionStart ? now - clock.sessionStart : 0
// return Math.floor((clock.clockOffset + running) / 1000)

export function halfElapsed(clock, h, activePeriod, now)
// h: 1 | 2               — which half to query
// activePeriod: null|1|2  — the currently active period (state.period)
// Returns 0 if halfStarts[h] is null.
// running = activePeriod === h ? now - clock.halfStarts[h] : 0
// return Math.floor((clock.halfOffsets[h] + running) / 1000)

export function resetClock()
// Returns initialClock().
```

## Tracker Integration

After the refactor the tracker holds:

```js
let state = GameState.initialState();
let clock = MatchClock.initialClock();
let clockInterval = null, pendingHalf = null;
```

`activatePeriod(n)` becomes:

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

`elapsedSecs` and `halfElapsedSecs` become one-liners:

```js
function elapsedSecs()      { return MatchClock.totalElapsed(clock, Date.now()); }
function halfElapsedSecs(h) { return MatchClock.halfElapsed(clock, h, state.period, Date.now()); }
```

`confirmReset` replaces the four manual assignments with:

```js
clock = MatchClock.resetClock();
```

`saveState` spreads both objects (field names do not overlap):

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ...clock }));
```

`loadState` splits on restore:

```js
const { sessionStart, clockOffset, halfStarts, halfOffsets, ...stateFields } = saved;
clock  = { sessionStart, clockOffset, halfStarts, halfOffsets };
state  = stateFields;
```

No localStorage migration needed — the serialized field names are unchanged.

## Dependency Strategy

In-process. `matchClock.js` is pure computation — plain JS objects in, plain JS objects out. Same UMD wrapper as `gameState.js`: CJS when `module` exists, `global.MatchClock` in browser.

## Testing Strategy

`node:test`, no DOM, no real timers. Tests use fake `now` values (plain numbers). Added to `tests/matchClock.test.js`.

Behaviours to verify:

- `initialClock` returns zeroed state with nulls and zeros
- `startPeriod(clock, null, 1, t0)` sets `sessionStart = t0`, `halfStarts[1] = t0`, `clockOffset = 0`
- `startPeriod(clock, 1, 2, t1)` accumulates `clockOffset` and `halfOffsets[1]` before starting period 2
- `totalElapsed` returns 0 when `sessionStart` is null
- `totalElapsed` returns accumulated + running when clock is ticking
- Full scenario: start P1 at t=0, start P2 at t=30min, query at t=50min → `totalElapsed = 50*60`, `halfElapsed(1) = 30*60`, `halfElapsed(2) = 20*60`
- `halfElapsed` returns 0 when half never started
- `halfElapsed` for a completed half (not active) returns only its accumulated offset
- `resetClock` returns state matching `initialClock`
