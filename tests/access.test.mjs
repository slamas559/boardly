import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectStore } from '../src/board/store.js';

const box = (id, extra = {}) => ({ id, type: 'shape', kind: 'rect', page: 0, x1: 0, y1: 0, x2: 50, y2: 50, color: '#000', width: 2, ...extra });

function listenerStore() {
  const sent = [];
  const store = new ObjectStore({ onLocalOps: (ops) => sent.push(ops) });
  store.commit([{ op: 'add', obj: box('host-1') }]); // drawn by the host
  sent.length = 0;
  store.setAuthor({ host: false, key: 'ana' });
  return { store, sent };
}

test('a listener who was let draw stamps their own objects', () => {
  const { store, sent } = listenerStore();
  store.commit([{ op: 'add', obj: box('a1') }]);
  assert.equal(store.get('a1').by, 'ana');
  assert.equal(sent[0][0].obj.by, 'ana');
});

test('they can change and remove only their own objects', () => {
  const { store, sent } = listenerStore();
  store.commit([{ op: 'add', obj: box('a1') }]);
  sent.length = 0;
  store.commit([{ op: 'update', id: 'host-1', patch: { color: '#f00' } }, { op: 'remove', id: 'host-1' }]);
  assert.equal(store.get('host-1').color, '#000');
  assert.equal(sent.length, 0); // nothing the server would reject is ever sent
  store.commit([{ op: 'update', id: 'a1', patch: { color: '#0f0' } }]);
  assert.equal(store.get('a1').color, '#0f0');
  store.commit([{ op: 'remove', id: 'a1' }]);
  assert.equal(store.get('a1'), undefined);
});

test('they cannot clear a page or add paper, covers or uploads', () => {
  const { store } = listenerStore();
  store.commit([{ op: 'clear', page: 0 }]);
  assert.ok(store.get('host-1'));
  store.commit([{ op: 'add', obj: { id: 'c1', type: 'cover', page: 0, x: 0, y: 0, w: 10, h: 10 } }, { op: 'add', obj: { id: 'p1', type: 'paper', page: 0 } }]);
  assert.equal(store.get('c1'), undefined);
  assert.equal(store.get('p1'), undefined);
});

test('the host is not restricted, and their objects carry no author', () => {
  const store = new ObjectStore();
  store.setAuthor({ host: true, key: 'host' });
  store.commit([{ op: 'add', obj: box('h1') }, { op: 'clear', page: 0 }]);
  assert.equal(store.get('h1'), undefined);
  store.commit([{ op: 'add', obj: box('h2') }]);
  assert.equal(store.get('h2').by, undefined);
});

test('undo works for a listener on their own work', () => {
  const { store } = listenerStore();
  store.commit([{ op: 'add', obj: box('a1') }]);
  store.undo();
  assert.equal(store.get('a1'), undefined);
  store.redo();
  assert.equal(store.get('a1').by, 'ana');
});

test('a live stroke from someone else keeps its author', () => {
  const store = new ObjectStore();
  store.applyRemoteStroke({ id: 's', page: 0, meta: { tool: 'pen', color: '#000', width: 3, by: 'ben' }, points: [[0, 0, 0.5]] });
  assert.equal(store.get('s').by, 'ben');
});
