// Freehand stroke rendering for the Pen and Marker: one smooth path for every client, plus selectable
// textures (smooth, pencil, chalk, ink brush) and line patterns (solid, dashed, dotted).
//
// Everything here is derived from the stroke's own points, so the person drawing, the people watching live
// and anyone who joins later see exactly the same stroke.

export const STROKE_TEXTURES = [
  { id: "smooth", label: "Smooth" },
  { id: "pencil", label: "Pencil" },
  { id: "chalk", label: "Chalk" },
  { id: "brush", label: "Ink brush" },
];
export const STROKE_PATTERNS = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
];
export const TEXTURE_IDS = STROKE_TEXTURES.map((t) => t.id);
export const PATTERN_IDS = STROKE_PATTERNS.map((p) => p.id);

export const strokeTexture = (value) => (TEXTURE_IDS.includes(value) ? value : "smooth");
export const strokePattern = (value) => (PATTERN_IDS.includes(value) ? value : "solid");

const TAU = Math.PI * 2;
const MAX_SAMPLES = 20000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Input stabiliser: a One Euro filter. It removes hand jitter when the pointer moves slowly and gets out of
   the way (almost no lag) when it moves fast. Coordinates are screen pixels so it feels the same at any zoom. */

export function createStabilizer({ minCutoff = 1.5, beta = 0.04, dCutoff = 1 } = {}) {
  let x = 0, y = 0, dx = 0, dy = 0, t = 0, ready = false;
  const alpha = (cutoff, dt) => 1 / (1 + 1 / (TAU * cutoff) / dt);
  return {
    /** Start a stroke at this point. */
    reset(px, py, time) {
      x = px; y = py; dx = 0; dy = 0; t = time; ready = true;
      return [px, py];
    },
    /** Filter the next point. `time` is in milliseconds. */
    next(px, py, time) {
      if (!ready) return this.reset(px, py, time);
      const dt = Math.max((time - t) / 1000, 0.001);
      t = time;
      const ad = alpha(dCutoff, dt);
      dx += ad * ((px - x) / dt - dx);
      dy += ad * ((py - y) / dt - dy);
      const cutoff = minCutoff + beta * Math.hypot(dx, dy);
      const a = alpha(cutoff, dt);
      x += a * (px - x);
      y += a * (py - y);
      return [x, y];
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sampling: turn the recorded points into evenly spaced samples along a smooth curve. */

// Per-point width factor: stylus pressure, and for the ink brush the drawing speed (fast = thinner).
function widthFactors(o, texture, width) {
  const pts = o.points;
  const n = pts.length;
  const f = new Float32Array(n).fill(1);
  if (o.vp) for (let i = 0; i < n; i++) f[i] *= 0.35 + 1.1 * (pts[i][2] ?? 0.5);
  if (texture === "brush" && n > 2) {
    const gap = new Float32Array(n);
    for (let i = 1; i < n; i++) gap[i] = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    gap[0] = gap[1];
    for (let i = 0; i < n; i++) {
      const a = gap[Math.max(0, i - 1)], b = gap[i], c = gap[Math.min(n - 1, i + 1)];
      const u = ((a + b + c) / 3) / Math.max(width, 1);
      f[i] *= 1.15 - 0.65 * smoothstep(0.35, 3.2, u);
    }
  }
  if (n > 4) { // soften the factors so the width never jumps from one point to the next
    const g = Float32Array.from(f);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n - 1; i++) f[i] = (g[i - 1] + 2 * g[i] + g[i + 1]) / 4;
      g.set(f);
    }
  }
  return f;
}

// The curve runs through the midpoints of consecutive points, using each point as a control point.
function curvePolyline(pts, f, step) {
  const n = pts.length;
  const vx = [pts[0][0]], vy = [pts[0][1]], vf = [f[0]];
  const push = (x, y, w) => { vx.push(x); vy.push(y); vf.push(w); };
  if (n === 2) {
    push(pts[1][0], pts[1][1], f[1]);
    return { vx, vy, vf };
  }
  for (let i = 1; i < n - 1; i++) {
    const ax = i === 1 ? pts[0][0] : (pts[i - 1][0] + pts[i][0]) / 2;
    const ay = i === 1 ? pts[0][1] : (pts[i - 1][1] + pts[i][1]) / 2;
    const cx = (pts[i][0] + pts[i + 1][0]) / 2;
    const cy = (pts[i][1] + pts[i + 1][1]) / 2;
    const fa = i === 1 ? f[0] : (f[i - 1] + f[i]) / 2;
    const fc = (f[i] + f[i + 1]) / 2;
    const bx = pts[i][0], by = pts[i][1];
    const length = Math.hypot(bx - ax, by - ay) + Math.hypot(cx - bx, cy - by);
    const m = clamp(Math.ceil(length / Math.max(step, 0.2)), 2, 48);
    for (let j = 1; j <= m; j++) {
      const t = j / m, u = 1 - t;
      push(u * u * ax + 2 * u * t * bx + t * t * cx, u * u * ay + 2 * u * t * by + t * t * cy, fa + (fc - fa) * t);
    }
  }
  const last = pts[n - 1];
  push(last[0], last[1], f[n - 1]);
  return { vx, vy, vf };
}

/**
 * Evenly spaced samples along the stroke: { x, y, r, on, count, minX.. } where `r` is the radius at each
 * sample and `on[i]` says whether the line pattern paints there. Pure function of the stroke, so it can be
 * cached and tested.
 */
export function sampleStroke(o) {
  const pts = o.points;
  const width = o.width || 3;
  const texture = strokeTexture(o.texture);
  const pattern = strokePattern(o.pattern);
  const f = widthFactors(o, texture, width);

  let step = clamp(width * 0.18, 0.3, 3);
  const unit = Math.max(width, 3);
  const dotPeriod = unit * 2;
  if (pattern === "dotted") step = dotPeriod;

  const poly = curvePolyline(pts, f, step);
  const nv = poly.vx.length;
  const cum = new Float64Array(nv);
  for (let i = 1; i < nv; i++) cum[i] = cum[i - 1] + Math.hypot(poly.vx[i] - poly.vx[i - 1], poly.vy[i] - poly.vy[i - 1]);
  const total = cum[nv - 1];
  step = Math.max(step, total / MAX_SAMPLES);

  const count = Math.max(2, Math.floor(total / step) + 1);
  const x = new Float32Array(count + 1), y = new Float32Array(count + 1), r = new Float32Array(count + 1), s = new Float32Array(count + 1);
  let seg = 1, n = 0;
  const emit = (dist) => {
    while (seg < nv - 1 && cum[seg] < dist) seg++;
    const span = cum[seg] - cum[seg - 1] || 1;
    const t = clamp((dist - cum[seg - 1]) / span, 0, 1);
    x[n] = poly.vx[seg - 1] + (poly.vx[seg] - poly.vx[seg - 1]) * t;
    y[n] = poly.vy[seg - 1] + (poly.vy[seg] - poly.vy[seg - 1]) * t;
    let factor = poly.vf[seg - 1] + (poly.vf[seg] - poly.vf[seg - 1]) * t;
    if (texture === "brush") factor *= 0.3 + 0.7 * smoothstep(0, 1, Math.min(dist, total - dist) / (width * 1.6));
    r[n] = Math.max(0.15, (width * factor) / 2);
    s[n] = dist;
    n++;
  };
  for (let d = 0; d < total; d += step) emit(d);
  if (pattern !== "dotted" || n === 0) emit(total);

  // Dashes and dots: which samples paint. A dash of length D is painted from samples D - 2r long (the round
  // ends add the rest).
  const on = new Uint8Array(n).fill(1);
  if (pattern === "dashed") {
    const dash = unit * 3, period = unit * 5;
    const paint = Math.max(dash - width, step * 0.5);
    for (let i = 0; i < n; i++) on[i] = s[i] % period <= paint ? 1 : 0;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (!on[i]) continue;
    minX = Math.min(minX, x[i] - r[i]); maxX = Math.max(maxX, x[i] + r[i]);
    minY = Math.min(minY, y[i] - r[i]); maxY = Math.max(maxY, y[i] + r[i]);
  }
  return { x, y, r, s, on, count: n, minX, minY, maxX, maxY, total, step };
}

/* ------------------------------------------------------------------ */
/* Cheap deterministic randomness, so rough edges and grain are identical for everyone. */

function hash(i, salt) {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const TEXTURE_LOOK = {
  // thr: how much of the grain tile cuts into the stroke; edge: how ragged the outline is; scale: grain size
  pencil: { thr: 0.52, gamma: 1.0, edge: 0.1, grain: 0.7, salt: 11 },
  chalk: { thr: 0.28, gamma: 0.75, edge: 0.34, grain: 1.25, salt: 23 },
};

let grainTiles = {};
function grainTile(texture) {
  if (grainTiles[texture]) return grainTiles[texture];
  const look = TEXTURE_LOOK[texture];
  const size = 160, cell = 8, cells = size / cell;
  const coarse = Float32Array.from({ length: cells * cells }, (_, i) => hash(i, look.salt + 100));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  const image = g.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const gx = px / cell, gy = py / cell;
      const x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
      const c = (cx, cy) => coarse[((cy + cells) % cells) * cells + ((cx + cells) % cells)];
      const top = c(x0, y0) * (1 - tx) + c(x0 + 1, y0) * tx;
      const bottom = c(x0, y0 + 1) * (1 - tx) + c(x0 + 1, y0 + 1) * tx;
      const blotch = top * (1 - ty) + bottom * ty;
      const fine = hash(py * size + px, look.salt);
      const value = fine * 0.72 + blotch * 0.28;
      const cut = value > look.thr ? Math.pow((value - look.thr) / (1 - look.thr), look.gamma) : 0;
      const k = (py * size + px) * 4;
      image.data[k + 3] = Math.round(clamp(cut * 1.15, 0, 1) * 255);
    }
  }
  g.putImageData(image, 0, 0);
  grainTiles[texture] = canvas;
  return canvas;
}

