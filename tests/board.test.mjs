import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectStore } from '../src/board/store.js';
import { getBounds, hitObject, movePatch, scalePatch, segDist } from '../src/board/geometry.js';

const stroke = (id, pts, extra = {}) => ({ id, type: 'stroke', page: 0, color: '#000', width: 4, points: pts, ...extra });

test('commit emits ops and undo/redo restore state', () => {
  const sent = [];
  const store = new ObjectStore({ onLocalOps: (ops) => sent.push(ops) });
  store.commit([{ op: 'add', obj: stroke('a', [[0, 0], [10, 10]]) }]);
  assert.equal(store.list().length, 1);
  store.commit([{ op: 'update', id: 'a', patch: { color: '#f00' } }]);
  assert.equal(store.get('a').color, '#f00');

  assert.ok(store.undo());
  assert.equal(store.get('a').color, '#000');
  assert.ok(store.undo());
  assert.equal(store.list().length, 0);
  assert.ok(store.redo());
  assert.equal(store.list().length, 1);
  assert.ok(store.redo());
  assert.equal(store.get('a').color, '#f00');
  // add, update, undo, undo, redo, redo = 6 emissions
  assert.equal(sent.length, 6);
});

test('undo of a remove restores the object; undo of clear restores everything', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: stroke('a', [[0, 0]]) }, { op: 'add', obj: stroke('b', [[1, 1]], { page: 1 }) }]);
  store.commit([{ op: 'remove', id: 'a' }]);
  assert.equal(store.get('a'), undefined);
  store.undo();
  assert.ok(store.get('a'));
  store.commit([{ op: 'clear', page: 0 }]);
  assert.equal(store.onPage(0).length, 0);
  assert.equal(store.onPage(1).length, 1);
  store.undo();
  assert.equal(store.onPage(0).length, 1);
});

test('remote ops do not touch history; remote stroke chunks accumulate', () => {
  const store = new ObjectStore();
  store.applyRemoteStroke({ id: 's', page: 0, meta: { tool: 'pen', color: '#123', width: 3 }, points: [[0, 0, 0.5]] });
  store.applyRemoteStroke({ id: 's', points: [[1, 1, 0.5], [2, 2, 0.5]] });
  assert.equal(store.get('s').points.length, 3);
  store.applyRemote([{ op: 'remove', id: 's' }]);
  assert.equal(store.list().length, 0);
  assert.equal(store.canUndo, false);
});

test('a new local action clears the redo stack', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: stroke('a', [[0, 0]]) }]);
  store.undo();
  assert.equal(store.canRedo, true);
  store.commit([{ op: 'add', obj: stroke('b', [[0, 0]]) }]);
  assert.equal(store.canRedo, false);
});

test('hit testing strokes, shapes and text', () => {
  const s = stroke('a', [[0, 0], [100, 0]], { width: 4 });
  assert.ok(hitObject(s, [50, 3], 2));
  assert.ok(!hitObject(s, [50, 20], 2));

  const rect = { id: 'r', type: 'shape', kind: 'rect', x1: 0, y1: 0, x2: 100, y2: 100, width: 2, fill: false };
  assert.ok(hitObject(rect, [100, 50], 3), 'edge hit');
  assert.ok(!hitObject(rect, [50, 50], 3), 'hollow centre is not a hit');
  assert.ok(hitObject({ ...rect, fill: true }, [50, 50], 3), 'filled centre is a hit');

  const ell = { id: 'e', type: 'shape', kind: 'ellipse', x1: 0, y1: 0, x2: 100, y2: 50, width: 2, fill: false };
  assert.ok(hitObject(ell, [100, 25], 3));
  assert.ok(!hitObject(ell, [50, 25], 3));

  const text = { id: 't', type: 'text', x: 10, y: 10, text: 'hello', fontSize: 20, fontFamily: 'sans' };
  const b = getBounds(text);
  assert.ok(hitObject(text, [b.x + 2, b.y + 2], 2));
});

test('move and scale patches', () => {
  const s = stroke('a', [[0, 0], [10, 10]]);
  assert.deepEqual(movePatch(s, 5, 5).points, [[5, 5], [15, 15]]);
  const sc = scalePatch(s, 2, 2, 0, 0);
  assert.deepEqual(sc.points, [[0, 0], [20, 20]]);
  const t = { id: 't', type: 'text', x: 10, y: 10, text: 'x', fontSize: 20 };
  assert.equal(scalePatch(t, 2, 2, 0, 0).fontSize, 40);
  assert.ok(Math.abs(segDist([5, 5], [0, 0], [10, 0]) - 5) < 1e-9);
});
