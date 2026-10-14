import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectStore } from '../src/board/store.js';
import { BOARD_TOOLS, PDF_TOOLS, SHAPE_KINDS, STYLE_GROUP } from '../src/board/constants.js';
import { getBounds, hitGraphGeometry, hitGraphTrace, hitObject, isMovable, movePatch, scalePatch, segDist } from '../src/board/geometry.js';
import { findKeyPoints, formatNumber, tracePoint } from '../src/board/graphAnalysis.js';
import { KEYS, backspace, insertSnippet, nextSlot, stepCaret } from '../src/board/mathKeys.js';
import { MAX_LATEX_LENGTH, ensureMath, equationSvgUrl, estimateEquationSize, measureEquation, renderLatex } from '../src/board/mathRender.js';
import {
  compileExpression, compileImplicitEquation, compileInequality, compileInequalitySystem, fitGraphRanges, fitGraphYRange, graphGeometryPixels, graphParamNames, graphSegments, paramConstants, paramSpec, sampleGraph, sampleImplicit, sampleInequalityRegion, scanParamNames,
} from '../src/board/graphMath.js';
import { buildGraphPatch, graphToForm, normalizeEquation } from '../src/board/graphValidation.js';
import { sampleParametricCurve3d, sampleParametricSurfaceMesh, sampleSurfaceMesh } from '../src/board/graph3d.js';
import { videoPlaybackPatch } from '../src/board/render.js';
import { parseVideoLink } from '../src/board/mediaLinks.js';

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

test('new polygon shapes hit-test their outlines and filled interiors', () => {
  const base = { id: 'shape', type: 'shape', x1: 0, y1: 0, x2: 100, y2: 100, width: 2, fill: false };
  for (const kind of ['triangle', 'roundedRect', 'hexagon', 'star']) {
    const shape = { ...base, kind };
    assert.ok(hitObject(shape, [50, 1], 3), `${kind} outline hit`);
    assert.ok(!hitObject(shape, [50, 50], 1), `${kind} hollow interior miss`);
    assert.ok(hitObject({ ...shape, fill: true }, [50, 50], 1), `${kind} filled interior hit`);
  }
});

test('shape tools are enabled for board and PDF annotations', () => {
  for (const kind of ['triangle', 'roundedRect', 'hexagon', 'star', 'line']) {
    assert.ok(SHAPE_KINDS.includes(kind));
    assert.ok(BOARD_TOOLS.includes(kind));
    assert.ok(PDF_TOOLS.includes(kind));
    assert.equal(STYLE_GROUP[kind], 'shape');
  }
});

test('equation parser evaluates safe arithmetic, powers, implicit multiplication and functions', () => {
  assert.equal(compileExpression('x^2 + 2x + 1')(3), 16);
  assert.ok(Math.abs(compileExpression('sin(pi / 2)')(0) - 1) < 1e-10);
  assert.equal(compileExpression('-x^2')(3), -9);
  assert.throws(() => compileExpression('globalThis.alert(1)'));
  assert.throws(() => compileExpression('x +'));
});

test('adaptive graph sampling refines curves and breaks across discontinuities', () => {
  const curve = sampleGraph((x) => x * x, { xMin: -2, xMax: 2, yMin: 0, yMax: 4, width: 320, height: 200 });
  assert.equal(curve.length, 1);
  assert.ok(curve[0].length > 40, 'curved sections get additional samples');
  const asymptote = sampleGraph((x) => 1 / x, { xMin: -1, xMax: 1, yMin: -10, yMax: 10, width: 320, height: 200 });
  assert.equal(asymptote.length, 2, 'the two sides of the discontinuity are separate paths');
  assert.ok(asymptote[0].at(-1).x < 160);
  assert.ok(asymptote[1][0].x > 160);
});

test('fit-to-curve computes padded vertical ranges for nonlinear equations', () => {
  const range = fitGraphYRange('x^2', -2, 2);
  assert.ok(range.yMin < 0);
  assert.ok(range.yMax > 4);
  assert.throws(() => fitGraphYRange('sqrt(x)', -2, -1), /no finite values/i);
});

