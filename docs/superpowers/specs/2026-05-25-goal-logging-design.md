# Goal Logging — Design Spec
_Date: 2026-05-25_

## Overview

Allow the user to log goals scored for and against during a match. Goals reset the pass streak, appear in the event stream, update a live score display in the tracker, and are visible in the stats viewer.

---

## Data Model (`events.js` / `gameState.js`)

### New event factory in `events.js`

```js
makeGoalEvent(type, elapsed, ts)
// type: 'goal_for' | 'goal_against'
// Returns: { type, elapsed, elapsedFormatted, ts }
```

### State changes in `gameState.js`

`initialState()` gains two new counters:

```js
goalsFor: 0,
goalsAgainst: 0,
```

### `recordPass` handles both new types

- `goal_for`: increment `goalsFor`, reset `streak` to 0, push event
- `goal_against`: increment `goalsAgainst`, reset `streak` to 0, push event
- Both types create a goal event (not a pass event — no `streakBefore/After`, no `runningAccuracy`)
- Undo works automatically via the existing history snapshot mechanism

### Export shape

Goal events appear inline in the `events[]` array (same as `period` and `halftime` events). The `summary` object gains `goalsFor` and `goalsAgainst` fields.

---

## Pass Tracker UI (`pass-tracker.html`)

### Header — score display

```
[● PASS TRACKER]   [0 – 0]   [04:32]
```

A `<div class="match-score">` is inserted between the header title and the match clock. Displays `goalsFor – goalsAgainst`. Styled in Bebas Neue, `var(--text)` color, `letter-spacing: 0.1em`. Updates on every goal tap.

### Goal buttons row

A new two-button row below the Streak Reset button, above the util icons:

```
[ ⚽ FOR ]   [ ⚽ AGT ]
```

- Same height as the util row: Bebas Neue, `1rem` font, `~0.5rem` vertical padding
- Goal For: green-tinted border/text (`rgba(34,168,84,…)`)
- Goal Against: red-tinted border/text (`rgba(232,37,64,…)`)
- Low-opacity backgrounds so they don't draw the eye
- Full-width two-column grid (matching the util row's visual weight)

### Pass trail

Two new dot styles for goal events in the trail:
- `goal_for`: gold/yellow (`#ffd166`) — distinct from amber used by `poss`
- `goal_against`: violet/purple (`#c084fc`) — distinct from red used by `fail`

---

## Stats Viewer (`stats-viewer.html`)

### Summary cards

Two new cards added to the summary grid (expanding from 5 to 7):

| Card | Accent | Value |
|------|--------|-------|
| Goals For | green (`c-green`) | count of `goal_for` events |
| Goals Against | red (`c-red`) | count of `goal_against` events |

The responsive grid (`repeat(3,1fr)` on mobile) handles overflow without layout changes.

### Timeline markers

Goal events appear on the "Every Pass" canvas timeline as vertical tick marks positioned by `elapsed`:

- Short colored line above the track (above the top border)
- Small `⚽` glyph with `F` (for) or `A` (against) label
- Goal For: green stroke; Goal Against: red stroke
- Not interactive (no tooltip)

### `prepareStats` changes

Reads `goal_for` / `goal_against` events from the events array to:
1. Count totals for summary cards
2. Return a `goals` array `[{ type, elapsed }]` for the timeline renderer

---

## Out of Scope

- Goal scorer attribution
- Goal time in the exported summary (timestamps are in the event stream)
- Editing/correcting a goal (undo covers the common case)
