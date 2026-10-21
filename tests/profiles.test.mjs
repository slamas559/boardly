import test from 'node:test';
import assert from 'node:assert/strict';
import {
  axisPosition, clipToRight, extrudeMeasures, isSymmetricAcross, isValidProfile, longestSide, outlineOf, polygonArea, polygonCentroid,
  polygonPerimeter, profileBounds, rescaleProfile, revolveExtent, revolveMeasures, revolveRegion, simplify, toProfile,
} from '../src/board/profiles.js';
import { dimensionLines, measureLines, newProfileSolid, profileOf, solidExtent, solidMeasures, solidShiftY, solidSizes } from '../src/board/solids.js';
import { ObjectStore } from '../src/board/store.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} is not close to ${b}`);
const shape = (kind, x1, y1, x2, y2) => ({ type: 'shape', kind, x1, y1, x2, y2 });

// a right triangle standing on the axis: spun, it is a cone with radius 2 and height 6
const coneProfile = [[0, -3], [2, -3], [0, 3]];

test('polygon area, centre and perimeter', () => {
  const square = [[0, 0], [4, 0], [4, 3], [0, 3]];
  assert.equal(polygonArea(square), 12);
  assert.deepEqual(polygonCentroid(square), [2, 1.5]);
  assert.equal(polygonPerimeter(square), 14);
  near(polygonCentroid([[0, 0], [3, 0], [0, 3]])[0], 1); // a triangle's centre is a third of the way across
});

test('a polygon is cut at the axis and only the right-hand part is kept', () => {
  const cut = clipToRight([[-2, -1], [2, -1], [2, 1], [-2, 1]]);
  near(polygonArea(cut), 4);
  assert.ok(cut.every(([x]) => x >= 0));
  assert.deepEqual(clipToRight([[1, 0], [3, 0], [2, 2]]).length, 3); // wholly on the right: unchanged
  assert.deepEqual(clipToRight([[-3, 0], [-1, 0], [-2, 2]]), []); // wholly on the left: nothing
});

test('spinning a triangle gives a cone, and the numbers match the cone formulas', () => {
  const m = revolveMeasures(coneProfile, 'left', 360);
  near(m.volume, (Math.PI * 4 * 6) / 3);
  near(m.surface, Math.PI * 2 * (2 + Math.hypot(2, 6)));
});

test('spinning a rectangle gives a cylinder', () => {
  const m = revolveMeasures([[0, -2.5], [2, -2.5], [2, 2.5], [0, 2.5]], 'left', 360);
  near(m.volume, Math.PI * 4 * 5);
  near(m.surface, 2 * Math.PI * 2 * (2 + 5));
});

test('a circle spun about its centre line is a sphere, about its edge a ring', () => {
  const circle = toProfile(outlineOf(shape('ellipse', 0, 0, 120, 120)), 6);
  near(revolveMeasures(circle, 'center', 360).volume, (4 / 3) * Math.PI * 27, 0.5);
  near(revolveMeasures(circle, 'center', 360).surface, 4 * Math.PI * 9, 0.5);
  near(revolveMeasures(circle, 'left', 360).volume, 2 * Math.PI ** 2 * 3 * 9, 1); // Pappus: a torus
});

test('a partial turn is the same fraction of the volume and has two flat faces', () => {
  const rect = [[0, -2.5], [2, -2.5], [2, 2.5], [0, 2.5]];
  const full = revolveMeasures(rect, 'left', 360);
  const half = revolveMeasures(rect, 'left', 180);
  near(half.volume, full.volume / 2);
  near(half.surface, full.surface / 2 + 2 * 10);
  assert.equal(half.full, false);
});

test('the axis can be on either edge or through the middle', () => {
  const p = [[-1, -2], [3, -2], [3, 2], [-1, 2]];
  assert.equal(axisPosition(p, 'left'), -1);
  assert.equal(axisPosition(p, 'center'), 1);
  assert.equal(axisPosition(p, 'right'), 3);
  near(polygonArea(revolveRegion(p, 'left')), 16);
  near(polygonArea(revolveRegion(p, 'center')), 8); // only the right-hand half is spun
  near(polygonArea(revolveRegion(p, 'right')), 16); // a shape on the left of its axis is mirrored across
  assert.equal(revolveExtent(p, 'left').radius, 4);
});

test('stretching a shape: volume is area × depth', () => {
  const m = extrudeMeasures([[0, 0], [4, 0], [4, 3], [0, 3]], 5);
  assert.equal(m.volume, 60);
  assert.equal(m.surface, 2 * 12 + 14 * 5);
});

test('closed board shapes give an outline; lines and tiny shapes do not', () => {
  assert.equal(outlineOf(shape('rect', 10, 10, 110, 60)).length, 4);
  assert.equal(outlineOf(shape('ellipse', 0, 0, 100, 100)).length, 72);
  assert.equal(outlineOf(shape('triangle', 0, 0, 100, 100)).length, 3);
  assert.equal(outlineOf(shape('hexagon', 0, 0, 100, 100)).length, 6);
  assert.equal(outlineOf(shape('line', 0, 0, 100, 100)), null);
  assert.equal(outlineOf(shape('arrow', 0, 0, 100, 100)), null);
  assert.equal(outlineOf(shape('rect', 0, 0, 1, 80)), null);
  assert.equal(outlineOf({ type: 'text', x: 0, y: 0 }), null);
});

