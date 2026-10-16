import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectStore } from '../src/board/store.js';
import { BOARD_TOOLS, PDF_TOOLS, SHAPE_KINDS, STYLE_GROUP } from '../src/board/constants.js';
import { getBounds, hitGraphGeometry, hitGraphTrace, hitObject, isMovable, movePatch, scalePatch, segDist } from '../src/board/geometry.js';
import { findKeyPoints, formatNumber, tracePoint } from '../src/board/graphAnalysis.js';
import { KEYS, backspace, insertSnippet, nextSlot, stepCaret } from '../src/board/mathKeys.js';
import {
  INSTRUMENTS, UNIT, formatCm, formatDegrees, hitInstrument, hitInstrumentHandle, instrumentBounds, instrumentEdges, instrumentHandles,
  instrumentPolygon, measurePolygon, measureShape, newInstrument, normalizeDegrees, rotationFromPoint, shapeVertices, sizeFromPoint, snapPoint,
  snapRotation, toLocal, toWorld,
} from '../src/board/geometryTools.js';
import { drawInstrument, drawInstrumentSelection, drawMeasure, drawSnapMark } from '../src/board/instrumentRender.js';
import {
  CHARTS, EXAMPLES, datasetToText, describeCorrelation, formatStat, histogramBins, linearRegression, newStats, niceNumber, niceScale, numbersOf,
  pairsOf, parseDataset, regressionEquation, statsTable, summarize,
} from '../src/board/stats.js';
import {
  ACTIVITY_LIMITS, CHOICE_TEMPLATES, choiceCounts, draftToSpec, emptyDraft, numberSummary, parseAnswerNumber, percent, pollResultsForBoard,
  progressLabel, showValue, upsertResponse,
} from '../src/board/activityLogic.js';
import { COVER_DEFAULT_COLOR, drawCover, newCover, togglePatch } from '../src/board/cover.js';
import { MAX_IMAGE_CHARS, fitImage } from '../src/board/workImage.js';
import { chartProblem, drawStats } from '../src/board/statsRender.js';
import { PAPER_KINDS, PLANE_ORIGIN, drawPaper, niceStep, paperId, paperSnapGrid } from '../src/board/paper.js';
import {
  angleFromPoint, fractionLayout, hitFractionPart, hitUnitCirclePoint, jumpsToText, listToText, newAid, normalizeAngle, numberLineTicks,
  parseJumps, parseNumberList, radianLabel, shadePatch, snapToSpecial, unitCircleGeometry, unitCircleReadout, validNumberLine,
} from '../src/board/mathAids.js';
import { drawAid } from '../src/board/aidRender.js';
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

/* ------------------------------ page paper ------------------------------ */

// A canvas stand-in that records what was drawn, so drawing code can run without a browser
function recordingContext() {
  const calls = [];
  const state = { measureText: (text) => ({ width: String(text).length * 7 }) };
  const ctx = new Proxy(state, {
    get: (object, key) => (key in object ? object[key] : (...args) => { calls.push([String(key), ...args]); }),
    set: (object, key, value) => { object[key] = value; return true; },
  });
  return { ctx, calls };
}

test('paper belongs to a page but is never one of its objects, and clearing the page keeps it', () => {
  const store = new ObjectStore();
  store.commit([
    { op: 'add', obj: { id: paperId(0), type: 'paper', page: 0, kind: 'plane', scale: 1 } },
    { op: 'add', obj: { id: 'r', type: 'shape', kind: 'rect', page: 0, x: 0, y: 0, w: 10, h: 10 } },
    { op: 'add', obj: { id: 'other', type: 'shape', kind: 'rect', page: 1, x: 0, y: 0, w: 10, h: 10 } },
  ]);
  assert.deepEqual(store.onPage(0).map((o) => o.id), ['r']); // paper is not selectable, erasable or counted
  assert.equal(store.paperFor(0).kind, 'plane');
  assert.equal(store.paperFor(1), undefined); // the default dots
  store.commit([{ op: 'clear', page: 0 }]);
  assert.equal(store.onPage(0).length, 0);
  assert.equal(store.paperFor(0).kind, 'plane');
  assert.equal(store.onPage(1).length, 1);
  store.undo();
  assert.deepEqual(store.onPage(0).map((o) => o.id), ['r']); // the undo brings the shape back without touching the paper
  store.commit([{ op: 'update', id: paperId(0), patch: { kind: 'grid' } }]);
  store.undo();
  assert.equal(store.paperFor(0).kind, 'plane'); // changing paper is undoable
});

test('every paper kind draws, blank draws nothing, and the plane has labelled axes', () => {
  const view = { x: PLANE_ORIGIN.x - 300, y: PLANE_ORIGIN.y - 200, k: 1 };
  for (const kind of PAPER_KINDS.map((item) => item.id)) {
    const { ctx, calls } = recordingContext();
    drawPaper(ctx, view, 600, 400, kind, 1);
    if (kind === 'blank') assert.equal(calls.filter(([name]) => ['fill', 'stroke', 'fillText'].includes(name)).length, 0);
    else assert.ok(calls.some(([name]) => ['fill', 'stroke'].includes(name)), kind);
  }
  const { ctx, calls } = recordingContext();
  drawPaper(ctx, view, 600, 400, 'plane', 1);
  const labels = calls.filter(([name]) => name === 'fillText').map((call) => call[1]);
  assert.ok(['1', '2', '-1', '-2', '0', 'x', 'y'].every((text) => labels.includes(text)));
  const axis = calls.filter(([name, x, y]) => name === 'moveTo' && y === PLANE_ORIGIN.y);
  assert.ok(axis.length > 0); // the x axis runs through the middle of the board
});

test('the number plane keeps its labels readable as you zoom', () => {
  assert.equal(niceStep(0.7), 1);
  assert.equal(niceStep(1.2), 2);
  assert.equal(niceStep(3), 5);
  assert.equal(niceStep(7), 10);
  assert.equal(niceStep(0.03), 0.05);
  const labelCount = (k) => {
    const { ctx, calls } = recordingContext();
    drawPaper(ctx, { x: PLANE_ORIGIN.x - 300 / k, y: PLANE_ORIGIN.y - 200 / k, k }, 600, 400, 'plane', 1);
    return calls.filter(([name]) => name === 'fillText').length;
  };
  assert.ok(labelCount(0.1) < 60 && labelCount(0.1) > 4); // zoomed far out: a few round numbers, not hundreds
  assert.ok(labelCount(4) < 60);
});

/* ------------------------------ math aids ------------------------------ */

test('number line points and jumps are read leniently and written back tidily', () => {
  assert.deepEqual(parseNumberList('2, 5.5; -3  −4 2 x'), [2, 5.5, -3, -4]);
  assert.equal(parseNumberList(Array.from({ length: 20 }, (_, i) => i).join(',')).length, 12);
  assert.deepEqual(parseJumps('0>3, 3 -> -2, 5 to 1, 4>4, nonsense'), [{ from: 0, to: 3 }, { from: 3, to: -2 }, { from: 5, to: 1 }]);
  assert.equal(parseJumps(Array.from({ length: 12 }, (_, i) => `${i}>${i + 1}`).join(',')).length, 8);
  assert.equal(listToText([2, 0.1 + 0.2]), '2, 0.3');
  assert.equal(jumpsToText([{ from: 0, to: 3 }]), '0 > 3');
});

