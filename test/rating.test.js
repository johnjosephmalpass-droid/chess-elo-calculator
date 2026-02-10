import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGameResult, computePerformanceElo, getInitialRatingState } from '../src/lib/rating.js';

test('Scenario A awful game collapses performance elo', () => {
  const perf = computePerformanceElo({
    botElo: 1200,
    estElo: null,
    result: 'loss',
    weightedACPL: 220,
    blunders: 6,
    mistakes: 4,
    inaccuracies: 6,
  });

  assert.ok(perf.performanceElo <= 700, `expected <=700, got ${perf.performanceElo}`);

  const update = applyGameResult(getInitialRatingState(), {
    opponentElo: 1200,
    result: 'loss',
    cplList: [420, 320, 280, 250, 180, 120, 95, 70],
  });
  assert.equal(update.nextState.sigma, 260);
});

test('Scenario B clean game yields high performance elo', () => {
  const perf = computePerformanceElo({
    botElo: 1200,
    estElo: null,
    result: 'win',
    weightedACPL: 18,
    blunders: 0,
    mistakes: 1,
    inaccuracies: 2,
  });

  assert.ok(perf.performanceElo >= 1700, `expected >=1700, got ${perf.performanceElo}`);
});

test('Scenario C one terrible game has modest effect after 20 games', () => {
  let state = getInitialRatingState();
  for (let i = 0; i < 20; i += 1) {
    state = applyGameResult(state, {
      opponentElo: 1200,
      result: 'win',
      cplList: [20, 15, 18, 25, 12, 10, 30],
    }).nextState;
  }

  assert.ok(state.sigma >= 70 && state.sigma <= 120, `expected sigma in [70,120], got ${state.sigma}`);

  const before = state.playerElo;
  const updated = applyGameResult(state, {
    opponentElo: 1200,
    result: 'loss',
    cplList: [600, 500, 420, 320, 250, 220, 180],
  }).nextState;

  const drop = before - updated.playerElo;
  assert.ok(drop < 120, `expected modest drop <120, got ${drop}`);
});
