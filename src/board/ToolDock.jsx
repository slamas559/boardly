// Places the tool rail and style panel: left rail on desktop, bottom dock on phones.
import { useEffect, useState } from "react";
import { compileExpression, compileImplicitEquation, compileInequalitySystem, fitGraphRanges } from "./graphMath.js";
import { StylePanel, ToolRail } from "./Toolbar.jsx";
import { uid } from "./constants.js";

export default function ToolDock({ mode, tools, store, surfaceRef, onCreateGraph, onCreateTable }) {
  const [sheetOpen, setSheetOpen] = useState(false); // phone bottom sheet
  const [collapsed, setCollapsed] = useState(false); // desktop side panel, dismissed by the presenter
  const [insertDialog, setInsertDialog] = useState(null);
  const { tool, setTool, lastShape, keepTool, setKeepTool, group, activeStyle, setStyle, selectedIds, selectedObjects } = tools;
  const selectedGraph = selectedObjects.length === 1 && selectedObjects[0].type === "graph" ? selectedObjects[0] : null;
  const showPanel = Boolean(group && activeStyle && !["eraser", "laser", "select", "pan"].includes(tool)) || selectedIds.length > 0 || Boolean(tools.editingObj);

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 safe-bottom md:bottom-auto md:right-auto md:left-3 md:top-3">
      <div className="pointer-events-auto relative">
        {selectedGraph && <GraphInspector key={selectedGraph.id} graph={selectedGraph} store={store} />}
        {showPanel && (
          <StylePanel
            mode={mode}
            group={group}
            style={activeStyle}
            onChange={setStyle}
            selectionCount={selectedIds.length}
            onDelete={() => surfaceRef.current?.deleteSelected()}
            onDuplicate={() => surfaceRef.current?.duplicate()}
            open={sheetOpen}
            collapsed={collapsed}
            onClose={() => { setSheetOpen(false); setCollapsed(true); }}
          />
        )}
        <ToolRail
          mode={mode}
          tool={tool}
          onTool={(t) => { setTool(t); setSheetOpen(false); }}
          lastShape={lastShape}
          canUndo={store.canUndo}
          canRedo={store.canRedo}
          onUndo={() => store.undo()}
          onRedo={() => store.redo()}
          keepTool={keepTool}
          onKeepTool={() => setKeepTool((v) => !v)}
          onCreateGraph={() => setInsertDialog("graph")}
          onCreateTable={() => setInsertDialog("table")}
          hasStyle={showPanel}
          styleSwatch={activeStyle?.color}
          styleOpen={sheetOpen || !collapsed}
          onStyleToggle={() => {
            const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
            if (desktop) setCollapsed((v) => !v);
            else setSheetOpen((v) => !v);
          }}
        />
      </div>
      {insertDialog && (
        <InsertDialog
          kind={insertDialog}
          onClose={() => setInsertDialog(null)}
          onCreate={(...args) => {
            if (insertDialog === "graph") onCreateGraph(...args);
            else onCreateTable(...args);
            setInsertDialog(null);
          }}
        />
      )}
    </div>
  );
}

function validateGraphExpressions({ mode, expression, xExpression, yExpression, zExpression }) {
  if (mode === "implicit") compileImplicitEquation(expression);
  else if (mode === "inequality") compileInequalitySystem(expression);
  else if (mode === "surface3d") compileExpression(expression, ["x", "y"]);
  else if (mode === "parametric") {
    compileExpression(xExpression, ["t"]);
    compileExpression(yExpression, ["t"]);
  } else if (mode === "curve3d") {
    compileExpression(xExpression, ["t"]);
    compileExpression(yExpression, ["t"]);
    compileExpression(zExpression, ["t"]);
  } else if (mode === "parametricSurface3d") {
    compileExpression(xExpression, ["u", "v"]);
    compileExpression(yExpression, ["u", "v"]);
    compileExpression(zExpression, ["u", "v"]);
  } else compileExpression(expression, mode === "polar" ? ["t"] : ["x"]);
}

const GRAPH_ELEMENT_FIELDS = {
  point: ["x", "y"],
  vector: ["x", "y", "dx", "dy"],
  segment: ["x1", "y1", "x2", "y2"],
  ray: ["x1", "y1", "x2", "y2"],
  polygon: [],
  angle: ["ax", "ay", "vx", "vy", "cx", "cy"],
};