test('a freehand loop becomes a simple closed outline', () => {
  const loop = Array.from({ length: 200 }, (_, i) => {
    const a = (i / 200) * Math.PI * 2;
    return [100 + Math.cos(a) * 60 + 0.4 * Math.sin(i * 7), 100 + Math.sin(a) * 40, 0.5];
  });
  const outline = outlineOf({ type: 'stroke', points: loop });
  assert.ok(outline.length >= 6 && outline.length <= 160);
  const box = profileBounds(outline);
  near(box.w, 120, 3);
  assert.equal(outlineOf({ type: 'stroke', points: [[0, 0, 1], [1, 1, 1]] }), null); // too short to be a shape
});

test('an outline is turned into solid units: centred, y up, longest side set', () => {
  const profile = toProfile([[10, 10], [110, 10], [110, 60], [10, 60]], 6);
  const box = profileBounds(profile);
  assert.equal(box.w, 6);
  near(box.h, 3);
  near(box.minX + box.maxX, 0);
  assert.deepEqual(profile[0], [-3, 1.5]); // the top left of the board shape is up on the left
  const bigger = rescaleProfile(profile, 12);
  near(longestSide(bigger), 12);
});

test('symmetry across the vertical centre line is detected', () => {
  assert.equal(isSymmetricAcross(outlineOf(shape('ellipse', 0, 0, 100, 60))), true);
  assert.equal(isSymmetricAcross(outlineOf(shape('triangle', 0, 0, 100, 100))), true);
  assert.equal(isSymmetricAcross([[0, 0], [100, 0], [0, 100]]), false);
});

test('simplify drops points on straight runs', () => {
  const line = Array.from({ length: 20 }, (_, i) => [i, i * 2]);
  assert.equal(simplify(line, 0.01).length, 2);
  assert.equal(simplify([[0, 0], [5, 5], [10, 0]], 0.5).length, 3);
});

test('what makes a valid profile', () => {
  assert.equal(isValidProfile(coneProfile), true);
  assert.equal(isValidProfile([[0, 0], [1, 1]]), false);
  assert.equal(isValidProfile([[0, 0], [1, NaN], [2, 2]]), false);
  assert.equal(isValidProfile([[0, 0], [1, 1], [1e9, 2]]), false);
  assert.equal(isValidProfile('nope'), false);
});

test('a new spun solid has the right sizes, and a stretched one a depth in proportion to its shape', () => {
  const spun = newProfileSolid('revolve', coneProfile, { id: 'a', page: 0, x: 0, y: 0, axis: 'left' });
  assert.deepEqual(spun.params, { sweep: 360 });
  assert.equal(spun.axis, 'left');
  const stretched = newProfileSolid('extrude', coneProfile, { id: 'b', page: 0, x: 0, y: 0 });
  assert.equal(stretched.params.depth, 3.6);
  assert.equal(newProfileSolid('anything', coneProfile, { id: 'c', page: 0, x: 0, y: 0 }).kind, 'revolve');
});

test('a spun solid reports its measurements with the working', () => {
  const o = newProfileSolid('revolve', coneProfile, { id: 'a', page: 0, x: 0, y: 0, axis: 'left' });
  const m = solidMeasures(o);
  near(m.volume, (Math.PI * 4 * 6) / 3);
  const lines = measureLines({ ...o, unit: 'cm' });
  assert.equal(lines.volume.formula, 'V = θ × x̄ × A');
  assert.match(lines.volume.answer, /25\.13 cm³/);
  assert.match(lines.volume.working, /^6\.28 × 0\.67 × 6$/);
  assert.equal(lines.extras[0].text, 'θ = 360° = 6.28 radians');
  const half = measureLines({ ...o, params: { sweep: 180 } });
  assert.equal(half.surface.formula, 'S = θ × Σ(r̄ × l) + 2A');
});

test('a stretched solid reports volume and surface area', () => {
  const o = newProfileSolid('extrude', [[0, 0], [4, 0], [4, 3], [0, 3]], { id: 'a', page: 0, x: 0, y: 0 });
  const m = solidMeasures({ ...o, params: { depth: 5 } });
  assert.equal(m.volume, 60);
  assert.equal(m.surface, 94);
});

test('spun and stretched solids have an overall size, a centring shift and measurement lines', () => {
  const spun = newProfileSolid('revolve', coneProfile, { id: 'a', page: 0, x: 0, y: 0, axis: 'left' });
  const e = solidExtent(spun);
  assert.deepEqual([e.x, e.y, e.z], [4, 6, 4]);
  assert.equal(solidShiftY(spun), 0);
  const keys = dimensionLines(spun).map((l) => l.key);
  assert.deepEqual(keys, ['axis', 'r']);
  assert.equal(dimensionLines(spun)[0].dashed, true);
  const stretched = newProfileSolid('extrude', coneProfile, { id: 'b', page: 0, x: 0, y: 0 });
  assert.deepEqual(dimensionLines(stretched).map((l) => l.key), ['d']);
  assert.equal(solidExtent(stretched).z, solidSizes(stretched).depth);
});

test('a damaged profile falls back to a plain square instead of breaking the board', () => {
  const broken = { kind: 'revolve', profile: 'oops', axis: 'sideways', params: { sweep: 360 }, x: 0, y: 0, w: 440, h: 460 };
  assert.equal(profileOf(broken).length, 4);
  assert.ok(Number.isFinite(solidMeasures(broken).volume));
});

test('spun solids are ordinary board objects: undo restores the sweep', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: newProfileSolid('revolve', coneProfile, { id: 's', page: 0, x: 0, y: 0 }) }]);
  store.commit([{ op: 'update', id: 's', patch: { params: { sweep: 180 } } }]);
  assert.equal(store.get('s').params.sweep, 180);
  store.undo();
  assert.equal(store.get('s').params.sweep, 360);
});
