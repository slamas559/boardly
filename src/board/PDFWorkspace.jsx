// PDF viewing + annotation: single-page view with thumbnails, zoom, follow-the-presenter,
// and the same annotation engine as the whiteboard drawn over each page.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft, ChevronRight, FileText, Loader2, Maximize2, Minus, PanelLeft, Plus, Radio, Trash2, Upload,
} from "lucide-react";
import Surface from "./Surface.jsx";
import ToolDock from "./ToolDock.jsx";
import { InspectorDock } from "./Inspector.jsx";
import { useInspector } from "./useInspector.js";
import QuickBar from "./QuickBar.jsx";
import { ObjectStore, chunkOps } from "./store.js";
import { PDF_WORLD_WIDTH } from "./constants.js";
import { useAnnotationTools } from "./useAnnotationTools.js";
import api from "../utils/api";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const DOC_OPTIONS = { cMapUrl: "cmaps/", cMapPacked: true };

// Lazy thumbnail: only renders the page once it scrolls into view
const Thumb = memo(function Thumb({ n, active, onClick, annotated }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={`Go to page ${n}`}
      aria-current={active}
      className={`group block w-full rounded-md p-1.5 text-left ${active ? "bg-accent-soft outline outline-2 -outline-offset-2 outline-accent" : "hover:bg-sunken"}`}
    >
      <div className="relative mx-auto min-h-[120px] w-[112px] border border-line bg-white">
        {seen && <Page pageNumber={n} width={110} renderTextLayer={false} renderAnnotationLayer={false} loading={<div className="h-[145px]" />} />}
        {annotated && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />}
      </div>
      <div className={`mt-1 text-center text-xs tabular-nums ${active ? "font-medium text-accent" : "text-muted"}`}>{n}</div>
    </button>
  );
});

