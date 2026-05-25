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

  return { initialClock };
}));
