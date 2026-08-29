(function(global, factory) {
  if (typeof module !== 'undefined') {
    module.exports = factory(require('./events.js'));
  } else {
    global.GameState = factory(global.Events);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function(Events) {
  'use strict';

  function initialState() {
    return {
      complete:     0,
      fail:         0,
      poss:         0,
      streak:       0,
      best:         0,
      goalsFor:     0,
      goalsAgainst: 0,
      period:       null,
      htActive:     false,
      fullTimeActive: false,
      events:       [],
      history:      [],
    };
  }

  function recordPass(state, type, elapsed, ts) {
    const { history: _, ...snap } = state;
    const newHistory = [...state.history, snap];

    const streakBefore = state.streak;

    let newComplete     = state.complete;
    let newFail         = state.fail;
    let newPoss         = state.poss;
    let newStreak       = state.streak;
    let newBest         = state.best;
    let newGoalsFor     = state.goalsFor;
    let newGoalsAgainst = state.goalsAgainst;

    if (type === 'success') {
      newComplete += 1;
      newStreak   += 1;
      if (newStreak > newBest) newBest = newStreak;
    } else if (type === 'fail') {
      newFail   += 1;
      newStreak  = 0;
    } else if (type === 'poss') {
      newPoss   += 1;
      newStreak  = 0;
    } else if (type === 'goal_for') {
      newGoalsFor += 1;
      newStreak    = 0;
    } else if (type === 'goal_against') {
      newGoalsAgainst += 1;
      newStreak        = 0;
    }

    const totalPasses     = newComplete + newFail;
    const runningAccuracy = totalPasses === 0 ? 0 : Math.round((newComplete / totalPasses) * 100);

    const isGoal = type === 'goal_for' || type === 'goal_against';
    const event  = isGoal
      ? Events.makeGoalEvent(type, elapsed, ts)
      : Events.makePassEvent(type, elapsed, ts, streakBefore, newStreak, runningAccuracy, state.period);

    return {
      ...state,
      complete:     newComplete,
      fail:         newFail,
      poss:         newPoss,
      streak:       newStreak,
      best:         newBest,
      goalsFor:     newGoalsFor,
      goalsAgainst: newGoalsAgainst,
      events:       [...state.events, event],
      history:      newHistory,
    };
  }

  function undoLast(state) {
    if (state.history.length === 0) return state;
    const snap = state.history[state.history.length - 1];
    return { ...snap, history: state.history.slice(0, -1) };
  }

  function activatePeriod(state, n, elapsed, ts) {
    return {
      ...state,
      period: n,
      events: [...state.events, Events.makePeriodEvent(n, elapsed, ts)],
    };
  }

  function toggleHT(state, elapsed, ts) {
    const phase = state.htActive ? 'end' : 'start';
    return {
      ...state,
      htActive: !state.htActive,
      events: [...state.events, Events.makeHalftimeEvent(phase, elapsed, ts)],
    };
  }

  function endGame(state, elapsed, ts) {
    if (state.fullTimeActive) return state;
    return {
      ...state,
      fullTimeActive: true,
      events: [...state.events, Events.makeFullTimeEvent(elapsed, ts)],
    };
  }

  function resetState() {
    return initialState();
  }

  return { initialState, recordPass, undoLast, activatePeriod, toggleHT, endGame, resetState };
}));