test('implicit equations compile and generate contours', () => {
  const circle = compileImplicitEquation('x^2 + y^2 = 25');
  assert.equal(circle(3, 4), 0);
  assert.equal(circle(0, 0), -25);
  const contours = sampleImplicit(circle, { xMin: -10, xMax: 10, yMin: -10, yMax: 10, width: 200, height: 200 });
  assert.ok(contours.length > 30);
  assert.throws(() => compileImplicitEquation('x + y'));
  assert.throws(() => compileImplicitEquation('x = y = 1'));
});

test('parametric and polar graphs generate curves and fit both axes', () => {
  const parametric = graphSegments({
    mode: 'parametric', xExpression: 'cos(t)', yExpression: 'sin(t)',
    tMin: 0, tMax: Math.PI * 2, xMin: -2, xMax: 2, yMin: -2, yMax: 2,
  }, 240, 160);
  assert.equal(parametric.length, 1);
  assert.ok(parametric[0].length >= 32);
  const polar = graphSegments({
    mode: 'polar', expression: '2 + cos(5t)',
    tMin: 0, tMax: Math.PI * 2, xMin: -5, xMax: 5, yMin: -5, yMax: 5,
  }, 240, 160);
  assert.equal(polar.length, 1);
  const ranges = fitGraphRanges({
    mode: 'implicit', expression: 'x^2 + y^2 = 25',
    xMin: -10, xMax: 10, yMin: -10, yMax: 10,
  });
  assert.ok(ranges.xMin < -5 && ranges.xMax > 5);
  assert.ok(ranges.yMin < -5 && ranges.yMax > 5);
});

test('math expressions support reciprocal, hyperbolic and logarithm functions plus double-star powers', () => {
  assert.ok(Math.abs(compileExpression('sec(0)')(0) - 1) < 1e-10);
  assert.ok(Math.abs(compileExpression('csc(pi / 2)')(0) - 1) < 1e-10);
  assert.ok(Math.abs(compileExpression('cot(pi / 4)')(0) - 1) < 1e-10);
  assert.ok(Math.abs(compileExpression('sinh(0) + cosh(0) + tanh(0)')(0) - 1) < 1e-10);
  assert.equal(compileExpression('log2(8)')(0), 3);
  assert.equal(compileExpression('x ** 2')(3), 9);
});

test('inequalities evaluate strict and inclusive boundaries and shade their intersection', () => {
  const strict = compileInequality('y > 2x + 1');
  const inclusive = compileInequality('x^2 + y^2 <= 16');
  assert.equal(strict.strict, true);
  assert.equal(strict.test(0, 2), true);
  assert.equal(strict.test(0, 1), false);
  assert.equal(inclusive.strict, false);
  assert.equal(inclusive.test(0, 4), true);
  assert.equal(inclusive.test(0, 4.1), false);
  assert.throws(() => compileInequalitySystem('y > x > 0'), /one inequality per line/);
  const region = sampleInequalityRegion([strict, inclusive], {
    xMin: -5, xMax: 5, yMin: -5, yMax: 5, width: 100, height: 100,
  });
  assert.equal(region.cols, 25);
  assert.ok(region.pixels.some((_, index) => index % 4 === 3 && region.pixels[index] > 0));
  assert.ok(graphSegments({
    mode: 'inequality', expression: 'y > x', xMin: -5, xMax: 5, yMin: -5, yMax: 5,
  }, 100, 100).length > 0);
});

test('coordinate geometry maps graph points and vectors and extends rays to the plot edge', () => {
  const mapped = graphGeometryPixels([
    { kind: 'point', label: 'A', x: 0, y: 0 },
    { kind: 'vector', label: 'v', x: 0, y: 0, dx: 2, dy: 1 },
    { kind: 'ray', label: 'r', x1: 0, y1: 0, x2: 1, y2: 1 },
  ], { xMin: -2, xMax: 2, yMin: -2, yMax: 2, width: 200, height: 100 });
  assert.deepEqual(mapped[0].point, { x: 100, y: 50 });
  assert.deepEqual(mapped[1].start, { x: 100, y: 50 });
  assert.deepEqual(mapped[1].end, { x: 200, y: 25 });
  assert.equal(mapped[2].arrow, true);
  assert.equal(mapped[2].end.x, 200);
});