function validateGraphGeometry(elements) {
  if (!Array.isArray(elements) || elements.length > 24) throw new Error("A graph can contain up to 24 geometry elements.");
  for (const element of elements) {
    const fields = GRAPH_ELEMENT_FIELDS[element.kind];
    if (!fields || typeof element.id !== "string" || element.id.length > 48
      || typeof element.label !== "string" || element.label.length > 24) {
      throw new Error("Check each geometry element and keep labels under 24 characters.");
    }
    if (element.kind === "polygon") {
      if (!Array.isArray(element.vertices) || element.vertices.length < 3 || element.vertices.length > 12
        || element.vertices.some((point) => !Array.isArray(point) || point.length !== 2
          || point.some((value) => !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 1_000_000))) {
        throw new Error("Polygons need 3–12 finite coordinate pairs within ±1,000,000.");
      }
      continue;
    }
    if (fields.some((field) => String(element[field]).trim() === "" || !Number.isFinite(Number(element[field])) || Math.abs(Number(element[field])) > 1_000_000)) {
      throw new Error("Check geometry coordinates and keep them within ±1,000,000.");
    }
    if (element.kind === "angle") {
      if (Number(element.ax) === Number(element.vx) && Number(element.ay) === Number(element.vy)
        || Number(element.cx) === Number(element.vx) && Number(element.cy) === Number(element.vy)) {
        throw new Error("An angle needs two non-zero arms.");
      }
      if (!["degrees", "radians"].includes(element.angleUnit)) throw new Error("Choose degrees or radians for the angle measurement.");
    }
    if ((element.kind === "segment" || element.kind === "ray") && element.showMeasure !== undefined && typeof element.showMeasure !== "boolean") {
      throw new Error("Choose whether to show the length measurement.");
    }
  }
}