test('number line ticks cover the range, skip crowded labels and refuse impossible lines', () => {
  const line = { min: -5, max: 5, step: 1 };
  const { ticks } = numberLineTicks(line, 0, 1000);
  assert.equal(ticks.length, 11);
  assert.equal(ticks[0].value, -5);
  assert.equal(ticks[10].value, 5);
  assert.equal(ticks[5].x, 500);
  assert.ok(ticks.every((tick) => tick.labelled)); // plenty of room: label every tick
  const crowded = numberLineTicks({ min: 0, max: 1, step: 0.01 }, 0, 300).ticks;
  assert.equal(crowded.length, 101);
  assert.ok(crowded.filter((tick) => tick.labelled).length < 15); // labels thinned out
  assert.equal(validNumberLine(line), true);
  assert.equal(validNumberLine({ ...line, step: 0 }), false);
  assert.equal(validNumberLine({ ...line, min: 6 }), false);
  assert.equal(validNumberLine({ min: 0, max: 1000, step: 1 }), false); // more than 200 ticks
});

test('unit circle maths: radians as fractions of pi, exact values, and magnetic angles', () => {
  assert.deepEqual([0, 30, 45, 90, 150, 180, 270, 360, -45].map(radianLabel), ['0', 'π/6', 'π/4', 'π/2', '5π/6', 'π', '3π/2', '2π', '−π/4']);
  assert.equal(radianLabel(37), null);
  const right = unitCircleReadout(90);
  assert.deepEqual([right.cos, right.sin, right.tan], [0, 1, null]); // tan is undefined at 90°
  const thirty = unitCircleReadout(30);
  assert.deepEqual([thirty.cos, thirty.sin, thirty.tan], [0.866, 0.5, 0.5774]);
  assert.equal(unitCircleReadout(225).sin, -0.7071);
  assert.equal(normalizeAngle(-30), 330);
  assert.equal(normalizeAngle(725), 5);
  assert.equal(snapToSpecial(46), 45);
  assert.equal(snapToSpecial(52), 52); // not close to a special angle: stays free
  assert.equal(snapToSpecial(358), 0);
  assert.equal(snapToSpecial(-29), 330);
});

test('the unit circle point can be grabbed and dragged to an angle', () => {
  const circle = { ...newAid('unitcircle', { id: 'u', page: 0, cx: 400, cy: 300 }), angle: 60 };
  const { cx, cy, radius, point } = unitCircleGeometry(circle);
  assert.ok(Math.abs(point.x - (cx + radius * 0.5)) < 1e-6 && Math.abs(point.y - (cy - radius * Math.sqrt(3) / 2)) < 1e-6);
  assert.equal(hitUnitCirclePoint(circle, [point.x + 5, point.y - 5], 18), true);
  assert.equal(hitUnitCirclePoint(circle, [cx, cy], 18), false);
  assert.equal(hitUnitCirclePoint({ ...circle, kind: 'fractions' }, [point.x, point.y], 18), false);
  assert.ok(Math.abs(angleFromPoint(circle, [cx, cy - 100]) - 90) < 1e-9);
  assert.ok(Math.abs(angleFromPoint(circle, [cx - 100, cy]) - 180) < 1e-9);
  assert.ok(Math.abs(angleFromPoint(circle, [cx, cy + 100]) - 270) < 1e-9);
  assert.equal(unitCircleGeometry({ ...circle, w: 400 }).hasPanel, false); // too narrow for the values panel
});

test('tapping a fraction part shades up to it, and tapping the last shaded part clears it', () => {
  const bars = { ...newAid('fractions', { id: 'f', page: 0, cx: 300, cy: 150 }), bars: [{ parts: 4, shaded: 1 }, { parts: 8, shaded: 0 }], h: 260 };
  const layout = fractionLayout(bars);
  assert.equal(layout.items.length, 2);
  const [first, second] = layout.items;
  const inPart = (item, part) => [item.x + ((part + 0.5) / item.parts) * item.w, item.y + item.h / 2];
  assert.deepEqual(hitFractionPart(bars, inPart(first, 2)), { bar: 0, part: 2 });
  assert.deepEqual(hitFractionPart(bars, inPart(second, 7)), { bar: 1, part: 7 });
  assert.equal(hitFractionPart(bars, [bars.x + 2, bars.y + 2]), null);
  assert.deepEqual(shadePatch(bars, { bar: 0, part: 2 }).bars[0], { parts: 4, shaded: 3 });
  assert.deepEqual(shadePatch(bars, { bar: 0, part: 0 }).bars[0], { parts: 4, shaded: 0 }); // the last shaded part clears
  assert.deepEqual(shadePatch(bars, { bar: 1, part: 3 }).bars[1], { parts: 8, shaded: 4 });
  assert.deepEqual(shadePatch(bars, { bar: 1, part: 3 }).bars[0], bars.bars[0]); // other bars are untouched
  // Circles: parts start at the top and run clockwise
  const pies = { ...bars, shape: 'pie', bars: [{ parts: 4, shaded: 0 }] };
  const pie = fractionLayout(pies).items[0];
  assert.deepEqual(hitFractionPart(pies, [pie.cx + 10, pie.cy - 10]), { bar: 0, part: 0 }); // upper right
  assert.deepEqual(hitFractionPart(pies, [pie.cx + 10, pie.cy + 10]), { bar: 0, part: 1 }); // lower right
  assert.deepEqual(hitFractionPart(pies, [pie.cx - 10, pie.cy + 10]), { bar: 0, part: 2 });
  assert.deepEqual(hitFractionPart(pies, [pie.cx - 10, pie.cy - 10]), { bar: 0, part: 3 });
  assert.equal(hitFractionPart(pies, [pie.cx + pie.radius + 20, pie.cy]), null);
});

test('new aids start valid, move, resize and are hit like other objects', () => {
  for (const kind of ['numberline', 'unitcircle', 'fractions']) {
    const aid = newAid(kind, { id: kind, page: 3, cx: 500, cy: 400 });
    assert.equal(aid.type, 'aid');
    assert.equal(aid.page, 3);
    assert.ok(Math.abs(aid.x + aid.w / 2 - 500) < 0.01 && Math.abs(aid.y + aid.h / 2 - 400) < 0.01); // centred where asked
    assert.deepEqual(getBounds(aid), { x: aid.x, y: aid.y, w: aid.w, h: aid.h });
    assert.equal(hitObject(aid, [aid.x + 5, aid.y + 5], 0), true);
    assert.equal(hitObject(aid, [aid.x - 50, aid.y], 0), false);
    assert.deepEqual(movePatch(aid, 7, -3), { x: aid.x + 7, y: aid.y - 3 });
    const bigger = scalePatch(aid, 2, 2, aid.x, aid.y);
    assert.equal(bigger.w, aid.w * 2);
    assert.equal(scalePatch(aid, 0.01, 0.01, aid.x, aid.y).w, 160); // never shrinks to nothing
    assert.ok(isMovable(aid));
  }
  assert.equal(validNumberLine(newAid('numberline', { id: 'n', page: 0, cx: 0, cy: 0 })), true);
});

