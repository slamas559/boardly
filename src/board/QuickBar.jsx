// A small bar that floats next to the current selection with the actions used most (colour,
// duplicate, delete, open properties), so the full panel can stay closed. It sits above the
// object, flips below when there is no room, and hides while the pointer is down so it never
// gets in the way of dragging, resizing or panning.
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { HIGHLIGHT_PALETTE, PALETTE } from "./constants.js";
import { getBounds, unionBounds } from "./geometry.js";
import { Swatches } from "./Toolbar.jsx";

const GAP = 10;
const EDGE = 8;

const iconButton = "flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-sunken";

export default function QuickBar({ tools, store, surfaceRef, inspector, view, size, safeLeft = EDGE, safeBottom = EDGE }) {
  const { selectedObjects, selectedIds, editingObj, group, activeStyle } = tools;
  const barRef = useRef(null);
  const [barSize, setBarSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e) => { if (!barRef.current?.contains(e.target)) setBusy(true); };
    const up = () => setBusy(false);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
    };
  }, []);

  const selectionKey = selectedIds.join(",");
  useEffect(() => { setPaletteOpen(false); }, [selectionKey]);

  // Track the bar's own size (its buttons change with the selection) to place it precisely
  const observer = useRef(null);
  const attachBar = useCallback((el) => {
    observer.current?.disconnect();
    observer.current = null;
    barRef.current = el;
    if (!el) return;
    const measure = () => setBarSize((prev) => (prev.w === el.offsetWidth && prev.h === el.offsetHeight ? prev : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(el);
  }, []);

  const objects = selectedObjects.filter(Boolean);
  const bounds = objects.length ? unionBounds(objects.map(getBounds)) : null;
  if (!bounds || editingObj || busy || !size.w || !size.h) return null;

  const left = (bounds.x - view.x) * view.k;
  const top = (bounds.y - view.y) * view.k;
  const width = bounds.w * view.k;
  const height = bounds.h * view.k;
  if (left > size.w || top > size.h || left + width < 0 || top + height < 0) return null;

  const graph = objects.length === 1 && objects[0].type === "graph" ? objects[0] : null;
  const formula = objects.length === 1 && objects[0].type === "equation" ? objects[0] : null;
  const aid = objects.length === 1 && objects[0].type === "aid" ? objects[0] : null;
  const chart = objects.length === 1 && objects[0].type === "stats" ? objects[0] : null;
  const own = graph || formula || aid || chart; // these keep their colour on the object itself
  const colour = graph ? graph.color || "#2540D9" : formula ? formula.color || "#17181C" : aid || chart ? (aid || chart).color || "#2540D9" : group && activeStyle ? activeStyle.color : null;
  const palette = own ? PALETTE.filter((c) => c !== "#FFFFFF") : group === "highlighter" || group === "markup" ? HIGHLIGHT_PALETTE : PALETTE;
  const pickColour = (c) => {
    if (own) store.commit([{ op: "update", id: own.id, patch: { color: c } }], { coalesce: `${graph ? "graph" : formula ? "equation" : aid ? "aid" : "stats"}-color:${own.id}` });
    else tools.setStyle({ color: c });
    setPaletteOpen(false);
  };
  const canDuplicate = !objects.some((o) => o.type === "markup");

  // Prefer above the object, then below, then tucked inside its top edge when it fills the view
  const barW = barSize.w || 160;
  const barH = barSize.h || 40;
  const above = top - barH - GAP >= EDGE;
  let y = above ? top - barH - GAP : top + height + GAP;
  if (!above && y + barH > size.h - safeBottom) y = Math.max(EDGE, Math.min(top + GAP, size.h - safeBottom - barH));
  const x = Math.max(safeLeft, Math.min(left + width / 2 - barW / 2, size.w - barW - EDGE));
  const alignRight = x + barW / 2 > size.w / 2;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div
        ref={attachBar}
        role="toolbar"
        aria-label="Selection actions"
        style={{ left: x, top: y }}
        className="float-panel pointer-events-auto absolute flex items-center gap-0.5 p-1"
      >
        {colour && (
          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            aria-label="Colour"
            aria-expanded={paletteOpen}
            title="Colour"
            className={`${iconButton} ${paletteOpen ? "bg-sunken" : ""}`}
          >
            <span className="h-5 w-5 rounded-[5px] border border-black/15" style={{ background: colour }} />
          </button>
        )}
        {!inspector.visible && (inspector.kind === "graph" || inspector.kind === "equation" || inspector.kind === "aid" || inspector.kind === "stats") && (
          <button type="button" onClick={() => inspector.open()} title={inspector.kind === "graph" ? "Edit graph" : inspector.kind === "equation" ? "Edit equation" : inspector.kind === "stats" ? "Edit chart" : "Edit math aid"} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-gray-700 hover:bg-sunken">
            <Pencil size={15} /> Edit
          </button>
        )}
        {!inspector.visible && inspector.kind === "style" && (
          <button type="button" onClick={() => inspector.open()} aria-label="More style options" title="More style options" className={iconButton}>
            <SlidersHorizontal size={16} />
          </button>
        )}
        {(colour || inspector.kind) && <div className="mx-0.5 h-5 w-px bg-line" />}
        {canDuplicate && (
          <button type="button" onClick={() => surfaceRef.current?.duplicate()} aria-label="Duplicate" title="Duplicate (Ctrl+D)" className={iconButton}>
            <Copy size={15} />
          </button>
        )}
        <button type="button" onClick={() => surfaceRef.current?.deleteSelected()} aria-label="Delete" title="Delete" className={`${iconButton} text-danger hover:bg-danger-soft`}>
          <Trash2 size={15} />
        </button>

        {paletteOpen && colour && (
          <div className={`float-panel absolute p-2.5 ${above ? "bottom-full mb-2" : "top-full mt-2"} ${alignRight ? "right-0" : "left-0"}`} style={{ width: 232 }}>
            <Swatches colors={palette} value={colour} onPick={pickColour} />
          </div>
        )}
      </div>
    </div>
  );
}
