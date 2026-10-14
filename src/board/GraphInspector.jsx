// Graph settings, organised in tabs and applied live (debounced), so the presenter can watch the
// graph change while typing instead of pressing "Apply". Rendered inside the properties dock.
import { useCallback, useEffect, useRef, useState } from "react";
import { PALETTE, uid } from "./constants.js";
import { fitGraphRanges, scanParamNames } from "./graphMath.js";
import GraphParams from "./GraphParams.jsx";
import GraphExplore from "./GraphExplore.jsx";
import {
  GRAPH_ELEMENT_FIELDS, MODE_LABELS, buildGraphPatch, graphToForm, is3dMode, isMultiInputMode, normalizeEquation, validateGraphExpressions,
} from "./graphValidation.js";
import { Swatches } from "./Toolbar.jsx";

const DEBOUNCE_MS = 450;

const inputCls = "mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm";
const numberCls = "mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-sm";
const chipCls = "h-7 rounded-md border border-line px-2 text-xs hover:bg-sunken disabled:opacity-50";

const PLACEHOLDERS = {
  explicit: "y = sin(x)", implicit: "x^2 + y^2 = 25", polar: "2 + cos(5t)", surface3d: "x^2 - y^2",
  inequality: "y > 2x + 1\nx^2 + y^2 <= 16",
};

const TAB_LABELS = { equation: "Equation", range: "Range", explore: "Explore", geometry: "Geometry", view3d: "3D view" };

// One-tap starting points that show off sliders
const SLIDER_EXAMPLES = ["a*x^2 + b*x + c", "a*sin(b*x)", "a*(x-h)^2 + k"];

function signatureOf(graph) {
  const result = buildGraphPatch(graph.mode || "explicit", graphToForm(graph), graph.geometry || []);
  return result.ok ? JSON.stringify(result.patch) : `invalid:${graph.id}`;
}

