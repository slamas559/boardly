import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLIDS, defaultSizes, dimensionLines, fmt, measureLines, newSolid, solidExtent, solidLayout, solidMeasures, solidSizes, solidTitle } from '../src/board/solids.js';
import { ObjectStore } from '../src/board/store.js';
import { getBounds, hitObject, movePatch, scalePatch } from '../src/board/geometry.js';

const make = (kind, extra = {}) => ({ ...newSolid(kind, { id: kind, page: 0, cx: 0, cy: 0 }), ...extra });
const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} is not close to ${b}`);

test('volume and surface area of each solid at its default size', () => {
  const expected = {
    cube: [64, 96], cuboid: [72, 108], sphere: [113.097, 113.097], cylinder: [117.81, 133.518],
    cone: [39.27, 70.686], pyramid: [50, 90], prism: [36, 79.267],
  };
  for (const [kind, [volume, surface]] of Object.entries(expected)) {
    const m = solidMeasures(make(kind));
    near(m.volume, volume);
    near(m.surface, surface);
  }
});

test('the working shows the numbers that were used', () => {
  const lines = measureLines(make('cone', { params: { r: 3, h: 4 }, unit: 'cm' }));
  assert.equal(lines.volume.formula, 'V = ⅓πr²h');
  assert.equal(lines.volume.working, '⅓ × π × 3² × 4');
  assert.equal(lines.volume.answer, '37.7 cm³');
  assert.equal(lines.surface.answer, '75.4 cm²');
  assert.equal(lines.extras[0].text, 'l = √(r² + h²) = 5');
  assert.match(measureLines(make('cube')).volume.answer, /cubic units$/);
});

test('numbers are shown with at most two decimals', () => {
  assert.equal(fmt(12.5), '12.5');
  assert.equal(fmt(3.14159), '3.14');
  assert.equal(fmt(100), '100');
  assert.equal(fmt(NaN), '');
});

test('a missing or out-of-range size falls back to the default', () => {
  assert.deepEqual(solidSizes({ kind: 'cylinder', params: { r: -2, h: 'tall' } }), defaultSizes('cylinder'));
  assert.deepEqual(solidSizes({ kind: 'cube', params: { a: 7 } }), { a: 7 });
  assert.deepEqual(solidSizes({ kind: 'nonsense' }), { a: 4 }); // unknown kinds read as the first solid
});

test('every new solid has the shape the server accepts', () => {
  const keys = { cube: 'a', cuboid: 'lwh', sphere: 'r', cylinder: 'rh', cone: 'rh', pyramid: 'ah', prism: 'btl' };
  for (const { id } of SOLIDS) {
    const o = make(id);
    assert.deepEqual(Object.keys(o.params).sort(), [...keys[id]].sort());
    assert.ok(o.w >= 200 && o.h >= 200);
    assert.ok(Object.values(o.params).every((n) => n >= 0.1 && n <= 1000));
  }
});

test('each size has a line to mark it on the solid', () => {
  for (const { id, params } of SOLIDS) {
    const o = make(id);
    const lines = dimensionLines(o);
    assert.deepEqual(lines.map((l) => l.key).sort(), params.map((p) => p.key).sort());
    const e = solidExtent(o);
    for (const l of lines) {
      for (const p of [l.from, l.to]) {
        assert.ok(Math.abs(p[0]) <= e.x / 2 + 1e-9 && Math.abs(p[1]) <= e.y / 2 + 1e-9 && Math.abs(p[2]) <= e.z / 2 + 1e-9, `${id} ${l.key} is outside the solid`);
      }
      const length = Math.hypot(l.to[0] - l.from[0], l.to[1] - l.from[1], l.to[2] - l.from[2]);
      near(length, solidSizes(o)[l.key], 1e-9);
    }
  }
});

test('title: the solid name by default, your own text, or hidden', () => {
  assert.equal(solidTitle(make('cone')), 'Cone');
  assert.equal(solidTitle(make('cone', { title: null })), 'Cone');
  assert.equal(solidTitle(make('cone', { title: 'Party hat' })), 'Party hat');
  assert.equal(solidTitle(make('cone', { title: '  ' })), '');
});

test('the card makes room for the title and the working only when they are shown', () => {
  const full = solidLayout(make('cube'));
  const bare = solidLayout(make('cube', { title: ' ', measures: false }));
  assert.ok(bare.viewport.h > full.viewport.h + 60);
  assert.equal(bare.header, 0);
  assert.equal(bare.strip, 0);
  assert.ok(solidLayout(make('cone')).strip > full.strip); // a cone also shows its slant height
});

test('solids move, resize and are found like other board objects', () => {
  const o = make('sphere', { x: 100, y: 50, w: 400, h: 400 });
  assert.deepEqual(getBounds(o), { x: 100, y: 50, w: 400, h: 400 });
  assert.equal(hitObject(o, [300, 200], 4), true);
  assert.equal(hitObject(o, [50, 20], 4), false);
  assert.deepEqual(movePatch(o, 10, -5), { x: 110, y: 45 });
  const grown = scalePatch(o, 2, 2, (v) => v, (v) => v);
  assert.ok(grown.w >= 300 && grown.h >= 280);
  const shrunk = scalePatch(o, 0.1, 0.1, (v) => v, (v) => v);
  assert.equal(shrunk.w, 300);
  assert.equal(shrunk.h, 280);
});

test('changing the kind and sizes together is one undoable step', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: make('cube') }]);
  store.commit([{ op: 'update', id: 'cube', patch: { kind: 'cone', params: defaultSizes('cone') } }]);
  assert.equal(store.get('cube').kind, 'cone');
  store.undo();
  assert.equal(store.get('cube').kind, 'cube');
  assert.deepEqual(store.get('cube').params, { a: 4 });
});
