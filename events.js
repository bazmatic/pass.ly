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

  function makePeriodEvent(n, elapsed, ts) {
    return { type: 'period', period: n, elapsed, ts };
  }

  function makeHalftimeEvent(phase, elapsed, ts) {
    return { type: 'halftime', phase, elapsed, ts };
  }

  function makeGoalEvent(type, elapsed, ts) {
    return { type, elapsed, elapsedFormatted: formatClock(elapsed), ts };
  }

  return { makePassEvent, makePeriodEvent, makeHalftimeEvent, makeGoalEvent };
}));
