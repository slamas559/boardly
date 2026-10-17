import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectStore, chunkOps } from '../src/board/store.js';
import { arrangeOps, arrangeOrder, paintOrder, topLayer } from '../src/board/layers.js';

const box = (id, x, extra = {}) => ({ id, type: 'shape', kind: 'rect', page: 0, x1: x, y1: 0, x2: x + 100, y2: 100, color: '#000', width: 2, ...extra });
const names = (list) => list.map((o) => o.id).join('');

test('objects without a layer paint in the order they were added', () => {
  const list = [box('a', 0), box('b', 10), box('c', 20)];
  assert.equal(paintOrder(list), list);
});

test('a higher layer paints on top; equal layers keep their order', () => {
  const list = [box('a', 0, { z: 2 }), box('b', 10), box('c', 20, { z: 2 }), box('d', 30, { z: -1 })];
  assert.equal(names(paintOrder(list)), 'dbac');
  assert.equal(topLayer(list), 2);
  assert.equal(topLayer([box('x', 0, { z: -4 })]), 0);
});

test('bring to front and send to back', () => {
  const order = [box('a', 0), box('b', 10), box('c', 20)];
  assert.equal(names(arrangeOrder(order, ['a'], 'front')), 'bca');
  assert.equal(names(arrangeOrder(order, ['c'], 'back')), 'cab');
  assert.equal(names(arrangeOrder(order, ['a', 'c'], 'front')), 'bac');
  assert.equal(arrangeOrder(order, ['c'], 'front'), null); // already on top
  assert.equal(arrangeOrder(order, ['a'], 'back'), null);
  assert.equal(arrangeOrder(order, ['a', 'b', 'c'], 'front'), null); // nothing to move past
});

test('forward and backward step past the next object that overlaps', () => {
  const order = [box('a', 0), box('far', 500), box('b', 50), box('c', 60)];
  assert.equal(names(arrangeOrder(order, ['a'], 'forward')), 'farbac'); // skips 'far' (no overlap), passes 'b'
  assert.equal(names(arrangeOrder(order, ['c'], 'backward')), 'afarcb');
  assert.equal(arrangeOrder(order, ['c'], 'forward'), null);
  assert.equal(arrangeOrder([box('a', 0), box('far', 500)], ['a'], 'forward'), null);
});

test('only the objects whose layer changes are updated', () => {
  const order = [box('a', 0, { z: 0 }), box('b', 10, { z: 1 }), box('c', 20, { z: 2 })];
  const ops = arrangeOps(order, ['a'], 'front');
  assert.deepEqual(ops.map((o) => [o.id, o.patch.z]), [['b', 0], ['c', 1], ['a', 2]]);
  assert.deepEqual(arrangeOps(order, ['c'], 'front'), []);
});

test('the store paints raised objects last and stacks new objects on top', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: box('a', 0) }, { op: 'add', obj: box('b', 10) }, { op: 'add', obj: box('c', 20) }]);
  assert.equal(names(store.onPage(0)), 'abc');
  store.commit(arrangeOps(store.onPage(0), ['a'], 'front'));
  assert.equal(names(store.onPage(0)), 'bca');
  store.commit([{ op: 'add', obj: box('d', 30) }]); // drawn after the raise: still on top
  assert.equal(names(store.onPage(0)), 'bcad');
  assert.equal(store.get('d').z, store.get('a').z);
});

test('layers are per page and undo/redo restore the order', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: box('a', 0) }, { op: 'add', obj: box('b', 10) }, { op: 'add', obj: box('p', 0, { page: 1 }) }]);
  store.commit(arrangeOps(store.onPage(0), ['a'], 'front'));
  assert.equal(names(store.onPage(1)), 'p');
  assert.equal(store.get('p').z, undefined);
  store.undo();
  assert.equal(names(store.onPage(0)), 'ab');
  store.redo();
  assert.equal(names(store.onPage(0)), 'ba');
});

test('undoing a reorder sends explicit layers, so collaborators follow', () => {
  const sent = [];
  const store = new ObjectStore({ onLocalOps: (ops) => sent.push(ops) });
  store.commit([{ op: 'add', obj: box('a', 0) }, { op: 'add', obj: box('b', 10) }]);
  store.commit(arrangeOps(store.onPage(0), ['a'], 'front'));
  store.undo();
  const undo = JSON.parse(JSON.stringify(sent[sent.length - 1]));
  assert.ok(undo.every((op) => op.patch.z === 0 || op.patch.z === 1));
});

test('a remote live stroke keeps its layer', () => {
  const store = new ObjectStore();
  store.applyRemoteStroke({ id: 's', page: 0, meta: { tool: 'pen', color: '#000', width: 3, z: 5 }, points: [[0, 0, 0.5]] });
  assert.equal(store.get('s').z, 5);
});

test('big batches are split to stay under the server limit', () => {
  const ops = Array.from({ length: 1000 }, (_, i) => ({ op: 'update', id: String(i), patch: { z: i } }));
  const parts = chunkOps(ops);
  assert.equal(parts.length, 3);
  assert.ok(parts.every((part) => part.length <= 400));
  assert.equal(parts.flat().length, 1000);
});
