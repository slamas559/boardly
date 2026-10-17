// Where the tool bar is docked. Shared by the board and the document view (one bar position for
// the whole room), remembered between visits. `null` means "use the default for this screen size".
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "boardly.toolbar.dock";
export const EDGES = ["left", "right", "top", "bottom"];
export const ALIGNS = ["start", "center", "end"];

// The bar can only be moved on a roomy screen (a laptop, desktop or large tablet). On phones, including a
// phone held sideways, it stays docked along the bottom and any position saved on a bigger screen is ignored.
const DOCK_MOVABLE_QUERY = "(min-width: 768px) and (min-height: 500px)";

export const defaultDock = (movable) => (movable ? { edge: "left", align: "start" } : { edge: "bottom", align: "center" });
export const resolveDock = (dock, movable) => (movable && dock ? dock : defaultDock(movable));
export const isVerticalDock = (dock) => dock.edge === "left" || dock.edge === "right";

const valid = (d) => d && EDGES.includes(d.edge) && ALIGNS.includes(d.align);

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return valid(parsed) ? { edge: parsed.edge, align: parsed.align } : null;
  } catch {
    return null;
  }
}

let current = typeof window === "undefined" ? null : read();
const listeners = new Set();

export function setToolbarDock(next) {
  current = valid(next) ? { edge: next.edge, align: next.align } : null;
  try {
    if (current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable: the position still applies for this visit */ }
  listeners.forEach((fn) => fn());
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const subscribeMovable = (fn) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(DOCK_MOVABLE_QUERY);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};
const readMovable = () => typeof window !== "undefined" && Boolean(window.matchMedia) && window.matchMedia(DOCK_MOVABLE_QUERY).matches;

/** True when the screen is big enough for the tool bar to be dragged to another edge. */
export function useDockMovable() {
  return useSyncExternalStore(subscribeMovable, readMovable, () => false);
}

/** [dock, setDock]: dock is `{ edge, align }` or null for the default. */
export function useToolbarDock() {
  const dock = useSyncExternalStore(subscribe, () => current, () => null);
  return [dock, setToolbarDock];
}

/** The dock closest to a point inside a box of size `box` (used when a drag is released). */
export function nearestDock(point, box) {
  const distances = [
    ["left", point.x],
    ["right", box.w - point.x],
    ["top", point.y],
    ["bottom", box.h - point.y],
  ];
  const edge = distances.reduce((best, d) => (d[1] < best[1] ? d : best))[0];
  const t = (edge === "left" || edge === "right" ? point.y / (box.h || 1) : point.x / (box.w || 1));
  const align = t < 1 / 3 ? "start" : t > 2 / 3 ? "end" : "center";
  return { edge, align };
}

/** Keyboard docking: arrows move the bar across edges or along the edge it sits on. */
export function stepDock(dock, key) {
  const along = (dir) => {
    const i = Math.max(0, Math.min(ALIGNS.length - 1, ALIGNS.indexOf(dock.align) + dir));
    return { edge: dock.edge, align: ALIGNS[i] };
  };
  const vertical = isVerticalDock(dock);
  switch (key) {
    case "ArrowLeft": return vertical ? { edge: "left", align: dock.align } : along(-1);
    case "ArrowRight": return vertical ? { edge: "right", align: dock.align } : along(1);
    case "ArrowUp": return vertical ? along(-1) : { edge: "top", align: dock.align };
    case "ArrowDown": return vertical ? along(1) : { edge: "bottom", align: dock.align };
    default: return dock;
  }
}

export const describeDock = (dock) => `Toolbar docked ${dock.edge}, ${dock.align === "center" ? "centred" : `at the ${dock.align}`}`;
