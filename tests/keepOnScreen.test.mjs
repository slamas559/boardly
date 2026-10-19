import test from 'node:test';
import assert from 'node:assert/strict';
import { fitHorizontally } from '../src/utils/useKeepOnScreen.js';

const box = (left, width) => ({ left, right: left + width });

test('a panel that already fits is left alone', () => {
  assert.deepEqual(fitHorizontally(box(20, 200), 8, 382), { dx: 0, cap: null });
});

test('a panel pushed past the left edge slides right', () => {
  // the Participants panel on a 390px phone: 320px wide, its right edge lined up with a button at x=250
  assert.deepEqual(fitHorizontally(box(-70, 320), 8, 382), { dx: 78, cap: null });
});

test('a panel pushed past the right edge slides left', () => {
  assert.deepEqual(fitHorizontally(box(240, 200), 8, 382), { dx: -58, cap: null });
});

test('the notch and rounded corners are kept clear', () => {
  assert.equal(fitHorizontally(box(10, 200), 8 + 47, 390 - 47 - 8).dx, 45); // landscape phone with a notch
});

test('a panel wider than the screen is capped, then lined up', () => {
  const r = fitHorizontally(box(-30, 500), 8, 312); // a 320px wide screen
  assert.equal(r.cap, 304);
  assert.equal(r.dx, 38);
  assert.equal(-30 + r.dx, 8);
  assert.ok(-30 + r.dx + r.cap <= 312);
});