function GraphInspector({ graph, store }) {
  const mode = graph.mode || "explicit";
  const is3d = ["surface3d", "curve3d", "parametricSurface3d"].includes(mode);
  const [expression, setExpression] = useState(graph.expression);
  const [xExpression, setXExpression] = useState(graph.xExpression || "cos(t)");
  const [yExpression, setYExpression] = useState(graph.yExpression || "sin(t)");
  const [zExpression, setZExpression] = useState(graph.zExpression || "t");
  const [tMin, setTMin] = useState(String(graph.tMin ?? 0));
  const [tMax, setTMax] = useState(String(graph.tMax ?? 6.283185307));
  const [uMin, setUMin] = useState(String(graph.uMin ?? 0));
  const [uMax, setUMax] = useState(String(graph.uMax ?? 6.283185307));
  const [vMin, setVMin] = useState(String(graph.vMin ?? 0));
  const [vMax, setVMax] = useState(String(graph.vMax ?? 6.283185307));
  const [xMin, setXMin] = useState(String(graph.xMin));
  const [xMax, setXMax] = useState(String(graph.xMax));
  const [yMin, setYMin] = useState(String(graph.yMin));
  const [yMax, setYMax] = useState(String(graph.yMax));
  const [zMin, setZMin] = useState(String(graph.zMin ?? -10));
  const [zMax, setZMax] = useState(String(graph.zMax ?? 10));
  const [azimuth, setAzimuth] = useState(String(graph.azimuth ?? 42));
  const [elevation, setElevation] = useState(String(graph.elevation ?? 32));
  const [geometry, setGeometry] = useState(graph.geometry || []);
  const [error, setError] = useState("");

  useEffect(() => {
    setExpression(graph.expression);
    setXExpression(graph.xExpression || "cos(t)");
    setYExpression(graph.yExpression || "sin(t)");
    setZExpression(graph.zExpression || "t");
    setTMin(String(graph.tMin ?? 0));
    setTMax(String(graph.tMax ?? 6.283185307));
    setUMin(String(graph.uMin ?? 0));
    setUMax(String(graph.uMax ?? 6.283185307));
    setVMin(String(graph.vMin ?? 0));
    setVMax(String(graph.vMax ?? 6.283185307));
    setXMin(String(graph.xMin));
    setXMax(String(graph.xMax));
    setYMin(String(graph.yMin));
    setYMax(String(graph.yMax));
    setZMin(String(graph.zMin ?? -10));
    setZMax(String(graph.zMax ?? 10));
    setAzimuth(String(graph.azimuth ?? 42));
    setElevation(String(graph.elevation ?? 32));
    setGeometry(graph.geometry || []);
  }, [graph.expression, graph.mode, graph.xExpression, graph.yExpression, graph.zExpression, graph.tMin, graph.tMax, graph.uMin, graph.uMax, graph.vMin, graph.vMax, graph.xMin, graph.xMax, graph.yMin, graph.yMax, graph.zMin, graph.zMax, graph.azimuth, graph.elevation, graph.geometry]);

  const updateValues = (next) => {
    setXMin(String(next.xMin));
    setXMax(String(next.xMax));
    setYMin(String(next.yMin));
    setYMax(String(next.yMax));
  };

  const apply = (e) => {
    e.preventDefault();
    setError("");
    const ranges = [xMin, xMax, yMin, yMax].map(Number);
    const parameters = [tMin, tMax].map(Number);
    const surfaceParameters = [uMin, uMax, vMin, vMax].map(Number);
    const vertical = [zMin, zMax].map(Number);
    const cameraAngles = [azimuth, elevation].map(Number);
    const expressionLimit = mode === "inequality" ? 967 : 120;
    if (expression.length > expressionLimit || xExpression.length > 120 || yExpression.length > 120 || zExpression.length > 120
      || !ranges.every(Number.isFinite) || !parameters.every(Number.isFinite) || !surfaceParameters.every(Number.isFinite)
      || !vertical.every(Number.isFinite) || !cameraAngles.every(Number.isFinite)
      || [...ranges, ...vertical].some((value) => Math.abs(value) > 1_000_000)
      || [...parameters, ...surfaceParameters].some((value) => Math.abs(value) > 1_000_000) || Math.abs(cameraAngles[0]) > 360_000
      || ranges[0] >= ranges[1] || ranges[2] >= ranges[3] || parameters[0] >= parameters[1]
      || surfaceParameters[0] >= surfaceParameters[1] || surfaceParameters[2] >= surfaceParameters[3]
      || vertical[0] >= vertical[1] || cameraAngles[1] < 12 || cameraAngles[1] > 82) {
      setError("Enter a valid equation and finite axis ranges within ±1,000,000.");
      return;
    }
    try {
      const equation = mode === "implicit" || mode === "inequality"
        ? expression.trim()
        : expression.trim().replace(mode === "surface3d" ? /^[yz]\s*=\s*/i : /^y\s*=\s*/i, "");
      validateGraphExpressions({ mode, expression: equation, xExpression, yExpression, zExpression });
      validateGraphGeometry(geometry);
      const normalizedGeometry = geometry.map((element) => ({
        ...element,
        ...Object.fromEntries((GRAPH_ELEMENT_FIELDS[element.kind] || []).map((field) => [field, Number(element[field])])),
        ...(element.kind === "polygon" ? { vertices: element.vertices.map((point) => point.map(Number)), filled: Boolean(element.filled) } : {}),
        ...(element.kind === "segment" || element.kind === "ray" ? { showMeasure: Boolean(element.showMeasure) } : {}),
      }));
      store.commit([{
        op: "update",
        id: graph.id,
        patch: {
          mode, expression: equation, xExpression, yExpression, zExpression, tMin: parameters[0], tMax: parameters[1],
          uMin: surfaceParameters[0], uMax: surfaceParameters[1], vMin: surfaceParameters[2], vMax: surfaceParameters[3],
          xMin: ranges[0], xMax: ranges[1], yMin: ranges[2], yMax: ranges[3], zMin: vertical[0], zMax: vertical[1],
          azimuth: cameraAngles[0], elevation: cameraAngles[1], geometry: normalizedGeometry,
        },
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this graph.");
    }
  };

  const addGeometry = (kind) => {
    const label = kind === "point" ? `P${geometry.length + 1}` : kind === "vector" ? `v${geometry.length + 1}` : `${kind[0].toUpperCase()}${geometry.length + 1}`;
    const element = { id: uid(), kind, label };
    if (kind === "polygon") {
      element.vertices = [[-2, -1], [2, -1], [0, 2]];
      element.filled = true;
      setGeometry((current) => current.length < 24 ? [...current, element] : current);
      return;
    }
    if (kind === "angle") {
      Object.assign(element, { ax: -1, ay: 0, vx: 0, vy: 0, cx: 0, cy: 1, angleUnit: "degrees" });
      setGeometry((current) => current.length < 24 ? [...current, element] : current);
      return;
    }
    for (const field of GRAPH_ELEMENT_FIELDS[kind]) element[field] = field === "x2" || field === "dy" ? 1 : 0;
    setGeometry((current) => current.length < 24 ? [...current, element] : current);
  };

  const updateGeometry = (id, field, value) => {
    setGeometry((current) => current.map((element) => element.id === id ? { ...element, [field]: value } : element));
  };

  const fitCurve = () => {
    const current = {
      ...graph, mode,
      expression: mode === "implicit" || mode === "inequality"
        ? expression.trim()
        : expression.trim().replace(mode === "surface3d" ? /^[yz]\s*=\s*/i : /^y\s*=\s*/i, ""),
      xExpression, yExpression, zExpression, tMin: Number(tMin), tMax: Number(tMax),
      uMin: Number(uMin), uMax: Number(uMax), vMin: Number(vMin), vMax: Number(vMax),
      xMin: Number(xMin), xMax: Number(xMax), yMin: Number(yMin), yMax: Number(yMax),
      zMin: Number(zMin), zMax: Number(zMax), azimuth: Number(azimuth), elevation: Number(elevation),
    };
    if (![current.xMin, current.xMax, current.yMin, current.yMax, current.tMin, current.tMax, current.uMin, current.uMax, current.vMin, current.vMax].every(Number.isFinite)
      || current.xMin >= current.xMax || current.yMin >= current.yMax || current.tMin >= current.tMax
      || current.uMin >= current.uMax || current.vMin >= current.vMax) {
      setError("Set valid x, y, and parameter ranges before fitting the graph.");
      return;
    }
    try {
      validateGraphExpressions(current);
      updateValues(fitGraphRanges(current));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fit this graph.");
    }
  };

  return (
    <form
      onSubmit={apply}
      className="float-panel fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-2 right-2 z-40 max-h-[min(70dvh,32rem)] space-y-3 overflow-y-auto p-3 md:bottom-auto md:left-16 md:right-auto md:top-3 md:max-h-[calc(100dvh-1.5rem)] md:w-80"
      aria-label="Graph settings"
    >
      <div className="text-sm font-medium text-ink">Graph settings</div>
      {["parametric", "curve3d", "parametricSurface3d"].includes(mode) ? (
        <>
          <label className="block text-xs font-medium">{mode === "parametricSurface3d" ? "x(u, v)" : "x(t)"}
            <input value={xExpression} onChange={(e) => setXExpression(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2 text-sm" aria-label="Parametric x equation" />
          </label>
          <label className="block text-xs font-medium">{mode === "parametricSurface3d" ? "y(u, v)" : "y(t)"}
            <input value={yExpression} onChange={(e) => setYExpression(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2 text-sm" aria-label="Parametric y equation" />
          </label>
          {is3d && <label className="block text-xs font-medium">{mode === "parametricSurface3d" ? "z(u, v)" : "z(t)"}
            <input value={zExpression} onChange={(e) => setZExpression(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2 text-sm" aria-label="Parametric z equation" />
          </label>}
        </>
      ) : (
        <label className="block text-xs font-medium">{is3d ? "Surface z = f(x, y)" : mode === "implicit" ? "Equation" : mode === "polar" ? "Radius r(t)" : mode === "inequality" ? "Inequalities (one per line)" : "Equation"}
          {mode === "inequality" ? (
            <textarea rows={4} value={expression} onChange={(e) => setExpression(e.target.value)} className="mt-1 w-full resize-y rounded border border-line px-2 py-2 text-sm" aria-label="Graph inequalities" />
          ) : (
            <input value={expression} onChange={(e) => setExpression(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2 text-sm" aria-label="Graph equation" />
          )}
        </label>
      )}
      {!is3d && <section className="space-y-2 border-t border-line pt-2" aria-label="Coordinate geometry">
        <div className="text-xs font-semibold">Coordinate geometry</div>
        <div className="flex flex-wrap gap-1">
          {Object.keys(GRAPH_ELEMENT_FIELDS).map((kind) => (
            <button key={kind} type="button" onClick={() => addGeometry(kind)} disabled={geometry.length >= 24} className="h-7 rounded border border-line px-2 text-xs capitalize disabled:opacity-50">
              + {kind}
            </button>
          ))}
        </div>
        {geometry.map((element) => (
          <div key={element.id} className="space-y-1 rounded border border-line p-2">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-xs font-medium capitalize">{element.kind}</span>
              <input value={element.label || ""} onChange={(event) => updateGeometry(element.id, "label", event.target.value)} maxLength={24} aria-label={`${element.kind} label`} className="h-7 w-20 rounded border border-line px-1 text-xs" />
              <button type="button" onClick={() => setGeometry((current) => current.filter((item) => item.id !== element.id))} aria-label={`Remove ${element.kind}`} className="h-7 rounded px-2 text-xs text-danger hover:bg-sunken">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {element.kind === "polygon" ? element.vertices.map((point, index) => (
                <div key={index} className="col-span-2 grid grid-cols-2 gap-1.5">
                  {point.map((value, coordinate) => (
                    <label key={coordinate} className="text-[11px] text-muted">{`vertex ${index + 1} ${coordinate === 0 ? "x" : "y"}`}
                      <input type="number" step="any" value={value} onChange={(event) => setGeometry((current) => current.map((item) => {
                        if (item.id !== element.id) return item;
                        const vertices = item.vertices.map((pair) => [...pair]);
                        vertices[index][coordinate] = event.target.value;
                        return { ...item, vertices };
                      }))} className="mt-0.5 h-7 w-full rounded border border-line px-1.5 text-xs text-ink" />
                    </label>
                  ))}
                </div>
              )) : GRAPH_ELEMENT_FIELDS[element.kind].map((field) => (
                <label key={field} className="text-[11px] text-muted">{field}
                  <input type="number" step="any" value={element[field]} onChange={(event) => updateGeometry(element.id, field, event.target.value)} className="mt-0.5 h-7 w-full rounded border border-line px-1.5 text-xs text-ink" />
                </label>
              ))}
            </div>
            {element.kind === "polygon" && (
              <div className="flex items-center justify-between">
                <button type="button" disabled={element.vertices.length >= 12} onClick={() => setGeometry((current) => current.map((item) => item.id === element.id && item.vertices.length < 12
                  ? { ...item, vertices: [...item.vertices, [...item.vertices.at(-1)]] } : item))} className="text-[11px] text-blue-700 disabled:opacity-50">Add vertex</button>
                <button type="button" disabled={element.vertices.length <= 3} onClick={() => setGeometry((current) => current.map((item) => item.id === element.id && item.vertices.length > 3
                  ? { ...item, vertices: item.vertices.slice(0, -1) } : item))} className="text-[11px] text-blue-700 disabled:opacity-50">Remove last vertex</button>
                <label className="flex items-center gap-1 text-[11px] text-muted"><input type="checkbox" checked={Boolean(element.filled)} onChange={(event) => updateGeometry(element.id, "filled", event.target.checked)} />Fill</label>
              </div>
            )}
            {element.kind === "angle" && (
              <label className="flex items-center gap-1 text-[11px] text-muted">Measure in
                <select value={element.angleUnit || "degrees"} onChange={(event) => updateGeometry(element.id, "angleUnit", event.target.value)} className="h-7 rounded border border-line px-1 text-xs text-ink">
                  <option value="degrees">degrees</option><option value="radians">radians</option>
                </select>
              </label>
            )}
            {(element.kind === "segment" || element.kind === "ray") && (
              <label className="flex items-center gap-1 text-[11px] text-muted"><input type="checkbox" checked={Boolean(element.showMeasure)} onChange={(event) => updateGeometry(element.id, "showMeasure", event.target.checked)} />Show length</label>
            )}
          </div>
        ))}
        <p className="text-[11px] text-muted">Use graph coordinates. Vectors start at (x, y) and end at (x + dx, y + dy).</p>
      </section>}
      {(mode === "parametric" || mode === "polar" || mode === "curve3d") && (
        <div className="grid grid-cols-2 gap-2">
          {[["t min", tMin, setTMin], ["t max", tMax, setTMax]].map(([label, value, setter]) => (
            <label key={label} className="text-xs font-medium">{label}
              <input type="number" step="any" value={value} onChange={(e) => setter(e.target.value)} className="mt-1 h-8 w-full rounded border border-line px-2 text-sm" />
            </label>
          ))}
        </div>
      )}
      {mode === "parametricSurface3d" && (
        <div className="grid grid-cols-2 gap-2">
          {[["u min", uMin, setUMin], ["u max", uMax, setUMax], ["v min", vMin, setVMin], ["v max", vMax, setVMax]].map(([label, value, setter]) => (
            <label key={label} className="text-xs font-medium">{label}
              <input type="number" step="any" value={value} onChange={(event) => setter(event.target.value)} className="mt-1 h-8 w-full rounded border border-line px-2 text-sm" />
            </label>
          ))}
        </div>
      )}
      {is3d && (
        <>
          <p className="text-[11px] text-muted">Drag inside the plot to rotate the 3D view. Camera changes are shared with listeners.</p>
          <div className="grid grid-cols-2 gap-2">
            {[["z min", zMin, setZMin], ["z max", zMax, setZMax]].map(([label, value, setter]) => (
              <label key={label} className="text-xs font-medium">{label}
                <input type="number" step="any" value={value} onChange={(event) => setter(event.target.value)} className="mt-1 h-8 w-full rounded border border-line px-2 text-sm" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium">Camera angle ({Number(azimuth) || 0}°)
              <input type="range" min="0" max="360" step="1" value={Math.max(0, Math.min(360, Number(azimuth) || 0))} onChange={(event) => setAzimuth(event.target.value)} className="mt-1 h-8 w-full accent-blue-700" />
            </label>
            <label className="text-xs font-medium">Camera elevation ({Number(elevation) || 32}°)
              <input type="range" min="12" max="82" step="1" value={Math.max(12, Math.min(82, Number(elevation) || 32))} onChange={(event) => setElevation(event.target.value)} className="mt-1 h-8 w-full accent-blue-700" />
            </label>
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        {[["x min", xMin, setXMin], ["x max", xMax, setXMax], ["y min", yMin, setYMin], ["y max", yMax, setYMax]].map(([label, value, setter]) => (
          <label key={label} className="text-xs font-medium">{label}
            <input type="number" step="any" value={value} onChange={(e) => setter(e.target.value)} className="mt-1 h-8 w-full rounded border border-line px-2 text-sm" />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => updateValues({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 })} className="h-7 rounded border border-line px-2 text-xs">Standard</button>
        <button type="button" onClick={() => updateValues({ xMin: -6.28, xMax: 6.28, yMin: -2, yMax: 2 })} className="h-7 rounded border border-line px-2 text-xs">Trig</button>
        {mode !== "inequality" && !is3d && <button type="button" onClick={fitCurve} className="h-7 rounded border border-line px-2 text-xs">Fit curve</button>}
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <button type="submit" className="h-8 w-full rounded bg-ink px-3 text-sm font-medium text-paper">Apply graph settings</button>
    </form>
  );
}

function InsertDialog({ kind, onClose, onCreate }) {
  const [graphMode, setGraphMode] = useState("explicit");
  const [expression, setExpression] = useState("y = x^2");
  const [xExpression, setXExpression] = useState("cos(t)");
  const [yExpression, setYExpression] = useState("sin(t)");
  const [zExpression, setZExpression] = useState("t");
  const [tMin, setTMin] = useState("0");
  const [tMax, setTMax] = useState("6.283185307");
  const [uMin, setUMin] = useState("0");
  const [uMax, setUMax] = useState("6.283185307");
  const [vMin, setVMin] = useState("0");
  const [vMax, setVMax] = useState("6.283185307");
  const [xMin, setXMin] = useState("-10");
  const [xMax, setXMax] = useState("10");
  const [yMin, setYMin] = useState("-10");
  const [yMax, setYMax] = useState("10");
  const [zMin, setZMin] = useState("-10");
  const [zMax, setZMax] = useState("10");
  const [rows, setRows] = useState("3");
  const [cols, setCols] = useState("3");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (kind === "graph") {
      const range = [xMin, xMax, yMin, yMax].map(Number);
      const zRange = [zMin, zMax].map(Number);
      if (!range.every(Number.isFinite) || !zRange.every(Number.isFinite) || [...range, ...zRange].some((value) => Math.abs(value) > 1_000_000)
        || !Number.isFinite(range[1] - range[0]) || !Number.isFinite(range[3] - range[2])
        || range[0] >= range[1] || range[2] >= range[3] || zRange[0] >= zRange[1]) {
        setError("Use finite axis ranges with each minimum smaller than its maximum (within ±1,000,000).");
        return;
      }
      const parameters = [tMin, tMax].map(Number);
      const surfaceParameters = [uMin, uMax, vMin, vMax].map(Number);
      const expressionLimit = graphMode === "inequality" ? 967 : 120;
      if (expression.length > expressionLimit || xExpression.length > 120 || yExpression.length > 120 || zExpression.length > 120
        || !parameters.every(Number.isFinite) || !surfaceParameters.every(Number.isFinite)
        || [...parameters, ...surfaceParameters].some((value) => Math.abs(value) > 1_000_000)
        || parameters[0] >= parameters[1] || surfaceParameters[0] >= surfaceParameters[1] || surfaceParameters[2] >= surfaceParameters[3]) {
        setError(`Keep each equation under 120 characters${graphMode === "inequality" ? " (up to eight lines)" : ""} and use a valid finite parameter range.`);
        return;
      }
      try {
        const equation = graphMode === "implicit" || graphMode === "inequality"
          ? expression.trim()
          : expression.trim().replace(graphMode === "surface3d" ? /^[yz]\s*=\s*/i : /^y\s*=\s*/i, "");
        validateGraphExpressions({ mode: graphMode, expression: equation, xExpression, yExpression, zExpression });
        onCreate({
          mode: graphMode, expression: equation, xExpression, yExpression, zExpression,
          tMin: parameters[0], tMax: parameters[1],
          uMin: surfaceParameters[0], uMax: surfaceParameters[1], vMin: surfaceParameters[2], vMax: surfaceParameters[3],
          xMin: range[0], xMax: range[1], yMin: range[2], yMax: range[3],
          zMin: zRange[0], zMax: zRange[1], azimuth: 42, elevation: 32,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create this graph.");
      }
      return;
    }
    const rowCount = Number(rows), colCount = Number(cols);
    if (!Number.isInteger(rowCount) || !Number.isInteger(colCount) || rowCount < 1 || rowCount > 12 || colCount < 1 || colCount > 12) {
      setError("Choose between 1 and 12 rows and columns.");
      return;
    }
    onCreate(rowCount, colCount);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/30 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="float-panel max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-4 overflow-y-auto p-5" onSubmit={submit} aria-label={kind === "graph" ? "Create graph" : "Create table"}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{kind === "graph" ? "Graph an equation" : "Insert a table"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-600 hover:bg-sunken" aria-label="Close">×</button>
        </div>
        {kind === "graph" ? (
          <>
            <label className="block text-sm font-medium">Graph type
              <select value={graphMode} onChange={(e) => {
                const nextMode = e.target.value;
                setGraphMode(nextMode);
                if (nextMode === "parametricSurface3d") {
                  setXExpression("cos(u)"); setYExpression("sin(u)"); setZExpression("v");
                } else if (nextMode === "curve3d") {
                  setXExpression("cos(t)"); setYExpression("sin(t)"); setZExpression("t");
                }
              }} className="mt-1 h-10 w-full rounded border border-line px-3">
                <option value="explicit">Function y = f(x)</option>
                <option value="implicit">Implicit equation F(x,y) = G(x,y)</option>
                <option value="inequality">Inequalities and shaded regions</option>
                <option value="surface3d">3D surface z = f(x, y)</option>
                <option value="curve3d">3D parametric curve x(t), y(t), z(t)</option>
                <option value="parametricSurface3d">3D parametric surface x(u,v), y(u,v), z(u,v)</option>
                <option value="parametric">Parametric x(t), y(t)</option>
                <option value="polar">Polar r(t)</option>
              </select>
            </label>
            {["parametric", "curve3d", "parametricSurface3d"].includes(graphMode) ? (
              <>
                <label className="block text-sm font-medium">{graphMode === "parametricSurface3d" ? "x(u, v)" : "x(t)"}
                  <input autoFocus value={xExpression} onChange={(e) => setXExpression(e.target.value)} className="mt-1 h-10 w-full rounded border border-line px-3" placeholder={graphMode === "parametricSurface3d" ? "sin(u) cos(v)" : "cos(t)"} />
                </label>
                <label className="block text-sm font-medium">{graphMode === "parametricSurface3d" ? "y(u, v)" : "y(t)"}
                  <input value={yExpression} onChange={(e) => setYExpression(e.target.value)} className="mt-1 h-10 w-full rounded border border-line px-3" placeholder={graphMode === "parametricSurface3d" ? "sin(u) sin(v)" : "sin(t)"} />
                </label>
                {(graphMode === "curve3d" || graphMode === "parametricSurface3d") && <label className="block text-sm font-medium">{graphMode === "parametricSurface3d" ? "z(u, v)" : "z(t)"}
                  <input value={zExpression} onChange={(e) => setZExpression(e.target.value)} className="mt-1 h-10 w-full rounded border border-line px-3" placeholder={graphMode === "parametricSurface3d" ? "v" : "t"} />
                </label>}
              </>
            ) : (
              <label className="block text-sm font-medium">{graphMode === "surface3d" ? "Surface z = f(x, y)" : graphMode === "implicit" ? "Equation" : graphMode === "polar" ? "Radius r(t)" : graphMode === "inequality" ? "Inequalities (one per line)" : "Equation"}
                {graphMode === "inequality" ? (
                  <textarea autoFocus rows={3} value={expression} onChange={(e) => setExpression(e.target.value)} className="mt-1 w-full resize-y rounded border border-line px-3 py-2" placeholder={"y > 2x + 1\nx^2 + y^2 <= 16"} />
                ) : (
                  <input autoFocus value={expression} onChange={(e) => setExpression(e.target.value)} className="mt-1 h-10 w-full rounded border border-line px-3" placeholder={graphMode === "surface3d" ? "x^2 - y^2" : graphMode === "implicit" ? "x^2 + y^2 = 25" : graphMode === "polar" ? "2 + cos(5t)" : "y = sin(x)"} />
                )}
              </label>
            )}
            <p className="text-xs text-muted">
              {graphMode === "inequality"
                ? "Use <, <=, >, or >=. One inequality per line; multiple lines shade their intersection. Strict boundaries are dashed."
                : graphMode === "implicit"
                ? "Use x, y, + - * / ^, parentheses, pi, e, and supported functions."
                : graphMode === "parametric" || graphMode === "curve3d"
                  ? "Use t, + - * / ^, parentheses, pi, e, and supported functions."
                  : graphMode === "parametricSurface3d"
                    ? "Use u and v with supported arithmetic and functions for a parameterized 3D surface."
                  : graphMode === "polar"
                    ? "The radius uses t as the angle in radians. Use t, + - * / ^ and supported functions."
                      : ["surface3d", "curve3d", "parametricSurface3d"].includes(graphMode)
                        ? "Use the supported safe math functions. Drag the graph to rotate; use graph settings for precise camera control."
                      : "Use x, + - * / ^, parentheses, pi, e, and supported functions."}
            </p>
            {(graphMode === "parametric" || graphMode === "polar" || graphMode === "curve3d") && (
              <div className="grid grid-cols-2 gap-3">
                {[["t minimum", tMin, setTMin], ["t maximum", tMax, setTMax]].map(([label, value, setter]) => (
                  <label key={label} className="text-sm font-medium">{label}
                    <input type="number" step="any" value={value} onChange={(e) => setter(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2" />
                  </label>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[["x minimum", xMin, setXMin], ["x maximum", xMax, setXMax], ["y minimum", yMin, setYMin], ["y maximum", yMax, setYMax]].map(([label, value, set]) => (
                <label key={label} className="text-sm font-medium">{label}
                  <input type="number" step="any" value={value} onChange={(e) => set(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2" />
                </label>
              ))}
            </div>
            {graphMode === "parametricSurface3d" && (
              <div className="grid grid-cols-2 gap-3">
                {[["u minimum", uMin, setUMin], ["u maximum", uMax, setUMax], ["v minimum", vMin, setVMin], ["v maximum", vMax, setVMax]].map(([label, value, setter]) => (
                  <label key={label} className="text-sm font-medium">{label}
                    <input type="number" step="any" value={value} onChange={(e) => setter(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2" />
                  </label>
                ))}
              </div>
            )}
            {["surface3d", "curve3d", "parametricSurface3d"].includes(graphMode) && (
              <div className="grid grid-cols-2 gap-3">
                {[["z minimum", zMin, setZMin], ["z maximum", zMax, setZMax]].map(([label, value, set]) => (
                  <label key={label} className="text-sm font-medium">{label}
                    <input type="number" step="any" value={value} onChange={(e) => set(e.target.value)} className="mt-1 h-9 w-full rounded border border-line px-2" />
                  </label>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Rows (1–12)
              <input autoFocus type="number" min="1" max="12" value={rows} onChange={(e) => setRows(e.target.value)} className="mt-1 h-10 w-full rounded border border-line px-3" />
            </label>
            <label className="text-sm font-medium">Columns (1–12)
              <input type="number" min="1" max="12" value={cols} onChange={(e) => setCols(e.target.value)} className="mt-1 h-10 w-full rounded border border-line px-3" />
            </label>
            <p className="col-span-2 text-xs text-muted">Double-click any cell after inserting the table to edit it.</p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded border border-line px-3 text-sm">Cancel</button>
          <button type="submit" className="h-9 rounded bg-ink px-4 text-sm font-medium text-paper">{kind === "graph" ? "Add graph" : "Add table"}</button>
        </div>
      </form>
    </div>
  );
}
