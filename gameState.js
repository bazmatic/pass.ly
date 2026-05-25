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

  function formatClock(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function recordPass(state, type, elapsed, ts) {
    // Save snapshot of current state (without history)
    const { history: _, ...snap } = state;
    const newHistory = [...state.history, snap];

    // Compute streak before this pass
    const streakBefore = state.streak;

    // Apply mutations based on type
    let newComplete = state.complete;
    let newFail = state.fail;
    let newPoss = state.poss;
    let newStreak = state.streak;
    let newBest = state.best;

    if (type === 'success') {
      newComplete += 1;
      newStreak += 1;
      if (newStreak > newBest) {
        newBest = newStreak;
      }
    } else if (type === 'fail') {
      newFail += 1;
      newStreak = 0;
    } else if (type === 'poss') {
      newPoss += 1;
      newStreak = 0;
    }

    // Compute running accuracy
    const totalPasses = newComplete + newFail;
    const runningAccuracy = totalPasses === 0 ? 0 : Math.round((newComplete / totalPasses) * 100);

    // Create event
    const event = {
      type,
      elapsed,
      elapsedFormatted: formatClock(elapsed),
      ts,
      streakBefore,
      streakAfter: newStreak,
      runningAccuracy,
      period: state.period,
    };

    // Return new state
    return {
      ...state,
      complete: newComplete,
      fail: newFail,
      poss: newPoss,
      streak: newStreak,
      best: newBest,
      events: [...state.events, event],
      history: newHistory,
    };
  }

  function undoLast(state) {
    if (state.history.length === 0) return state;
    const snap = state.history[state.history.length - 1];
    return { ...snap, history: state.history.slice(0, -1) };
  }

  return { initialState, recordPass, undoLast };
}));
