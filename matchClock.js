(function(global, factory) {
  typeof module !== 'undefined' ? module.exports = factory() : global.MatchClock = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function initialClock() {
    return {
      sessionStart: null,
      clockOffset:  0,
      halfStarts:   { 1: null, 2: null },
      halfOffsets:  { 1: 0,    2: 0    },
    };
  }

  function startPeriod(clock, outgoing, n, now) {
    let newClockOffset   = clock.clockOffset;
    const newHalfOffsets = { ...clock.halfOffsets };

    if (clock.sessionStart !== null) {
      newClockOffset += now - clock.sessionStart;
      if (outgoing !== null) {
        newHalfOffsets[outgoing] += now - clock.halfStarts[outgoing];
      }
    }

    return {
      ...clock,
      sessionStart: now,
      clockOffset:  newClockOffset,
      halfStarts:   { ...clock.halfStarts, [n]: now },
      halfOffsets:  newHalfOffsets,
    };
  }

  function totalElapsed(clock, now) {
    const running = clock.sessionStart !== null ? now - clock.sessionStart : 0;
    return Math.floor((clock.clockOffset + running) / 1000);
  }

  function halfElapsed(clock, h, activePeriod, now) {
    if (clock.halfStarts[h] === null) return 0;
    const running = activePeriod === h ? now - clock.halfStarts[h] : 0;
    return Math.floor((clock.halfOffsets[h] + running) / 1000);
  }

  function resetClock() {
    return initialClock();
  }

  return { initialClock, startPeriod, totalElapsed, halfElapsed, resetClock };
}));