test('every aid draws without errors, including awkward settings', () => {
  const variants = [
    { ...newAid('numberline', { id: 'a', page: 0, cx: 300, cy: 200 }), marks: [2, -3.5, 99], jumps: [{ from: 0, to: 3 }, { from: 3, to: -2 }, { from: 50, to: 60 }] },
    { ...newAid('numberline', { id: 'b', page: 0, cx: 300, cy: 200 }), min: 0, max: 1, step: 0.01 },
    { ...newAid('numberline', { id: 'c', page: 0, cx: 300, cy: 200 }), min: 5, max: 1 }, // invalid range shows a hint instead of breaking
    ...[0, 30, 90, 180, 270, 359.5].map((angle) => ({ ...newAid('unitcircle', { id: 'u', page: 0, cx: 300, cy: 200 }), angle })),
    { ...newAid('unitcircle', { id: 'u2', page: 0, cx: 300, cy: 200 }), radians: true, showTriangle: false, showValues: false, w: 200, h: 200 },
    { ...newAid('fractions', { id: 'd', page: 0, cx: 300, cy: 200 }), bars: [{ parts: 24, shaded: 24 }, { parts: 1, shaded: 0 }, { parts: 5, shaded: 2 }, { parts: 7, shaded: 3 }] },
    { ...newAid('fractions', { id: 'e', page: 0, cx: 300, cy: 200 }), shape: 'pie', bars: [{ parts: 1, shaded: 1 }, { parts: 12, shaded: 5 }] },
    { ...newAid('fractions', { id: 'g', page: 0, cx: 300, cy: 200 }), bars: [], color: 'not a colour' },
  ];
  for (const aid of variants) {
    const { ctx, calls } = recordingContext();
    drawAid(ctx, aid);
    assert.ok(calls.length > 5, `${aid.kind} drew nothing`);
  }
});

/* ------------------------------ geometry tools ------------------------------ */

const shapeAt = (kind, x1, y1, x2, y2, extra = {}) => ({ id: `${kind}-${x1}-${y1}`, type: 'shape', kind, page: 0, x1, y1, x2, y2, color: '#2540D9', width: 3, ...extra });
const near = (a, b, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;

test('triangles, rectangles and lines report lengths in cm and angles that add up', () => {
  const triangle = measureShape(shapeAt('triangle', 0, 0, 240, 160)); // 6 cm wide, 4 cm tall, isosceles
  assert.deepEqual(triangle.sides.map((side) => formatCm(side.length)).sort(), ['5', '5', '6']);
  assert.ok(near(triangle.angles.reduce((sum, angle) => sum + angle.degrees, 0), 180, 1e-9));
  assert.deepEqual(triangle.angles.map((angle) => formatDegrees(angle.degrees)).sort(), ['53.1', '53.1', '73.7']);
  const rect = measureShape(shapeAt('rect', 0, 0, 160, 120));
  assert.deepEqual(rect.sides.map((side) => formatCm(side.length)), ['4', '3', '4', '3']);
  assert.ok(rect.angles.every((angle) => near(angle.degrees, 90, 1e-9)));
  assert.ok(near(rect.area, 160 * 120));
  const hexagon = measureShape(shapeAt('hexagon', 0, 0, 240, 200));
  assert.equal(hexagon.angles.length, 6);
  assert.ok(near(hexagon.angles.reduce((sum, angle) => sum + angle.degrees, 0), 720, 1e-6)); // (6 - 2) * 180
  const line = measureShape(shapeAt('line', 0, 0, 120, 160));
  assert.equal(formatCm(line.sides[0].length), '5');
  assert.equal(line.angles.length, 0);
  assert.ok(line.sides[0].normal[1] <= 0); // the label stays above the line
  assert.equal(measureShape(shapeAt('ellipse', 0, 0, 100, 100)), null); // no corners to measure
  assert.equal(measureShape(shapeAt('star', 0, 0, 100, 100)), null);
  assert.equal(measureShape({ type: 'stroke' }), null);
  assert.equal(measureShape(shapeAt('line', 5, 5, 5, 5)), null); // a dot has no length
});

test('side labels point away from the shape and angle labels point into it', () => {
  const rect = measurePolygon(shapeVertices(shapeAt('rect', 100, 100, 260, 220)));
  const centre = [180, 160];
  for (const side of rect.sides) {
    const outward = (side.mid[0] - centre[0]) * side.normal[0] + (side.mid[1] - centre[1]) * side.normal[1];
    assert.ok(outward > 0);
  }
  for (const angle of rect.angles) {
    const inward = (centre[0] - angle.vertex[0]) * angle.inward[0] + (centre[1] - angle.vertex[1]) * angle.inward[1];
    assert.ok(inward > 0);
  }
  // Same result whichever way the corners are drawn
  const flipped = measureShape(shapeAt('triangle', 240, 160, 0, 0));
  assert.deepEqual(flipped.sides.map((side) => formatCm(side.length)).sort(), ['5', '5', '6']);
  assert.equal(formatCm(UNIT * 2.56), '2.6');
  assert.equal(formatCm(UNIT * 3), '3');
  assert.equal(formatDegrees(60.04), '60');
});

test('instruments turn about their anchor and can be hit, measured and edged', () => {
  const ruler = { ...newInstrument('ruler', { id: 'r', page: 0, cx: 400, cy: 300 }), angle: 90 };
  assert.deepEqual(INSTRUMENTS.map((item) => item.id), ['ruler', 'protractor', 'square45', 'square3060']);
  const turned = toWorld(ruler, [100, 0]);
  assert.ok(near(turned[0], 400) && near(turned[1], 400)); // a quarter turn sends the long axis downward
  const back = toLocal(ruler, turned);
  assert.ok(near(back[0], 100) && near(back[1], 0));
  assert.equal(hitInstrument(ruler, [400, 500], 0), true); // along the turned ruler
  assert.equal(hitInstrument(ruler, [600, 300], 0), false); // where it used to be
  const bounds = instrumentBounds(ruler);
  assert.ok(near(bounds.w, 72) && near(bounds.h, ruler.w)); // 72 wide, as long as the ruler tall
  const [top, bottom] = instrumentEdges(ruler);
  assert.ok(near(Math.hypot(top[1][0] - top[0][0], top[1][1] - top[0][1]), ruler.w));
  assert.ok(near(Math.abs(top[0][0] - bottom[0][0]), 72)); // the two long edges are 72 apart
  assert.equal(normalizeDegrees(-14), 346);
});

test('set squares have the right angles and protractors only exist inside their half circle', () => {
  const corner = (points, i) => {
    const a = points[i], b = points[(i + 1) % 3], c = points[(i + 2) % 3];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - a[0], c[1] - a[1]];
    return (Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]) * 180) / Math.PI;
  };
  const forty5 = instrumentPolygon({ ...newInstrument('square45', { id: 's', page: 0, cx: 0, cy: 0 }), angle: 33 });
  assert.deepEqual([0, 1, 2].map((i) => Math.round(corner(forty5, i))), [90, 45, 45]);
  const sixty = instrumentPolygon({ ...newInstrument('square3060', { id: 't', page: 0, cx: 0, cy: 0 }), angle: 71 });
  assert.deepEqual([0, 1, 2].map((i) => Math.round(corner(sixty, i))), [90, 30, 60]);
  const square = newInstrument('square45', { id: 's', page: 0, cx: 300, cy: 300 });
  assert.equal(hitInstrument(square, [300 - 100, 300 + 100], 0), true); // near the right angle
  assert.equal(hitInstrument(square, [300 + 140, 300 - 140], 0), false); // beyond the slanted side
  const protractor = newInstrument('protractor', { id: 'p', page: 0, cx: 300, cy: 300 });
  const R = protractor.w / 2;
  assert.equal(hitInstrument(protractor, [protractor.x, protractor.y - R / 2], 0), true);
  assert.equal(hitInstrument(protractor, [protractor.x + R * 0.9, protractor.y - R * 0.9], 0), false); // outside the arc
  assert.equal(hitInstrument(protractor, [protractor.x, protractor.y + 10], 0), true); // the flat flange
  assert.equal(hitInstrument(protractor, [protractor.x, protractor.y + 60], 0), false);
});

