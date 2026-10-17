import test from 'node:test';
import assert from 'node:assert/strict';
import { createStabilizer, sampleStroke, strokePattern, strokeTexture } from '../src/board/brushes.js';
import { fillMode } from '../src/board/constants.js';
import { defaultDock, resolveDock } from '../src/board/useToolbarDock.js';

const wave = (n = 40) => Array.from({ length: n }, (_, i) => [i * 6, 50 + Math.sin(i / 4) * 20, 0.5]);

test('unknown textures and patterns fall back to smooth and solid', () => {
  assert.equal(strokeTexture('glitter'), 'smooth');
  assert.equal(strokeTexture(undefined), 'smooth');
  assert.equal(strokeTexture('chalk'), 'chalk');
  assert.equal(strokePattern('wavy'), 'solid');
  assert.equal(strokePattern('dotted'), 'dotted');
});

test('stroke samples follow the stroke and are evenly spaced', () => {
  const S = sampleStroke({ points: wave(), width: 4 });
  assert.ok(S.count > 40);
  assert.ok(S.x[0] === 0 && Math.abs(S.x[S.count - 1] - 234) < 0.5);
  for (let i = 1; i < S.count - 1; i++) assert.ok(Math.abs(S.s[i] - S.s[i - 1] - S.step) < 1e-3);
});

test('the same stroke always gives the same samples', () => {
  const a = sampleStroke({ points: wave(), width: 6, texture: 'brush' });
  const b = sampleStroke({ points: wave(), width: 6, texture: 'brush' });
  assert.deepEqual(Array.from(a.r), Array.from(b.r));
});

test('ink brush tapers at both ends and thins when drawn fast', () => {
  const S = sampleStroke({ points: wave(), width: 8, texture: 'brush' });
  const mid = S.r[Math.floor(S.count / 2)];
  assert.ok(S.r[0] < mid * 0.6 && S.r[S.count - 1] < mid * 0.6);
  const slow = sampleStroke({ points: Array.from({ length: 40 }, (_, i) => [i * 1.5, 0, 0.5]), width: 8, texture: 'brush' });
  const fast = sampleStroke({ points: Array.from({ length: 40 }, (_, i) => [i * 30, 0, 0.5]), width: 8, texture: 'brush' });
  assert.ok(fast.r[Math.floor(fast.count / 2)] < slow.r[Math.floor(slow.count / 2)]);
});

test('stylus pressure changes the width smoothly', () => {
  const points = Array.from({ length: 30 }, (_, i) => [i * 5, 0, i < 15 ? 0.2 : 0.9]);
  const S = sampleStroke({ points, width: 6, vp: true });
  assert.ok(S.r[S.count - 1] > S.r[0] * 2);
  for (let i = 1; i < S.count; i++) assert.ok(Math.abs(S.r[i] - S.r[i - 1]) < 0.35);
});

test('dashed strokes leave gaps and dotted strokes paint separate dots', () => {
  const dashed = sampleStroke({ points: wave(), width: 4, pattern: 'dashed' });
  const painted = Array.from(dashed.on).filter(Boolean).length;
  assert.ok(painted > 0 && painted < dashed.count);
  const dotted = sampleStroke({ points: wave(), width: 4, pattern: 'dotted' });
  assert.ok(dotted.step >= 8 && dotted.count > 10);
});

test('very long strokes stay within the sample budget', () => {
  const huge = Array.from({ length: 5000 }, (_, i) => [i * 40, Math.sin(i) * 30, 0.5]);
  assert.ok(sampleStroke({ points: huge, width: 2 }).count <= 20002);
});

test('the stabiliser smooths jitter but keeps up with fast strokes', () => {
  const st = createStabilizer();
  st.reset(0, 0, 0);
  let out;
  for (let i = 1; i < 60; i++) out = st.next(i * 30, 0, i * 16);
  assert.ok(60 * 30 - 30 - out[0] < 8);
  const slow = createStabilizer();
  slow.reset(0, 0, 0);
  const ys = [];
  for (let i = 1; i < 60; i++) ys.push(slow.next(i * 3, i % 2 ? 2 : -2, i * 16)[1]);
  assert.ok(Math.max(...ys.slice(10).map(Math.abs)) < 1.2);
});

test('shape fill modes: none, tint and solid, with old boards still tinted', () => {
  assert.equal(fillMode(false), null);
  assert.equal(fillMode(undefined), null);
  assert.equal(fillMode(true), 'tint');
  assert.equal(fillMode('tint'), 'tint');
  assert.equal(fillMode('solid'), 'solid');
});

test('the tool bar stays docked at the bottom on small screens, whatever was saved', () => {
  const saved = { edge: 'left', align: 'start' };
  assert.deepEqual(resolveDock(saved, false), { edge: 'bottom', align: 'center' });
  assert.deepEqual(resolveDock(null, false), defaultDock(false));
  assert.deepEqual(resolveDock(saved, true), saved);
  assert.deepEqual(resolveDock(null, true), { edge: 'left', align: 'start' });
});
