// Pure geometry helpers: bounds, hit-testing, move/resize patches.
import { FONT_STACKS, LINE_HEIGHT } from "./constants.js";
import { graphGeometryPixels } from "./graphMath.js";
import { tracePoint } from "./graphAnalysis.js";

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2, 0, 1);
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function shapeOutline(kind, x, y, w, h) {
  if (kind === "rect") return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  if (kind === "diamond") return [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
  if (kind === "triangle") return [[x + w / 2, y], [x + w, y + h], [x, y + h]];
  if (kind === "hexagon") return [[x + w * 0.25, y], [x + w * 0.75, y], [x + w, y + h / 2], [x + w * 0.75, y + h], [x + w * 0.25, y + h], [x, y + h / 2]];
  if (kind === "star") {
    const points = [];
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? 1 : 0.45;
      points.push([x + w / 2 + Math.cos(angle) * w / 2 * radius, y + h / 2 + Math.sin(angle) * h / 2 * radius]);
    }
    return points;
  }
  if (kind === "roundedRect") {
    const radius = Math.min(12, w / 4, h / 4);
    const corners = [
      [x + w - radius, y + radius, -Math.PI / 2],
      [x + w - radius, y + h - radius, 0],
      [x + radius, y + h - radius, Math.PI / 2],
      [x + radius, y + radius, Math.PI],
    ];
    return corners.flatMap(([cx, cy, start]) =>
      Array.from({ length: 9 }, (_, i) => {
        const angle = start + (Math.PI / 2) * (i / 8);
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
      })
    );
  }
  return [];
}

/* ---------- text measuring ---------- */
let measureCtx = null;
const metricCache = new Map();

export function fontString(o) {
  const stack = FONT_STACKS[o.fontFamily] || FONT_STACKS.sans;
  return `${o.italic ? "italic " : ""}${o.bold ? "700" : "400"} ${o.fontSize || 24}px ${stack}`;
}

export function measureText(o) {
  const text = o.text || "";
  const lines = text.split("\n");
  const size = o.fontSize || 24;
  const h = Math.max(1, lines.length) * size * LINE_HEIGHT;
  let w;

  if (typeof document !== "undefined") {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    const font = fontString(o);
    const key = font + "|" + text;
    if (metricCache.has(key)) return metricCache.get(key);
    measureCtx.font = font;
    w = Math.max(...lines.map((l) => measureCtx.measureText(l || " ").width), size * 0.5);
    const out = { w, h };
    if (metricCache.size > 500) metricCache.clear();
    metricCache.set(key, out);
    return out;
  }
  // Non-DOM fallback (tests / SSR)
  w = Math.max(...lines.map((l) => l.length * size * 0.55), size * 0.5);
  return { w, h };
}

/* ---------- bounds ---------- */
export function getBounds(o) {
  switch (o.type) {
    case "stroke": {
      const pts = o.points;
      if (!pts || pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of pts) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }
      const r = (o.width || 3) / 2;
      return { x: minX - r, y: minY - r, w: maxX - minX + r * 2, h: maxY - minY + r * 2 };
    }
    case "shape": {
      const r = (o.width || 3) / 2;
      const x = Math.min(o.x1, o.x2);
      const y = Math.min(o.y1, o.y2);
      return { x: x - r, y: y - r, w: Math.abs(o.x2 - o.x1) + r * 2, h: Math.abs(o.y2 - o.y1) + r * 2 };
    }
    case "graph":
    case "equation":
      return { x: o.x, y: o.y, w: o.w, h: o.h };
    case "table":
      return { x: o.x, y: o.y, w: o.cols * o.cellWidth, h: o.rows * o.cellHeight };
    case "media":
      return { x: o.x, y: o.y, w: o.w, h: o.h };
    case "text": {
      const m = measureText(o);
      const x = o.align === "center" ? o.x - m.w / 2 : o.align === "right" ? o.x - m.w : o.x;
      return { x, y: o.y, w: m.w, h: m.h };
    }
    case "markup": {
      if (!o.rects || o.rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y, w, h] of o.rects) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    default:
      return { x: 0, y: 0, w: 0, h: 0 };
  }
}