/* ------------------------------------------------------------------ */
/* Drawing */

function fillStamps(ctx, S, look) {
  ctx.beginPath();
  for (let i = 0; i < S.count; i++) {
    if (!S.on[i]) continue;
    let r = S.r[i], px = S.x[i], py = S.y[i];
    if (look && look.edge) {
      r *= 1 + (hash(i, look.salt + 1) - 0.5) * look.edge;
      const wobble = r * look.edge * 0.5;
      px += (hash(i, look.salt + 2) - 0.5) * wobble;
      py += (hash(i, look.salt + 3) - 0.5) * wobble;
    }
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r, 0, TAU);
  }
  ctx.fill();
}

// Textured strokes are painted on a small canvas first (the stroke in full colour, then the grain cut out of
// it), so the grain never touches anything else on the board.
const bitmaps = new Map(); // points array -> { canvas, sig, scale, bx, by, bw, bh, pixels }
let bitmapPixels = 0;
const BITMAP_BUDGET = 60e6;

function grainyBitmap(ctx, o, S, texture, color) {
  const look = TEXTURE_LOOK[texture];
  const m = ctx.getTransform();
  let scale = Math.hypot(m.a, m.b) || 1;
  const pad = S.r.reduce((a, b) => Math.max(a, b), 0) * look.edge + 2;
  const bx = S.minX - pad, by = S.minY - pad;
  const bw = S.maxX - S.minX + pad * 2, bh = S.maxY - S.minY + pad * 2;
  scale = Math.min(scale, 3200 / Math.max(bw, bh, 1));
  const sig = [texture, color, o.width, o.points.length, o.points[o.points.length - 1].join(","), o.pattern, o.vp ? 1 : 0].join("|");

  let entry = bitmaps.get(o.points);
  const reusable = entry && entry.sig === sig && scale / entry.scale < 1.5 && scale / entry.scale > 0.6;
  if (!reusable) {
    if (!entry) {
      entry = { canvas: document.createElement("canvas"), pixels: 0 };
      bitmaps.set(o.points, entry);
    }
    const w = Math.max(1, Math.ceil(bw * scale)), h = Math.max(1, Math.ceil(bh * scale));
    bitmapPixels += w * h - entry.pixels;
    entry.pixels = w * h;
    entry.canvas.width = w;
    entry.canvas.height = h;
    const g = entry.canvas.getContext("2d");
    g.setTransform(scale, 0, 0, scale, -bx * scale, -by * scale);
    g.fillStyle = color;
    fillStamps(g, S, look);
    const grain = look.grain * clamp(o.width / 6, 1, 2);
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = g.createPattern(grainTile(texture), "repeat");
    g.save();
    g.scale(grain, grain);
    g.fillRect(bx / grain, by / grain, bw / grain, bh / grain);
    g.restore();
    Object.assign(entry, { sig, scale, bx, by, bw, bh });
  }
  // Mark as recently used and drop the oldest bitmaps when over budget
  bitmaps.delete(o.points);
  bitmaps.set(o.points, entry);
  if (bitmapPixels > BITMAP_BUDGET) {
    for (const [key, old] of bitmaps) {
      if (bitmapPixels <= BITMAP_BUDGET * 0.7 || key === o.points) break;
      bitmapPixels -= old.pixels;
      bitmaps.delete(key);
    }
  }
  return entry;
}

