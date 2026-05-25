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
