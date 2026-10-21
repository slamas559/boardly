// Turning a drawn 2D shape into a 3D solid: the shape's outline (its "profile") is either spun around an axis
// (a solid of revolution) or stretched along its depth (an extrusion). This module holds the geometry: reading a
// profile from a board object, tidying it, clipping it to one side of the axis, and its area, centroid and
// perimeter, which give the volume and surface area. Pure functions, so every number can be tested.
import { shapeOutline } from "./shapeOutline.js";

export const PROFILE_LIMITS = { maxPoints: 160, minPoints: 3, maxCoord: 10000, defaultLongest: 6 };
export const AXES = ["left", "center", "right"];
export const AXIS_LABELS = { left: "Left edge", center: "Centre line", right: "Right edge" };

const EPS = 1e-9;
const round = (n, places = 3) => Math.round(n * 10 ** places) / 10 ** places;

/* ------------------------------ reading a shape ------------------------------ */

// Douglas–Peucker: drop points that sit within `tolerance` of the line between their neighbours
export function simplify(points, tolerance) {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || EPS;
    let far = -1;
    let farDist = tolerance;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((points[i][0] - ax) * dy - (points[i][1] - ay) * dx) / len;
      if (dist > farDist) { far = i; farDist = dist; }
    }
    if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

const extent = (points) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
};
export const profileBounds = extent;

function ellipsePoints(cx, cy, rx, ry, count = 72) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

/**
 * The outline of a closed board object, as points in board coordinates (y down), or null when the object is
 * not a closed shape (a line, an arrow, text …). Freehand strokes are closed with a straight line and simplified.
 */
export function outlineOf(o) {
  if (!o) return null;
  let points = null;
  if (o.type === "shape") {
    if (o.kind === "line" || o.kind === "arrow") return null;
    const x = Math.min(o.x1, o.x2), y = Math.min(o.y1, o.y2);
    const w = Math.abs(o.x2 - o.x1), h = Math.abs(o.y2 - o.y1);
    if (w < 2 || h < 2) return null;
    points = o.kind === "ellipse" ? ellipsePoints(x + w / 2, y + h / 2, w / 2, h / 2) : shapeOutline(o.kind, x, y, w, h);
  } else if (o.type === "stroke" && Array.isArray(o.points) && o.points.length >= 3) {
    points = o.points.map((p) => [p[0], p[1]]);
    const box = extent(points);
    if (box.w < 2 && box.h < 2) return null;
    points = simplify(points, Math.max(box.w, box.h) * 0.012);
    const first = points[0], last = points[points.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < Math.max(box.w, box.h) * 0.02) points.pop(); // already closed
  }
  if (!points || points.length < PROFILE_LIMITS.minPoints) return null;
  const box = extent(points);
  if (box.w < 2 || box.h < 2) return null;
  while (points.length > PROFILE_LIMITS.maxPoints) points = simplify(points, Math.max(box.w, box.h) * 0.02 * (points.length / PROFILE_LIMITS.maxPoints));
  return points.length >= PROFILE_LIMITS.minPoints && points.length <= PROFILE_LIMITS.maxPoints ? points : null;
}

/** Is the outline the same on both sides of its vertical centre line? (A circle, a rectangle, a diamond …) */
export function isSymmetricAcross(points) {
  const box = extent(points);
  const mid = box.minX + box.w / 2;
  const tol = Math.max(box.w, box.h) * 0.03;
  return points.every(([x, y]) => points.some(([x2, y2]) => Math.abs(x2 - (2 * mid - x)) <= tol && Math.abs(y2 - y) <= tol));
}

/**
 * Board points (y down) to a profile in solid units (y up), centred on its bounding box, with its longest side
 * set to `longest`. Returns [[x, y], …] rounded to 3 decimals.
 */
export function toProfile(points, longest = PROFILE_LIMITS.defaultLongest) {
  const box = extent(points);
  const scale = longest / Math.max(box.w, box.h, EPS);
  const cx = box.minX + box.w / 2, cy = box.minY + box.h / 2;
  return points.map(([x, y]) => [round((x - cx) * scale), round(-(y - cy) * scale)]);
}

/** Multiply every point so the longest side becomes `longest`. */
export function rescaleProfile(profile, longest) {
  const box = extent(profile);
  const factor = longest / Math.max(box.w, box.h, EPS);
  return profile.map(([x, y]) => [round(x * factor), round(y * factor)]);
}