test('polygons, measured segments and angles produce mapped geometry measurements', () => {
  const [polygon, segment, angle] = graphGeometryPixels([
    { kind: 'polygon', vertices: [[-1, -1], [1, -1], [0, 1]] },
    { kind: 'segment', x1: 0, y1: 0, x2: 3, y2: 4, showMeasure: true },
    { kind: 'angle', ax: -1, ay: 0, vx: 0, vy: 0, cx: 0, cy: 1, angleUnit: 'degrees' },
  ], { xMin: -2, xMax: 2, yMin: -2, yMax: 2, width: 200, height: 200 });
  assert.equal(polygon.points.length, 3);
  assert.deepEqual(segment.start, { x: 100, y: 100 });
  assert.equal(segment.length, 5);
  assert.ok(Math.abs(angle.angleRadians - Math.PI / 2) < 1e-10);
  assert.ok(Number.isFinite(angle.startAngle) && Number.isFinite(angle.endAngle));
});

test('coordinate geometry can be hit-tested in graph canvas coordinates', () => {
  const graph = {
    x: 10, y: 20, w: 520, h: 380, xMin: -10, xMax: 10, yMin: -10, yMax: 10,
    geometry: [
      { id: 'point-a', kind: 'point', label: 'A', x: 2, y: 2 },
      { id: 'triangle', kind: 'polygon', label: 'ABC', vertices: [[-2, -2], [2, -2], [0, 2]], filled: true },
    ],
  };
  assert.equal(hitGraphGeometry(graph, [332, 173], 1), 'point-a');
  assert.equal(hitGraphGeometry(graph, [285, 230], 1), 'triangle', 'filled polygon interiors are selectable');
  assert.equal(hitGraphGeometry(graph, [100, 100], 1), null);
});

test('3D surface mesh samples z=f(x,y) into a bounded indexed mesh', () => {
  const mesh = sampleSurfaceMesh({
    expression: 'x^2 - y^2',
    xMin: -2, xMax: 2, yMin: -2, yMax: 2, zMin: -4, zMax: 4,
  }, 8);
  assert.equal(mesh.vertices.length, 9 * 9 * 3);
  assert.ok(mesh.indices.length > 0);
  assert.ok(mesh.vertices.every(Number.isFinite));
  assert.throws(() => sampleSurfaceMesh({
    expression: 'x + y',
    xMin: -2, xMax: 2, yMin: -2, yMax: 2, zMin: 1, zMax: 1,
  }));
});

test('3D parametric curves and surfaces sample bounded indexed geometry', () => {
  const curve = sampleParametricCurve3d({
    xExpression: 'cos(t)', yExpression: 'sin(t)', zExpression: 't',
    tMin: 0, tMax: 6, xMin: -2, xMax: 2, yMin: -2, yMax: 2, zMin: 0, zMax: 6,
  }, 64);
  assert.equal(curve.vertices.length, 65 * 3);
  assert.ok(curve.indices.length > 100);
  assert.ok(curve.vertices.every(Number.isFinite));

  const surface = sampleParametricSurfaceMesh({
    xExpression: 'cos(u)', yExpression: 'sin(u)', zExpression: 'v',
    uMin: 0, uMax: Math.PI * 2, vMin: 0, vMax: 2,
    xMin: -2, xMax: 2, yMin: -2, yMax: 2, zMin: -1, zMax: 3,
  }, 12);
  assert.equal(surface.vertices.length, 13 * 13 * 3);
  assert.ok(surface.indices.length > 100);
  assert.ok(surface.vertices.every(Number.isFinite));
  assert.throws(() => sampleParametricSurfaceMesh({
    xExpression: 'cos(u)', yExpression: 'sin(u)', zExpression: 'v',
    uMin: 2, uMax: 1, vMin: 0, vMax: 2,
    xMin: -2, xMax: 2, yMin: -2, yMax: 2, zMin: -1, zMax: 3,
  }));
});