test('rotate and size handles turn and stretch an instrument', () => {
  const ruler = newInstrument('ruler', { id: 'r', page: 0, cx: 500, cy: 400 });
  const handles = instrumentHandles(ruler);
  assert.ok(near(handles.rotate[0], 500) && handles.rotate[1] < 400 - 36); // above the ruler
  assert.ok(near(handles.size[0], 500 + ruler.w / 2) && near(handles.size[1], 400)); // at the right-hand end
  assert.equal(hitInstrumentHandle(ruler, [handles.rotate[0] + 3, handles.rotate[1]], 12), 'rotate');
  assert.equal(hitInstrumentHandle(ruler, [handles.size[0], handles.size[1] + 4], 12), 'size');
  assert.equal(hitInstrumentHandle(ruler, [500, 400], 12), null);
  assert.ok(near(rotationFromPoint(ruler, [500, 300]), 0)); // handle straight up: not turned
  assert.ok(near(rotationFromPoint(ruler, [600, 400]), 90)); // handle to the right: turned a quarter
  assert.ok(near(rotationFromPoint(ruler, [400, 400]), 270));
  assert.equal(snapRotation(88), 90); // clicks onto multiples of 15 when close
  assert.equal(snapRotation(82), 82);
  assert.equal(snapRotation(-1), 0);
  assert.equal(sizeFromPoint(ruler, [500 + 400, 400]), 800); // dragged out to the right
  assert.equal(sizeFromPoint(ruler, [500 + 5, 400]), 160); // never smaller than the minimum
  assert.equal(sizeFromPoint(ruler, [500 + 5000, 400]), 1600); // nor bigger than the maximum
  const square = newInstrument('square45', { id: 's', page: 0, cx: 500, cy: 400 });
  assert.equal(sizeFromPoint(square, [500 + 200, 400 + 200]), 400);
});

test('snapping prefers corners, then edges, then the grid, and a ruler is always a straight edge', () => {
  const triangle = shapeAt('triangle', 100, 100, 300, 260);
  const [apex] = shapeVertices(triangle);
  const base = { objects: [triangle], k: 1 };
  // Corner
  let result = snapPoint([apex[0] + 6, apex[1] - 5], { ...base, points: true });
  assert.deepEqual(result.point, apex);
  assert.equal(result.target.kind, 'vertex');
  // Midpoint of the base
  result = snapPoint([203, 262], { ...base, points: true });
  assert.equal(result.target.kind, 'midpoint');
  assert.deepEqual(result.point, [200, 260]);
  // Far from everything: stays where it is, or lands on the grid
  assert.deepEqual(snapPoint([700, 700], { ...base, points: true }).point, [700, 700]);
  assert.deepEqual(snapPoint([707, 693], { ...base, points: true, grid: { step: 40, ox: 0, oy: 0 } }).point, [720, 680]);
  assert.deepEqual(snapPoint([707, 693], { ...base, points: true, grid: { step: 40, ox: 20, oy: 10 } }).point, [700, 690]); // grid aligned to the plane origin
  // Edge: a point near the middle of a side slides onto it
  result = snapPoint([150, 195], { ...base, points: true, edges: true });
  assert.equal(result.target.kind, 'edge');
  // Snap off: shapes are ignored and nothing moves
  assert.deepEqual(snapPoint([apex[0] + 3, apex[1]], base), { point: [apex[0] + 3, apex[1]], target: null });
  // Radius shrinks as you zoom in, so snapping stays precise
  assert.equal(snapPoint([apex[0] + 9, apex[1]], { ...base, points: true, k: 4 }).target, null);
  assert.equal(snapPoint([apex[0] + 9, apex[1]], { ...base, points: true, k: 1 }).target.kind, 'vertex');
  // A shape never snaps to itself while it is being drawn
  assert.equal(snapPoint([apex[0] + 2, apex[1]], { ...base, points: true, exclude: triangle.id }).target, null);
  // Ruler edge works even with Snap off
  const ruler = newInstrument('ruler', { id: 'r', page: 0, cx: 400, cy: 400 });
  const edgeY = 400 - 36;
  result = snapPoint([420, edgeY + 7], { objects: [ruler], k: 1 });
  assert.equal(result.target.kind, 'edge');
  assert.ok(near(result.point[1], edgeY) && near(result.point[0], 420)); // slid onto the ruler's top edge
  assert.equal(snapPoint([420, edgeY + 30], { objects: [ruler], k: 1 }).target, null);
  // And along a turned ruler
  const turned = { ...ruler, angle: 30 };
  const [topEdge] = instrumentEdges(turned);
  const mid = [(topEdge[0][0] + topEdge[1][0]) / 2, (topEdge[0][1] + topEdge[1][1]) / 2];
  const result2 = snapPoint([mid[0] + 4, mid[1] + 4], { objects: [turned], k: 1 });
  assert.equal(result2.target.kind, 'edge');
});

test('each kind of paper offers the right snap grid', () => {
  assert.deepEqual(paperSnapGrid(undefined), { step: 40, ox: 0, oy: 0 }); // default dots
  assert.deepEqual(paperSnapGrid({ kind: 'grid', scale: 1 }), { step: 20, ox: 0, oy: 0 }); // the small squares
  assert.deepEqual(paperSnapGrid({ kind: 'grid', scale: 2 }), { step: 40, ox: 0, oy: 0 });
  assert.deepEqual(paperSnapGrid({ kind: 'plane', scale: 1 }), { step: 40, ox: PLANE_ORIGIN.x, oy: PLANE_ORIGIN.y });
  assert.equal(paperSnapGrid({ kind: 'blank' }), null);
  assert.equal(paperSnapGrid({ kind: 'lined' }), null);
  assert.equal(paperSnapGrid({ kind: 'isometric' }), null);
});

