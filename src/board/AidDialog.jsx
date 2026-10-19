// "Add math aid" picker: three cards, each with a live preview drawn by the same code as the board.
import { useEffect, useRef } from "react";
import { drawAid } from "./aidRender.js";
import { AID_KINDS, newAid } from "./mathAids.js";
import { INSTRUMENTS, instrumentBounds, newInstrument } from "./geometryTools.js";
import { drawInstrument } from "./instrumentRender.js";
import { drawStats } from "./statsRender.js";
import { drawCover, newCover } from "./cover.js";
import { CHARTS, newStats } from "./stats.js";
import { SOLIDS } from "./solids.js";

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

/** A cover as students see it. */
function CoverPreview() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const cover = { ...newCover({ id: "preview", page: 0, cx: 0, cy: 0 }), x: 0, y: 0, w: 360, h: 170 };
    const k = PREVIEW_WIDTH / cover.w;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PREVIEW_WIDTH * dpr;
    canvas.height = Math.ceil(cover.h * k * dpr);
    canvas.style.aspectRatio = `${PREVIEW_WIDTH} / ${cover.h * k}`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    drawCover(ctx, cover, "listener", 1);
  }, []);
  return <canvas ref={ref} className="block h-auto w-full rounded-lg bg-white" aria-hidden="true" />;
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

const SOLID_ART = {
  cube: <><polygon points="60,10 95,28 60,46 25,28" /><polygon points="25,28 60,46 60,64 25,46" /><polygon points="60,46 95,28 95,46 60,64" /></>,
  cuboid: <><polygon points="14,28 54,14 106,26 66,40" /><polygon points="14,28 66,40 66,62 14,50" /><polygon points="66,40 106,26 106,48 66,62" /></>,
  sphere: <><circle cx="60" cy="36" r="28" /><ellipse cx="60" cy="36" rx="28" ry="9" /><ellipse cx="60" cy="36" rx="10" ry="28" /></>,
  cylinder: <><ellipse cx="60" cy="18" rx="26" ry="8" /><path d="M34 18v36a26 8 0 0 0 52 0V18" /></>,
  cone: <><path d="M34 52L60 8l26 44" /><ellipse cx="60" cy="52" rx="26" ry="9" /></>,
  pyramid: <><polygon points="60,8 22,48 58,64" /><polygon points="60,8 58,64 100,48" /><path d="M60 8L64 38M22 48l42-10 36 10" strokeDasharray="3 3" fill="none" /></>,
  prism: <><polygon points="16,60 56,60 36,22" /><polygon points="56,60 106,48 86,10 36,22" /><path d="M16 60l50-12 40 0" strokeDasharray="3 3" fill="none" /></>,
};

function SolidPreview({ kind }) {
  return (
    <svg viewBox="0 0 120 72" className="block h-auto w-full rounded-lg bg-sunken" aria-hidden="true">
      <g fill="#2540D9" fillOpacity="0.14" stroke="#2540D9" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">{SOLID_ART[kind]}</g>
    </svg>
  );
}

export default function AidDialog({ onClose, onPick }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-safe pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-ink/40" role="dialog" aria-modal="true" aria-labelledby="aid-dialog-title" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="float-panel max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="aid-dialog-title" className="text-base font-semibold">Math aids, data, 3D solids and class tools</h3>
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
        <h4 className="mt-5 text-[11px] font-medium uppercase tracking-wider text-muted">3D solids</h4>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SOLIDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className="flex flex-col gap-2 rounded-lg border border-line bg-white p-2 text-left transition-colors hover:border-accent hover:bg-accent-soft focus-visible:border-accent"
            >
              <SolidPreview kind={item.id} />
              <span className="px-1 pb-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <h4 className="mt-5 text-[11px] font-medium uppercase tracking-wider text-muted">Class tools</h4>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onPick("cover")}
            className="flex flex-col gap-2 rounded-lg border border-line bg-white p-2 text-left transition-colors hover:border-accent hover:bg-accent-soft focus-visible:border-accent"
          >
            <CoverPreview />
            <span className="px-1 pb-1">
              <span className="block text-sm font-medium">Cover</span>
              <span className="block text-xs text-muted">Hide part of the board, then reveal it</span>
            </span>
          </button>
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
