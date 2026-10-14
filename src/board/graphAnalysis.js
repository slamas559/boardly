// Calculus-style helpers for explicit graphs y = f(x): the trace point, its tangent line and the
// key points (roots, y-intercept, local highs and lows). Pure functions so they can be unit tested.
import { compileExpression, paramConstants } from "./graphMath.js";

export const isExplicitGraph = (graph) => (graph.mode || "explicit") === "explicit";

/** f(x) for an explicit graph, or null when the equation cannot be compiled. */
export function explicitFunction(graph) {
  if (!isExplicitGraph(graph) || typeof graph.expression !== "string") return null;
  try {
    return compileExpression(graph.expression, ["x"], paramConstants(graph));
  } catch {
    return null;
  }
}

/** Compact number for labels: 3.14159 -> "3.142", 1e-12 -> "0". */
export function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1e-9) return "0";
  return String(Number(value.toPrecision(4)));
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Central difference slope of f at x. */
export function slopeAt(fn, x, span = 20) {
  const h = Math.max(span * 1e-6, 1e-9);
  const slope = (fn(x + h) - fn(x - h)) / (2 * h);
  return Number.isFinite(slope) ? slope : NaN;
}

/**
 * Where the trace point sits: graph coordinates (x, y), the slope there and the plot-pixel offset
 * inside the plotting area of size width x height. Returns null when the point is not drawable.
 */
export function tracePoint(graph, width, height) {
  if (!graph.trace || !Number.isFinite(graph.trace.x)) return null;
  const fn = explicitFunction(graph);
  if (!fn) return null;
  const x = clamp(graph.trace.x, graph.xMin, graph.xMax);
  const y = fn(x);
  if (!Number.isFinite(y)) return null;
  const px = ((x - graph.xMin) / (graph.xMax - graph.xMin)) * width;
  const py = ((graph.yMax - y) / (graph.yMax - graph.yMin)) * height;
  if (px < -1 || px > width + 1 || py < -height || py > height * 2) return null;
  return { x, y, px, py, slope: slopeAt(fn, x, graph.xMax - graph.xMin) };
}

/**
 * Roots, y-intercept and local extrema of the visible part of an explicit graph.
 * Breaks in the curve (like tan x or 1/x) are not reported as extrema or roots.
 */
export function findKeyPoints(graph, { samples = 800, limit = 12 } = {}) {
  const empty = { roots: [], extrema: [], yIntercept: null };
  const fn = explicitFunction(graph);
  if (!fn) return empty;
  const { xMin, xMax, yMin, yMax } = graph;
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite) || xMin >= xMax) return empty;

  const xs = new Array(samples + 1);
  const ys = new Array(samples + 1);
  for (let i = 0; i <= samples; i++) {
    xs[i] = xMin + ((xMax - xMin) * i) / samples;
    const y = fn(xs[i]);
    ys[i] = Number.isFinite(y) && Math.abs(y) < 1e12 ? y : NaN;
  }

  // Typical height of the curve, ignoring spikes, so we can tell a jump from a smooth change
  const finite = ys.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length < 3) return empty;
  const low = finite[Math.floor((finite.length - 1) * 0.05)];
  const high = finite[Math.ceil((finite.length - 1) * 0.95)];
  const scale = Math.max(high - low, 1e-9);
  const visible = (y) => y >= yMin - 1e-9 && y <= yMax + 1e-9;

  const roots = [];
  const addRoot = (x) => {
    if (!roots.some((existing) => Math.abs(existing - x) < (xMax - xMin) * 1e-4)) roots.push(x);
  };

  for (let i = 0; i < samples; i++) {
    const a = ys[i];
    const b = ys[i + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a === 0) {
      addRoot(xs[i]);
      continue;
    }
    if (a * b >= 0) continue;
    let lo = xs[i];
    let hi = xs[i + 1];
    let flo = a;
    for (let step = 0; step < 60; step++) {
      const mid = (lo + hi) / 2;
      const fm = fn(mid);
      if (!Number.isFinite(fm)) break;
      if (fm === 0) { lo = mid; hi = mid; break; }
      if (flo * fm < 0) hi = mid;
      else { lo = mid; flo = fm; }
    }
    const x = (lo + hi) / 2;
    const fx = fn(x);
    // A true crossing ends close to zero; a jump across an asymptote ends huge
    if (Number.isFinite(fx) && Math.abs(fx) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) addRoot(x);
  }
  if (Number.isFinite(ys[samples]) && ys[samples] === 0) addRoot(xs[samples]);

  const extrema = [];
  for (let i = 1; i < samples; i++) {
    const a = ys[i - 1];
    const b = ys[i];
    const c = ys[i + 1];
    if (![a, b, c].every(Number.isFinite)) continue;
    const isMax = b > a && b >= c;
    const isMin = b < a && b <= c;
    if (!isMax && !isMin) continue;
    if (Math.abs(b - a) > scale * 0.5 || Math.abs(c - b) > scale * 0.5) continue; // a jump, not a turning point
    // Golden-section search for the exact turning point between the neighbouring samples
    const sign = isMax ? 1 : -1;
    let lo = xs[i - 1];
    let hi = xs[i + 1];
    const phi = (Math.sqrt(5) - 1) / 2;
    for (let step = 0; step < 50; step++) {
      const x1 = hi - phi * (hi - lo);
      const x2 = lo + phi * (hi - lo);
      if (sign * fn(x1) < sign * fn(x2)) lo = x1;
      else hi = x2;
    }
    const x = (lo + hi) / 2;
    const y = fn(x);
    if (!Number.isFinite(y) || !visible(y)) continue;
    if (extrema.some((existing) => Math.abs(existing.x - x) < (xMax - xMin) * 1e-3)) continue;
    extrema.push({ x, y, kind: isMax ? "max" : "min" });
    // A touching root (like x^2 at 0) never changes sign, so catch it here
    if (Math.abs(y) < 1e-7 * Math.max(1, scale)) addRoot(x);
  }

  let yIntercept = null;
  if (xMin <= 0 && xMax >= 0) {
    const y0 = fn(0);
    if (Number.isFinite(y0) && visible(y0)) yIntercept = { x: 0, y: y0 };
  }

  return {
    roots: visible(0) ? roots.sort((p, q) => p - q).slice(0, limit).map((x) => ({ x, y: 0 })) : [],
    extrema: extrema.sort((p, q) => p.x - q.x).slice(0, limit),
    yIntercept,
  };
}