export const unionBounds = (list) => {
  if (!list.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of list) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export const pointInRect = (p, r, pad = 0) =>
  p[0] >= r.x - pad && p[0] <= r.x + r.w + pad && p[1] >= r.y - pad && p[1] <= r.y + r.h + pad;

export const rectsOverlap = (a, b) =>
  a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;

/* ---------- hit testing ---------- */
export function hitObject(o, p, tol) {
  switch (o.type) {
    case "stroke": {
      const pts = o.points;
      if (!pts || pts.length === 0) return false;
      const reach = (o.width || 3) / 2 + tol;
      if (pts.length === 1) return dist(p, pts[0]) <= reach;
      if (!pointInRect(p, getBounds(o), tol)) return false;
      for (let i = 1; i < pts.length; i++) {
        if (segDist(p, pts[i - 1], pts[i]) <= reach) return true;
      }
      return false;
    }
    case "shape": {
      const reach = (o.width || 3) / 2 + tol;
      const a = [o.x1, o.y1];
      const b = [o.x2, o.y2];
      if (o.kind === "line" || o.kind === "arrow") return segDist(p, a, b) <= reach;

      const x = Math.min(o.x1, o.x2), y = Math.min(o.y1, o.y2);
      const w = Math.abs(o.x2 - o.x1), h = Math.abs(o.y2 - o.y1);

      if (o.kind === "ellipse") {
        const cx = x + w / 2, cy = y + h / 2;
        const rx = Math.max(w / 2, 0.001), ry = Math.max(h / 2, 0.001);
        const d = Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry);
        if (o.fill) return d <= 1 + reach / Math.min(rx, ry);
        return Math.abs(d - 1) <= reach / Math.min(rx, ry);
      }
      const outline = shapeOutline(o.kind, x, y, w, h);
      if (outline.length) {
        if (o.fill && pointInPolygon(p, outline)) return true;
        for (let i = 0; i < outline.length; i++) {
          if (segDist(p, outline[i], outline[(i + 1) % outline.length]) <= reach) return true;
        }
        return false;
      }
      if (o.fill && pointInRect(p, { x, y, w, h })) return true;
      const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      for (let i = 0; i < 4; i++) if (segDist(p, corners[i], corners[(i + 1) % 4]) <= reach) return true;
      return false;
    }
    case "graph":
    case "equation":
    case "table":
    case "media":
      return pointInRect(p, getBounds(o), tol);
    case "text":
      return pointInRect(p, getBounds(o), tol);
    case "markup":
      return (o.rects || []).some(([x, y, w, h]) => pointInRect(p, { x, y, w, h }, tol));
    default:
      return false;
  }
}

/** True when p (world coordinates) is on the graph's trace dot. */
export function hitGraphTrace(graph, p, tolerance) {
  if (!graph.trace) return false;
  const width = Math.max(20, graph.w - 54);
  const height = Math.max(20, graph.h - 58);
  const trace = tracePoint(graph, width, height);
  if (!trace) return false;
  return dist([p[0] - graph.x - 42, p[1] - graph.y - 24], [trace.px, trace.py]) <= tolerance;
}