test('instruments move and resize like objects and keep their shape', () => {
  const protractor = newInstrument('protractor', { id: 'p', page: 0, cx: 500, cy: 400 });
  assert.deepEqual(movePatch(protractor, 20, -10), { x: protractor.x + 20, y: protractor.y - 10 });
  assert.deepEqual(getBounds(protractor), instrumentBounds(protractor));
  assert.equal(hitObject(protractor, [protractor.x, protractor.y - 50], 0), true);
  assert.equal(scalePatch(protractor, 2, 1, 0, 0).w, protractor.w * 2);
  assert.equal(scalePatch(protractor, 0.01, 0.01, 0, 0).w, 160); // limits apply
  assert.ok(isMovable(protractor));
});

test('instruments, measurements and snap markers all draw', () => {
  for (const { id } of INSTRUMENTS) {
    const { ctx, calls } = recordingContext();
    drawInstrument(ctx, { ...newInstrument(id, { id, page: 0, cx: 300, cy: 300 }), angle: 40 });
    assert.ok(calls.length > 20, id);
    const selection = recordingContext();
    drawInstrumentSelection(selection.ctx, newInstrument(id, { id, page: 0, cx: 300, cy: 300 }), 1);
    assert.ok(selection.calls.length > 5);
  }
  for (const kind of ['rect', 'triangle', 'diamond', 'hexagon', 'line', 'arrow']) {
    const { ctx, calls } = recordingContext();
    drawMeasure(ctx, shapeAt(kind, 0, 0, 200, 140, { measure: true }), 1);
    assert.ok(calls.some(([name]) => name === 'fillText'), kind);
  }
  const quiet = recordingContext();
  drawMeasure(quiet.ctx, shapeAt('ellipse', 0, 0, 200, 140, { measure: true }), 1);
  assert.equal(quiet.calls.filter(([name]) => name === 'fillText').length, 0);
  for (const kind of ['vertex', 'midpoint', 'edge', 'grid']) {
    const { ctx, calls } = recordingContext();
    drawSnapMark(ctx, { kind, at: [10, 10] }, 1);
    assert.ok(calls.some(([name]) => name === 'stroke'), kind);
  }
  const { ctx, calls } = recordingContext();
  drawSnapMark(ctx, null, 1);
  assert.equal(calls.length, 0);
});

/* ------------------------------ statistics tools ------------------------------ */

test('pasted data becomes columns, from a row, a list or a spreadsheet', () => {
  assert.deepEqual(parseDataset('3 5 7 9, 11').columns, [{ name: 'Values', values: [3, 5, 7, 9, 11] }]); // one line read across
  assert.deepEqual(parseDataset('3\n5\n7').columns[0].values, [3, 5, 7]); // one number per line
  const sheet = parseDataset('Hours\tScore\n1\t48\n2\t55\n3\t61');
  assert.equal(sheet.hasHeader, true);
  assert.deepEqual(sheet.columns, [{ name: 'Hours', values: [1, 2, 3] }, { name: 'Score', values: [48, 55, 61] }]);
  const plain = parseDataset('1, 2\n2, 4.5\n3, 5.9');
  assert.equal(plain.hasHeader, false);
  assert.deepEqual(plain.columns.map((column) => column.name), ['x', 'y']);
  assert.deepEqual(parseDataset('A,B,C\n1,2,3\n4,5,6').columns.map((column) => column.name), ['A', 'B', 'C']);
  assert.deepEqual(parseDataset('−4 \n2.5\n1e2\n50%').columns[0].values, [-4, 2.5, 100, 50]); // real minus sign, exponent, percent
  const messy = parseDataset('score\n10\nabsent\n20\n\n30');
  assert.deepEqual(messy.columns[0].values, [10, null, 20, 30]); // the word is left out but the row keeps its place
  assert.match(messy.notes.join(' '), /1 cell was not a number and left out/);
  assert.match(parseDataset('a\n1\nx\ny').notes.join(' '), /2 cells were not numbers and left out/);
  const groups = parseDataset('A\tB\n1\t10\n2\t20\n3\t');
  assert.deepEqual(groups.columns.map((column) => column.values), [[1, 2, 3], [10, 20]]); // groups may differ in size
  assert.equal(parseDataset('').ok, false);
  assert.equal(parseDataset('hello world').ok, false);
  assert.equal(parseDataset(Array.from({ length: 400 }, (_, i) => i).join('\n')).columns[0].values.length, 300); // capped
  assert.equal(parseDataset('1 2 3 4 5 6\n1 2 3 4 5 6').columns.length, 4);
});

test('data written back to text reads back the same', () => {
  for (const example of EXAMPLES) {
    const again = parseDataset(datasetToText(example.columns));
    assert.deepEqual(again.columns, example.columns, example.id);
  }
  assert.equal(datasetToText([{ name: 'Values', values: [1, 2, 3] }]), '1\n2\n3'); // a single list needs no header
  assert.equal(datasetToText([]), '');
});

test('summary statistics match hand calculations', () => {
  // The classic set: 2, 4, 4, 4, 5, 5, 7, 9
  const s = summarize([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(s.n, 8);
  assert.equal(s.mean, 5);
  assert.equal(s.median, 4.5);
  assert.deepEqual(s.mode, [4]);
  assert.equal(s.sdPopulation, 2);
  assert.ok(Math.abs(s.sdSample - 2.13809) < 1e-5);
  assert.equal(s.sd, s.sdSample); // sample by default
  assert.equal(summarize([2, 4, 4, 4, 5, 5, 7, 9], { sd: 'population' }).sd, 2);
  assert.equal(s.q1, 4);
  assert.equal(s.q3, 6);
  assert.equal(s.iqr, 2);
  assert.deepEqual([s.min, s.max, s.range], [2, 9, 7]);
  // Odd count: the middle value is left out of both halves
  const odd = summarize([1, 3, 5, 7, 9, 11, 13]);
  assert.deepEqual([odd.median, odd.q1, odd.q3], [7, 3, 11]);
  // Outliers and whiskers use the 1.5 x IQR rule
  const outlying = summarize([10, 12, 12, 13, 14, 14, 15, 16, 40]);
  assert.deepEqual(outlying.outliers, [40]);
  assert.equal(outlying.whiskerHigh, 16);
  assert.equal(summarize([5, 6, 7, 8, 9]).outliers.length, 0);
  // Several modes, no mode, and tiny data
  assert.deepEqual(summarize([1, 1, 2, 2, 3]).mode, [1, 2]);
  assert.deepEqual(summarize([1, 2, 3]).mode, []);
  assert.equal(summarize([7]).n, 1);
  assert.ok(Number.isNaN(summarize([7]).sdSample));
  assert.equal(summarize([7]).sdPopulation, 0);
  assert.deepEqual(summarize([]), { n: 0 });
  assert.equal(summarize([1, null, 3, NaN]).n, 2); // blanks are ignored
});

test('histogram classes include their lower boundary and cover every value once', () => {
  const scores = EXAMPLES[0].columns[0].values;
  const { bins, width, auto } = histogramBins(scores);
  assert.equal(auto, true);
  assert.equal(width, 10);
  assert.deepEqual(bins.map((bin) => [bin.from, bin.to, bin.count]), [[40, 50, 1], [50, 60, 3], [60, 70, 9], [70, 80, 10], [80, 90, 5], [90, 100, 2]]);
  assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), scores.length);
  // 70 belongs to the 70-80 class, and a value on the very top boundary starts a new class
  assert.equal(histogramBins([60, 70, 80]).bins.find((bin) => bin.from === 70).count, 1);
  const edge = histogramBins([50, 60, 70]);
  assert.equal(edge.bins.reduce((sum, bin) => sum + bin.count, 0), 3);
  assert.equal(edge.bins.at(-1).count, 1); // the top value has a class of its own to belong to
  assert.ok(edge.bins.at(-1).from <= 70 && edge.bins.at(-1).to > 70);
  // A width chosen by the teacher is used exactly
  const custom = histogramBins(scores, 5);
  assert.equal(custom.auto, false);
  assert.equal(custom.width, 5);
  assert.equal(custom.bins[0].from, 45);
  assert.equal(custom.bins.reduce((sum, bin) => sum + bin.count, 0), scores.length);
  // Silly widths cannot make thousands of classes
  assert.ok(histogramBins(scores, 0.0001).bins.length <= 60);
  assert.equal(histogramBins([]).bins.length, 0);
  assert.equal(histogramBins([5, 5, 5]).bins.reduce((sum, bin) => sum + bin.count, 0), 3); // all the same value
  assert.equal(niceNumber(1.8), 2);
  assert.equal(niceNumber(2.2), 2.5);
  assert.equal(niceNumber(7), 10);
});

