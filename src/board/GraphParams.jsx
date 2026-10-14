// Sliders for the letters (a, b, c ...) used in a graph's equation, shown inside the graph settings.
// Dragging a slider updates the graph for everyone in the room; the play button sweeps a letter back
// and forth so students can watch what it does to the curve.
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, SlidersHorizontal } from "lucide-react";
import { paramSpec } from "./graphMath.js";

const SEND_EVERY_MS = 45; // keeps a fast drag from flooding the socket
const PLAY_SECONDS = 6; // one sweep from min to max
const LIMIT = 1_000_000;

const iconBtn = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-sunken hover:text-ink disabled:opacity-40";

/** A step that gives about 200 positions across the range, e.g. 0.1 for -10..10. */
function stepFor(min, max) {
  const raw = (max - min) / 200;
  if (!(raw > 0)) return 0.01;
  return Math.max(1e-6, 10 ** Math.floor(Math.log10(raw)));
}

const roundTo = (value, step) => {
  const decimals = Math.max(0, Math.min(8, Math.round(-Math.log10(step))));
  return Number((Math.round(value / step) * step).toFixed(decimals));
};

/** Number input that lets you type "-", "1." and so on without fighting the committed value. */
export function NumberBox({ value, onCommit, label, className = "", invalid = false }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? String(Number(Number(value).toFixed(4)));
  return (
    <input
      type="number"
      step="any"
      value={shown}
      aria-label={label}
      aria-invalid={invalid || undefined}
      onFocus={(e) => { setDraft(shown); e.target.select(); }}
      onChange={(e) => {
        setDraft(e.target.value);
        const next = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(next) && Math.abs(next) <= LIMIT) onCommit(next);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className={`rounded-md border bg-white px-1.5 text-xs tabular-nums ${invalid ? "border-danger" : "border-line"} ${className}`}
    />
  );
}

export default function GraphParams({ graph, names, store }) {
  const graphId = graph.id;
  const [local, setLocal] = useState({}); // values shown while a change is on its way to the store
  const [playing, setPlaying] = useState(null);
  const [editing, setEditing] = useState(null);

  const pending = useRef({});
  const timer = useRef(null);
  const lastSend = useRef(0);
  const live = useRef({}); // newest value per letter, readable between renders

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    const changes = pending.current;
    pending.current = {};
    const letters = Object.keys(changes);
    if (!letters.length) return;
    const current = store.get(graphId);
    if (!current) return;
    const params = { ...(current.params || {}) };
    for (const name of letters) params[name] = { ...paramSpec(current, name), ...changes[name] };
    lastSend.current = performance.now();
    // Coalesced: a whole drag (or one play-through) is a single Ctrl+Z step
    store.commit([{ op: "update", id: graphId, patch: { params } }], { coalesce: `graph-params:${graphId}` });
    setLocal({});
  }, [store, graphId]);

  const send = useCallback((name, partial) => {
    pending.current[name] = { ...pending.current[name], ...partial };
    if (partial.value !== undefined) live.current[name] = partial.value;
    setLocal((state) => ({ ...state, [name]: { ...state[name], ...partial } }));
    const wait = SEND_EVERY_MS - (performance.now() - lastSend.current);
    if (wait <= 0) flush();
    else if (!timer.current) timer.current = setTimeout(flush, wait);
  }, [flush]);

  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => { clearTimeout(timer.current); flushRef.current(); }, []);

  const specOf = (name) => ({ ...paramSpec(graph, name), ...local[name] });
  const specRef = useRef(specOf);
  specRef.current = specOf;

  /* Play: sweep one letter between its min and max, bouncing at the ends */
  const namesKey = names.join("");
  useEffect(() => {
    if (!playing) return undefined;
    if (!namesKey.includes(playing)) { setPlaying(null); return undefined; }
    const start = specRef.current(playing);
    const state = { value: live.current[playing] ?? start.value, dir: 1 };
    let last = performance.now();
    let frame = 0;
    const tick = (now) => {
      const spec = specRef.current(playing);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      state.value += state.dir * ((spec.max - spec.min) * dt) / PLAY_SECONDS;
      if (state.value >= spec.max) { state.value = spec.max; state.dir = -1; }
      else if (state.value <= spec.min) { state.value = spec.min; state.dir = 1; }
      send(playing, { value: Number(state.value.toFixed(3)) });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, namesKey, send]);

  if (!names.length) return null;

  const setRange = (name, spec, edge, raw) => {
    const min = edge === "min" ? raw : spec.min;
    const max = edge === "max" ? raw : spec.max;
    if (!(min < max)) return;
    send(name, { min, max, value: Math.max(min, Math.min(max, spec.value)) });
  };

  return (
    <section aria-label="Sliders" className="space-y-2 rounded-md border border-line bg-paper p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Sliders</div>
        <div className="text-[11px] text-muted">Drag to change a letter</div>
      </div>
      {names.map((name) => {
        const spec = specOf(name);
        const step = stepFor(spec.min, spec.max);
        const isPlaying = playing === name;
        return (
          <div key={name} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-center font-display text-lg italic leading-none" aria-hidden="true">{name}</span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={step}
                value={Math.max(spec.min, Math.min(spec.max, spec.value))}
                onPointerDown={() => setPlaying(null)}
                onChange={(e) => send(name, { value: roundTo(Number(e.target.value), step) })}
                aria-label={`Value of ${name}`}
                className="h-8 min-w-0 flex-1"
              />
              <NumberBox
                value={spec.value}
                label={`Type a value for ${name}`}
                onCommit={(value) => { setPlaying(null); send(name, { value }); }}
                className="h-8 w-[4.25rem] text-right"
              />
              <button
                type="button"
                onClick={() => setPlaying(isPlaying ? null : name)}
                aria-label={isPlaying ? `Stop animating ${name}` : `Animate ${name}`}
                aria-pressed={isPlaying}
                title={isPlaying ? "Stop" : "Animate"}
                className={`${iconBtn} ${isPlaying ? "bg-accent-soft text-accent" : ""}`}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setEditing(editing === name ? null : name)}
                aria-label={`Range of ${name}`}
                aria-expanded={editing === name}
                title="Slider range"
                className={`${iconBtn} ${editing === name ? "bg-sunken text-ink" : ""}`}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
            {editing === name && (
              <div className="ml-7 flex items-center gap-2 text-[11px] text-muted">
                <span>from</span>
                <NumberBox value={spec.min} label={`Minimum of ${name}`} onCommit={(v) => setRange(name, spec, "min", v)} className="h-7 w-16" />
                <span>to</span>
                <NumberBox value={spec.max} label={`Maximum of ${name}`} onCommit={(v) => setRange(name, spec, "max", v)} className="h-7 w-16" />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