test('graphs and tables support selection, movement and resizing', () => {
  const graph = { id: 'g', type: 'graph', x: 10, y: 20, w: 300, h: 200 };
  assert.deepEqual(getBounds(graph), { x: 10, y: 20, w: 300, h: 200 });
  assert.ok(hitObject(graph, [10, 20], 1));
  assert.deepEqual(movePatch(graph, 5, 6), { x: 15, y: 26 });
  assert.deepEqual(scalePatch(graph, 2, 2, 0, 0), { x: 20, y: 40, w: 600, h: 400 });

  const table = { id: 't', type: 'table', x: 5, y: 8, rows: 2, cols: 3, cellWidth: 100, cellHeight: 40 };
  assert.deepEqual(getBounds(table), { x: 5, y: 8, w: 300, h: 80 });
  assert.ok(hitObject(table, [200, 40], 1));
  assert.deepEqual(scalePatch(table, 2, 2, 0, 0), { x: 10, y: 16, cellWidth: 200, cellHeight: 80 });
});

test('media objects support selection, movement and resizing', () => {
  const media = { id: 'm', type: 'media', mediaType: 'image', src: 'https://res.cloudinary.com/demo/image/upload/photo.jpg', x: 10, y: 20, w: 300, h: 200 };
  assert.deepEqual(getBounds(media), { x: 10, y: 20, w: 300, h: 200 });
  assert.ok(hitObject(media, [100, 100], 1));
  assert.deepEqual(movePatch(media, 5, 6), { x: 15, y: 26 });
  assert.deepEqual(scalePatch(media, 2, 2, 0, 0), { x: 20, y: 40, w: 600, h: 400 });
});

test('video playback updates share the play state and seek position', () => {
  const video = { id: 'video', type: 'media', mediaType: 'video', playing: false };
  const started = videoPlaybackPatch(video, true, 12.5);
  assert.equal(started.playing, true);
  assert.equal(started.currentTime, 12.5);

  const paused = videoPlaybackPatch(video, false, 18);
  assert.equal(paused.playing, false);
  assert.equal(paused.currentTime, 18);
});

