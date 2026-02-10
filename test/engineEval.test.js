import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMoveLossCp, normalizeMateToCp, toPlayerPerspectiveCp, toWhitePerspectiveCp } from '../src/lib/engineEval.js';

test('white perspective conversion flips when side-to-move flips', () => {
  assert.equal(toWhitePerspectiveCp(120, 'w'), 120);
  assert.equal(toWhitePerspectiveCp(120, 'b'), -120);
});

test('player perspective conversion flips for black player', () => {
  assert.equal(toPlayerPerspectiveCp(75, 'w'), 75);
  assert.equal(toPlayerPerspectiveCp(75, 'b'), -75);
});

test('mate conversion sign is correct', () => {
  assert.equal(normalizeMateToCp(3), 9700);
  assert.equal(normalizeMateToCp(-2), -9800);
});

test('blunder move loss is positive and never negative', () => {
  assert.equal(computeMoveLossCp(120, -400), 520);
  assert.equal(computeMoveLossCp(-100, 30), 0);
});