const sampleCache = new Map(); // points array -> { sig, S }
function cachedSamples(o) {
  const last = o.points[o.points.length - 1];
  const sig = [o.width, strokeTexture(o.texture), strokePattern(o.pattern), o.vp ? 1 : 0, o.points.length, last[0], last[1]].join("|");
  const hit = sampleCache.get(o.points);
  if (hit && hit.sig === sig) return hit.S;
  const S = sampleStroke(o);
  sampleCache.delete(o.points);
  sampleCache.set(o.points, { sig, S });
  if (sampleCache.size > 400) sampleCache.delete(sampleCache.keys().next().value);
  return S;
}

// Plain smooth line through the points
function strokePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }
  ctx.stroke();
}

/** Draw one freehand stroke object ({ points, color, width, opacity, tool, vp, texture, pattern }). */
export function drawStroke(ctx, o) {
  const pts = o.points;
  if (!pts || pts.length === 0) return;
  const width = o.width || 3;
  const marker = o.tool === "highlighter";
  const texture = strokeTexture(o.texture);
  const pattern = strokePattern(o.pattern);
  const color = o.color || "#000";

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha *= o.opacity ?? 1;
  ctx.lineJoin = "round";
  ctx.lineCap = marker && pattern === "solid" ? "square" : "round";
  ctx.lineWidth = width;

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], width / 2, 0, TAU);
    ctx.fill();
  } else if (texture === "smooth" && !o.vp) {
    if (pattern === "solid") {
      strokePath(ctx, pts);
    } else {
      const unit = Math.max(width, 3);
      ctx.setLineDash(pattern === "dashed" ? [unit * 3 - width, unit * 2 + width] : [0.01, unit * 2]);
      strokePath(ctx, pts);
    }
  } else {
    const S = cachedSamples(o);
    if ((texture === "pencil" || texture === "chalk") && typeof document !== "undefined" && S.count > 0) {
      const b = grainyBitmap(ctx, o, S, texture, color);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(b.canvas, b.bx, b.by, b.bw, b.bh);
    } else {
      fillStamps(ctx, S, null);
    }
  }
  ctx.restore();
}

/** Draw a small sample stroke (an S-curve) for the texture picker. */
export function drawBrushPreview(ctx, w, h, style) {
  const pts = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([w * (0.1 + 0.8 * t), h / 2 + Math.sin(t * Math.PI * 2) * h * 0.26, 0.5]);
  }
  ctx.clearRect(0, 0, w, h);
  drawStroke(ctx, { points: pts, ...style, vp: false });
}
