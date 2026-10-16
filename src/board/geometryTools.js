// Geometry tools: movable, rotatable instruments (ruler, protractor, set squares), snapping, and the
// measurements shown on shapes. Everything here is pure maths so it can be tested without a browser;
// the drawing lives in instrumentRender.js.
import { shapeOutline } from "./shapeOutline.js";

/** World units per centimetre: one square of "Medium" paper. */
export const UNIT = 40;
export const INCH = 2.54 * UNIT;

export const INSTRUMENTS = [
  { id: "ruler", label: "Ruler", hint: "Centimetres and inches" },
  { id: "protractor", label: "Protractor", hint: "Read and draw angles" },
  { id: "square45", label: "Set square 45°", hint: "Right angles and 45° lines" },
  { id: "square3060", label: "Set square 30°–60°", hint: "30°, 60° and 90° lines" },
];

export const INSTRUMENT_SIZES = {
  ruler: { min: 160, max: 1600, initial: 520 },
  protractor: { min: 160, max: 1200, initial: 420 },
  square45: { min: 120, max: 1000, initial: 320 },
  square3060: { min: 160, max: 1200, initial: 400 },
};
export const RULER_HEIGHT = 72;
export const PROTRACTOR_FLANGE = 22;

const SQRT3 = Math.sqrt(3);
const rad = (degrees) => (degrees * Math.PI) / 180;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const normalizeDegrees = (degrees) => ((degrees % 360) + 360) % 360;

/** A new instrument; (cx, cy) is where its middle should appear on screen. */
export function newInstrument(kind, { id, page, cx, cy }) {
  const w = (INSTRUMENT_SIZES[kind] || INSTRUMENT_SIZES.ruler).initial;
  const base = { id, type: "instrument", kind, page, w, angle: 0 };
  // The protractor turns about the middle of its base line, so that is where it is anchored
  if (kind === "protractor") return { ...base, x: cx, y: cy + (w / 2 - PROTRACTOR_FLANGE) / 2 };
  return { ...base, x: cx, y: cy };
}

/* ------------------------------ shapes in the instrument's own space ------------------------------ */

/** Size of the instrument's box in its own space. */
export function instrumentSize(o) {
  if (o.kind === "protractor") return { w: o.w, h: o.w / 2 + PROTRACTOR_FLANGE };
  if (o.kind === "square45") return { w: o.w, h: o.w };
  if (o.kind === "square3060") return { w: o.w, h: o.w / SQRT3 };
  return { w: o.w, h: RULER_HEIGHT };
}

/** Outline points relative to the anchor (before rotation). */
export function localOutline(o) {
  const L = o.w;
  if (o.kind === "protractor") {
    const R = L / 2;
    return [[-R, -R], [R, -R], [R, PROTRACTOR_FLANGE], [-R, PROTRACTOR_FLANGE]];
  }
  if (o.kind === "square45") return [[-L / 2, L / 2], [L / 2, L / 2], [-L / 2, -L / 2]];
  if (o.kind === "square3060") {
    const s = L / SQRT3;
    return [[-L / 2, s / 2], [L / 2, s / 2], [-L / 2, -s / 2]];
  }
  return [[-L / 2, -RULER_HEIGHT / 2], [L / 2, -RULER_HEIGHT / 2], [L / 2, RULER_HEIGHT / 2], [-L / 2, RULER_HEIGHT / 2]];
}

export function toWorld(o, [lx, ly]) {
  const a = rad(o.angle || 0);
  return [o.x + lx * Math.cos(a) - ly * Math.sin(a), o.y + lx * Math.sin(a) + ly * Math.cos(a)];
}
export function toLocal(o, [wx, wy]) {
  const a = rad(o.angle || 0);
  const dx = wx - o.x;
  const dy = wy - o.y;
  return [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)];
}

export const instrumentPolygon = (o) => localOutline(o).map((point) => toWorld(o, point));

