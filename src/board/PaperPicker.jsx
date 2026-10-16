// Host control for the page paper (dots, graph paper, number plane ...). Lives next to the page
// buttons because paper belongs to a page. Each option shows a real preview drawn by the same code
// that paints the board, so what you tap is what you get.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Grid3x3 } from "lucide-react";
import { DEFAULT_PAPER, PAPER_KINDS, PAPER_SCALES, PLANE_ORIGIN, drawPaper, paperId } from "./paper.js";

const PREVIEW = { w: 92, h: 60, k: 0.9 };

function PaperPreview({ kind, scale }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PREVIEW.w * dpr;
    canvas.height = PREVIEW.h * dpr;
    const ctx = canvas.getContext("2d");
    const view = { x: PLANE_ORIGIN.x - PREVIEW.w / PREVIEW.k / 2, y: PLANE_ORIGIN.y - PREVIEW.h / PREVIEW.k / 2, k: PREVIEW.k };
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * view.k, 0, 0, dpr * view.k, -view.x * view.k * dpr, -view.y * view.k * dpr);
    drawPaper(ctx, view, PREVIEW.w, PREVIEW.h, kind, scale);
  }, [kind, scale]);
  return <canvas ref={ref} style={{ width: PREVIEW.w }} className="block h-auto max-w-full rounded border border-line" aria-hidden="true" />;
}

export default function PaperPicker({ store, page, pageCount }) {
  const [open, setOpen] = useState(false);
  const [allPages, setAllPages] = useState(false);
  const rootRef = useRef(null);
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  const current = store.paperFor(page);
  const kind = current?.kind || DEFAULT_PAPER.kind;
  const scale = current?.scale || DEFAULT_PAPER.scale;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const apply = (nextKind, nextScale) => {
    const pages = allPages ? Array.from({ length: pageCount }, (_, index) => index) : [page];
    const ops = pages.map((target) => {
      const id = paperId(target);
      return store.get(id)
        ? { op: "update", id, patch: { kind: nextKind, scale: nextScale } }
        : { op: "add", obj: { id, type: "paper", page: target, kind: nextKind, scale: nextScale } };
    });
    store.commit(ops); // one undo step, even for every page at once
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Page paper"
        aria-expanded={open}
        title="Paper: dots, graph paper, number plane…"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken ${open ? "bg-sunken" : ""}`}
      >
        <Grid3x3 size={15} />
      </button>
      {open && (
        <div role="dialog" aria-label="Page paper" className="float-panel absolute bottom-full right-0 z-20 mb-2 w-[min(20.5rem,calc(100vw-1.5rem))] p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Paper</h3>
            <span className="text-[11px] text-muted">{allPages ? "All pages" : `Page ${page + 1}`}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PAPER_KINDS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => apply(item.id, scale)}
                aria-pressed={kind === item.id}
                title={item.hint}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-md p-1 text-xs ${kind === item.id ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-sunken"}`}
              >
                <PaperPreview kind={item.id} scale={scale} />
                <span className="w-full truncate text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
          {kind !== "blank" && (
            <div className="mt-3">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">Square size</div>
              <div role="group" aria-label="Square size" className="flex rounded-md bg-sunken p-0.5">
                {PAPER_SCALES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={scale === item.id}
                    onClick={() => apply(kind, item.id)}
                    className={`h-8 flex-1 rounded text-sm ${scale === item.id ? "bg-white font-medium shadow-sm" : "text-gray-700 hover:text-ink"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={allPages} onChange={(e) => setAllPages(e.target.checked)} className="h-4 w-4" />
            Use on all {pageCount} {pageCount === 1 ? "page" : "pages"}
          </label>
        </div>
      )}
    </div>
  );
}
