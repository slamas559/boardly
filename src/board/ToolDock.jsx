// Places the tool rail. It sits on a screen edge (left by default on desktop, bottom on phones) and can be
// dragged to any other edge, where it lays itself out vertically or horizontally. The properties panel
// (style + graph settings) lives in the separate InspectorDock so it never covers the board.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ToolRail } from "./Toolbar.jsx";
import { validateGraphExpressions } from "./graphValidation.js";
import AidDialog from "./AidDialog.jsx";
import { describeDock, isVerticalDock, nearestDock, resolveDock, setToolbarDock, stepDock, useDockMovable, useToolbarDock } from "./useToolbarDock.js";

const ALIGN_MAIN = { start: "justify-start", center: "justify-center", end: "justify-end" };
const FLYOUT_SIDE = { left: "right", right: "left", top: "bottom", bottom: "top" };
const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

// Where the wrapper sits for each dock. The board's page and zoom controls live bottom-right, so a bar docked
// to the right or along the bottom leaves them free.
function dockLayout({ edge, align }, mode) {
  const main = ALIGN_MAIN[align];
  switch (edge) {
    case "left":
      return `left-3 top-3 bottom-3 flex-col items-start ${main}`;
    case "right":
      return `right-3 top-3 bottom-44 flex-col items-end ${main} ${mode === "board" ? "md:bottom-28" : "md:bottom-3"}`;
    case "top":
      return `left-3 right-3 top-3 flex-row items-start ${main}`;
    default:
      return `bottom-2 left-2 right-2 safe-bottom flex-row items-end md:bottom-3 md:left-3 ${mode === "board" ? "md:right-[19rem]" : "md:right-3"} ${main}`;
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// A thin accent strip on the edge the bar will snap to when released
function DropHint({ target }) {
  const vertical = target.edge === "left" || target.edge === "right";
  const along = { start: "0%", center: "33.333%", end: "66.666%" }[target.align];
  const style = vertical
    ? { top: along, height: "33.333%", width: 4, [target.edge]: 3 }
    : { left: along, width: "33.333%", height: 4, [target.edge]: 3 };
  return <div aria-hidden="true" className="pointer-events-none absolute rounded-full bg-accent/50" style={style} />;
}

export default function ToolDock({ mode, restricted = false, tools, inspector, surfaceRef, onCreateGraph, onCreateEquation, onCreateAid, onCreateTable, onUploadMedia, onAddVideoLink, mediaUploading = false, mediaError = "", store }) {
  const [insertDialog, setInsertDialog] = useState(null);
  const [aidDialog, setAidDialog] = useState(false);
  const [videoLinkDialog, setVideoLinkDialog] = useState(false);
  const [drag, setDrag] = useState(null); // { x, y, target } while the bar is being dragged
  const [announcement, setAnnouncement] = useState("");
  const mediaInputRef = useRef(null);
  const wrapRef = useRef(null);
  const boxRef = useRef(null);
  const dragRef = useRef(null);
  const { tool, setTool, lastShape, keepTool, setKeepTool, activeStyle, canGroup, canUngroup } = tools;

  const [savedDock] = useToolbarDock();
  const movable = useDockMovable();
  const dock = resolveDock(savedDock, movable);
  const vertical = isVerticalDock(dock);

  // Rotating a phone or resizing the window while the bar is mid-drag drops the drag
  useEffect(() => {
    if (movable) return;
    dragRef.current = null;
    setDrag(null);
  }, [movable]);

  const grip = {
    onPointerDown: (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const box = boxRef.current;
      const parent = wrapRef.current?.parentElement;
      if (!box || !parent) return;
      const r = box.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      dragRef.current = {
        id: e.pointerId, sx: e.clientX, sy: e.clientY, left: r.left - pr.left, top: r.top - pr.top,
        w: r.width, h: r.height, pw: pr.width, ph: pr.height, moved: false, target: null,
      };
    },
    onPointerMove: (e) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < 5) return; // a click on the handle is not a drag
      d.moved = true;
      const x = clamp(d.left + dx, 0, Math.max(0, d.pw - d.w));
      const y = clamp(d.top + dy, 0, Math.max(0, d.ph - d.h));
      d.target = nearestDock({ x: x + d.w / 2, y: y + d.h / 2 }, { w: d.pw, h: d.ph });
      setDrag({ x, y, target: d.target });
    },
    onPointerUp: (e) => endDrag(e, true),
    onPointerCancel: (e) => endDrag(e, false),
    onKeyDown: (e) => {
      if (!ARROWS.includes(e.key)) return;
      e.preventDefault();
      const next = stepDock(dock, e.key);
      setToolbarDock(next);
      setAnnouncement(describeDock(next));
    },
    onReset: () => {
      setToolbarDock(null);
      setAnnouncement("Toolbar moved back to its default position");
    },
  };

  function endDrag(e, commit) {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (commit && d.moved && d.target) {
      setToolbarDock(d.target);
      setAnnouncement(describeDock(d.target));
    }
    setDrag(null);
  }

  return (
    <div ref={wrapRef} className={`pointer-events-none absolute z-20 flex ${drag ? "inset-0" : dockLayout(dock, mode)}`}>
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUploadMedia?.(file);
          event.target.value = "";
        }}
      />
      <div
        ref={boxRef}
        className="pointer-events-auto relative flex max-h-full min-h-0 min-w-0 max-w-full"
        style={drag ? { position: "absolute", left: drag.x, top: drag.y, opacity: 0.92 } : undefined}
      >
        <ToolRail
          mode={mode}
          tool={tool}
          onTool={(t) => { setTool(t); inspector.onToolPicked(); }}
          lastShape={lastShape}
          canUndo={store.canUndo}
          canRedo={store.canRedo}
          onUndo={() => store.undo()}
          onRedo={() => store.redo()}
          keepTool={keepTool}
          onKeepTool={() => setKeepTool((v) => !v)}
          onCreateGraph={() => setInsertDialog("graph")}
          onCreateEquation={onCreateEquation}
          onCreateAid={() => setAidDialog(true)}
          onCreateTable={() => setInsertDialog("table")}
          onUploadMedia={() => mediaInputRef.current?.click()}
          onAddVideoLink={() => setVideoLinkDialog(true)}
          mediaUploading={mediaUploading}
          restricted={restricted}
          hasStyle={inspector.kind !== null}
          styleSwatch={inspector.kind === "style" ? activeStyle?.color : null}
          styleLabel={inspector.kind === "graph" ? "Graph" : inspector.kind === "equation" ? "Equation" : "Style"}
          styleOpen={inspector.visible}
          onStyleToggle={inspector.toggle}
          vertical={vertical}
          side={FLYOUT_SIDE[dock.edge]}
          grip={movable ? grip : null}
          canGroup={canGroup}
          canUngroup={canUngroup}
          onGroup={() => surfaceRef?.current?.group()}
          onUngroup={() => surfaceRef?.current?.ungroup()}
        />
      </div>
      {drag && <DropHint target={drag.target} />}
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      {mediaUploading && (
        <div role="status" aria-live="polite" className="pointer-events-auto fixed left-1/2 z-[40] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-paper shadow" style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}>
          <Loader2 size={15} className="animate-spin" />
          Uploading media…
        </div>
      )}
      {mediaError && (
        <div role="alert" className="pointer-events-auto fixed left-1/2 z-[40] max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md bg-danger px-3 py-2 text-sm text-white shadow" style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}>
          {mediaError}
        </div>
      )}
      {videoLinkDialog && (
        <VideoLinkDialog
          onClose={() => setVideoLinkDialog(false)}
          onAdd={(link) => onAddVideoLink?.(link)}
        />
      )}
      {aidDialog && (
        <AidDialog
          onClose={() => setAidDialog(false)}
          onPick={(kind) => {
            onCreateAid?.(kind);
            setAidDialog(false);
          }}
        />
      )}
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