const FieldLabel = ({ children }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</div>;

export default function GraphInspector({ graph, store, peek = false, onExpand }) {
  const mode = graph.mode || "explicit";
  const is3d = is3dMode(mode);
  const [form, setForm] = useState(() => graphToForm(graph));
  const [geometry, setGeometry] = useState(() => graph.geometry || []);
  const [tab, setTab] = useState("equation");
  const [problem, setProblem] = useState(null); // { section, message }
  const [pending, setPending] = useState(false);

  const latest = useRef({ graph, mode, form, geometry });
  latest.current = { graph, mode, form, geometry };
  const committed = useRef(signatureOf(graph));
  const timer = useRef(null);
  const touched = useRef(false);
  const pendingRef = useRef(false);

  const apply = useCallback(() => {
    clearTimeout(timer.current);
    pendingRef.current = false;
    const { graph: g, mode: m, form: f, geometry: geo } = latest.current;
    const result = buildGraphPatch(m, f, geo);
    setPending(false);
    if (!result.ok) {
      setProblem({ section: result.section, message: result.message });
      return;
    }
    setProblem(null);
    const signature = JSON.stringify(result.patch);
    if (signature === committed.current || !store.get(g.id)) return;
    committed.current = signature;
    // Coalesced so a burst of live edits is a single Ctrl+Z step
    store.commit([{ op: "update", id: g.id, patch: result.patch }], { coalesce: `graph:${g.id}` });
  }, [store]);

  const applyRef = useRef(apply);
  applyRef.current = apply;

  /* Pick up changes made elsewhere (undo, dragging the 3D camera) without fighting our own commits */
  useEffect(() => {
    const signature = signatureOf(graph);
    if (signature === committed.current) return;
    committed.current = signature;
    clearTimeout(timer.current);
    pendingRef.current = false;
    touched.current = false;
    setForm(graphToForm(graph));
    setGeometry(graph.geometry || []);
    setProblem(null);
    setPending(false);
  }, [graph]);

  /* Debounced live apply after the user edits something */
  useEffect(() => {
    if (!touched.current) return;
    touched.current = false;
    pendingRef.current = true;
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => applyRef.current(), DEBOUNCE_MS);
  }, [form, geometry]);

  /* Switching graphs or closing the panel must not drop a half-finished edit */
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (pendingRef.current) applyRef.current();
  }, []);

  const setField = (name, value) => {
    touched.current = true;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const setRanges = (next) => {
    touched.current = true;
    setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])) }));
  };
  const changeGeometry = (updater) => {
    touched.current = true;
    setGeometry(updater);
  };

  const addGeometry = (kind) => {
    const label = kind === "point" ? `P${geometry.length + 1}` : kind === "vector" ? `v${geometry.length + 1}` : `${kind[0].toUpperCase()}${geometry.length + 1}`;
    const element = { id: uid(), kind, label };
    if (kind === "polygon") {
      element.vertices = [[-2, -1], [2, -1], [0, 2]];
      element.filled = true;
    } else if (kind === "angle") {
      Object.assign(element, { ax: -1, ay: 0, vx: 0, vy: 0, cx: 0, cy: 1, angleUnit: "degrees" });
    } else {
      for (const field of GRAPH_ELEMENT_FIELDS[kind]) element[field] = field === "x2" || field === "dy" ? 1 : 0;
    }
    changeGeometry((current) => (current.length < 24 ? [...current, element] : current));
  };
  const updateGeometry = (id, field, value) => changeGeometry((current) => current.map((el) => (el.id === id ? { ...el, [field]: value } : el)));

  const fitCurve = () => {
    const current = {
      ...graph, mode, expression: normalizeEquation(mode, form.expression),
      xExpression: form.xExpression, yExpression: form.yExpression, zExpression: form.zExpression,
      tMin: Number(form.tMin), tMax: Number(form.tMax), uMin: Number(form.uMin), uMax: Number(form.uMax), vMin: Number(form.vMin), vMax: Number(form.vMax),
      xMin: Number(form.xMin), xMax: Number(form.xMax), yMin: Number(form.yMin), yMax: Number(form.yMax),
    };
    if (![current.xMin, current.xMax, current.yMin, current.yMax, current.tMin, current.tMax, current.uMin, current.uMax, current.vMin, current.vMax].every(Number.isFinite)
      || current.xMin >= current.xMax || current.yMin >= current.yMax || current.tMin >= current.tMax
      || current.uMin >= current.uMax || current.vMin >= current.vMax) {
      setProblem({ section: "range", message: "Set valid x, y and parameter ranges before fitting the graph." });
      return;
    }
    try {
      validateGraphExpressions(current);
      setRanges(fitGraphRanges(current));
      setProblem(null);
    } catch (err) {
      setProblem({ section: "equation", message: err instanceof Error ? err.message : "Could not fit this graph." });
    }
  };

  const setColour = (color) => store.commit([{ op: "update", id: graph.id, patch: { color } }], { coalesce: `graph-color:${graph.id}` });

  const parametric = ["parametric", "curve3d", "parametricSurface3d"].includes(mode);
  const var1 = mode === "parametricSurface3d" ? "u, v" : "t";

  // Letters like a, b, c in the equation become sliders (read from the text being typed, so they appear at once)
  const paramNames = scanParamNames(...(parametric ? [form.xExpression, form.yExpression, ...(is3d ? [form.zExpression] : [])] : [form.expression]));
  const sliders = <GraphParams graph={graph} names={paramNames} store={store} />;

  const textInput = (name, label, aria) => (
    <label className="block text-xs font-medium">{label}
      <input value={form[name]} onChange={(e) => setField(name, e.target.value)} className={inputCls} aria-label={aria} spellCheck={false} autoComplete="off" />
    </label>
  );

  const equationFields = (
    <div className="space-y-2.5">
      {parametric ? (
        <>
          {textInput("xExpression", `x(${var1})`, "Parametric x equation")}
          {textInput("yExpression", `y(${var1})`, "Parametric y equation")}
          {is3d && textInput("zExpression", `z(${var1})`, "Parametric z equation")}
        </>
      ) : (
        <label className="block text-xs font-medium">
          {is3d ? "Surface z = f(x, y)" : mode === "polar" ? "Radius r(t)" : mode === "inequality" ? "Inequalities (one per line)" : "Equation"}
          {mode === "inequality" ? (
            <textarea rows={4} value={form.expression} onChange={(e) => setField("expression", e.target.value)} placeholder={PLACEHOLDERS.inequality}
              className="mt-1 w-full resize-y rounded-md border border-line bg-white px-2 py-2 text-sm" aria-label="Graph inequalities" spellCheck={false} />
          ) : (
            <input value={form.expression} onChange={(e) => setField("expression", e.target.value)} placeholder={PLACEHOLDERS[mode] || PLACEHOLDERS.explicit}
              className={inputCls} aria-label="Graph equation" spellCheck={false} autoComplete="off" />
          )}
        </label>
      )}
    </div>
  );

  const numberField = (name, label) => (
    <label key={name} className="text-xs font-medium">{label}
      <input type="number" step="any" value={form[name]} onChange={(e) => setField(name, e.target.value)} className={numberCls} />
    </label>
  );

  /* ------------------------------ compact (phone peek) ------------------------------ */
  if (peek) {
    if (isMultiInputMode(mode)) {
      return (
        <div className="space-y-2">
          <button type="button" onClick={onExpand} className="flex h-10 w-full items-center justify-between rounded-md border border-line px-3 text-sm hover:bg-sunken">
            <span>Edit {MODE_LABELS[mode].toLowerCase()}</span><span className="text-xs text-muted">Expand</span>
          </button>
          {sliders}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <form onSubmit={(e) => { e.preventDefault(); apply(); }} noValidate>
          {equationFields}
          {problem && <p role="alert" className="mt-1.5 text-xs text-danger">{problem.message}</p>}
        </form>
        {sliders}
      </div>
    );
  }

  const tabs = is3d ? ["equation", "range", "view3d"] : mode === "explicit" ? ["equation", "range", "explore", "geometry"] : ["equation", "range", "geometry"];
  const activeTab = tabs.includes(tab) ? tab : "equation";

  return (
    <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="space-y-3" aria-label="Graph settings" noValidate>
      <div role="tablist" aria-label="Graph settings sections" className="flex border-b border-line">
        {tabs.map((id) => (
          <button
            key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setTab(id)}
            className={`relative -mb-px flex-1 border-b-2 px-2 pb-2 pt-1 text-xs font-medium ${activeTab === id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {TAB_LABELS[id]}
            {problem?.section === id && <span className="absolute right-1.5 top-0.5 h-1.5 w-1.5 rounded-full bg-danger" aria-label="Has an error" />}
          </button>
        ))}
      </div>

      {activeTab === "equation" && (
        <div className="space-y-3">
          {equationFields}
          <p className="text-[11px] text-muted">Use x, + - * / ^, parentheses, pi, e and supported functions. Letters like a, b, c become sliders. Changes appear on the board as you type.</p>
          {sliders}
          {mode === "explicit" && paramNames.length === 0 && (
            <div>
              <FieldLabel>Try a slider equation</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {SLIDER_EXAMPLES.map((example) => (
                  <button key={example} type="button" className={`${chipCls} font-mono`} onClick={() => setField("expression", example)}>{example}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <FieldLabel>Colour</FieldLabel>
            <Swatches colors={PALETTE.filter((c) => c !== "#FFFFFF")} value={graph.color || "#2540D9"} onPick={setColour} />
          </div>
        </div>
      )}

      {activeTab === "explore" && mode === "explicit" && <GraphExplore graph={graph} store={store} />}

      {activeTab === "range" && (
        <div className="space-y-3">
          {(mode === "parametric" || mode === "polar" || mode === "curve3d") && (
            <div className="grid grid-cols-2 gap-2">{numberField("tMin", "t min")}{numberField("tMax", "t max")}</div>
          )}
          {mode === "parametricSurface3d" && (
            <div className="grid grid-cols-2 gap-2">{numberField("uMin", "u min")}{numberField("uMax", "u max")}{numberField("vMin", "v min")}{numberField("vMax", "v max")}</div>
          )}
          <div className="grid grid-cols-2 gap-2">{numberField("xMin", "x min")}{numberField("xMax", "x max")}{numberField("yMin", "y min")}{numberField("yMax", "y max")}</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chipCls} onClick={() => setRanges({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 })}>Standard</button>
            <button type="button" className={chipCls} onClick={() => setRanges({ xMin: -6.28, xMax: 6.28, yMin: -2, yMax: 2 })}>Trig</button>
            {mode !== "inequality" && !is3d && <button type="button" className={chipCls} onClick={fitCurve}>Fit curve</button>}
          </div>
        </div>
      )}

      {activeTab === "view3d" && is3d && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted">Drag inside the plot to rotate the 3D view. Camera changes are shared with listeners.</p>
          <div className="grid grid-cols-2 gap-2">{numberField("zMin", "z min")}{numberField("zMax", "z max")}</div>
          <label className="block text-xs font-medium">Camera angle ({Number(form.azimuth) || 0}°)
            <input type="range" min="0" max="360" step="1" value={Math.max(0, Math.min(360, Number(form.azimuth) || 0))} onChange={(e) => setField("azimuth", e.target.value)} className="mt-1 h-8 w-full" />
          </label>
          <label className="block text-xs font-medium">Camera elevation ({Number(form.elevation) || 32}°)
            <input type="range" min="12" max="82" step="1" value={Math.max(12, Math.min(82, Number(form.elevation) || 32))} onChange={(e) => setField("elevation", e.target.value)} className="mt-1 h-8 w-full" />
          </label>
        </div>
      )}

      {activeTab === "geometry" && !is3d && (
        <section className="space-y-2" aria-label="Coordinate geometry">
          <div className="flex flex-wrap gap-1">
            {Object.keys(GRAPH_ELEMENT_FIELDS).map((kind) => (
              <button key={kind} type="button" onClick={() => addGeometry(kind)} disabled={geometry.length >= 24} className={`${chipCls} capitalize`}>+ {kind}</button>
            ))}
          </div>
          {geometry.length === 0 && <p className="text-[11px] text-muted">Add points, vectors, segments, polygons or angles using graph coordinates.</p>}
          {geometry.map((element) => (
            <div key={element.id} className="space-y-1.5 rounded-md border border-line p-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-xs font-medium capitalize">{element.kind}</span>
                <input value={element.label || ""} onChange={(e) => updateGeometry(element.id, "label", e.target.value)} maxLength={24} aria-label={`${element.kind} label`} className="h-7 w-20 rounded-md border border-line bg-white px-1.5 text-xs" />
                <button type="button" onClick={() => changeGeometry((current) => current.filter((item) => item.id !== element.id))} aria-label={`Remove ${element.kind}`} className="h-7 rounded-md px-2 text-xs text-danger hover:bg-danger-soft">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {element.kind === "polygon" ? element.vertices.map((point, index) => (
                  <div key={index} className="col-span-2 grid grid-cols-2 gap-1.5">
                    {point.map((value, coordinate) => (
                      <label key={coordinate} className="text-[11px] text-muted">{`vertex ${index + 1} ${coordinate === 0 ? "x" : "y"}`}
                        <input type="number" step="any" value={value} onChange={(e) => changeGeometry((current) => current.map((item) => {
                          if (item.id !== element.id) return item;
                          const vertices = item.vertices.map((pair) => [...pair]);
                          vertices[index][coordinate] = e.target.value;
                          return { ...item, vertices };
                        }))} className="mt-0.5 h-7 w-full rounded-md border border-line bg-white px-1.5 text-xs text-ink" />
                      </label>
                    ))}
                  </div>
                )) : GRAPH_ELEMENT_FIELDS[element.kind].map((field) => (
                  <label key={field} className="text-[11px] text-muted">{field}
                    <input type="number" step="any" value={element[field]} onChange={(e) => updateGeometry(element.id, field, e.target.value)} className="mt-0.5 h-7 w-full rounded-md border border-line bg-white px-1.5 text-xs text-ink" />
                  </label>
                ))}
              </div>
              {element.kind === "polygon" && (
                <div className="flex items-center justify-between">
                  <button type="button" disabled={element.vertices.length >= 12} onClick={() => changeGeometry((current) => current.map((item) => (item.id === element.id && item.vertices.length < 12
                    ? { ...item, vertices: [...item.vertices, [...item.vertices.at(-1)]] } : item)))} className="text-[11px] text-accent disabled:opacity-50">Add vertex</button>
                  <button type="button" disabled={element.vertices.length <= 3} onClick={() => changeGeometry((current) => current.map((item) => (item.id === element.id && item.vertices.length > 3
                    ? { ...item, vertices: item.vertices.slice(0, -1) } : item)))} className="text-[11px] text-accent disabled:opacity-50">Remove last vertex</button>
                  <label className="flex items-center gap-1 text-[11px] text-muted"><input type="checkbox" checked={Boolean(element.filled)} onChange={(e) => updateGeometry(element.id, "filled", e.target.checked)} />Fill</label>
                </div>
              )}
              {element.kind === "angle" && (
                <label className="flex items-center gap-1 text-[11px] text-muted">Measure in
                  <select value={element.angleUnit || "degrees"} onChange={(e) => updateGeometry(element.id, "angleUnit", e.target.value)} className="h-7 rounded-md border border-line bg-white px-1 text-xs text-ink">
                    <option value="degrees">degrees</option><option value="radians">radians</option>
                  </select>
                </label>
              )}
              {(element.kind === "segment" || element.kind === "ray") && (
                <label className="flex items-center gap-1 text-[11px] text-muted"><input type="checkbox" checked={Boolean(element.showMeasure)} onChange={(e) => updateGeometry(element.id, "showMeasure", e.target.checked)} />Show length</label>
              )}
            </div>
          ))}
          <p className="text-[11px] text-muted">Vectors start at (x, y) and end at (x + dx, y + dy).</p>
        </section>
      )}

      {problem && (
        <div role="alert" className="rounded-md bg-danger-soft px-2.5 py-2 text-xs text-danger">
          {problem.message}
          {problem.section !== activeTab && tabs.includes(problem.section) && (
            <button type="button" onClick={() => setTab(problem.section)} className="ml-1.5 font-medium underline">Show</button>
          )}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted" aria-live="polite">
        <span className={`h-1.5 w-1.5 rounded-full ${problem ? "bg-danger" : pending ? "bg-amber-500" : "bg-ok"}`} />
        {problem ? "Not applied yet. Fix the error to update the graph." : pending ? "Updating…" : "Up to date"}
      </p>
    </form>
  );
}
