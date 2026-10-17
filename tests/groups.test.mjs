import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectStore } from '../src/board/store.js';
import { expandToGroups, groupOps, groupState, isGroupable, remapGroupIds, ungroupOps } from '../src/board/groups.js';
import { nearestDock, resolveDock, stepDock } from '../src/board/useToolbarDock.js';

const stroke = (id, extra = {}) => ({ id, type: 'stroke', page: 0, color: '#000', width: 4, points: [[0, 0], [10, 10]], ...extra });
const makeStore = (objs, sent = []) => {
  const store = new ObjectStore({ onLocalOps: (ops) => sent.push(ops) });
  store.reset(objs);
  return store;
};

test('grouping glues objects: selecting one member brings the whole group', () => {
  const store = makeStore([stroke('a'), stroke('b'), stroke('c')]);
  store.commit(groupOps([store.get('a'), store.get('b')], 'g1'));
  assert.deepEqual(expandToGroups(store, 0, ['a']).sort(), ['a', 'b']);
  assert.deepEqual(expandToGroups(store, 0, ['c']), ['c']);
  assert.deepEqual(expandToGroups(store, 0, ['a', 'c']).sort(), ['a', 'b', 'c']);
});

test('groups do not leak across pages', () => {
  const store = makeStore([stroke('a', { groupId: 'g1' }), stroke('b', { groupId: 'g1', page: 1 })]);
  assert.deepEqual(expandToGroups(store, 0, ['a']), ['a']);
});

test('ungroup releases every member, even ones that were not selected', () => {
  const store = makeStore([stroke('a', { groupId: 'g1' }), stroke('b', { groupId: 'g1' }), stroke('c')]);
  store.commit(ungroupOps(store, 0, [store.get('a')]));
  assert.ok(!store.get('a').groupId);
  assert.ok(!store.get('b').groupId);
  assert.deepEqual(expandToGroups(store, 0, ['a']), ['a']);
});

test('grouping and ungrouping undo and redo, and undo reaches collaborators as an explicit null', () => {
  const sent = [];
  const store = makeStore([stroke('a'), stroke('b')], sent);
  store.commit(groupOps([store.get('a'), store.get('b')], 'g1'));
  assert.equal(store.get('a').groupId, 'g1');
  assert.ok(store.undo());
  assert.ok(!store.get('a').groupId);
  // the undo op must carry groupId: null (undefined would vanish in JSON and leave remote copies grouped)
  const undoOps = JSON.parse(JSON.stringify(sent[sent.length - 1]));
  assert.deepEqual(undoOps.map((op) => op.patch), [{ groupId: null }, { groupId: null }]);
  assert.ok(store.redo());
  assert.equal(store.get('b').groupId, 'g1');
});

test('a remote peer applying the same ops ends up in the same state', () => {
  const sent = [];
  const host = makeStore([stroke('a'), stroke('b')], sent);
  const listener = makeStore([stroke('a'), stroke('b')]);
  host.commit(groupOps([host.get('a'), host.get('b')], 'g1'));
  host.undo();
  for (const ops of sent) listener.applyRemote(JSON.parse(JSON.stringify(ops)));
  assert.ok(!listener.get('a').groupId && !listener.get('b').groupId);
});

test('groupState: when grouping / ungrouping are offered', () => {
  const a = stroke('a'), b = stroke('b'), c = stroke('c', { groupId: 'g1' }), d = stroke('d', { groupId: 'g1' });
  assert.deepEqual(groupState([a]), { canGroup: false, canUngroup: false });
  assert.deepEqual(groupState([a, b]), { canGroup: true, canUngroup: false });
  assert.deepEqual(groupState([c, d]), { canGroup: false, canUngroup: true }); // already one group
  assert.deepEqual(groupState([a, c, d]), { canGroup: true, canUngroup: true }); // merge, or release
  assert.deepEqual(groupState([]), { canGroup: false, canUngroup: false });
});

test('paper, markup, covers and instruments are never grouped', () => {
  for (const type of ['paper', 'markup', 'cover', 'instrument', 'highlight']) assert.equal(isGroupable({ id: 'x', type }), false);
  assert.equal(isGroupable({ id: 'x', type: 'equation' }), true);
  assert.equal(groupOps([{ id: 'x', type: 'cover' }, stroke('a')], 'g').length, 1);
});

test('pasted copies get their own group id and never stay glued to the originals', () => {
  let n = 0;
  const copies = [stroke('a2', { groupId: 'g1' }), stroke('b2', { groupId: 'g1' }), stroke('c2', { groupId: 'g9' }), stroke('d2')];
  remapGroupIds(copies, () => `new${++n}`);
  assert.equal(copies[0].groupId, 'new1');
  assert.equal(copies[1].groupId, 'new1');
  assert.ok(!('groupId' in copies[2])); // lost its partners, so it is no longer grouped
  assert.ok(!('groupId' in copies[3]));
});

test('dock: nearest edge and alignment from a drop point', () => {
  const box = { w: 1000, h: 600 };
  assert.deepEqual(nearestDock({ x: 10, y: 50 }, box), { edge: 'left', align: 'start' });
  assert.deepEqual(nearestDock({ x: 10, y: 300 }, box), { edge: 'left', align: 'center' });
  assert.deepEqual(nearestDock({ x: 990, y: 580 }, box), { edge: 'right', align: 'end' });
  assert.deepEqual(nearestDock({ x: 500, y: 10 }, box), { edge: 'top', align: 'center' });
  assert.deepEqual(nearestDock({ x: 900, y: 590 }, box), { edge: 'bottom', align: 'end' });
});

test('dock: defaults per screen size and keyboard stepping', () => {
  assert.deepEqual(resolveDock(null, true), { edge: 'left', align: 'start' });
  assert.deepEqual(resolveDock(null, false), { edge: 'bottom', align: 'center' });
  assert.deepEqual(resolveDock({ edge: 'top', align: 'end' }, true), { edge: 'top', align: 'end' });
  assert.deepEqual(stepDock({ edge: 'left', align: 'start' }, 'ArrowDown'), { edge: 'left', align: 'center' });
  assert.deepEqual(stepDock({ edge: 'left', align: 'end' }, 'ArrowDown'), { edge: 'left', align: 'end' });
  assert.deepEqual(stepDock({ edge: 'left', align: 'center' }, 'ArrowRight'), { edge: 'right', align: 'center' });
  assert.deepEqual(stepDock({ edge: 'bottom', align: 'center' }, 'ArrowUp'), { edge: 'top', align: 'center' });
  assert.deepEqual(stepDock({ edge: 'bottom', align: 'center' }, 'ArrowLeft'), { edge: 'bottom', align: 'start' });
});