export function instrumentBounds(o) {
  const points = instrumentPolygon(o);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** True when p (world coordinates) is on the instrument. */
export function hitInstrument(o, p, tolerance = 0) {
  const [x, y] = toLocal(o, p);
  const t = tolerance;
  if (o.kind === "protractor") {
    const R = o.w / 2;
    if (Math.abs(x) > R + t || y < -R - t || y > PROTRACTOR_FLANGE + t) return false;
    return y >= -t || Math.hypot(x, y) <= R + t;
  }
  if (o.kind === "square45" || o.kind === "square3060") {
    const [a, b, c] = localOutline(o);
    // Inside the right triangle a-b-c, whose right angle is at a
    const along = (x - a[0]) / (b[0] - a[0]); // 0 at the right-angle corner, 1 at the far end of the base
    const up = (a[1] - y) / (a[1] - c[1]); // 0 at the base, 1 at the top of the upright side
    const slack = t / Math.min(Math.abs(b[0] - a[0]), Math.abs(a[1] - c[1]));
    return along >= -slack && up >= -slack && along + up <= 1 + slack * 2;
  }
  const hh = RULER_HEIGHT / 2;
  return Math.abs(x) <= o.w / 2 + t && Math.abs(y) <= hh + t;
}

/* ------------------------------ handles ------------------------------ */

/** Where the rotate and size handles are drawn (world coordinates). */
export function instrumentHandles(o) {
  if (o.kind === "protractor") {
    const R = o.w / 2;
    return { rotate: toWorld(o, [0, -R - 30]), size: toWorld(o, [R, PROTRACTOR_FLANGE]) };
  }
  if (o.kind === "square45") return { rotate: toWorld(o, [0, -o.w / 2 - 30]), size: toWorld(o, [o.w / 2, o.w / 2]) };
  if (o.kind === "square3060") return { rotate: toWorld(o, [0, -o.w / SQRT3 / 2 - 30]), size: toWorld(o, [o.w / 2, o.w / SQRT3 / 2]) };
  return { rotate: toWorld(o, [0, -RULER_HEIGHT / 2 - 30]), size: toWorld(o, [o.w / 2, 0]) };
}

export function hitInstrumentHandle(o, p, tolerance) {
  const handles = instrumentHandles(o);
  if (Math.hypot(p[0] - handles.rotate[0], p[1] - handles.rotate[1]) <= tolerance) return "rotate";
  if (Math.hypot(p[0] - handles.size[0], p[1] - handles.size[1]) <= tolerance) return "size";
  return null;
}

/** Turn so the rotate handle points at p. */
export function rotationFromPoint(o, p) {
  return normalizeDegrees((Math.atan2(p[1] - o.y, p[0] - o.x) * 180) / Math.PI + 90);
}

/** Pull a rotation onto a multiple of 15° when it is within 3°. */
export function snapRotation(degrees, step = 15, tolerance = 3) {
  const nearest = Math.round(degrees / step) * step;
  return Math.abs(degrees - nearest) <= tolerance ? normalizeDegrees(nearest) : normalizeDegrees(degrees);
}

/** The new size when the size handle is dragged to p. */
export function sizeFromPoint(o, p) {
  const [x, y] = toLocal(o, p);
  const limits = INSTRUMENT_SIZES[o.kind] || INSTRUMENT_SIZES.ruler;
  let w;
  if (o.kind === "protractor") w = 2 * Math.abs(x);
  else if (o.kind === "square45") w = Math.abs(x) + Math.abs(y); // the corner sits at (L/2, L/2)
  else w = 2 * Math.abs(x);
  return clamp(Math.round(w), limits.min, limits.max);
}

/* ------------------------------ edges and snap points ------------------------------ */

/** The straight edges you can draw along, as [[x1,y1],[x2,y2]] in world coordinates. */
export function instrumentEdges(o) {
  const world = (a, b) => [toWorld(o, a), toWorld(o, b)];
  if (o.kind === "protractor") {
    const R = o.w / 2;
    return [world([-R, PROTRACTOR_FLANGE], [R, PROTRACTOR_FLANGE]), world([-R, 0], [R, 0])];
  }
  if (o.kind === "square45" || o.kind === "square3060") {
    const [a, b, c] = localOutline(o);
    return [world(a, b), world(a, c), world(b, c)];
  }
  const hw = o.w / 2;
  const hh = RULER_HEIGHT / 2;
  return [world([-hw, -hh], [hw, -hh]), world([-hw, hh], [hw, hh])];
}

/** Corners and the anchor, for snapping a point onto them. */
export function instrumentSnapPoints(o) {
  const spots = o.kind === "protractor" ? [[0, 0]] : localOutline(o);
  return spots.map((point) => toWorld(o, point));
}

/* ------------------------------ snapping ------------------------------ */

function nearestOnSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2, 0, 1);
  const at = [a[0] + t * dx, a[1] + t * dy];
  return { at, distance: Math.hypot(p[0] - at[0], p[1] - at[1]) };
}

/** The corner points of a shape (lines have their two ends). Ellipses and stars are left out. */
export function shapeVertices(o) {
  if (o.type !== "shape") return [];
  if (o.kind === "line" || o.kind === "arrow") return [[o.x1, o.y1], [o.x2, o.y2]];
  if (!["rect", "diamond", "triangle", "hexagon"].includes(o.kind)) return [];
  const x = Math.min(o.x1, o.x2);
  const y = Math.min(o.y1, o.y2);
  return shapeOutline(o.kind, x, y, Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1));
}

/**
 * Snap a point while drawing.
 *  - points: snap onto corners, line ends and edge midpoints of shapes and instruments
 *  - edges: also onto the straight edges of shapes (instrument edges always count, so a ruler works as a straightedge)
 *  - grid: { step, ox, oy } to round onto the paper grid
 * Returns { point, target } where target is null when nothing was close.
 */