export function hitGraphGeometry(graph, p, tolerance) {
  if (!Array.isArray(graph.geometry) || graph.geometry.length === 0) return null;
  const width = Math.max(20, graph.w - 54);
  const height = Math.max(20, graph.h - 58);
  const local = [p[0] - graph.x - 42, p[1] - graph.y - 24];
  if (!pointInRect(local, { x: 0, y: 0, w: width, h: height }, tolerance)) return null;
  const elements = graphGeometryPixels(graph.geometry, {
    xMin: graph.xMin, xMax: graph.xMax, yMin: graph.yMin, yMax: graph.yMax, width, height,
  });
  for (let index = elements.length - 1; index >= 0; index--) {
    const element = elements[index];
    if (element.kind === "point") {
      if (dist(local, [element.point.x, element.point.y]) <= tolerance + 4) return element.id;
    } else if (element.kind === "polygon") {
      if (element.filled && pointInPolygon(local, element.points.map((point) => [point.x, point.y]))) return element.id;
      for (let edge = 0; edge < element.points.length; edge++) {
        const a = element.points[edge], b = element.points[(edge + 1) % element.points.length];
        if (segDist(local, [a.x, a.y], [b.x, b.y]) <= tolerance + 4) return element.id;
      }
    } else if (element.kind === "angle") {
      if (segDist(local, [element.a.x, element.a.y], [element.vertex.x, element.vertex.y]) <= tolerance + 4
        || segDist(local, [element.vertex.x, element.vertex.y], [element.c.x, element.c.y]) <= tolerance + 4
        || dist(local, [element.vertex.x, element.vertex.y]) <= tolerance + 22) return element.id;
    } else if (segDist(local, [element.start.x, element.start.y], [element.end.x, element.end.y]) <= tolerance + 4) {
      return element.id;
    }
  }
  return null;
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Does the object intersect a marquee rectangle? (bounds test; good enough for selection) */
export const objectInRect = (o, r) => rectsOverlap(getBounds(o), r);

/* ---------- move / resize patches ---------- */
export const isMovable = (o) => o.type !== "markup";

export function movePatch(o, dx, dy) {
  switch (o.type) {
    case "stroke":
      return { points: o.points.map((p) => [p[0] + dx, p[1] + dy, ...p.slice(2)]) };
    case "shape":
      return { x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy };
    case "graph":
    case "equation":
    case "table":
    case "media":
      return { x: o.x + dx, y: o.y + dy };
    case "text":
      return { x: o.x + dx, y: o.y + dy };
    default:
      return {};
  }
}

/** Scale an object about the origin (ox, oy). Text scales uniformly. */
export function scalePatch(o, sx, sy, ox, oy) {
  const fx = (x) => ox + (x - ox) * sx;
  const fy = (y) => oy + (y - oy) * sy;
  switch (o.type) {
    case "stroke":
      return {
        points: o.points.map((p) => [fx(p[0]), fy(p[1]), ...p.slice(2)]),
        width: Math.max(0.5, (o.width || 3) * Math.sqrt(Math.abs(sx * sy))),
      };
    case "shape":
      return { x1: fx(o.x1), y1: fy(o.y1), x2: fx(o.x2), y2: fy(o.y2) };
    case "graph":
      return { x: fx(o.x), y: fy(o.y), w: Math.max(80, o.w * Math.abs(sx)), h: Math.max(80, o.h * Math.abs(sy)) };
    case "media":
      return { x: fx(o.x), y: fy(o.y), w: Math.max(40, o.w * Math.abs(sx)), h: Math.max(40, o.h * Math.abs(sy)) };
    case "equation": {
      // Formulas keep their proportions, like text: the font size scales with the box
      const s = Math.max(Math.abs(sx), Math.abs(sy));
      return { x: fx(o.x), y: fy(o.y), w: Math.max(8, o.w * s), h: Math.max(8, o.h * s), fontSize: Math.max(6, Math.round((o.fontSize || 36) * s * 10) / 10) };
    }
    case "table":
      return {
        x: fx(o.x),
        y: fy(o.y),
        cellWidth: Math.max(40, o.cellWidth * Math.abs(sx)),
        cellHeight: Math.max(24, o.cellHeight * Math.abs(sy)),
      };
    case "text": {
      const s = Math.max(Math.abs(sx), Math.abs(sy));
      return { x: fx(o.x), y: fy(o.y), fontSize: Math.max(6, Math.round((o.fontSize || 24) * s * 10) / 10) };
    }
    default:
      return {};
  }
}

/** Round to one decimal place to keep payloads small */
export const q = (n) => Math.round(n * 10) / 10;
