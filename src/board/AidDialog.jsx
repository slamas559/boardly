// "Add math aid" picker: three cards, each with a live preview drawn by the same code as the board.
import { useEffect, useRef } from "react";
import { drawAid } from "./aidRender.js";
import { AID_KINDS, newAid } from "./mathAids.js";
import { INSTRUMENTS, instrumentBounds, newInstrument } from "./geometryTools.js";
import { drawInstrument } from "./instrumentRender.js";
import { drawStats } from "./statsRender.js";
import { CHARTS, newStats } from "./stats.js";

const PREVIEW_WIDTH = 288;

// What each card shows: the real default aid, with a little something already on it
const sample = (kind) => {
  const aid = newAid(kind, { id: "preview", page: 0, cx: 0, cy: 0 });
  const placed = { ...aid, x: 0, y: 0 };
  if (kind === "numberline") return { ...placed, marks: [3], jumps: [{ from: 0, to: 3 }] };
  if (kind === "fractions") return { ...placed, bars: [{ parts: 4, shaded: 3 }] };
  return placed;
};

function AidPreview({ kind }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const aid = sample(kind);
    const k = PREVIEW_WIDTH / aid.w;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PREVIEW_WIDTH * dpr;
    canvas.height = Math.ceil(aid.h * k * dpr);
    canvas.style.aspectRatio = `${PREVIEW_WIDTH} / ${aid.h * k}`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    drawAid(ctx, aid);
  }, [kind]);
  return <canvas ref={ref} className="block h-auto w-full rounded-lg" aria-hidden="true" />;
}

/** A statistics chart with its example data. */
function ChartPreview({ chart }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const stats = { ...newStats(chart, { id: "preview", page: 0, cx: 0, cy: 0 }), x: 0, y: 0, showStats: false };
    const k = PREVIEW_WIDTH / stats.w;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PREVIEW_WIDTH * dpr;
    canvas.height = Math.ceil(stats.h * k * dpr);
    canvas.style.aspectRatio = `${PREVIEW_WIDTH} / ${stats.h * k}`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    drawStats(ctx, stats);
  }, [chart]);
  return <canvas ref={ref} className="block h-auto w-full rounded-lg" aria-hidden="true" />;
}

/** A geometry instrument, scaled to fit its card. */
function InstrumentPreview({ kind }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const instrument = { ...newInstrument(kind, { id: "preview", page: 0, cx: 0, cy: 0 }), angle: kind === "ruler" ? -12 : 0 };
    const bounds = instrumentBounds(instrument);
    const width = 150;
    const pad = 10;
    const k = (width - pad * 2) / bounds.w;
    const height = Math.round(bounds.h * k + pad * 2);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.aspectRatio = `${width} / ${height}`;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#faf9f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (pad - bounds.x * k), dpr * (pad - bounds.y * k));
    drawInstrument(ctx, instrument);
  }, [kind]);
  return <canvas ref={ref} className="block h-auto w-full rounded-lg" aria-hidden="true" />;
}

export default function AidDialog({ onClose, onPick }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="aid-dialog-title" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="float-panel max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="aid-dialog-title" className="text-base font-semibold">Math aids, data and tools</h3>
            <p className="mt-0.5 text-sm text-muted">Drop one on the board, then change it live while you teach.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-sunken">Close</button>
        </div>
        <h4 className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted">Math aids</h4>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {AID_KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className="flex flex-col gap-2 rounded-lg border border-line bg-white p-2 text-left transition-colors hover:border-accent hover:bg-accent-soft focus-visible:border-accent"
            >
              <AidPreview kind={item.id} />
              <span className="px-1 pb-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <h4 className="mt-5 text-[11px] font-medium uppercase tracking-wider text-muted">Data and statistics</h4>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {CHARTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className="flex flex-col gap-2 rounded-lg border border-line bg-white p-2 text-left transition-colors hover:border-accent hover:bg-accent-soft focus-visible:border-accent"
            >
              <ChartPreview chart={item.id} />
              <span className="px-1 pb-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <h4 className="mt-5 text-[11px] font-medium uppercase tracking-wider text-muted">Geometry tools</h4>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {INSTRUMENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className="flex flex-col gap-2 rounded-lg border border-line bg-white p-2 text-left transition-colors hover:border-accent hover:bg-accent-soft focus-visible:border-accent"
            >
              <InstrumentPreview kind={item.id} />
              <span className="px-1 pb-1">
                <span className="block text-sm font-medium leading-snug">{item.label}</span>
                <span className="block text-xs leading-snug text-muted">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
