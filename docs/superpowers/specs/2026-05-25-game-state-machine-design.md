# Game State Machine — Design Spec

**Date:** 2026-05-25  
**Status:** Approved

## Problem

`pass-tracker.html` has no separation between game state logic and side effects. Every action function (`count`, `activatePeriod`, `toggleHT`, `undo`, `confirmReset`) mixes state mutation, audio playback, DOM updates, and localStorage writes together. This makes the core logic untestable — verifying that a pass was recorded correctly requires running audio, touching the DOM, and writing localStorage.

State is also scattered across ten flat globals (`s`, `f`, `p`, `streak`, `best`, `events`, `history`, `period`, `htActive`, and clock variables), so adding a new field or resetting state requires finding and updating every location independently.

## Design

Extract all game state logic into a pure `gameState.js` module. The module accepts the current state and action parameters, returns a new state. No DOM access, no audio, no localStorage, no `Date.now()`.

The tracker keeps one variable — `let state = initialState()` — and handles all side effects after each state transition.

## State Shape

```js
{
  complete:  0,      // successful passes
  fail:      0,      // failed passes
  poss:      0,      // streak resets (lost possession, no pass recorded)
  streak:    0,      // current consecutive complete passes
  best:      0,      // best streak achieved this session
  period:    null,   // null | 1 | 2
  htActive:  false,  // true while halftime is in progress
  events:    [],     // full event log (exported to JSON)
  history:   [],     // undo stack — array of prior state snapshots
}
```

Clock state (`sessionStart`, `clockOffset`, `halfStarts`, `halfOffsets`, `clockInterval`) stays as flat variables in the tracker. The module receives pre-computed `elapsed` (seconds) and `ts` (ISO string) on every action — it never calls `Date.now()` itself.

## Module Interface

```js
// gameState.js

export function initialState()
// Returns a fresh zeroed state object.

export function recordPass(state, type, elapsed, ts)
// type: 'success' | 'fail' | 'poss'
// Pushes current state (minus history) onto history stack.
// Applies counter and streak mutation.
// Appends a pass event to events array.
// Returns new state.

export function undoLast(state)
// Pops the last entry from history and returns it.
// No-op (returns state unchanged) if history is empty.

export function activatePeriod(state, n, elapsed, ts)
// n: 1 | 2
// Updates state.period, appends a period event.
// Returns new state.

export function toggleHT(state, elapsed, ts)
// Flips state.htActive.
// Appends a halftime start or end event.
// Returns new state.

export function resetState()
// Returns initialState(). Named separately for clarity at call sites.
```

## Tracker Integration

All flat globals (`s`, `f`, `p`, `streak`, `best`, `events`, `period`, `htActive`, `history`) are removed. The tracker holds a single `let state = initialState()`.

Every handler follows the same pattern:

```js
function count(type, btn) {
  soundFor(type);
  state = recordPass(state, type, elapsedSecs(), isoNow());
  render(state);
  saveState(state);
  bump(...); ripple(...);
}
```

`render(state)` replaces `update()` — reads from the state object instead of globals.  
`saveState(state)` serializes the whole state object to localStorage.  
`loadState()` deserializes and assigns `state = loaded`.

**localStorage migration:** the serialized shape changes from flat globals to a single state object. On first load after the refactor, any existing saved session that doesn't match the new shape is silently dropped and replaced with `initialState()`. No migration logic needed.

## Dependency Strategy

In-process. `gameState.js` is pure computation — plain JS objects in, plain JS objects out. No I/O, no DOM, no browser APIs. Can be imported directly by Node tests.

## Testing Strategy

Same pattern as `prepareStats` tests — `node:test`, no DOM, no mocking. Tests are added to `tests/gameState.test.js`.

Behaviours to verify:

- `recordPass` with type `'success'` increments `complete` and `streak`, appends correct event
- `recordPass` with type `'fail'` increments `fail`, resets `streak` to 0, preserves `best`
- `recordPass` with type `'poss'` increments `poss`, resets `streak`, does not increment `fail`
- `best` updates when `streak` exceeds it, does not decrease on reset
- `undoLast` restores previous counters and events
- `undoLast` on empty history returns state unchanged
- `activatePeriod` sets `period` and appends a period event with correct elapsed
- `toggleHT` flips `htActive` and appends correct phase event each call
- `resetState` returns a zeroed state with empty events and history
- `runningAccuracy` on each pass event is correct (complete / (complete + fail))
