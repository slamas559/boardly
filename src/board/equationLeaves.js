// Where a formula's editable parts are on the board, and which one is under a point. Used for editing a value
// by clicking it. Nothing here draws anything.
import { leafBoxes } from "./mathRender.js";

/** Every part of formula `eq` as a rectangle in board coordinates: [{ part, x, y, w, h }] ([] until it can be measured). */
export function leafRects(eq) {
  const boxes = leafBoxes(eq.latex);
  if (!boxes) return [];
  return boxes.map(({ part, x, y, w, h }) => ({ part, x: eq.x + x * eq.w, y: eq.y + y * eq.h, w: w * eq.w, h: h * eq.h }));
}

/** The part under board point `p`, with `pad` of slack on every side (so small digits are easy to hit); nearest wins. */
export function leafAt(eq, p, pad = 0) {
  let best = null;
  let bestDistance = Infinity;
  for (const r of leafRects(eq)) {
    if (p[0] < r.x - pad || p[0] > r.x + r.w + pad || p[1] < r.y - pad || p[1] > r.y + r.h + pad) continue;
    const distance = Math.hypot(p[0] - (r.x + r.w / 2), p[1] - (r.y + r.h / 2));
    if (distance < bestDistance) { best = r; bestDistance = distance; }
  }
  return best;
}