test('regression finds the line of best fit, r and R squared', () => {
  const perfect = linearRegression([[1, 3], [2, 5], [3, 7], [4, 9]]);
  assert.ok(near(perfect.slope, 2) && near(perfect.intercept, 1) && near(perfect.r, 1) && near(perfect.r2, 1));
  const falling = linearRegression([[1, 10], [2, 8], [3, 6]]);
  assert.ok(near(falling.slope, -2) && near(falling.r, -1));
  // A worked example: slope 2.04, intercept -0.05, r squared 0.99799
  const fit = linearRegression([[1, 2], [2, 4.1], [3, 5.9], [4, 8.2]]);
  assert.ok(near(fit.slope, 2.04, 1e-9) && near(fit.intercept, -0.05, 1e-9) && near(fit.r2, 0.9979856, 1e-6));
  assert.equal(linearRegression([[1, 1]]), null); // one point has no line
  assert.equal(linearRegression([[2, 1], [2, 5], [2, 9]]), null); // all x the same
  assert.equal(linearRegression([[1, 4], [2, 4], [3, 4]]).r, 0); // flat data: no correlation
  assert.equal(regressionEquation(fit), 'y = 2.04x − 0.05');
  assert.equal(regressionEquation({ slope: 1, intercept: 3 }), 'y = x + 3');
  assert.equal(regressionEquation({ slope: -1, intercept: 0 }), 'y = −x');
  assert.equal(regressionEquation({ slope: 0.5, intercept: 12.34567 }, { x: 'h', y: 's' }), 's = 0.5h + 12.35');
  assert.equal(describeCorrelation(0.95), 'strong positive');
  assert.equal(describeCorrelation(-0.6), 'moderate negative');
  assert.equal(describeCorrelation(0.3), 'weak positive');
  assert.equal(describeCorrelation(0.05), 'very weak or none');
  assert.deepEqual(pairsOf([{ name: 'x', values: [1, 2, null, 4] }, { name: 'y', values: [5, null, 7, 8] }]), [[1, 5], [4, 8]]); // rows with a gap are skipped
  assert.deepEqual(pairsOf([{ name: 'x', values: [1] }]), []);
});

test('numbers are shown tidily and axes get friendly ticks', () => {
  assert.deepEqual([3.14159265, 70, 0.5, -4.25, 1234.5678, 0].map(formatStat), ['3.142', '70', '0.5', '−4.25', '1235', '0']);
  assert.equal(formatStat(NaN), '—');
  assert.equal(formatStat(0.00001234), '1.234e−5');
  assert.deepEqual(niceScale(0, 17).ticks, [0, 5, 10, 15, 20]);
  assert.deepEqual(niceScale(43, 97, 6).ticks, [40, 60, 80, 100]);
  assert.deepEqual(niceScale(-3, 3, 7).ticks, [-3, -2, -1, 0, 1, 2, 3]);
  const same = niceScale(5, 5);
  assert.ok(same.min < 5 && same.max > 5); // a single value still gets a range
  assert.ok(niceScale(0.001, 0.009).ticks.every((tick) => Number.isFinite(tick)));
  assert.ok(niceScale(NaN, 3).ticks.length > 1);
});

test('the statistics table lists the right numbers for each chart', () => {
  const hist = statsTable(newStats('histogram', { id: 'h', page: 0, cx: 0, cy: 0 }));
  assert.deepEqual(hist.headers, []);
  const labels = hist.rows.map((row) => row[0]);
  assert.deepEqual(labels.slice(0, 4), ['n', 'Mean', 'Median', 'SD']);
  assert.equal(hist.rows[0][1], '30');
  assert.equal(hist.rows[1][1], '71.23');
  const box = statsTable(newStats('box', { id: 'b', page: 0, cx: 0, cy: 0 }));
  assert.deepEqual(box.headers, ['Class A', 'Class B']);
  assert.ok(box.rows.every((row) => row.length === 3));
  assert.equal(box.rows.find((row) => row[0] === 'Median')[1], '70.5');
  const population = statsTable({ ...newStats('histogram', { id: 'p', page: 0, cx: 0, cy: 0 }), sd: 'population' });
  assert.ok(population.rows.some((row) => row[0] === 'SD (pop.)'));
  const scatter = statsTable(newStats('scatter', { id: 's', page: 0, cx: 0, cy: 0 }));
  assert.deepEqual(scatter.rows.map((row) => row[0]).slice(0, 5), ['n', 'r', 'R²', 'Slope', 'Intercept']);
  assert.equal(statsTable({ chart: 'histogram', columns: [{ name: 'x', values: [] }] }).rows[1][1], '—'); // no data: dashes, no crash
  assert.equal(statsTable({ chart: 'histogram', columns: [{ name: 'x', values: [1, 2, 3] }] }).rows.find((row) => row[0] === 'Mode')[1], 'none');
});

