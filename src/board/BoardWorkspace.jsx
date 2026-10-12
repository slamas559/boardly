// The live whiteboard: infinite canvas, pages, follow-the-presenter for listeners.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Radio, Trash2 } from "lucide-react";
import Surface from "./Surface.jsx";
import ToolDock from "./ToolDock.jsx";
import { ObjectStore } from "./store.js";
import { BOARD_HOME } from "./constants.js";
import { useAnnotationTools } from "./useAnnotationTools.js";

const MIN_K = 0.1;
const MAX_K = 8;

function fitRect(rect, size) {
  const k = Math.min(size.w / rect.w, size.h / rect.h);
  return { k, x: rect.x - (size.w / k - rect.w) / 2, y: rect.y - (size.h / k - rect.h) / 2 };
}

export default function BoardWorkspace({ room, socket, isHost, initial, visible }) {
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
  const [confirmClear, setConfirmClear] = useState(false);
  const initialised = useRef(false);

  const store = useMemo(
    () => new ObjectStore({ onLocalOps: (ops) => socket?.emit("board-op", { room: roomId, ops }) }),
    [socket, roomId]
  );
  const tools = useAnnotationTools({ mode: "board", store, surfaceRef, enabled: isHost && visible });

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
  useEffect(() => {
    if (!isHost || !size.w || !socket) return undefined;
    const send = () => socket.emit("board-view", { room: roomId, page, rect: { x: view.x, y: view.y, w: size.w / view.k, h: size.h / view.k } });
    const wait = Math.max(0, 80 - (Date.now() - lastView.current));
    const t = setTimeout(() => { lastView.current = Date.now(); send(); }, wait);
    return () => clearTimeout(t);
  }, [isHost, view, size, page, socket, roomId]);

  /* incoming events */
  useEffect(() => {
    if (!socket) return undefined;
    const onOp = ({ ops }) => store.applyRemote(ops);
    const onStroke = (chunk) => store.applyRemoteStroke(chunk);
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
      setLaser(d.active === false ? null : { x: d.x, y: d.y, page: d.page, active: true, t: performance.now() });
    };
    socket.on("board-op", onOp);
    socket.on("board-stroke", onStroke);
    socket.on("board-page", onPage);
    socket.on("board-view", onView);
    socket.on("pointer", onPointer);
    return () => {
      socket.off("board-op", onOp);
      socket.off("board-stroke", onStroke);
      socket.off("board-page", onPage);
      socket.off("board-view", onView);
      socket.off("pointer", onPointer);
    };
  }, [socket, store]);

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

  const readOnlyLaser = laser && laser.page === page ? laser : null;

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden bg-white">
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
        onStrokeChunk={isHost ? onStrokeChunk : undefined}
        onEditingChange={tools.setEditingObj}
        onToolChange={tools.setTool}
        keepTool={tools.keepTool}
      />

      {isHost && <ToolDock mode="board" tools={tools} store={store} surfaceRef={surfaceRef} />}

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
      <div className="pointer-events-none absolute bottom-[4.5rem] right-3 z-10 flex flex-col items-end gap-2 md:bottom-3 [&>*]:pointer-events-auto">
        <div className="float-panel flex items-center p-0.5">
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => goPage(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="min-w-[4.5rem] px-1 text-center text-xs tabular-nums text-gray-700">Page {page + 1} / {pageCount}</span>
          <button type="button" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => goPage(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken disabled:opacity-30"><ChevronRight size={16} /></button>
          {isHost && (
            <>
              <div className="mx-0.5 h-5 w-px bg-line" />
              <button type="button" aria-label="Add page" title="Add page" onClick={addPage} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Plus size={16} /></button>
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
  );
}