function VideoLinkDialog({ onClose, onAdd }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const submit = (event) => {
    event.preventDefault();
    try {
      onAdd(link);
      onClose();
    } catch (err) {
      setError(err.message || "Could not add this video link.");
    }
  };
  return (
    <div className="modal-safe pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-ink/40" role="dialog" aria-modal="true" aria-labelledby="video-link-title">
      <form onSubmit={submit} className="float-panel w-full max-w-md p-5">
        <div className="flex items-start justify-between">
          <h3 id="video-link-title" className="text-base font-semibold">Add a video link</h3>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-sunken">Close</button>
        </div>
        <label htmlFor="video-link-input" className="mt-3 block text-sm font-medium">YouTube, Vimeo, or direct video URL</label>
        <input
          id="video-link-input"
          autoFocus
          type="url"
          value={link}
          onChange={(event) => { setLink(event.target.value); setError(""); }}
          placeholder="https://youtu.be/… or https://example.com/video.mp4"
          className="mt-1.5 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-accent"
        />
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-line px-3 text-sm hover:bg-sunken">Cancel</button>
          <button type="submit" className="h-9 rounded-md bg-ink px-3 text-sm font-medium text-paper hover:opacity-90">Add to board</button>
        </div>
      </form>
    </div>
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
    <div className="modal-safe pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/30" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
                      : "Use x, + - * / ^, parentheses, pi, e, and supported functions. Letters like a, b, c become sliders."}
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