test('new charts start with working examples and report what is missing', () => {
  assert.deepEqual(CHARTS.map((chart) => chart.id), ['histogram', 'box', 'scatter']);
  for (const { id } of CHARTS) {
    const chart = newStats(id, { id, page: 2, cx: 500, cy: 300 });
    assert.equal(chart.type, 'stats');
    assert.equal(chart.page, 2);
    assert.ok(near(chart.x + chart.w / 2, 500, 0.01) && near(chart.y + chart.h / 2, 300, 0.01));
    assert.equal(chartProblem(chart), '');
    assert.deepEqual(getBounds(chart), { x: chart.x, y: chart.y, w: chart.w, h: chart.h });
    assert.equal(hitObject(chart, [chart.x + 10, chart.y + 10], 0), true);
    assert.deepEqual(movePatch(chart, 5, 5), { x: chart.x + 5, y: chart.y + 5 });
    assert.equal(scalePatch(chart, 0.01, 0.01, 0, 0).w, 320);
  }
  const copy = newStats('histogram', { id: 'a', page: 0, cx: 0, cy: 0 });
  copy.columns[0].values.push(1);
  assert.notEqual(newStats('histogram', { id: 'b', page: 0, cx: 0, cy: 0 }).columns[0].values.length, copy.columns[0].values.length); // examples are copied, never shared
  const scatter = newStats('scatter', { id: 's', page: 0, cx: 0, cy: 0 });
  assert.match(chartProblem({ ...scatter, columns: [scatter.columns[0]] }), /two columns/);
  assert.match(chartProblem({ ...scatter, columns: [{ name: 'x', values: [1, null] }, { name: 'y', values: [null, 2] }] }), /at least two rows/);
  assert.match(chartProblem({ chart: 'histogram', columns: [{ name: 'x', values: [] }] }), /Add some numbers/);
  assert.match(chartProblem({ chart: 'box', columns: [{ name: 'x', values: [null] }] }), /Add some numbers/);
  assert.equal(numbersOf({ values: [1, null, 2, NaN, 'x'] }).length, 2);
});

test('every chart draws, including empty, tiny and awkward data', () => {
  const base = newStats('histogram', { id: 'h', page: 0, cx: 0, cy: 0 });
  const variants = [
    base,
    { ...base, title: 'Class 4B', showMedian: true, showMean: true, binWidth: 5 },
    { ...base, w: 400, h: 300 }, // too narrow for the table
    { ...base, showStats: false, showCounts: false },
    { ...base, columns: [{ name: 'One', values: [5] }] },
    { ...base, columns: [{ name: 'Same', values: [4, 4, 4, 4] }] },
    { ...base, columns: [{ name: 'Negative', values: [-5, -2.5, 0, 3.25] }] },
    { ...base, columns: [{ name: 'x', values: [] }] },
    newStats('box', { id: 'b', page: 0, cx: 0, cy: 0 }),
    { ...newStats('box', { id: 'b2', page: 0, cx: 0, cy: 0 }), columns: [{ name: 'One', values: [1, 2, 3, 4, 100] }], showMean: false },
    { ...newStats('box', { id: 'b3', page: 0, cx: 0, cy: 0 }), columns: Array.from({ length: 4 }, (_, i) => ({ name: `G${i}`, values: [i, i + 1, i + 5, i + 9] })) },
    newStats('scatter', { id: 's', page: 0, cx: 0, cy: 0 }),
    { ...newStats('scatter', { id: 's2', page: 0, cx: 0, cy: 0 }), showLine: false },
    { ...newStats('scatter', { id: 's3', page: 0, cx: 0, cy: 0 }), columns: [{ name: 'x', values: [1, 1, 1] }, { name: 'y', values: [2, 3, 4] }] }, // vertical: no line
    { ...newStats('scatter', { id: 's4', page: 0, cx: 0, cy: 0 }), columns: [{ name: 'x' }] },
    { ...base, color: 'not a colour' },
  ];
  for (const chart of variants) {
    const { ctx, calls } = recordingContext();
    drawStats(ctx, chart);
    assert.ok(calls.length > 3, `${chart.chart} drew nothing`);
  }
  const labelled = recordingContext();
  drawStats(labelled.ctx, base);
  const text = labelled.calls.filter(([name]) => name === 'fillText').map((call) => call[1]);
  assert.ok(['Mean', '71.23', 'Median', '70.5', 'Frequency', 'Score'].every((word) => text.includes(word)));
});

/* ------------------------------ class activities ------------------------------ */

const draftOf = (patch) => ({ ...emptyDraft('choice'), prompt: 'What is 2 + 2?', ...patch });

test('a multiple choice question is checked before it is sent and blank choices are dropped', () => {
  const ok = draftToSpec(draftOf({ options: ['3', '4', '5', ''], correct: 1 }));
  assert.deepEqual(ok, { ok: true, spec: { kind: 'choice', prompt: 'What is 2 + 2?', options: ['3', '4', '5'], correct: 1 } });
  // A blank choice in the middle shifts the marked answer along with the choices that follow it
  const shifted = draftToSpec(draftOf({ options: ['3', '', '4', '5'], correct: 2 }));
  assert.deepEqual(shifted.spec.options, ['3', '4', '5']);
  assert.equal(shifted.spec.correct, 1);
  assert.equal(draftToSpec(draftOf({ options: ['3', '4', '', ''] })).spec.correct, undefined); // a poll with no right answer
  assert.match(draftToSpec(draftOf({ prompt: '   ' })).error, /Write the question/);
  assert.match(draftToSpec(draftOf({ options: ['only', '', '', ''] })).error, /at least two choices/);
  assert.match(draftToSpec(draftOf({ options: ['a', 'b', '', ''], correct: 3 })).error, /marked as correct is empty/);
  assert.equal(draftToSpec(draftOf({ prompt: '  lots   of   space  ', options: ['a', 'b', '', ''] })).spec.prompt, 'lots of space');
  assert.equal(CHOICE_TEMPLATES.every((template) => template.options.length >= ACTIVITY_LIMITS.minOptions && template.options.length <= ACTIVITY_LIMITS.maxOptions), true);
});

test('number and drawing questions build the right request', () => {
  assert.deepEqual(draftToSpec({ ...emptyDraft('number'), prompt: 'Add them', answer: '7/8', tolerance: '0.01' }).spec, { kind: 'number', prompt: 'Add them', answer: 0.875, tolerance: 0.01 });
  assert.deepEqual(draftToSpec({ ...emptyDraft('number'), prompt: 'Estimate' }).spec, { kind: 'number', prompt: 'Estimate' }); // no answer: just collect numbers
  assert.match(draftToSpec({ ...emptyDraft('number'), prompt: 'q', answer: 'abc' }).error, /must be a number/);
  assert.match(draftToSpec({ ...emptyDraft('number'), prompt: 'q', answer: '5', tolerance: '-1' }).error, /0 or more/);
  assert.deepEqual(draftToSpec({ ...emptyDraft('work'), prompt: 'Show your steps' }).spec, { kind: 'work', prompt: 'Show your steps' });
  for (const [typed, expected] of [['12', 12], [' -3.5 ', -3.5], ['3,5', 3.5], ['3/4', 0.75], ['−4', -4]]) assert.equal(parseAnswerNumber(typed), expected, typed);
  for (const bad of ['', 'abc', '1/0', '12 apples', null]) assert.equal(parseAnswerNumber(bad), null, String(bad));
});

