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

  return { initialState };
}));