export const longestSide = (profile) => {
  const box = extent(profile);
  return Math.max(box.w, box.h);
};

/** Is this a usable profile (what the server accepts)? */
export function isValidProfile(profile) {
  return Array.isArray(profile)
    && profile.length >= PROFILE_LIMITS.minPoints && profile.length <= PROFILE_LIMITS.maxPoints
    && profile.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n) && Math.abs(n) <= PROFILE_LIMITS.maxCoord));
}

/* ------------------------------- polygon maths ------------------------------- */

export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/** The centre of mass of the polygon's area. */
export function polygonCentroid(points) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(a) < EPS) return [points[0][0], points[0][1]];
  return [cx / (3 * a), cy / (3 * a)];
}

export function polygonPerimeter(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += Math.hypot(x2 - x1, y2 - y1);
  }
  return sum;
}

/** Keep the part of a polygon where x >= 0 (Sutherland–Hodgman against one edge). */
export function clipToRight(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const cur = points[i];
    const prev = points[(i + points.length - 1) % points.length];
    const curIn = cur[0] >= 0, prevIn = prev[0] >= 0;
    if (curIn !== prevIn) {
      const t = prev[0] / (prev[0] - cur[0]);
      out.push([0, prev[1] + (cur[1] - prev[1]) * t]);
    }
    if (curIn) out.push([cur[0], cur[1]]);
  }
  return out;
}

/* --------------------------------- the solids --------------------------------- */

/** x position of the spin axis for a profile (which is centred on its bounding box). */
export function axisPosition(profile, axis) {
  const box = extent(profile);
  return axis === "right" ? box.maxX : axis === "center" ? box.minX + box.w / 2 : box.minX;
}

/**
 * The region that is spun: the profile measured as distance from the axis (r >= 0) and height (y), keeping
 * only the side of the axis the shape is on (for a centre-line axis, the right half).
 */
export function revolveRegion(profile, axis) {
  const at = axisPosition(profile, axis);
  const flip = axis === "right" ? -1 : 1;
  const region = clipToRight(profile.map(([x, y]) => [(x - at) * flip, y]));
  return region.length >= 3 ? region.map(([r, y]) => [round(r, 6), round(y, 6)]) : [];
}

/** How big a revolved solid is: radius, and the lowest and highest point. */
export function revolveExtent(profile, axis) {
  const region = revolveRegion(profile, axis);
  if (!region.length) return { radius: 0, minY: 0, maxY: 0, height: 0 };
  const box = extent(region);
  return { radius: box.maxX, minY: box.minY, maxY: box.maxY, height: box.h };
}

/**
 * Volume and surface area of a spun region. Pappus's theorem: the volume is the sweep angle × the distance of the
 * region's centre from the axis × its area; each outline edge sweeps a band of area sweep × mean radius × length.
 * A partial sweep also has two flat faces where it is cut.
 */
export function revolveMeasures(profile, axis, sweepDegrees) {
  const region = revolveRegion(profile, axis);
  if (!region.length) return { area: 0, centroid: 0, volume: 0, surface: 0, band: 0, sweep: 0 };
  const sweep = (Math.min(360, Math.max(0, sweepDegrees)) * Math.PI) / 180;
  const area = polygonArea(region);
  const centroid = polygonCentroid(region)[0];
  let band = 0; // sum of (mean radius × edge length) over the edges that are not on the axis
  for (let i = 0; i < region.length; i++) {
    const [r1, y1] = region[i];
    const [r2, y2] = region[(i + 1) % region.length];
    if (r1 < 1e-7 && r2 < 1e-7) continue;
    band += ((r1 + r2) / 2) * Math.hypot(r2 - r1, y2 - y1);
  }
  const full = Math.abs(sweep - Math.PI * 2) < 1e-9;
  return { area, centroid, volume: sweep * centroid * area, surface: sweep * band + (full ? 0 : 2 * area), band, sweep, full };
}

/** Volume and surface area of a profile stretched by `depth`. */
export function extrudeMeasures(profile, depth) {
  const area = polygonArea(profile);
  const perimeter = polygonPerimeter(profile);
  return { area, perimeter, volume: area * depth, surface: 2 * area + perimeter * depth };
}
