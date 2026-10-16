// The properties panel UI (style settings + graph settings); state lives in useInspector.js.
// - Desktop: docked to the right of the canvas, so the board resizes instead of being covered.
// - Phone: a bottom sheet with three heights (peek / half / full) that never hides the whole board.
// Used by both the whiteboard and the PDF annotator.
import { useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import GraphInspector from "./GraphInspector.jsx";
import EquationInspector from "./EquationInspector.jsx";
import AidInspector from "./AidInspector.jsx";
import StatsInspector from "./StatsInspector.jsx";
import { AID_KINDS } from "./mathAids.js";
import { CHARTS } from "./stats.js";
import { STYLE_TITLES } from "./constants.js";
import { StylePanel } from "./Toolbar.jsx";
import { graphParamNames } from "./graphMath.js";
import { MODE_LABELS } from "./graphValidation.js";

function PanelBody({ mode, tools, store, surfaceRef, inspector, peek = false }) {
  const graph = inspector.selectedGraph;
  if (inspector.kind === "graph" && graph) {
    return (
      <GraphInspector
        key={graph.id}
        graph={graph}
        store={store}
        peek={peek}
        onExpand={() => inspector.setSheet({ open: true, snap: "half" })}
      />
    );
  }
  if (inspector.kind === "equation" && inspector.selectedEquation) {
    return (
      <EquationInspector
        key={inspector.selectedEquation.id}
        equation={inspector.selectedEquation}
        store={store}
        peek={peek}
        onExpand={() => inspector.setSheet({ open: true, snap: "half" })}
      />
    );
  }
  if (inspector.kind === "stats" && inspector.selectedStats) {
    return <StatsInspector key={inspector.selectedStats.id} chart={inspector.selectedStats} store={store} />;
  }
  if (inspector.kind === "aid" && inspector.selectedAid) {
    return <AidInspector key={inspector.selectedAid.id} aid={inspector.selectedAid} store={store} />;
  }
  return (
    <StylePanel
      mode={mode}
      group={tools.group}
      style={tools.activeStyle}
      onChange={tools.setStyle}
      selectionCount={tools.selectedIds.length}
      onDelete={() => surfaceRef.current?.deleteSelected()}
      onDuplicate={() => surfaceRef.current?.duplicate()}
    />
  );
}

function titleOf(inspector, tools) {
  if (inspector.kind === "graph") return { title: "Graph", subtitle: MODE_LABELS[inspector.selectedGraph?.mode || "explicit"] };
  if (inspector.kind === "equation") return { title: "Equation", subtitle: "" };
  if (inspector.kind === "stats") return { title: "Statistics", subtitle: CHARTS.find((item) => item.id === inspector.selectedStats?.chart)?.label || "" };
  if (inspector.kind === "aid") return { title: "Math aid", subtitle: AID_KINDS.find((item) => item.id === inspector.selectedAid?.kind)?.label || (inspector.selectedAid?.kind === "pollbars" ? "Poll results" : "") };
  const count = tools.selectedIds.length;
  return { title: STYLE_TITLES[tools.group] || "Style", subtitle: count > 1 ? `${count} selected` : "" };
}

const leaveField = (e) => {
  // Esc inside a field hands the keyboard back to the board (so tool shortcuts work again)
  if (e.key === "Escape" && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) e.target.blur();
};

function DesktopDock(props) {
  const { inspector, tools } = props;
  const { title, subtitle } = titleOf(inspector, tools);
  return (
    <aside aria-label="Properties" onKeyDown={leaveField} className="flex w-80 shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium leading-tight">{title}</div>
          {subtitle && <div className="truncate text-[11px] leading-tight text-muted">{subtitle}</div>}
        </div>
        <button type="button" onClick={inspector.close} aria-label="Hide properties panel" title="Hide panel" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-sunken hover:text-ink">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
        <PanelBody {...props} />
      </div>
    </aside>
  );
}

function SheetDock(props) {
  const { inspector, tools } = props;
  const { setSheetHeight } = inspector;
  const ref = useRef(null);
  const drag = useRef(null);
  const [dragHeight, setDragHeight] = useState(null);
  const { title, subtitle } = titleOf(inspector, tools);

  const hasPeek = inspector.kind === "graph" || inspector.kind === "equation";
  const snaps = hasPeek ? ["peek", "half", "full"] : ["half", "full"];
  const snap = snaps.includes(inspector.sheet.snap) ? inspector.sheet.snap : "half";
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // The peek height makes room for up to two slider rows so a presenter can scrub without expanding the sheet
  const sliderRows = inspector.kind === "graph" && inspector.selectedGraph ? Math.min(2, graphParamNames(inspector.selectedGraph).length) : 0;
  // A formula sheet is taller: its half height has to hold the preview, the field and the whole keyboard
  const formula = inspector.kind === "equation";
  const heights = formula
    ? { peek: 268, half: Math.round(vh * 0.62), full: Math.round(vh * 0.86) }
    : { peek: 132 + sliderRows * 46 + (sliderRows ? 40 : 0), half: Math.round(vh * 0.46), full: Math.round(vh * 0.8) };
  const setSnap = (next) => inspector.setSheet({ open: true, snap: next });

  // Report the sheet's real height so the board can keep the selected graph visible above it
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const report = () => setSheetHeight(el.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => { observer.disconnect(); setSheetHeight(0); };
  }, [setSheetHeight]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { y: e.clientY, height: ref.current?.offsetHeight || heights[snap], moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 4) d.moved = true;
    setDragHeight(Math.max(56, Math.min(heights.full, d.height + dy)));
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    setDragHeight(null);
    if (!d) return;
    const dy = d.y - e.clientY; // positive: dragged up
    const index = snaps.indexOf(snap);
    if (!d.moved || Math.abs(dy) < 24) setSnap(snaps[(index + 1) % snaps.length]); // a tap steps through the heights
    else if (dy > 0) setSnap(snaps[Math.min(snaps.length - 1, index + 1)]);
    else if (index === 0) inspector.close(); // swipe down from the lowest height dismisses
    else setSnap(snaps[index - 1]);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Properties"
      onKeyDown={leaveField}
      style={{ maxHeight: dragHeight ?? heights[snap] }}
      className={`float-panel absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 flex flex-col overflow-hidden ${dragHeight === null ? "transition-[max-height] duration-150" : ""}`}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2"
        aria-label="Drag to resize the panel"
      >
        <span className="h-1 w-9 rounded-full bg-line-strong" />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-1.5">
        <div className="min-w-0 text-sm font-medium">
          {title}
          {subtitle && <span className="ml-2 text-xs font-normal text-muted">{subtitle}</span>}
        </div>
        <button type="button" onClick={inspector.close} aria-label="Close properties panel" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-sunken">
          <X size={16} />
        </button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <PanelBody {...props} peek={hasPeek && snap === "peek"} />
      </div>
    </div>
  );
}

/** Render as a flex sibling of the canvas (desktop) / inside the positioned workspace (phone). */
export function InspectorDock({ mode, tools, store, surfaceRef, inspector }) {
  if (!inspector.visible) return null;
  const Dock = inspector.desktop ? DesktopDock : SheetDock;
  return <Dock mode={mode} tools={tools} store={store} surfaceRef={surfaceRef} inspector={inspector} />;
}
