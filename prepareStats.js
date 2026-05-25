'use strict';

const WINDOW = 15;

function slidingAccuracy(passEvents) {
  return passEvents.map((_, i) => {
    const start  = Math.max(0, i - WINDOW + 1);
    const window = passEvents.slice(start, i + 1);
    const ok     = window.filter(e => e.type === 'success').length;
    return Math.round(ok / window.length * 100);
  });
}

function findBestStreak(passEvents, bestLen) {
  const endIdx = passEvents.findIndex(e => e.streakAfter === bestLen);
  if (endIdx < 0) return null;
  let startIdx = endIdx;
  while (startIdx > 0 && passEvents[startIdx].streakBefore > 0) startIdx--;
  return { start: startIdx, end: endIdx };
}

function prepareStats(data) {
  const { summary, events = [] } = data;

  const passEvents   = events.filter(e => e.type === 'success' || e.type === 'fail');
  const p2Mark       = events.filter(e => e.type === 'period').find(e => e.period === 2) ?? null;
  const p2Idx        = p2Mark ? passEvents.findIndex(e => e.elapsed >= p2Mark.elapsed) : -1;
  const htStart      = events.find(e => e.type === 'halftime' && e.phase === 'start') ?? null;
  const htEnd        = events.find(e => e.type === 'halftime' && e.phase === 'end')   ?? null;
  const bestStreakLen = summary.bestStreak ?? 0;
  const streak       = bestStreakLen > 0 ? findBestStreak(passEvents, bestStreakLen) : null;
  const cumData      = passEvents.map(e => e.runningAccuracy);
  const slideData    = slidingAccuracy(passEvents);
  const step         = Math.max(1, Math.floor(passEvents.length / 18));
  const labels       = passEvents.map((e, i) => i % step === 0 ? e.elapsedFormatted : '');

  const p1    = passEvents.filter(e => e.period === 1);
  const p2    = passEvents.filter(e => e.period === 2);
  const midOf = arr => {
    if (!arr.length) return 0;
    const ts = arr.map(e => e.elapsed);
    return (Math.min(...ts) + Math.max(...ts)) / 2;
  };
  const p1Mid = midOf(p1), p2Mid = midOf(p2);
  const makeQ = evs => {
    const ok    = evs.filter(e => e.type === 'success').length;
    const fail  = evs.filter(e => e.type === 'fail').length;
    const total = ok + fail;
    return { ok, fail, total, pct: total ? Math.round(ok / total * 100) : 0 };
  };

  return {
    stats:    { complete: summary.complete ?? 0, fail: summary.fail ?? 0, accuracy: summary.accuracy ?? '—', bestStreak: summary.bestStreak ?? 0, duration: summary.duration ?? '—' },
    accuracy: { passEvents, cumData, slideData, labels, p2Idx, streak, bestStreakLen },
    timeline: { passEvents, p2Mark, htStart, htEnd },
    quarters: {
      q1: makeQ(p1.filter(e => e.elapsed <= p1Mid)),
      q2: makeQ(p1.filter(e => e.elapsed >  p1Mid)),
      q3: makeQ(p2.filter(e => e.elapsed <= p2Mid)),
      q4: makeQ(p2.filter(e => e.elapsed >  p2Mid)),
    },
  };
}

module.exports = { prepareStats, slidingAccuracy, findBestStreak };
