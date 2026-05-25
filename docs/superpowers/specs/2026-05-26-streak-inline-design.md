# Streak Inline — Design Spec
_Date: 2026-05-26_

## Goal

Reduce visual complexity by removing the dedicated streak row and folding streak/best values into the existing accuracy bar as inline secondary stats.

## Change

### Remove

- `.streak-row` HTML block (two `.streak-box` divs with `id="streak-cur"` and `id="streak-best"`)
- CSS rules: `.streak-row`, `.streak-box`, `.streak-label`, `.streak-value`

### Update `render()` in `index.html`

Append streak and best to the accuracy bar innerHTML. Full format:

```
Accuracy — 84% · 23 passes · 5 lost poss. · 🔥 5 · ⭐ 12
```

When no passes recorded yet:
```
Accuracy — —
```

The streak and best values are always appended when the accuracy line has content (i.e. `total > 0`). They use the same `&nbsp;·&nbsp;` separator and `var(--muted)` color as the existing pass/possession counts. The values themselves are plain text (no `<span>` wrapper needed — they don't need a distinct color).

### Element IDs removed

`streak-cur`, `streak-best` — no longer exist in the DOM. No other code references them.