export function snapPoint(p, { objects = [], k = 1, points = false, edges = false, grid = null, radius = 12, exclude = null } = {}) {
  const reach = radius / k;
  const instruments = objects.filter((o) => o.type === "instrument");
  const shapes = objects.filter((o) => o.type === "shape" && o.id !== exclude);

  if (points) {
    let best = null;
    const consider = (at, kind) => {
      const distance = Math.hypot(p[0] - at[0], p[1] - at[1]);
      if (distance <= reach && (!best || distance < best.distance - 1e-9 || (kind === "vertex" && best.kind !== "vertex" && distance <= best.distance + reach * 0.25))) {
        best = { at, kind, distance };
      }
    };
    for (const shape of shapes) {
      const vertices = shapeVertices(shape);
      vertices.forEach((v) => consider(v, "vertex"));
      const closed = shape.kind !== "line" && shape.kind !== "arrow";
      const count = closed ? vertices.length : vertices.length - 1;
      for (let i = 0; i < count; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        consider([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], "midpoint");
      }
    }
    for (const instrument of instruments) instrumentSnapPoints(instrument).forEach((v) => consider(v, "vertex"));
    if (best) return { point: best.at, target: { kind: best.kind, at: best.at } };
  }

  let edge = null;
  const consider = (a, b) => {
    const hit = nearestOnSegment(p, a, b);
    if (hit.distance <= reach && (!edge || hit.distance < edge.distance)) edge = hit;
  };
  for (const instrument of instruments) instrumentEdges(instrument).forEach(([a, b]) => consider(a, b));
  if (edges) {
    for (const shape of shapes) {
      const vertices = shapeVertices(shape);
      const closed = shape.kind !== "line" && shape.kind !== "arrow";
      const count = closed ? vertices.length : vertices.length - 1;
      for (let i = 0; i < count; i++) consider(vertices[i], vertices[(i + 1) % vertices.length]);
    }
  }
  if (edge) return { point: edge.at, target: { kind: "edge", at: edge.at } };

  if (grid) {
    const at = [grid.ox + Math.round((p[0] - grid.ox) / grid.step) * grid.step, grid.oy + Math.round((p[1] - grid.oy) / grid.step) * grid.step];
    return { point: at, target: { kind: "grid", at } };
  }
  return { point: p, target: null };
}

/* ------------------------------ measurements ------------------------------ */

/** "5", "5.3", "0.4" - centimetres from world units, without a pointless ".0". */
export const formatCm = (length) => String(Number((length / UNIT).toFixed(1)));
export const formatDegrees = (degrees) => String(Number(degrees.toFixed(1)));

/**
 * Side lengths and interior angles of a convex outline [[x, y], ...]. Each side has its midpoint and an outward
 * direction (for placing a label); each angle has its vertex, the two directions along the sides and the
 * direction into the shape.
 */
export function measurePolygon(points) {
  const n = points.length;
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) { cx += x / n; cy += y / n; }
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const sides = [];
  const angles = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 1e-6) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let normal = [(b[1] - a[1]) / length, -(b[0] - a[0]) / length];
    if ((mid[0] - cx) * normal[0] + (mid[1] - cy) * normal[1] < 0) normal = [-normal[0], -normal[1]];
    sides.push({ from: a, to: b, mid, length, normal });

    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const u = [prev[0] - a[0], prev[1] - a[1]];
    const v = [next[0] - a[0], next[1] - a[1]];
    const lu = Math.hypot(u[0], u[1]);
    const lv = Math.hypot(v[0], v[1]);
    if (lu < 1e-6 || lv < 1e-6) continue;
    const dot = u[0] * v[0] + u[1] * v[1];
    const cross = u[0] * v[1] - u[1] * v[0];
    const degrees = (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
    let inward = [u[0] / lu + v[0] / lv, u[1] / lu + v[1] / lv];
    const li = Math.hypot(inward[0], inward[1]);
    inward = li < 1e-9 ? [-normal[0], -normal[1]] : [inward[0] / li, inward[1] / li];
    angles.push({ vertex: a, degrees, dirA: [u[0] / lu, u[1] / lu], dirB: [v[0] / lv, v[1] / lv], inward, shortest: Math.min(lu, lv) });
  }
  return { sides, angles, area: Math.abs(area) / 2 };
}

/** What to show for a shape: polygons get sides and angles, lines get their length. Null when not measurable. */
export function measureShape(o) {
  if (o.type !== "shape") return null;
  if (o.kind === "line" || o.kind === "arrow") {
    const length = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
    if (length < 1) return null;
    const mid = [(o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2];
    let normal = [(o.y2 - o.y1) / length, -(o.x2 - o.x1) / length];
    if (normal[1] > 0) normal = [-normal[0], -normal[1]]; // keep the label above the line
    return { sides: [{ from: [o.x1, o.y1], to: [o.x2, o.y2], mid, length, normal }], angles: [], area: 0 };
  }
  const vertices = shapeVertices(o);
  if (vertices.length < 3) return null;
  return measurePolygon(vertices);
}
