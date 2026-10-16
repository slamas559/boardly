// The live whiteboard: infinite canvas, pages, follow-the-presenter for listeners.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Radio, Trash2 } from "lucide-react";
import Surface from "./Surface.jsx";
import ToolDock from "./ToolDock.jsx";
import { InspectorDock } from "./Inspector.jsx";
import { useInspector } from "./useInspector.js";
import QuickBar from "./QuickBar.jsx";
import { ObjectStore } from "./store.js";
import { BOARD_HOME, uid } from "./constants.js";
import { compileExpression, compileImplicitEquation, compileInequalitySystem } from "./graphMath.js";
import { ensureMath, estimateEquationSize, measureEquation } from "./mathRender.js";
import PaperPicker from "./PaperPicker.jsx";
import { newAid } from "./mathAids.js";
import { INSTRUMENTS, newInstrument } from "./geometryTools.js";
import { CHARTS, newStats } from "./stats.js";
import { newCover } from "./cover.js";
import { useAnnotationTools } from "./useAnnotationTools.js";
import { parseVideoLink } from "./mediaLinks.js";
import api from "../utils/api";

const MIN_K = 0.1;
const MAX_K = 8;

function fitRect(rect, size) {
  const k = Math.min(size.w / rect.w, size.h / rect.h);
  return { k, x: rect.x - (size.w / k - rect.w) / 2, y: rect.y - (size.h / k - rect.h) / 2 };
}