export default function PDFWorkspace({ room, socket, isHost, canDraw = false, participantKey = null, initial, visible }) {
  // The host, or a listener the host has let draw (who can only change their own annotations)
  const editing = isHost || canDraw;
  const roomId = room._id;
  const scrollRef = useRef(null);
  const surfaceRef = useRef(null);
  const [pageEl, setPageEl] = useState(null);
  const fileRef = useRef(null);

  const [url, setUrl] = useState(room.pdf?.url || null);
  const [page, setPage] = useState(room.pdf?.currentPage || 1);
  const [hostPage, setHostPage] = useState(room.pdf?.currentPage || 1);
  const [hostViewport, setHostViewport] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [avail, setAvail] = useState({ width: 0, height: 0 });
  const [aspect, setAspect] = useState(1.414);
  const [thumbs, setThumbs] = useState(false);
  const [following, setFollowing] = useState(true);
  const [uploading, setUploading] = useState(null); // percent | null
  const [uploadError, setUploadError] = useState("");
  const [laser, setLaser] = useState(null);
  const [remotePreviews, setRemotePreviews] = useState(() => new Map());
  const previewTimers = useRef(new Map());
  const viewSendTimer = useRef(null);
  const lastViewSent = useRef(0);
  const remoteScrollUntil = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const store = useMemo(
    () => new ObjectStore({ onLocalOps: (ops) => chunkOps(ops).forEach((part) => socket?.emit("pdf-op", { room: roomId, ops: part })) }),
    [socket, roomId]
  );
  useEffect(() => { store.setAuthor({ host: isHost, key: participantKey }); }, [store, isHost, participantKey]);
  const canEdit = useCallback((o) => isHost || Boolean(participantKey && o.by === participantKey), [isHost, participantKey]);
  const tools = useAnnotationTools({ mode: "pdf", store, surfaceRef, enabled: editing && visible });
  const inspector = useInspector(tools);

  /* initial / late-join state */
  useEffect(() => {
    if (!initial?.pdf) return;
    store.reset(initial.pdf.annotations || []);
    if (initial.pdf.url) setUrl(initial.pdf.url);
    const p = initial.pdf.currentPage || 1;
    setPage(p);
    setHostPage(p);
  }, [initial, store]);

  /* incoming events */
  useEffect(() => {
    if (!socket) return undefined;
    const onOp = ({ ops }) => {
      store.applyRemote(ops);
      if (!Array.isArray(ops) || !ops.length) return;
      setRemotePreviews((current) => {
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
          } else if (op.op === "clear") {
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
    const onPageChange = ({ page: p }) => {
      setHostPage(p);
      setHostViewport(null);
    };
    const onUpdated = ({ url: u }) => {
      setUrl(u);
      setPage(1);
      setHostPage(1);
      setHostViewport(null);
      store.reset([]);
      for (const timer of previewTimers.current.values()) clearTimeout(timer);
      previewTimers.current.clear();
      setRemotePreviews(new Map());
    };
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
    const onView = (data) => setHostViewport(data);
    const onPointer = (d) => {
      if (d.view !== "pdf") return;
      setLaser(d.active === false ? null : { x: d.x, y: d.y, page: d.page, active: true });
    };
    socket.on("pdf-op", onOp);
    socket.on("pdf-preview", onPreview);
    socket.on("pdf-page-change", onPageChange);
    socket.on("pdf-view", onView);
    socket.on("pdf-updated", onUpdated);
    socket.on("pointer", onPointer);
    return () => {
      socket.off("pdf-op", onOp);
      socket.off("pdf-preview", onPreview);
      socket.off("pdf-page-change", onPageChange);
      socket.off("pdf-view", onView);
      socket.off("pdf-updated", onUpdated);
      socket.off("pointer", onPointer);
    };
  }, [socket, store]);

  useEffect(() => () => {
    for (const timer of previewTimers.current.values()) clearTimeout(timer);
    previewTimers.current.clear();
    if (viewSendTimer.current) clearTimeout(viewSendTimer.current);
  }, []);

  useEffect(() => {
    if (!isHost && following) {
      if (page !== hostPage) {
        remoteScrollUntil.current = Date.now() + 200;
        scrollRef.current?.scrollTo({ top: 0, left: 0 });
      }
      setPage(hostPage);
    }
  }, [isHost, following, hostPage, page]);

  /* Fit the page to the available viewer area, then apply the user's zoom. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => {
      const next = { width: el.clientWidth, height: el.clientHeight };
      setAvail((current) => current.width === next.width && current.height === next.height ? current : next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [url]);

  const pad = avail.width < 640 ? 16 : 48;
  const verticalPad = avail.width < 640 ? 32 : 48;
  // 100% fills the width of the viewer, so a portrait page opens at a readable size and you scroll down it.
  // A page that is wider than it is tall (slides) is fitted whole instead, so it is never taller than the screen.
  const widthFit = Math.max(240, avail.width - pad);
  const heightFit = avail.height > verticalPad ? (avail.height - verticalPad) / aspect : widthFit;
  const fitWidth = Math.max(1, aspect >= 1 ? widthFit : Math.min(widthFit, heightFit));
  const width = Math.round(fitWidth * zoom);
  const height = Math.round(width * aspect);
  const view = useMemo(() => ({ x: 0, y: 0, k: width / PDF_WORLD_WIDTH }), [width]);
  const pageSize = useMemo(() => ({ w: PDF_WORLD_WIDTH, h: PDF_WORLD_WIDTH * aspect }), [aspect]);

  const getVisiblePage = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || !pageEl) return null;
    const viewport = scroller.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) return null;
    const x0 = Math.max(0, Math.min(1, (Math.max(viewport.left, pageRect.left) - pageRect.left) / pageRect.width));
    const x1 = Math.max(0, Math.min(1, (Math.min(viewport.right, pageRect.right) - pageRect.left) / pageRect.width));
    const y0 = Math.max(0, Math.min(1, (Math.max(viewport.top, pageRect.top) - pageRect.top) / pageRect.height));
    const y1 = Math.max(0, Math.min(1, (Math.min(viewport.bottom, pageRect.bottom) - pageRect.top) / pageRect.height));
    if (x1 <= x0 || y1 <= y0) return null;
    return { x0, x1, y0, y1 };
  }, [pageEl]);

  const sendPdfView = useCallback(() => {
    const viewport = getVisiblePage();
    if (!isHost || !socket || !viewport) return;
    lastViewSent.current = Date.now();
    socket.emit("pdf-view", { room: roomId, page, viewport });
  }, [getVisiblePage, isHost, page, roomId, socket]);

  const onViewerScroll = useCallback(() => {
    if (!isHost) {
      if (Date.now() < remoteScrollUntil.current) return;
      if (following) setFollowing(false);
      return;
    }
    if (viewSendTimer.current) return;
    const delay = Math.max(0, 80 - (Date.now() - lastViewSent.current));
    viewSendTimer.current = setTimeout(() => {
      viewSendTimer.current = null;
      sendPdfView();
    }, delay);
  }, [following, isHost, sendPdfView]);

  useEffect(() => {
    if (isHost || !following || !hostViewport || hostViewport.page !== page) return;
    const scroller = scrollRef.current;
    if (!scroller || !pageEl) return;
    const current = getVisiblePage();
    if (!current) return;

    const targetX = (hostViewport.viewport.x0 + hostViewport.viewport.x1) / 2;
    const targetY = (hostViewport.viewport.y0 + hostViewport.viewport.y1) / 2;
    const targetAlreadyVisible = targetX >= current.x0 && targetX <= current.x1
      && targetY >= current.y0 && targetY <= current.y1;
    if (targetAlreadyVisible) return;

    const viewportRect = scroller.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();
    const pageLeft = scroller.scrollLeft + pageRect.left - viewportRect.left;
    const pageTop = scroller.scrollTop + pageRect.top - viewportRect.top;
    const left = pageLeft + targetX * pageRect.width - scroller.clientWidth / 2;
    const top = pageTop + targetY * pageRect.height - scroller.clientHeight / 2;
    remoteScrollUntil.current = Date.now() + 250;
    scroller.scrollTo({ left, top, behavior: "auto" });
  }, [following, getVisiblePage, hostViewport, isHost, page, pageEl]);

  const clampZoom = (z) => Math.min(4, Math.max(0.5, z));
  const onZoom = useCallback((f) => setZoom((z) => clampZoom(z * f)), []);
  const onPan = useCallback((dx, dy) => {
    const el = scrollRef.current;
    if (el) { el.scrollLeft -= dx; el.scrollTop -= dy; }
  }, []);

  /* navigation */
  const goTo = useCallback((p) => {
    if (!numPages || p < 1 || p > numPages) return;
    setPage(p);
    tools.setSelectedIds([]);
    scrollRef.current?.scrollTo({ top: 0 });
    if (isHost) socket?.emit("pdf-page-change", { room: roomId, page: p });
    else setFollowing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, isHost, socket, roomId]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "PageDown" || (e.key === "ArrowRight" && !tools.selectedIds.length)) goTo(page + 1);
      if (e.key === "PageUp" || (e.key === "ArrowLeft" && !tools.selectedIds.length)) goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, goTo, page, tools.selectedIds.length]);

  /* upload */
  const upload = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { setUploadError("Please choose a PDF file."); return; }
    setUploadError("");
    setUploading(0);
    try {
      const form = new FormData();
      form.append("pdf", file);
      const res = await api.post(`/pdf/upload/${roomId}`, form, {
        timeout: 300000,
        onUploadProgress: (e) => e.total && setUploading(Math.round((e.loaded / e.total) * 100)),
      });
      const next = res.data.pdf.url;
      setUrl(next);
      setPage(1);
      store.reset([]);
      socket?.emit("pdf-updated", { url: next, room: roomId });
    } catch (err) {
      setUploadError(err.response?.data?.message || "Upload failed. Check your connection and try again.");
    } finally {
      setUploading(null);
    }
  };

  const onStrokeNoop = undefined; // freehand strokes on PDFs are sent as complete objects
  const onLaser = useCallback((p) => socket?.emit("pointer", { room: roomId, view: "pdf", page, ...p }), [socket, roomId, page]);
  const onPreview = useCallback((preview) => socket?.emit("pdf-preview", { room: roomId, ...preview }), [socket, roomId]);
  const annotatedPages = useMemo(() => new Set(store.list().map((o) => o.page)), [store, store.getVersion()]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------- empty state ------------------------------- */
  const picker = (
    <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
  );

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sunken p-4">
        {picker}
        {isHost ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]); }}
            className={`flex w-full max-w-lg flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center ${dragOver ? "border-accent bg-accent-soft" : "border-line-strong bg-white"}`}
          >
            <FileText size={28} strokeWidth={1.5} className="text-gray-500" />
            <h2 className="mt-4 text-lg font-semibold">Share a document</h2>
            <p className="mt-1 max-w-xs text-sm text-muted">Upload a PDF. Everyone in the room sees the page you are on, plus your highlights and notes.</p>
            <button type="button" disabled={uploading !== null} onClick={() => fileRef.current?.click()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60">
              {uploading !== null ? <><Loader2 size={15} className="animate-spin" /> Uploading {uploading}%</> : <><Upload size={15} /> Choose PDF</>}
            </button>
            <p className="mt-3 text-xs text-muted">or drop a file here · up to 100 MB</p>
            {uploadError && <p role="alert" className="mt-3 text-sm text-danger">{uploadError}</p>}
          </div>
        ) : (
          <div className="max-w-sm text-center">
            <FileText size={28} strokeWidth={1.5} className="mx-auto text-gray-400" />
            <h2 className="mt-4 text-base font-medium">No document shared yet</h2>
            <p className="mt-1 text-sm text-muted">When the host shares a PDF, it will appear here automatically.</p>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------- viewer --------------------------------- */
  const thumbList = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="relative flex h-full w-full flex-col bg-sunken">
      {picker}
      <Document
        file={url}
        options={DOC_OPTIONS}
        onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPage((p) => Math.min(Math.max(1, p), n)); }}
        loading={<div className="flex h-full items-center justify-center text-sm text-muted"><Loader2 size={16} className="mr-2 animate-spin" />Loading document…</div>}
        error={<div className="p-8 text-center text-sm text-danger">This document could not be loaded.</div>}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* top controls */}
        <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface px-2">
          <button type="button" aria-label="Toggle thumbnails" aria-pressed={thumbs} onClick={() => setThumbs((v) => !v)} className={`flex h-8 w-8 items-center justify-center rounded-md ${thumbs ? "bg-sunken" : "hover:bg-sunken"}`}><PanelLeft size={16} /></button>
          <div className="mx-1 h-5 w-px bg-line" />
          <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => goTo(page - 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken disabled:opacity-30"><ChevronLeft size={16} /></button>
          <div className="flex items-center gap-1 text-sm tabular-nums">
            <input
              aria-label="Page number"
              value={page}
              onChange={(e) => { const n = parseInt(e.target.value, 10); if (n) goTo(n); }}
              className="h-7 w-10 rounded-md border border-line bg-white text-center text-sm"
              inputMode="numeric"
            />
            <span className="text-muted">/ {numPages || "–"}</span>
          </div>
          <button type="button" aria-label="Next page" disabled={page >= numPages} onClick={() => goTo(page + 1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken disabled:opacity-30"><ChevronRight size={16} /></button>
          <div className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <div className="hidden items-center sm:flex">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => clampZoom(z / 1.2))} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Minus size={15} /></button>
            <button type="button" onClick={() => setZoom(1)} className="w-12 text-center text-xs tabular-nums text-gray-700 hover:text-ink" aria-label="Fit to width">{Math.round(zoom * 100)}%</button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => clampZoom(z * 1.2))} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Plus size={15} /></button>
            <button type="button" aria-label="Fit to width" title="Fit to width" onClick={() => setZoom(1)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-sunken"><Maximize2 size={14} /></button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {!isHost && !following && (
              <button type="button" onClick={() => { setFollowing(true); setPage(hostPage); }} className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-2.5 text-xs font-medium text-white">
                <Radio size={13} /> <span className="hidden xs:inline">Return to presenter</span><span className="xs:hidden">Presenter</span>
              </button>
            )}
            {!isHost && following && <span className="hidden items-center gap-1.5 px-2 text-xs text-muted sm:flex"><Radio size={13} className="text-accent" /> Following presenter</span>}
            {isHost && (
              <>
                <button type="button" onClick={() => setConfirmClear(true)} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-danger hover:bg-danger-soft" title="Remove all annotations on this page"><Trash2 size={14} /><span className="hidden md:inline">Clear page</span></button>
                <button type="button" disabled={uploading !== null} onClick={() => fileRef.current?.click()} className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-xs hover:bg-sunken disabled:opacity-60">
                  {uploading !== null ? <><Loader2 size={13} className="animate-spin" />{uploading}%</> : <><Upload size={13} /><span className="hidden sm:inline">Replace</span></>}
                </button>
              </>
            )}
          </div>
        </div>
        {uploadError && <div role="alert" className="border-b border-line bg-danger-soft px-3 py-1.5 text-sm text-danger">{uploadError}</div>}

        <div className="relative flex min-h-0 flex-1">
          {/* thumbnails */}
          {thumbs && (
            <aside className="scroll-thin absolute inset-y-0 left-0 z-20 w-36 overflow-y-auto border-r border-line bg-surface p-1.5 md:static md:z-auto md:shrink-0">
              {thumbList.map((n) => (
                <Thumb key={n} n={n} active={n === page} annotated={annotatedPages.has(n)} onClick={() => { goTo(n); if (window.innerWidth < 768) setThumbs(false); }} />
              ))}
            </aside>
          )}

          {/* page */}
          <div ref={scrollRef} onScroll={onViewerScroll} className="scroll-thin relative min-w-0 flex-1 overflow-auto">
            <div className="mx-auto flex min-h-full w-max min-w-full justify-center px-2 py-4 pb-24 md:px-6 md:pb-6">
              <div
                ref={setPageEl}
                className="relative h-fit shrink-0 bg-white"
                style={{ width, height, boxShadow: "0 0 0 1px rgb(23 24 28 / 0.08), 0 8px 24px -16px rgb(23 24 28 / 0.35)" }}
              >
                <Page
                  pageNumber={page}
                  width={width}
                  renderTextLayer
                  renderAnnotationLayer
                  onLoadSuccess={(p) => setAspect(p.originalHeight / p.originalWidth)}
                  loading={<div style={{ width, height }} className="animate-pulse bg-white" />}
                />
                <Surface
                  ref={surfaceRef}
                  store={store}
                  page={page}
                  mode="pdf"
                  tool={editing ? tools.tool : "select"}
                  styles={tools.styles}
                  readOnly={!editing}
                  asListener={!isHost}
                  canEdit={canEdit}
                  view={view}
                  background="none"
                  pageSize={pageSize}
                  pageEl={pageEl}
                  selectedIds={tools.selectedIds}
                  onSelectedChange={tools.setSelectedIds}
                  onPan={onPan}
                  onZoom={onZoom}
                  onLaser={isHost ? onLaser : undefined}
                  remoteLaser={isHost ? null : laser && laser.page === page ? laser : null}
                  remotePreviews={[...remotePreviews.values()].filter((preview) => preview.page === page).map((preview) => preview.obj)}
                  onStrokeChunk={onStrokeNoop}
                  onLivePreview={editing ? onPreview : undefined}
                  onEditingChange={tools.setEditingObj}
                  onToolChange={tools.setTool}
                  keepTool={tools.keepTool}
                />
                {isHost && (
                  <QuickBar tools={tools} store={store} surfaceRef={surfaceRef} inspector={inspector} view={view} size={{ w: width, h: height }} />
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-3 z-40 flex items-center rounded-lg border border-line bg-surface p-1 shadow-md sm:hidden">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => clampZoom(z / 1.2))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-sunken"><Minus size={17} /></button>
            <button type="button" onClick={() => setZoom(1)} className="min-w-12 px-1 text-center text-xs tabular-nums text-gray-700 hover:text-ink" aria-label="Fit to width">{Math.round(zoom * 100)}%</button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => clampZoom(z * 1.2))} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-sunken"><Plus size={17} /></button>
          </div>

          {/* Style settings dock beside the page on desktop; a bottom sheet on phones */}
          {editing && <InspectorDock mode="pdf" tools={tools} store={store} surfaceRef={surfaceRef} inspector={inspector} />}
          {editing && <ToolDock mode="pdf" restricted={!isHost} tools={tools} store={store} inspector={inspector} surfaceRef={surfaceRef} />}
        </div>
      </Document>

      {confirmClear && (
        <div className="modal-safe absolute inset-0 z-30 flex items-center justify-center bg-ink/30" role="dialog" aria-modal="true" aria-label="Clear annotations">
          <div className="float-panel w-full max-w-sm p-5">
            <h3 className="text-base font-semibold">Clear annotations on page {page}?</h3>
            <p className="mt-1.5 text-sm text-muted">Highlights, notes and drawings on this page are removed for everyone. You can undo it with Ctrl+Z.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmClear(false)} className="h-9 rounded-md border border-line px-3 text-sm hover:bg-sunken">Cancel</button>
              <button type="button" onClick={() => { surfaceRef.current?.clearPage(); setConfirmClear(false); }} className="h-9 rounded-md bg-danger px-3 text-sm font-medium text-white hover:opacity-90">Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