test('the host sees counts, summaries and board-ready results from the answers', () => {
  const answer = (key, value, correct = null) => ({ key, name: key, value, correct, at: key.length + value });
  const choice = { kind: 'choice', prompt: 'x'.repeat(100), options: ['3', '4', '5'], correct: 1, responses: [answer('a', 1, true), answer('b', 1, true), answer('c', 0, false)] };
  assert.deepEqual(choiceCounts(choice), [1, 2, 0]);
  const board = pollResultsForBoard(choice);
  assert.deepEqual(board.bars, [{ label: '3', count: 1 }, { label: '4', count: 2 }, { label: '5', count: 0 }]);
  assert.equal(board.correct, 1);
  assert.ok(board.title.length <= 80 && board.title.endsWith('…')); // long questions are shortened for the chart
  assert.equal('correct' in pollResultsForBoard({ ...choice, correct: undefined }), false);
  const numbers = { kind: 'number', answer: 5, responses: [answer('a', 9, false), answer('b', 5, true), answer('c', 3, false), answer('d', 5, true)] };
  assert.deepEqual(numberSummary(numbers), { total: 4, values: [3, 5, 5, 9], mean: 5.5, median: 5, correct: 2 });
  assert.deepEqual(numberSummary({ responses: [] }), { total: 0, values: [], mean: null, median: null, correct: 0 });
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(0, 0), 0);
  assert.equal(progressLabel(12, 18), '12 of 18 answered');
  assert.equal(progressLabel(20, 18), '18 of 18 answered'); // never more than the class
  assert.equal(progressLabel(3, 0), '3 answered');
  assert.deepEqual([showValue(3.14159265), showValue(-4), showValue(0.75), showValue(NaN)], ['3.14159', '−4', '0.75', '—']);
});

test('a changed answer replaces the old one instead of counting twice', () => {
  const first = [{ key: 'a', value: 1, at: 1 }, { key: 'b', value: 2, at: 2 }];
  const next = upsertResponse(first, { key: 'a', value: 0, at: 3 });
  assert.equal(next.length, 2);
  assert.equal(next.find((r) => r.key === 'a').value, 0);
  assert.deepEqual(next.map((r) => r.key), ['b', 'a']); // newest last
  assert.equal(upsertResponse([], { key: 'z', value: 1, at: 1 }).length, 1);
  assert.equal(first.length, 2); // the original list is untouched
});

test('drawings are sent as the smallest picture that fits', () => {
  const calls = [];
  const sizes = new Map([['1/0.8', 400000], ['1/0.65', 350000], ['1/0.5', 300000], ['1/0.35', 250000]]);
  const url = fitImage((scale, quality) => { calls.push([scale, quality]); return 'x'.repeat(sizes.get(`${scale}/${quality}`) ?? 100); });
  assert.equal(url.length, 250000); // quality was lowered step by step until it fitted
  assert.deepEqual(calls.at(-1), [1, 0.35]);
  assert.equal(fitImage(() => 'tiny'), 'tiny'); // a small drawing is sent at full quality straight away
  const shrunk = fitImage((scale) => 'x'.repeat(scale === 1 ? 999999 : 1000)); // too big until the picture itself is smaller
  assert.equal(shrunk.length, 1000);
  assert.equal(fitImage(() => 'x'.repeat(MAX_IMAGE_CHARS + 1)), null); // cannot be made small enough
  assert.ok(MAX_IMAGE_CHARS < 300000); // always under the server's limit
});

test('a cover hides things from students but never from the host', () => {
  const closed = newCover({ id: 'c', page: 0, cx: 500, cy: 300 });
  assert.equal(closed.open, false);
  assert.equal(closed.color, COVER_DEFAULT_COLOR);
  assert.ok(near(closed.x + closed.w / 2, 500, 0.01) && near(closed.y + closed.h / 2, 300, 0.01));
  assert.deepEqual(togglePatch(closed), { open: true });
  assert.deepEqual(togglePatch({ ...closed, open: true }), { open: false });
  const text = (o, viewer) => {
    const { ctx, calls } = recordingContext();
    drawCover(ctx, o, viewer, 1);
    return { calls, words: calls.filter(([name]) => name === 'fillText').map((call) => call[1]) };
  };
  const studentClosed = text(closed, 'listener');
  assert.ok(studentClosed.calls.some(([name]) => name === 'fill'), 'a closed cover is a solid panel for students');
  assert.ok(studentClosed.words.includes('?'));
  assert.equal(text({ ...closed, open: true }, 'listener').calls.filter(([name]) => ['fill', 'stroke', 'fillText'].includes(name)).length, 0); // revealed: nothing left to see
  assert.ok(text({ ...closed, label: 'Answer' }, 'listener').words.includes('Answer'));
  assert.ok(text(closed, 'host').words.includes('Hidden from students'));
  assert.ok(text({ ...closed, open: true }, 'host').words.includes('Revealed to students'));
  const hostFill = text(closed, 'host').calls.find(([name]) => name === 'fill');
  assert.ok(hostFill); // translucent tint, so the host can still work under it
  drawCover(recordingContext().ctx, { ...closed, color: 'not a colour' }, 'listener', 1); // a bad colour cannot break drawing
});

test('covers move, resize and are hit like other objects', () => {
  const cover = newCover({ id: 'c', page: 0, cx: 300, cy: 200 });
  assert.deepEqual(getBounds(cover), { x: cover.x, y: cover.y, w: cover.w, h: cover.h });
  assert.equal(hitObject(cover, [cover.x + 5, cover.y + 5], 0), true);
  assert.equal(hitObject(cover, [cover.x - 40, cover.y], 0), false);
  assert.deepEqual(movePatch(cover, 10, 20), { x: cover.x + 10, y: cover.y + 20 });
  assert.equal(scalePatch(cover, 2, 1, 0, 0).w, cover.w * 2);
  assert.equal(scalePatch(cover, 0.01, 0.01, 0, 0).w, 60);
  assert.equal(scalePatch(cover, 0.01, 0.01, 0, 0).h, 40);
  assert.ok(isMovable(cover));
});

test('poll results draw as lettered bars with the right answer marked', () => {
  const results = { id: 'p', type: 'aid', kind: 'pollbars', page: 0, x: 0, y: 0, w: 600, h: 300, color: '#2540D9', title: 'What is 2 + 2?', bars: [{ label: '3', count: 2 }, { label: '4', count: 14 }, { label: '5', count: 1 }], correct: 1 };
  const { ctx, calls } = recordingContext();
  drawAid(ctx, results);
  const words = calls.filter(([name]) => name === 'fillText').map((call) => call[1]);
  assert.ok(['What is 2 + 2?', 'A', 'B', 'C', '2', '14', '1', '17 answers'].every((word) => words.includes(word)), words.join('|'));
  assert.equal(words.includes('✓'), false); // the tick is a drawn shape, so it shows on every device
  assert.ok(calls.filter(([name]) => name === 'lineTo').length >= 2);
  assert.ok(words.includes('82%')); // 14 of 17
  for (const odd of [{ ...results, bars: [{ label: 'a', count: 0 }] }, { ...results, title: undefined, correct: undefined }, { ...results, bars: [] }]) {
    drawAid(recordingContext().ctx, odd); // no answers yet, no title, no bars: still draws
  }
  assert.equal(hitObject(results, [10, 10], 0), true);
});
