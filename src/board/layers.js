// Stacking order ("layers") of objects on a page. Order is stored on each object as `z` (missing = 0); objects
// with the same z keep the order they were added in, so boards made before layers existed look the same.
import { getBounds, unionBounds } from "./geometry.js";

export const zOf = (o) => (Number.isFinite(o?.z) ? o.z : 0);

/** Bottom-to-top paint order: sorted by z, ties keep the order the objects were added in. */
export function paintOrder(list) {
  if (!list.some((o) => o.z)) return list;
  return list.map((o, i) => [o, i]).sort((a, b) => zOf(a[0]) - zOf(b[0]) || a[1] - b[1]).map((pair) => pair[0]);
}

/** The highest layer in use (never below 0), so a new object can be stacked on top of everything. */
export function topLayer(list) {
  let top = 0;
  for (const o of list) top = Math.max(top, zOf(o));
  return top;
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const ARRANGE_MODES = ["front", "forward", "backward", "back"];

/**
 * The new bottom-to-top order after moving the selected objects, or null when nothing would change.
 * `ordered` is the page's current paint order. Forward/backward step past the next object the selection
 * overlaps, so one click always changes what is visible.
 */
export function arrangeOrder(ordered, selectedIds, mode) {
  const ids = new Set(selectedIds);
  const chosen = ordered.filter((o) => ids.has(o.id));
  const rest = ordered.filter((o) => !ids.has(o.id));
  if (!chosen.length || !rest.length) return null;

  let next = null;
  if (mode === "front") next = [...rest, ...chosen];
  else if (mode === "back") next = [...chosen, ...rest];
  else if (mode === "forward" || mode === "backward") {
    const box = unionBounds(chosen.map(getBounds));
    let target = null;
    if (mode === "forward") {
      const from = ordered.reduce((last, o, i) => (ids.has(o.id) ? i : last), -1);
      for (let i = from + 1; i < ordered.length; i++) {
        if (!ids.has(ordered[i].id) && overlaps(getBounds(ordered[i]), box)) { target = ordered[i]; break; }
      }
    } else {
      const from = ordered.findIndex((o) => ids.has(o.id));
      for (let i = from - 1; i >= 0; i--) {
        if (!ids.has(ordered[i].id) && overlaps(getBounds(ordered[i]), box)) { target = ordered[i]; break; }
      }
    }
    if (!target) return null;
    const at = rest.indexOf(target);
    next = [...rest.slice(0, mode === "forward" ? at + 1 : at), ...chosen, ...rest.slice(mode === "forward" ? at + 1 : at)];
  }
  if (!next || next.every((o, i) => o === ordered[i])) return null;
  return next;
}

/** Store ops (small `z` updates) that make `ordered` the page's order. Only objects whose z changes are touched. */
export function arrangeOps(ordered, selectedIds, mode) {
  const next = arrangeOrder(ordered, selectedIds, mode);
  if (!next) return [];
  const ops = [];
  next.forEach((o, i) => { if (zOf(o) !== i) ops.push({ op: "update", id: o.id, patch: { z: i } }); });
  return ops;
}