export default function BoardWorkspace({ room, socket, isHost, initial, visible, apiRef }) {
  const roomId = room._id;
  const frameRef = useRef(null);
  const surfaceRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [following, setFollowing] = useState(true);
  const [hostRect, setHostRect] = useState(null);
  const [hostPage, setHostPage] = useState(0);
  const [laser, setLaser] = useState(null);
  const [remotePreviews, setRemotePreviews] = useState(() => new Map());
  const [confirmClear, setConfirmClear] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const initialised = useRef(false);
  const previewTimers = useRef(new Map());

  const store = useMemo(
    () => new ObjectStore({ onLocalOps: (ops) => socket?.emit("board-op", { room: roomId, ops }) }),
    [socket, roomId]
  );
  const tools = useAnnotationTools({ mode: "board", store, surfaceRef, enabled: isHost && visible });
  const inspector = useInspector(tools);

  /* sizing + first framing */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w || initialised.current) return;
    initialised.current = true;
    setView(fitRect({ x: 0, y: 0, ...BOARD_HOME }, size));
  }, [size]);

  /* Keep a selected graph clear of the properties panel: the docked panel narrows the canvas on desktop,
     and the bottom sheet covers its lower part on phones. Runs on selection / panel changes, never while panning. */
  const selectedGraphId = inspector.selectedGraph?.id ?? inspector.selectedEquation?.id ?? inspector.selectedAid?.id ?? inspector.selectedStats?.id;
  const sheetInset = inspector.insetBottom;
  const desktopLayout = inspector.desktop;
  useEffect(() => {
    if (!isHost || !size.w || !selectedGraphId) return;
    const graph = store.get(selectedGraphId);
    if (!graph) return;
    const pad = 24;
    const leftSafe = desktopLayout ? 76 : pad; // desktop: the tool rail
    const topSafe = 56; // room for the quick bar above the graph
    const bottomSafe = (desktopLayout ? 0 : Math.max(sheetInset, 72)) + pad;
    setView((v) => {
      const l = (graph.x - v.x) * v.k;
      const t = (graph.y - v.y) * v.k;
      const r = l + graph.w * v.k;
      const b = t + graph.h * v.k;
      let dx = 0;
      let dy = 0;
      if (r > size.w - pad) dx = r - (size.w - pad);
      if (l - dx < leftSafe) dx = l - leftSafe;
      if (b > size.h - bottomSafe) dy = b - (size.h - bottomSafe);
      if (t - dy < topSafe) dy = t - topSafe;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return v;
      return { ...v, x: v.x + dx / v.k, y: v.y + dy / v.k };
    });
  }, [isHost, size.w, size.h, selectedGraphId, sheetInset, desktopLayout, store]);

  /* initial state from the server (also covers late joiners and reconnects) */
  useEffect(() => {
    if (!initial?.board) return;
    store.reset(initial.board.objects || []);
    setPageCount(initial.board.pageCount || 1);
    setPage(initial.board.page || 0);
    setHostPage(initial.board.page || 0);
  }, [initial, store]);

  /* host broadcasts what they are looking at, so listeners can follow on any screen size */
  const lastView = useRef(0);
  const dockWidth = inspector.dockWidth;
  useEffect(() => {
    if (!isHost || !size.w || !socket) return undefined;
    // The docked panel narrows the canvas but not what listeners should frame, so they never see a zoom jump
    const send = () => socket.emit("board-view", { room: roomId, page, rect: { x: view.x, y: view.y, w: (size.w + dockWidth) / view.k, h: size.h / view.k } });
    const wait = Math.max(0, 80 - (Date.now() - lastView.current));
    const t = setTimeout(() => { lastView.current = Date.now(); send(); }, wait);
    return () => clearTimeout(t);
  }, [isHost, view, size, dockWidth, page, socket, roomId]);

  /* incoming events */
  useEffect(() => {
    if (!socket) return undefined;
    const onOp = ({ ops }) => {
      store.applyRemote(ops);
      setRemotePreviews((current) => {
        if (!Array.isArray(ops) || !ops.length) return current;
        const next = new Map(current);
        for (const op of ops) {
          if (op.op === "add") {
            clearTimeout(previewTimers.current.get(op.obj.id));
            previewTimers.current.delete(op.obj.id);
            next.delete(op.obj.id);
          } else if (op.op === "update" || op.op === "remove") {
            clearTimeout(previewTimers.current.get(op.id));
            previewTimers.current.delete(op.id);
            next.delete(op.id);
          }
          else if (op.op === "clear") {
            for (const [id, preview] of next) if (op.page === undefined || preview.page === op.page) {
              clearTimeout(previewTimers.current.get(id));
              previewTimers.current.delete(id);
              next.delete(id);
            }
          }
        }
        return next;
      });
    };
    const onStroke = (chunk) => store.applyRemoteStroke(chunk);
    const onPreview = ({ id, page: previewPage, obj, active }) => {
      setRemotePreviews((current) => {
        const next = new Map(current);
        clearTimeout(previewTimers.current.get(id));
        previewTimers.current.delete(id);
        if (active === false) next.delete(id);
        else if (obj && obj.id === id) {
          next.set(id, { obj, page: previewPage });
          const timer = setTimeout(() => {
            setRemotePreviews((latest) => {
              if (latest.get(id)?.obj !== obj) return latest;
              const expired = new Map(latest);
              expired.delete(id);
              return expired;
            });
            previewTimers.current.delete(id);
          }, 15000);
          previewTimers.current.set(id, timer);
        }
        return next;
      });
    };
    const onPage = ({ page: p, pageCount: c }) => {
      if (c) setPageCount(c);
      setHostPage(p);
    };
    const onView = ({ rect, page: p }) => {
      setHostRect(rect);
      if (typeof p === "number") setHostPage(p);
    };
    const onPointer = (d) => {
      if (d.view !== "board") return;
      setLaser(d.active === false ? null : {
        x: d.x, y: d.y, page: d.page, active: true, tool: d.tool || "laser", angle: d.angle, t: performance.now(),
      });
    };
    socket.on("board-op", onOp);
    socket.on("board-stroke", onStroke);
    socket.on("board-preview", onPreview);
    socket.on("board-page", onPage);
    socket.on("board-view", onView);
    socket.on("pointer", onPointer);
    return () => {
      socket.off("board-op", onOp);
      socket.off("board-stroke", onStroke);
      socket.off("board-preview", onPreview);
      socket.off("board-page", onPage);
      socket.off("board-view", onView);
      socket.off("pointer", onPointer);
    };
  }, [socket, store]);

  useEffect(() => () => {
    for (const timer of previewTimers.current.values()) clearTimeout(timer);
    previewTimers.current.clear();
  }, []);

  // Listeners mirror the presenter while following
  useEffect(() => {
    if (isHost || !following) return;
    setPage(hostPage);
    if (hostRect && size.w) setView(fitRect(hostRect, size));
  }, [isHost, following, hostRect, hostPage, size]);

  /* viewport gestures */
  const onPan = useCallback((dx, dy) => {
    setView((v) => ({ ...v, x: v.x - dx / v.k, y: v.y - dy / v.k }));
    if (!isHost) setFollowing(false);
  }, [isHost]);

  const onZoom = useCallback((factor, cx, cy) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const wx = cx / v.k + v.x;
      const wy = cy / v.k + v.y;
      return { k, x: wx - cx / k, y: wy - cy / k };
    });
    if (!isHost) setFollowing(false);
  }, [isHost]);

  const zoomBy = (f) => onZoom(f, size.w / 2, size.h / 2);
  const resetView = () => {
    if (!isHost) {
      setFollowing(true);
      return;
    }
    setView(fitRect({ x: 0, y: 0, ...BOARD_HOME }, size));
  };

  /* pages */
  const goPage = (p) => {
    if (p < 0 || p >= pageCount) return;
    setPage(p);
    tools.setSelectedIds([]);
    if (isHost) socket?.emit("board-page", { room: roomId, page: p, pageCount });
    else setFollowing(false);
  };
  const addPage = () => {
    const count = pageCount + 1;
    setPageCount(count);
    setPage(count - 1);
    socket?.emit("board-page", { room: roomId, page: count - 1, pageCount: count });
  };

  const onStrokeChunk = useCallback((chunk) => socket?.emit("board-stroke", { room: roomId, ...chunk }), [socket, roomId]);
  const onLaser = useCallback((p) => socket?.emit("pointer", { room: roomId, view: "board", page, ...p }), [socket, roomId, page]);
  const onPreview = useCallback((preview) => socket?.emit("board-preview", { room: roomId, ...preview }), [socket, roomId]);

  const readOnlyLaser = laser && laser.page === page ? laser : null;

  const addGraph = ({ mode, expression, xExpression, yExpression, zExpression, tMin, tMax, uMin, uMax, vMin, vMax, xMin, xMax, yMin, yMax, zMin, zMax, azimuth, elevation }) => {
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
    const w = 520, h = 380;
    const x = view.x + size.w / view.k / 2 - w / 2;
    const y = view.y + size.h / view.k / 2 - h / 2;
    const obj = {
      id: uid(), type: "graph", page, mode, expression, xExpression, yExpression, zExpression, tMin, tMax,
      uMin, uMax, vMin, vMax,
      x, y, w, h, xMin, xMax, yMin, yMax,
      zMin, zMax, azimuth, elevation,
      color: "#2540D9", width: 2.5,
    };
    store.commit([{ op: "add", obj }]);
    tools.setSelectedIds([obj.id]);
    tools.setTool("select");
  };

  // A new formula appears in the middle of the view with a starter equation and opens its editor
  const addEquation = () => {
    const latex = "y = x^{2}";
    const fontSize = 44;
    ensureMath(); // start loading the typesetting engine; the editor corrects the size once it is ready
    const measured = measureEquation(latex, fontSize);
    const { w, h } = measured && !measured.error ? measured : estimateEquationSize(latex, fontSize);
    const obj = {
      id: uid(), type: "equation", page, latex, fontSize, color: "#17181C", w, h,
      x: view.x + size.w / view.k / 2 - w / 2,
      y: view.y + size.h / view.k / 2 - h / 2,
    };
    store.commit([{ op: "add", obj }]);
    tools.setSelectedIds([obj.id]);
    tools.setTool("select");
    inspector.open("half");
  };

  // A math aid (number line, unit circle, fraction bars) appears in the middle of the view, ready to edit
  const addAid = (kind) => {
    const spot = { id: uid(), page, cx: view.x + size.w / view.k / 2, cy: view.y + size.h / view.k / 2 };
    const instrument = INSTRUMENTS.some((item) => item.id === kind);
    const obj = kind === "cover" ? newCover(spot)
      : instrument ? newInstrument(kind, spot)
        : CHARTS.some((item) => item.id === kind) ? newStats(kind, spot)
          : newAid(kind, spot);
    store.commit([{ op: "add", obj }]);
    tools.setSelectedIds([obj.id]);
    tools.setTool("select");
    if (!instrument && kind !== "cover") inspector.open("half"); // instruments and covers are adjusted on the board itself
  };

  // Things the class-activity panel can put on the board: poll results, and a chart of numeric answers
  useEffect(() => {
    if (!apiRef) return undefined;
    const place = (obj) => {
      const placed = { ...obj, id: uid(), page, x: Number((view.x + size.w / view.k / 2 - obj.w / 2).toFixed(2)), y: Number((view.y + size.h / view.k / 2 - obj.h / 2).toFixed(2)) };
      store.commit([{ op: "add", obj: placed }]);
      tools.setSelectedIds([placed.id]);
      tools.setTool("select");
    };
    apiRef.current = {
      addPollResults: ({ title, bars, correct }) => place({
        type: "aid", kind: "pollbars", w: 600, h: Math.max(240, 120 + bars.length * 58), color: "#2540D9", title, bars, ...(correct === undefined || correct === null ? {} : { correct }),
      }),
      addNumberChart: ({ title, values }) => {
        const chart = newStats("histogram", { id: "x", page, cx: 0, cy: 0 });
        place({ ...chart, title, columns: [{ name: "Answers", values: values.slice(0, 300) }], showMean: true, showMedian: true });
      },
    };
    return () => { apiRef.current = null; };
  });

  const addTable = (rows, cols) => {
    const tableStyle = tools.styles.table;
    const cellWidth = tableStyle.cellWidth, cellHeight = tableStyle.cellHeight;
    const w = cols * cellWidth, h = rows * cellHeight;
    const x = view.x + size.w / view.k / 2 - w / 2;
    const y = view.y + size.h / view.k / 2 - h / 2;
    const obj = { id: uid(), type: "table", page, x, y, rows, cols, cellWidth, cellHeight, color: tableStyle.color, fontSize: tableStyle.fontSize, cells: Array(rows * cols).fill("") };
    store.commit([{ op: "add", obj }]);
    tools.setSelectedIds([obj.id]);
    tools.setTool("select");
  };

  const uploadMedia = async (file) => {
    if (!file) return;
    setMediaUploading(true);
    setMediaError("");
    try {
      const form = new FormData();
      form.append("media", file);
      const { data } = await api.post(`/media/board/${roomId}`, form, {
        timeout: 300000,
      });
      const media = data.media;
      const aspect = media.width > 0 && media.height > 0 ? media.width / media.height : 4 / 3;
      const maxWidth = Math.min(640, (size.w / view.k) * 0.65);
      const maxHeight = Math.min(480, (size.h / view.k) * 0.65);
      const w = Math.max(80, Math.min(maxWidth, maxHeight * aspect));
      const h = w / aspect;
      const obj = {
        id: uid(),
        type: "media",
        mediaType: media.mediaType,
        src: media.src,
        filename: media.filename,
        x: view.x + size.w / view.k / 2 - w / 2,
        y: view.y + size.h / view.k / 2 - h / 2,
        w,
        h,
        playing: false,
        currentTime: 0,
      };
      store.commit([{ op: "add", obj }]);
      tools.setSelectedIds([obj.id]);
      tools.setTool("select");
    } catch (error) {
      setMediaError(error.response?.data?.message || "Media upload failed. Please try again.");
    } finally {
      setMediaUploading(false);
    }
  };

  const addVideoLink = (input) => {
    const media = parseVideoLink(input);
    const maxWidth = Math.min(640, (size.w / view.k) * 0.65);
    const maxHeight = Math.min(480, (size.h / view.k) * 0.65);
    const w = Math.max(160, Math.min(maxWidth, maxHeight * (16 / 9)));
    const h = w * 9 / 16;
    const obj = {
      id: uid(),
      type: "media",
      page,
      ...media,
      x: view.x + size.w / view.k / 2 - w / 2,
      y: view.y + size.h / view.k / 2 - h / 2,
      w,
      h,
      playing: false,
      currentTime: 0,
    };
    store.commit([{ op: "add", obj }]);
    tools.setSelectedIds([obj.id]);
    tools.setTool("select");
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-white">
      <div ref={frameRef} className="relative h-full min-w-0 flex-1 overflow-hidden bg-white">
        <Surface
          ref={surfaceRef}
          store={store}
          page={page}
          mode="board"
          tool={isHost ? tools.tool : "select"}
          styles={tools.styles}
          readOnly={!isHost}
          view={view}
          background="grid"
          selectedIds={tools.selectedIds}
          onSelectedChange={tools.setSelectedIds}
          onPan={onPan}
          onZoom={onZoom}
          onLaser={isHost ? onLaser : undefined}
          remoteLaser={isHost ? null : readOnlyLaser}
          remotePreviews={isHost ? null : [...remotePreviews.values()].filter((preview) => preview.page === page).map((preview) => preview.obj)}
          onStrokeChunk={isHost ? onStrokeChunk : undefined}
          onLivePreview={isHost ? onPreview : undefined}
          onEditingChange={tools.setEditingObj}
          onEquationEdit={() => inspector.open("half")}
          onToolChange={tools.setTool}
          keepTool={tools.keepTool}
        />

        {isHost && <ToolDock mode="board" tools={tools} store={store} inspector={inspector} onCreateGraph={addGraph} onCreateEquation={addEquation} onCreateAid={addAid} onCreateTable={addTable} onUploadMedia={uploadMedia} onAddVideoLink={addVideoLink} mediaUploading={mediaUploading} mediaError={mediaError} />}
        {isHost && (
          <QuickBar
            tools={tools}
            store={store}
            surfaceRef={surfaceRef}
            inspector={inspector}
            view={view}
            size={size}
            safeLeft={inspector.desktop ? 68 : 8}
            safeBottom={inspector.desktop ? 8 : Math.max(72, inspector.insetBottom)}
          />
        )}

        {/* Listener: follow status */}
        {!isHost && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
            {following ? (
              <div className="flex items-center gap-2 rounded-md border border-line bg-white/95 px-3 py-1.5 text-xs text-gray-700">
                <Radio size={13} className="text-accent" /> Following presenter
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setFollowing(true); if (hostRect) setView(fitRect(hostRect, size)); setPage(hostPage); }}
                className="flex items-center gap-2 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper"
              >
                <Radio size={13} /> Return to presenter
              </button>
            )}
          </div>
        )}

        {/* Page + zoom controls */}
        <div className="absolute bottom-[4.5rem] right-3 z-10 flex flex-col items-end gap-2 md:bottom-3">
          <div className="float-panel flex items-center p-0.5">
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => goPage(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span className="min-w-[4.5rem] px-1 text-center text-xs tabular-nums text-gray-700">Page {page + 1} / {pageCount}</span>
            <button type="button" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => goPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken disabled:opacity-30"><ChevronRight size={16} /></button>
            {isHost && (
              <>
                <div className="mx-0.5 h-5 w-px bg-line" />
                <button type="button" aria-label="Add page" title="Add page" onClick={addPage} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Plus size={16} /></button>
                <PaperPicker store={store} page={page} pageCount={pageCount} />
                <button type="button" aria-label="Clear this page" title="Clear this page" onClick={() => setConfirmClear(true)} className="flex h-8 w-8 items-center justify-center rounded-md text-danger hover:bg-danger-soft"><Trash2 size={15} /></button>
              </>
            )}
          </div>
          <div className="float-panel flex items-center p-0.5">
            <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Minus size={15} /></button>
            <button type="button" aria-label="Reset zoom" onClick={resetView} className="min-w-[3.25rem] px-1 text-center text-xs tabular-nums text-gray-700 hover:text-ink">{Math.round(view.k * 100)}%</button>
            <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Plus size={15} /></button>
            <button type="button" aria-label="Fit board" title={isHost ? "Fit board" : "Follow presenter"} onClick={resetView} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Maximize2 size={14} /></button>
          </div>
        </div>

        {confirmClear && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/30 p-4" role="dialog" aria-modal="true" aria-label="Clear page">
            <div className="float-panel w-full max-w-sm p-5">
              <h3 className="text-base font-semibold">Clear page {page + 1}?</h3>
              <p className="mt-1.5 text-sm text-muted">Everything on this page is removed for everyone. You can undo it with Ctrl+Z.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmClear(false)} className="h-9 rounded-md border border-line px-3 text-sm hover:bg-sunken">Cancel</button>
                <button type="button" onClick={() => { surfaceRef.current?.clearPage(); setConfirmClear(false); }} className="h-9 rounded-md bg-danger px-3 text-sm font-medium text-white hover:opacity-90">Clear page</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {isHost && <InspectorDock mode="board" tools={tools} store={store} surfaceRef={surfaceRef} inspector={inspector} />}
    </div>
  );
}