test('video links normalize supported YouTube, Vimeo, and direct HTTPS videos', () => {
  assert.deepEqual(parseVideoLink('https://youtu.be/dQw4w9WgXcQ'), {
    mediaType: 'embed',
    provider: 'youtube',
    src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  });
  assert.deepEqual(parseVideoLink('https://vimeo.com/123456789'), {
    mediaType: 'embed',
    provider: 'vimeo',
    src: 'https://player.vimeo.com/video/123456789',
  });
  assert.deepEqual(parseVideoLink('https://cdn.example.com/lesson.mp4?token=abc'), {
    mediaType: 'embed',
    provider: 'direct',
    src: 'https://cdn.example.com/lesson.mp4?token=abc',
  });
  assert.throws(() => parseVideoLink('https://example.com/watch'));
  assert.throws(() => parseVideoLink('http://cdn.example.com/lesson.mp4'));
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

test('every drawing tool gets a deliberate cursor; shapes keep the crosshair', async () => {
  const { cursorFor } = await import('../src/board/cursors.js');
  assert.match(cursorFor('pen'), /^url\(/);
  assert.match(cursorFor('highlighter'), /^url\(/);
  assert.match(cursorFor('laser'), /^url\(/);
  assert.notEqual(cursorFor('pen'), cursorFor('laser'));
  assert.equal(cursorFor('pan'), 'grab');
  assert.equal(cursorFor('rect'), 'crosshair');
  assert.equal(cursorFor('text'), 'text');
});


test('coalesced edits of one object share a single undo step', () => {
  const sent = [];
  const store = new ObjectStore({ onLocalOps: (ops) => sent.push(ops) });
  store.commit([{ op: 'add', obj: { id: 'g', type: 'graph', page: 0, expression: 'x', xMin: -10, color: '#111111' } }]);
  store.commit([{ op: 'update', id: 'g', patch: { expression: 'x^2' } }], { coalesce: 'graph:g' });
  store.commit([{ op: 'update', id: 'g', patch: { expression: 'x^3', xMin: -5 } }], { coalesce: 'graph:g' });
  assert.equal(store.undoStack.length, 2); // add + one merged update
  assert.equal(sent.length, 3); // every edit is still broadcast live
  assert.equal(store.get('g').expression, 'x^3');

  assert.ok(store.undo()); // restores the values from before the first live edit
  assert.equal(store.get('g').expression, 'x');
  assert.equal(store.get('g').xMin, -10);
  assert.ok(store.redo());
  assert.equal(store.get('g').expression, 'x^3');
  assert.equal(store.get('g').xMin, -5);
});

test('edits with different coalesce keys, or none, stay separate undo steps', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: { id: 'g', type: 'graph', page: 0, expression: 'x', color: '#111111' } }]);
  store.commit([{ op: 'update', id: 'g', patch: { expression: 'x^2' } }], { coalesce: 'graph:g' });
  store.commit([{ op: 'update', id: 'g', patch: { color: '#ff0000' } }], { coalesce: 'graph-color:g' });
  store.commit([{ op: 'update', id: 'g', patch: { expression: 'x^3' } }]);
  assert.equal(store.undoStack.length, 4);
});

test('graph form: builds a normalised patch and strips the "y =" prefix', () => {
  const graph = { mode: 'explicit', expression: 'x^2', xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const form = { ...graphToForm(graph), expression: ' y = sin(x) ' };
  const result = buildGraphPatch('explicit', form, []);
  assert.ok(result.ok);
  assert.equal(result.patch.expression, 'sin(x)');
  assert.equal(result.patch.xMin, -10);
  assert.equal(normalizeEquation('surface3d', 'z = x*y'), 'x*y');
  assert.equal(normalizeEquation('implicit', ' x^2 + y^2 = 25 '), 'x^2 + y^2 = 25');
});

test('graph form: reports which section holds the problem', () => {
  const base = graphToForm({ mode: 'explicit', expression: 'x', xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
  assert.equal(buildGraphPatch('explicit', { ...base, expression: 'x +' }, []).section, 'equation');
  assert.equal(buildGraphPatch('explicit', { ...base, xMin: '5', xMax: '1' }, []).section, 'range');
  assert.equal(buildGraphPatch('explicit', { ...base, xMax: '' }, []).section, 'range'); // empty is not 0
  assert.equal(buildGraphPatch('surface3d', { ...base, expression: 'x*y', elevation: '95' }, []).section, 'view3d');
  const badPoint = [{ id: 'p', kind: 'point', label: 'P1', x: 'abc', y: 0 }];
  assert.equal(buildGraphPatch('explicit', base, badPoint).section, 'geometry');
});

test('graph form: an untouched graph round-trips to the same patch (no spurious live commit)', () => {
  const graph = { mode: 'explicit', expression: 'sin(x)', xMin: -6.28, xMax: 6.28, yMin: -2, yMax: 2 };
  const first = buildGraphPatch('explicit', graphToForm(graph), []);
  const again = buildGraphPatch('explicit', graphToForm({ ...graph, ...first.patch }), []);
  assert.equal(JSON.stringify(again.patch), JSON.stringify(first.patch));
});

/* ------------------------------ sliders, trace point and key points ------------------------------ */

test('slider letters use their value, default to 1, and may be written next to other factors', () => {
  assert.equal(compileExpression('a*x^2 + b', ['x'], { a: 2, b: 1 })(3), 19);
  assert.equal(compileExpression('ax', ['x'], { a: 3 })(2), 6);
  assert.equal(compileExpression('a', ['x'])(0), 1); // no slider value stored yet
  assert.equal(compileExpression('a(x-h)^2+k', ['x'], { a: 2, h: 1, k: -3 })(3), 5);
  assert.ok(Math.abs(compileExpression('2sin(x)', ['x'])(Math.PI / 2) - 2) < 1e-12);
  assert.ok(Math.abs(compileExpression('x sin(x)', ['x'])(Math.PI / 2) - Math.PI / 2) < 1e-12);
  assert.equal(compileExpression('asin(1) * 2 / pi', ['x'])(0), 1); // a function name still wins over a*s*i*n
  assert.equal(compileImplicitEquation('x^2 + y^2 = r^2', { r: 5 })(3, 4), 0);
  assert.equal(compileInequality('y > a*x', { a: 2 }).test(1, 3), true);
  assert.equal(compileInequality('y > a*x', { a: 2 }).test(1, 1), false);
});

test('unknown words are reported by name and cannot reach anything outside the maths', () => {
  assert.throws(() => compileExpression('foo(x)'), /"foo" is not recognised/);
  assert.throws(() => compileExpression('y = z'), /"z" is not recognised/);
  assert.throws(() => compileExpression('globalThis.alert(1)'));
  assert.throws(() => compileExpression('constructor'));
  assert.throws(() => compileExpression('__proto__'));
  assert.throws(() => compileExpression('x +'), /unfinished/);
  // x is the variable here, so it is never mistaken for a slider letter
  assert.deepEqual(scanParamNames('a*x^2 + b*x + c'), ['a', 'b', 'c']);
  assert.deepEqual(scanParamNames('2sin(x) + abs(x)'), []);
  assert.deepEqual(scanParamNames('x^2 + y^2 = r^2'), ['r']);
  assert.deepEqual(graphParamNames({ mode: 'parametric', xExpression: 'a*cos(t)', yExpression: 'b*sin(t)' }), ['a', 'b']);
});

test('graphs follow their slider values', () => {
  const graph = { mode: 'explicit', expression: 'a*x', xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const topOfLine = (params) => graphSegments({ ...graph, params }, 200, 200)[0].at(-1).y;
  const flat = topOfLine({ a: { value: 0, min: -10, max: 10 } });
  const steep = topOfLine({ a: { value: 1, min: -10, max: 10 } });
  assert.ok(Math.abs(flat - 100) < 0.5); // y = 0 sits on the middle row
  assert.ok(Math.abs(steep - 0) < 0.5); // y = 10 sits on the top row
  assert.deepEqual(paramConstants({ params: { a: { value: 2, min: 0, max: 5 }, '__proto__': { value: 9 } } }), { a: 2 });
  assert.deepEqual(paramSpec({ params: {} }, 'a'), { value: 1, min: -10, max: 10 });
  assert.deepEqual(paramSpec({ params: { a: { value: 4, min: 0, max: 5 } } }, 'a'), { value: 4, min: 0, max: 5 });
});

test('the equation form patch leaves sliders alone, so dragging one never rewrites the equation', () => {
  const graph = { mode: 'explicit', expression: 'a*x^2', xMin: -10, xMax: 10, yMin: -10, yMax: 10, params: { a: { value: 3, min: -10, max: 10 } } };
  const result = buildGraphPatch('explicit', graphToForm(graph), []);
  assert.ok(result.ok);
  assert.equal('params' in result.patch, false);
  assert.equal('trace' in result.patch, false);
  assert.equal('keyPoints' in result.patch, false);
});

test('repeated slider updates coalesce into one undo step', () => {
  const store = new ObjectStore();
  store.commit([{ op: 'add', obj: { id: 'g', type: 'graph', page: 0, expression: 'a*x', params: { a: { value: 1, min: -10, max: 10 } } } }]);
  for (const value of [1.5, 2, 2.5, 3]) {
    store.commit([{ op: 'update', id: 'g', patch: { params: { a: { value, min: -10, max: 10 } } } }], { coalesce: 'graph-params:g' });
  }
  assert.equal(store.get('g').params.a.value, 3);
  store.undo();
  assert.equal(store.get('g').params.a.value, 1);
});

test('key points: roots, intercept and turning points of a parabola', () => {
  const graph = { mode: 'explicit', expression: 'x^2 - 4', xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const found = findKeyPoints(graph);
  assert.equal(found.roots.length, 2);
  assert.ok(Math.abs(found.roots[0].x + 2) < 1e-6 && Math.abs(found.roots[1].x - 2) < 1e-6);
  assert.deepEqual(found.yIntercept, { x: 0, y: -4 });
  assert.equal(found.extrema.length, 1);
  assert.equal(found.extrema[0].kind, 'min');
  assert.ok(Math.abs(found.extrema[0].x) < 1e-4 && Math.abs(found.extrema[0].y + 4) < 1e-6);
});

test('key points follow sliders and ignore what is off screen', () => {
  const graph = { mode: 'explicit', expression: 'a(x-h)^2+k', xMin: -10, xMax: 10, yMin: -10, yMax: 10,
    params: { a: { value: 2, min: -5, max: 5 }, h: { value: 1, min: -5, max: 5 }, k: { value: -3, min: -5, max: 5 } } };
  const found = findKeyPoints(graph);
  assert.ok(Math.abs(found.extrema[0].x - 1) < 1e-4 && Math.abs(found.extrema[0].y + 3) < 1e-6);
  assert.equal(found.roots.length, 2);
  assert.equal(findKeyPoints({ ...graph, expression: 'x^2 + 3' }).roots.length, 0); // no roots exist
  assert.equal(findKeyPoints({ ...graph, params: undefined, expression: 'x^2', yMin: 2, yMax: 8 }).roots.length, 0); // y = 0 is not in view
});

test('key points do not report breaks in the curve as roots or turning points', () => {
  const view = { mode: 'explicit', xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const reciprocal = findKeyPoints({ ...view, expression: '1/x' });
  assert.deepEqual([reciprocal.roots.length, reciprocal.extrema.length], [0, 0]);
  const tangent = findKeyPoints({ ...view, expression: 'tan(x)' });
  assert.equal(tangent.extrema.length, 0);
  assert.ok(tangent.roots.every((root) => Math.abs(root.x / Math.PI - Math.round(root.x / Math.PI)) < 1e-6));
  assert.deepEqual(findKeyPoints({ ...view, mode: 'polar', expression: '2' }), { roots: [], extrema: [], yIntercept: null });
});

test('trace point reads out y and slope, and can be grabbed on the board', () => {
  const graph = { id: 'g', type: 'graph', mode: 'explicit', expression: 'x^2', x: 100, y: 100, w: 554, h: 358,
    xMin: -10, xMax: 10, yMin: -10, yMax: 100, trace: { x: 3, tangent: true } };
  const width = graph.w - 54;
  const height = graph.h - 58;
  const point = tracePoint(graph, width, height);
  assert.ok(Math.abs(point.y - 9) < 1e-9);
  assert.ok(Math.abs(point.slope - 6) < 1e-4);
  const world = [graph.x + 42 + point.px, graph.y + 24 + point.py];
  assert.equal(hitGraphTrace(graph, world, 16), true);
  assert.equal(hitGraphTrace(graph, [world[0] + 60, world[1]], 16), false);
  assert.equal(hitGraphTrace({ ...graph, trace: null }, world, 16), false);
  assert.equal(tracePoint({ ...graph, expression: 'sqrt(x)', trace: { x: -4 } }, width, height), null); // no value there
  assert.equal(tracePoint({ ...graph, trace: { x: 99 } }, width, height).x, 10); // clamped to the visible range
  assert.equal(formatNumber(3.14159265), '3.142');
  assert.equal(formatNumber(1e-12), '0');
});

/* ------------------------------ equation blocks and the math keyboard ------------------------------ */

test('keyboard snippets drop the caret in the right place and wrap a selection', () => {
  assert.deepEqual(insertSnippet('2+', 2, 2, '\\frac{‸}{}'), { text: '2+\\frac{}{}', caret: 8 });
  assert.deepEqual(insertSnippet('x+1', 0, 3, '\\sqrt{‸}'), { text: '\\sqrt{x+1}', caret: 9 }); // selection moves into the root
  assert.deepEqual(insertSnippet('ab', 1, 1, '\\pi '), { text: 'a\\pi b', caret: 5 });
  assert.deepEqual(insertSnippet('abc', 0, 3, '7'), { text: '7', caret: 1 }); // typing over a selection replaces it
});

test('backspace and arrows treat a LaTeX command as one step', () => {
  assert.deepEqual(backspace('a\\alpha ', 8, 8), { text: 'a', caret: 1 });
  assert.deepEqual(backspace('abc', 3, 3), { text: 'ab', caret: 2 });
  assert.deepEqual(backspace('abc', 1, 3), { text: 'a', caret: 1 });
  assert.deepEqual(backspace('abc', 0, 0), { text: 'abc', caret: 0 });
  assert.equal(stepCaret('\\alpha x', 0, 1), 7);
  assert.equal(stepCaret('\\alpha x', 7, -1), 0);
  assert.equal(stepCaret('ab', 2, 1), 2);
});

test('the next-box key walks through fraction boxes and matrix cells', () => {
  const fraction = insertSnippet('', 0, 0, '\\frac{‸}{}');
  assert.equal(nextSlot(fraction.text, fraction.caret), 8); // the empty denominator
  const matrix = insertSnippet('', 0, 0, '\\begin{pmatrix} ‸ &  \\\\  &  \\end{pmatrix}');
  const second = nextSlot(matrix.text, matrix.caret);
  assert.ok(matrix.text.slice(0, second).endsWith('& '));
  assert.ok(nextSlot(matrix.text, second) > second);
  assert.equal(nextSlot('abc', 1), 3); // nothing left to jump to: the end
});

test('every ready-made key and formula typesets without errors', async () => {
  await ensureMath();
  const needsContext = (key) => key.insert.trim() === '&';
  for (const [tab, keys] of Object.entries(KEYS)) {
    for (const key of keys.filter((item) => item.insert && !needsContext(item))) {
      const result = renderLatex(key.insert.replace('‸', ''));
      assert.equal(result.error, '', `${tab} key "${key.label}" gave: ${result.error}`);
    }
  }
});

test('formulas are measured from their typeset size and bad ones are reported', async () => {
  await ensureMath();
  const small = measureEquation('x^2', 36);
  const big = measureEquation('x^2', 72);
  assert.ok(small.w > 10 && small.h > 10);
  assert.ok(Math.abs(big.w / small.w - 2) < 0.02 && Math.abs(big.h / small.h - 2) < 0.02); // scales with the font size
  const fraction = measureEquation('\\frac{a}{b}', 36);
  assert.ok(fraction.h > measureEquation('a', 36).h); // a fraction is taller than a letter
  assert.match(measureEquation('\\frac{1}{', 36).error, /brace/i);
  assert.ok(measureEquation('\\notacommand{x}', 36).error);
  assert.ok(measureEquation('   ', 36).error);
  assert.match(measureEquation('x'.repeat(MAX_LATEX_LENGTH + 1), 36).error, /under/);
  const guess = estimateEquationSize('y = x^{2}', 44);
  assert.ok(guess.w > 0 && guess.h > 0);
});

test('formula images are plain SVG with the chosen colour and nothing that can run', async () => {
  await ensureMath();
  const url = equationSvgUrl('E = mc^2', '#2540D9');
  assert.ok(url.startsWith('data:image/svg+xml'));
  const svg = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64').toString('utf8');
  assert.ok(svg.includes('#2540D9') && !svg.includes('currentColor'));
  assert.ok(!/<script|onload=|javascript:|<foreignObject|href=/i.test(svg));
  // A hostile colour string is replaced instead of being written into the image
  const hostile = Buffer.from(equationSvgUrl('x', 'red" onload="alert(1)').split(',')[1], 'base64').toString('utf8');
  assert.ok(!hostile.includes('onload'));
  assert.equal(equationSvgUrl('\\frac{1}{', '#000'), null);
  // MathJax cannot be talked into loading files or running code
  for (const hostileTex of ['\\href{javascript:alert(1)}{x}', '\\unicode{x41}', '\\require{html}', '\\input{/etc/passwd}', '\\newcommand{\\x}{\\x}\\x']) {
    const result = renderLatex(hostileTex);
    assert.ok(result.error || !/<script|javascript:|<a /i.test(result.svg), hostileTex);
  }
});

test('equation blocks move, resize with their text and are hit like other objects', () => {
  const eq = { id: 'e', type: 'equation', page: 0, x: 100, y: 50, w: 200, h: 60, latex: 'x', fontSize: 40, color: '#17181C' };
  assert.deepEqual(getBounds(eq), { x: 100, y: 50, w: 200, h: 60 });
  assert.equal(hitObject(eq, [150, 70], 0), true);
  assert.equal(hitObject(eq, [400, 70], 0), false);
  assert.deepEqual(movePatch(eq, 10, -5), { x: 110, y: 45 });
  const grown = scalePatch(eq, 2, 1.5, 100, 50);
  assert.equal(grown.w, 400);
  assert.equal(grown.h, 120);
  assert.equal(grown.fontSize, 80); // proportions are kept: the font grows with the box
  assert.ok(isMovable(eq));
});
