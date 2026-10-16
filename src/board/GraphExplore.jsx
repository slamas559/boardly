// "Explore" tab of the graph settings: a trace point you can drag along the curve (with its tangent
// line) and automatic key points (roots, y-intercept, highs and lows). Explicit graphs y = f(x) only.
import { useMemo } from "react";
import { findKeyPoints, formatNumber, tracePoint } from "./graphAnalysis.js";
import { NumberBox } from "./GraphParams.jsx";

export function ToggleRow({ checked, onChange, title, hint, disabled = false }) {
  return (
    <label className={`flex items-start gap-2.5 rounded-md border px-2.5 py-2 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-sunken"} ${checked ? "border-accent/40 bg-accent-soft" : "border-line"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug">{title}</span>
        <span className="block text-[11px] leading-snug text-muted">{hint}</span>
      </span>
    </label>
  );
}

const Stat = ({ label, value }) => (
  <div className="min-w-0 flex-1 rounded-md bg-sunken px-2 py-1.5">
    <div className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</div>
    <div className="truncate text-sm font-medium tabular-nums">{value}</div>
  </div>
);

export default function GraphExplore({ graph, store }) {
  const commit = (patch) => store.commit([{ op: "update", id: graph.id, patch }], { coalesce: `graph-explore:${graph.id}` });
  const trace = graph.trace || null;
  const span = graph.xMax - graph.xMin;

  const readout = useMemo(() => (trace ? tracePoint(graph, 100, 100) : null), [graph, trace]);

  const found = useMemo(
    () => (graph.keyPoints ? findKeyPoints(graph) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.keyPoints, graph.expression, graph.xMin, graph.xMax, graph.yMin, graph.yMax, graph.params],
  );

  const startTrace = () => commit({ trace: { x: Number((graph.xMin + span * 0.65).toFixed(2)), tangent: false } });
  const empty = found && !found.roots.length && !found.extrema.length && !found.yIntercept;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <ToggleRow
          checked={Boolean(trace)}
          onChange={(on) => (on ? startTrace() : commit({ trace: null }))}
          title="Trace point"
          hint="A dot on the curve that reads out (x, y). Drag it on the board."
        />
        {trace && (
          <div className="space-y-2.5 rounded-md border border-line p-2.5">
            <div className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-center font-display text-lg italic leading-none" aria-hidden="true">x</span>
              <input
                type="range"
                min={graph.xMin}
                max={graph.xMax}
                step={span / 400}
                value={Math.max(graph.xMin, Math.min(graph.xMax, trace.x))}
                onChange={(e) => commit({ trace: { ...trace, x: Number(Number(e.target.value).toFixed(4)) } })}
                aria-label="Trace point x position"
                className="h-8 min-w-0 flex-1"
              />
              <NumberBox
                value={trace.x}
                label="Trace point x value"
                onCommit={(x) => commit({ trace: { ...trace, x: Math.max(graph.xMin, Math.min(graph.xMax, x)) } })}
                className="h-8 w-[4.25rem] text-right"
              />
            </div>
            {readout ? (
              <div className="flex gap-1.5" aria-live="polite">
                <Stat label="x" value={formatNumber(readout.x)} />
                <Stat label="y" value={formatNumber(readout.y)} />
                <Stat label="slope" value={formatNumber(readout.slope)} />
              </div>
            ) : (
              <p className="text-[11px] text-muted">The curve has no value at this x. Move the dot to another position.</p>
            )}
            <ToggleRow
              checked={Boolean(trace.tangent)}
              onChange={(tangent) => commit({ trace: { ...trace, tangent } })}
              title="Tangent line"
              hint="Draws the line that just touches the curve at the dot."
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <ToggleRow
          checked={Boolean(graph.keyPoints)}
          onChange={(on) => commit({ keyPoints: on })}
          title="Key points"
          hint="Marks roots, the y-intercept, highs and lows on the curve."
        />
        {found && (
          <div className="space-y-1 rounded-md border border-line p-2.5 text-xs" aria-live="polite">
            {empty && <p className="text-muted">No key points in the visible window. Try widening the range.</p>}
            {found.roots.length > 0 && (
              <p><span className="font-medium">Roots</span> <span className="tabular-nums text-muted">x = {found.roots.map((p) => formatNumber(p.x)).join(", ")}</span></p>
            )}
            {found.yIntercept && (
              <p><span className="font-medium">Y-intercept</span> <span className="tabular-nums text-muted">(0, {formatNumber(found.yIntercept.y)})</span></p>
            )}
            {found.extrema.map((p) => (
              <p key={`${p.kind}-${p.x}`}>
                <span className="font-medium">{p.kind === "max" ? "Maximum" : "Minimum"}</span>{" "}
                <span className="tabular-nums text-muted">({formatNumber(p.x)}, {formatNumber(p.y)})</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
