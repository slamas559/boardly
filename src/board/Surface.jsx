// Surface: one canvas that renders objects from an ObjectStore and turns pointer input into
// store operations. It is used for the infinite whiteboard and as the annotation layer on PDF pages.
import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore,
} from "react";
import {
  FONT_STACKS, LINE_HEIGHT, STYLE_GROUP, uid,
} from "./constants.js";
import {
  dist, hitGraphGeometry, hitObject, isMovable, measureText, movePatch, objectInRect, q, scalePatch,
} from "./geometry.js";
import { drawGrid, drawObject, drawSelection, handlePoints } from "./render.js";
import { cursorFor } from "./cursors.js";

let clipboard = [];
const LASER_COLOR = "#E2492B";

const Surface = forwardRef(function Surface(
  {
    store,
    page = 0,
    mode = "board", // "board" | "pdf"
    tool = "select",
    styles,
    readOnly = false,
    view,
    background = "grid",
    pageSize = null, // PDF only: world size of the page
    pageEl = null, // PDF only: DOM element of the rendered page (for text markup)
    selectedIds,
    onSelectedChange,
    onPan,
    onZoom,
    onLaser,
    remoteLaser,
    remotePreviews,
    onStrokeChunk,
    onLivePreview,
    onEditingChange,
    onToolChange,
    keepTool = false,
    className = "",
  },
  ref
) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [editing, setEditing] = useState(null); // {id, isNew, obj}
  const [tableEditing, setTableEditing] = useState(null);
  const tableEditRef = useRef(null);
  const version = useSyncExternalStore(store.subscribe, store.getVersion);

  // Latest props for event handlers without re-binding
  const live = useRef({});
  live.current = { store, page, mode, tool, styles, readOnly, view, pageSize, pageEl, selectedIds, size, editing, onLaser, onLivePreview, remotePreviews };

  const drag = useRef(null);
  const pointers = useRef(new Map());
  const transient = useRef(new Map()); // id -> patched object preview while moving/resizing
  const erasing = useRef(new Set());
  const lasers = useRef([]); // {x, y, t}
  const spaceDown = useRef(false);
  const lastPenTime = useRef(0);
  const raf = useRef(0);
  const lastLaserSend = useRef(0);
  const lastCursorSend = useRef(0);
  const lastPreviewSend = useRef(new Map());
  const lastCursorPoint = useRef(null);
  const remoteCursor = useRef(null);
  const cursorRef = useRef("default");

  /* ------------------------------ sizing ------------------------------ */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ----------------------------- rendering ----------------------------- */
  const draw = useCallback(() => {
    raf.current = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { store: st, page: pg, view: v, size: sz, selectedIds: sel, editing: ed, pageSize: ps, mode: md, remotePreviews: previews } = live.current;
    if (!v || !sz.w || !sz.h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const pw = Math.round(sz.w * dpr);
    const ph = Math.round(sz.h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);
    if (md === "board") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, pw, ph);
    }

    ctx.setTransform(dpr * v.k, 0, 0, dpr * v.k, -v.x * v.k * dpr, -v.y * v.k * dpr);
    if (background === "grid") drawGrid(ctx, v, sz.w, sz.h);

    const objs = st.onPage(pg);
    const selected = [];
    const previewIds = new Set((previews || []).map((preview) => preview.id));
    for (const base of objs) {
      if (ed && ed.id === base.id) continue;
      if (previewIds.has(base.id)) continue;
      const o = transient.current.get(base.id) || base;
      const fade = erasing.current.has(base.id) ? 0.2 : 1;
      drawObject(ctx, o, { k: v.k, pageSize: ps, alpha: fade });
      if (sel && sel.includes(base.id)) selected.push(o);
    }
    for (const preview of previews || []) if ((preview.page ?? 0) === pg) {
      drawObject(ctx, preview, { k: v.k, pageSize: ps, alpha: preview.previewAlpha ?? 1 });
    }

    // In-progress drawing
    const d = drag.current;
    if (d) {
      if (d.type === "stroke") {
        drawObject(ctx, { type: "stroke", tool: d.meta.tool, color: d.meta.color, width: d.meta.width, opacity: d.meta.opacity, vp: d.meta.vp, points: d.pts }, { k: v.k });
      } else if (d.type === "shape") {
        drawObject(ctx, d.obj, { k: v.k });
      } else if (d.type === "markup") {
        drawObject(ctx, d.obj, { k: v.k });
      } else if (d.type === "marquee") {
        ctx.save();
        ctx.fillStyle = "rgba(37,64,217,0.08)";
        ctx.strokeStyle = "#2540D9";
        ctx.lineWidth = 1 / v.k;
        const r = d.rect;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.restore();
      }
    }

    if (selected.length && !(d && d.type === "marquee")) {
      drawSelection(ctx, selected, v.k, { showHandles: !live.current.readOnly && !(d && d.type === "move") });
    }

    // Laser pointer trails
    const now = performance.now();
    lasers.current = lasers.current.filter((p) => now - p.t < 900);
    if (lasers.current.length) {
      ctx.save();
      for (const p of lasers.current) {
        const age = (now - p.t) / 900;
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.fillStyle = LASER_COLOR;
        ctx.shadowColor = LASER_COLOR;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (2.6 - 1.4 * age) / v.k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      schedule();
    }
    const cursor = remoteCursor.current;
    if (cursor && cursor.page === pg && now - cursor.t < 5000) {
      const x = cursor.x, y = cursor.y;
      const angle = Number.isFinite(cursor.angle) ? cursor.angle : 0;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = cursor.tool === "laser" ? LASER_COLOR : "#2540D9";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 / v.k;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 18 / v.k);
      ctx.lineTo(5 / v.k, 13 / v.k);
      ctx.lineTo(10 / v.k, 22 / v.k);
      ctx.lineTo(14 / v.k, 20 / v.k);
      ctx.lineTo(9 / v.k, 11 / v.k);
      ctx.lineTo(16 / v.k, 11 / v.k);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (cursor.tool && cursor.tool !== "laser") {
        ctx.rotate(-angle);
        ctx.font = `${11 / v.k}px system-ui, sans-serif`;
        ctx.fillStyle = "#172554";
        ctx.fillText(cursor.tool, 18 / v.k, 12 / v.k);
      }
      ctx.restore();
      if (now - cursor.t < 5000) schedule();
    }
  }, [background]);

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    schedule();
  }, [schedule, version, view, size, selectedIds, editing, page, pageSize, tool, remotePreviews]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const redraw = () => schedule();
    window.addEventListener("boardly-3d-renderer-ready", redraw);
    return () => window.removeEventListener("boardly-3d-renderer-ready", redraw);
  }, [schedule]);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  // Web fonts load after first paint: redraw so text uses the right metrics
  useEffect(() => {
    document.fonts?.ready?.then(schedule);
  }, [schedule]);

  // Remote laser
  useEffect(() => {
    if (!remoteLaser || remoteLaser.active === false) {
      remoteCursor.current = null;
      return;
    }
    remoteCursor.current = { ...remoteLaser, t: performance.now() };
    if (remoteLaser.tool === "laser" || !remoteLaser.tool) {
      lasers.current.push({ x: remoteLaser.x, y: remoteLaser.y, t: performance.now() });
    }
    schedule();
  }, [remoteLaser, schedule]);

  /* -------------------------- coordinate helpers -------------------------- */
  const toWorld = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const { view: v } = live.current;
    return [(e.clientX - r.left) / v.k + v.x, (e.clientY - r.top) / v.k + v.y];
  }, []);

  const objectsTopFirst = () => live.current.store.onPage(live.current.page).slice().reverse();

  /* ----------------------------- text editing ----------------------------- */
  const startEdit = useCallback((obj, isNew) => {
    setEditing({ id: obj.id, isNew, obj });
    live.current.onLivePreview?.({ id: obj.id, page: obj.page ?? live.current.page, obj, active: true });
    onEditingChange?.(obj);
    onSelectedChange?.(isNew ? [] : [obj.id]);
  }, [onEditingChange, onSelectedChange]);

  const finishEdit = useCallback((text) => {
    const ed = live.current.editing;
    if (!ed) return;
    const { store: st } = live.current;
    const obj = { ...ed.obj, text };
    clearPreview(obj.id, obj.page ?? live.current.page);
    live.current.editing = null; // synchronous guard: blur can fire again while unmounting
    setEditing(null);
    onEditingChange?.(null);

    if (!text.trim()) {
      if (!ed.isNew && st.get(ed.id)) st.commit([{ op: "remove", id: ed.id }]);
      onSelectedChange?.([]);
      return;
    }
    if (ed.isNew) {
      st.commit([{ op: "add", obj }]);
      onSelectedChange?.([obj.id]);
    } else {
      const prev = st.get(ed.id);
      if (!prev) return;
      const patch = {};
      for (const k of Object.keys(obj)) if (obj[k] !== prev[k]) patch[k] = obj[k];
      if (Object.keys(patch).length) st.commit([{ op: "update", id: ed.id, patch }]);
      onSelectedChange?.([ed.id]);
    }
  }, [onEditingChange, onSelectedChange]);

  const finishTableEdit = useCallback((nextValue, cancel = false) => {
    const ed = tableEditRef.current;
    if (!ed) return;
    tableEditRef.current = null;
    setTableEditing(null);
    clearPreview(ed.id);
    if (cancel) return;
    const table = live.current.store.get(ed.id);
    if (!table) return;
    const cells = table.cells.slice();
    cells[ed.row * table.cols + ed.col] = nextValue;
    live.current.store.commit([{ op: "update", id: ed.id, patch: { cells } }]);
  }, []);

  /* ----------------------------- selection ops ----------------------------- */
  const selectedObjects = () => {
    const { store: st, selectedIds: sel } = live.current;
    return (sel || []).map((id) => st.get(id)).filter(Boolean);
  };

  const api = useMemo(() => ({
    deleteSelected() {
      const objs = selectedObjects();
      if (!objs.length) return;
      live.current.store.commit(objs.map((o) => ({ op: "remove", id: o.id })));
      onSelectedChange?.([]);
    },
    selectAll() {
      onSelectedChange?.(live.current.store.onPage(live.current.page).map((o) => o.id));
    },
    copy() {
      clipboard = selectedObjects().map((o) => JSON.parse(JSON.stringify(o)));
    },
    paste(offset = 24) {
      if (!clipboard.length) return;
      const { page: pg } = live.current;
      const ops = clipboard.filter((o) => o.type !== "markup").map((o) => {
        const copy = { ...JSON.parse(JSON.stringify(o)), id: uid(), page: pg };
        return { op: "add", obj: { ...copy, ...movePatch(copy, offset, offset) } };
      });
      if (!ops.length) return;
      live.current.store.commit(ops);
      onSelectedChange?.(ops.map((o) => o.obj.id));
      clipboard = ops.map((o) => o.obj);
    },
    duplicate() {
      api.copy();
      api.paste();
    },
    nudge(dx, dy) {
      const ops = selectedObjects().filter(isMovable).map((o) => ({ op: "update", id: o.id, patch: movePatch(o, dx, dy) }));
      if (ops.length) live.current.store.commit(ops);
    },
    /** Apply a style patch to the current selection (or the text being edited). */
    patchStyle(patch) {
      const ed = live.current.editing;
      if (ed) {
        const obj = { ...ed.obj, ...patch };
        setEditing({ ...ed, obj });
        onEditingChange?.(obj);
        return true;
      }
      const ops = selectedObjects()
        .map((o) => {
          const p = {};
          for (const [k, v] of Object.entries(patch)) {
            if (k in o || styleKeyApplies(o, k)) p[k] = v;
          }
          return Object.keys(p).length ? { op: "update", id: o.id, patch: p } : null;
        })
        .filter(Boolean);
      if (ops.length) live.current.store.commit(ops);
      return ops.length > 0;
    },
    finishEditing() {
      const ed = live.current.editing;
      if (ed) finishEdit(ed.obj.text || "");
    },
    clearPage() {
      live.current.store.commit([{ op: "clear", page: live.current.page }]);
      onSelectedChange?.([]);
    },
  }), [finishEdit, onEditingChange, onSelectedChange]);

  useImperativeHandle(ref, () => api, [api]);

  // Drop transient state when the page or tool changes
  useEffect(() => {
    drag.current = null;
    transient.current.clear();
    erasing.current.clear();
    if (live.current.editing) api.finishEditing();
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tool]);

  /* ----------------------------- pointer input ----------------------------- */
  const hitHandle = (screenPt) => {
    const objs = selectedObjects();
    if (!objs.length) return -1;
    const { view: v } = live.current;
    const pts = handlePoints(objs, "box", 4 / v.k);
    for (let i = 0; i < pts.length; i++) {
      const sx = (pts[i][0] - v.x) * v.k;
      const sy = (pts[i][1] - v.y) * v.k;
      if (Math.hypot(sx - screenPt[0], sy - screenPt[1]) <= 14) return i;
    }
    return -1;
  };

  const emitLaser = (p, active = true) => {
    if (!onLaser) return;
    const now = performance.now();
    if (active && now - lastLaserSend.current < 28) return;
    lastLaserSend.current = now;
    onLaser(active ? { x: q(p[0]), y: q(p[1]), active: true, tool: "laser", angle: 0 } : { active: false });
  };

  const shareCursor = (p, force = false) => {
    const { onLaser: share, tool: activeTool } = live.current;
    if (!share) return;
    const now = performance.now();
    if (!force && now - lastCursorSend.current < 32) return;
    lastCursorSend.current = now;
    let angle = 0;
    if (lastCursorPoint.current && p) {
      const dx = p[0] - lastCursorPoint.current[0];
      const dy = p[1] - lastCursorPoint.current[1];
      if (Math.hypot(dx, dy) > 0.5) angle = Math.atan2(dy, dx);
    }
    if (p) lastCursorPoint.current = p;
    share(p ? { x: q(p[0]), y: q(p[1]), active: true, tool: activeTool || "select", angle } : { active: false });
  };

  const sharePreview = (obj, active = true, force = false) => {
    const { onLivePreview: share } = live.current;
    if (!share || !obj) return;
    const now = performance.now();
    const lastSent = lastPreviewSend.current.get(obj.id) || 0;
    if (active && !force && now - lastSent < 32) return;
    lastPreviewSend.current.set(obj.id, now);
    share({ id: obj.id, page: obj.page ?? live.current.page, obj: active ? obj : undefined, active });
  };

  const clearPreview = (id, pg = live.current.page) => {
    lastPreviewSend.current.delete(id);
    live.current.onLivePreview?.({ id, page: pg, active: false });
  };

  const onPointerDown = (e) => {
    const { tool: tl, readOnly: ro, mode: md, styles: st, store: s, page: pg, view: v } = live.current;
    const canvas = canvasRef.current;

    if (e.pointerType === "pen") lastPenTime.current = performance.now();
    // Palm rejection: while a stylus is active, ignore finger touches for drawing
    if (e.pointerType === "touch" && performance.now() - lastPenTime.current < 1500) return;

    canvas.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

    // Two fingers: pinch / pan, discarding a stroke that has not been shown to others yet
    if (pointers.current.size === 2 && e.pointerType === "touch") {
      const d = drag.current;
      if (d && d.type === "stroke" && d.sent > 0) finishStroke();
      drag.current = null;
      transient.current.clear();
      erasing.current.clear();
      const [a, b] = [...pointers.current.values()];
      drag.current = { type: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      schedule();
      return;
    }
    if (pointers.current.size > 2) return;

    const r = canvas.getBoundingClientRect();
    const screen = [e.clientX - r.left, e.clientY - r.top];
    const p = toWorld(e);
    shareCursor(p, true);

    // Panning: middle button, space held, the Pan tool, or a read-only board
    if (e.button === 1 || spaceDown.current || (!ro && tl === "pan") || (ro && md === "board")) {
      drag.current = { type: "pan", x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
      return;
    }
    if (ro) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;

    switch (tl) {
      case "pen":
      case "highlighter": {
        const g = st[STYLE_GROUP[tl]];
        const pressure = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
        drag.current = {
          type: "stroke",
          id: uid(),
          page: pg,
          meta: { tool: tl, color: g.color, width: g.width, opacity: g.opacity ?? 1, vp: false },
          pts: [[q(p[0]), q(p[1]), Math.round(pressure * 100) / 100]],
          sent: 0,
          startT: performance.now(),
          lastSend: 0,
          pointerType: e.pointerType,
        };
        break;
      }
      case "rect":
      case "ellipse":
      case "diamond":
      case "triangle":
      case "roundedRect":
      case "hexagon":
      case "star":
      case "line":
      case "arrow": {
        const g = st.shape;
        drag.current = {
          type: "shape",
          kind: tl,
          start: p,
          obj: { id: uid(), type: "shape", kind: tl, page: pg, x1: p[0], y1: p[1], x2: p[0], y2: p[1], color: g.color, width: g.width, opacity: g.opacity ?? 1, fill: !!g.fill },
        };
        sharePreview(drag.current.obj, true, true);
        break;
      }
      case "eraser": {
        drag.current = { type: "erase" };
        eraseAt(p);
        break;
      }
      case "text": {
        e.preventDefault();
        const hit = objectsTopFirst().find((o) => o.type === "text" && hitObject(o, p, 4 / v.k));
        if (hit) startEdit(hit, false);
        else {
          const g = st.text;
          startEdit({
            id: uid(), type: "text", page: pg, x: q(p[0]), y: q(p[1] - g.fontSize * 0.6), text: "",
            color: g.color, fontFamily: g.fontFamily, fontSize: g.fontSize, bold: g.bold, italic: g.italic, underline: g.underline, align: g.align,
          }, true);
        }
        break;
      }
      case "highlight":
      case "underline":
      case "strike": {
        if (md !== "pdf" || !live.current.pageEl) return;
        const g = st[STYLE_GROUP[tl]];
        drag.current = {
          type: "markup",
          start: { x: e.clientX, y: e.clientY },
          obj: { id: uid(), type: "markup", kind: tl, page: pg, rects: [], color: g.color, opacity: g.opacity ?? 1 },
        };
        break;
      }
      case "laser": {
        drag.current = { type: "laser" };
        lasers.current.push({ x: p[0], y: p[1], t: performance.now() });
        emitLaser(p);
        break;
      }
      default: {
        // select
        const selected = selectedObjects();
        if (selected.length === 1 && selected[0].type === "graph") {
          const graph = selected[0];
          const inPlot = p[0] >= graph.x + 42 && p[0] <= graph.x + graph.w - 12
            && p[1] >= graph.y + 24 && p[1] <= graph.y + graph.h - 34;
          if (["surface3d", "curve3d", "parametricSurface3d"].includes(graph.mode) && inPlot) {
            e.preventDefault();
            drag.current = {
              type: "graphCamera", obj: graph, start: [e.clientX, e.clientY],
              azimuth: graph.azimuth ?? 42, elevation: graph.elevation ?? 32, moved: false,
            };
            canvas.style.cursor = "grabbing";
            break;
          }
          const geometryId = hitGraphGeometry(selected[0], p, 8 / v.k);
          if (geometryId) {
            drag.current = { type: "graphGeometry", obj: selected[0], geometryId, start: p };
            break;
          }
        }
        const hi = hitHandle(screen);
        if (hi >= 0) {
          const objs = selectedObjects();
          const single = objs.length === 1 && objs[0].type === "shape" && (objs[0].kind === "line" || objs[0].kind === "arrow");
          const handles = handlePoints(objs, "box", 0);
          drag.current = single
            ? { type: "endpoint", index: hi, obj: objs[0] }
            : {
              type: "resize", index: hi, objs: objs.map((o) => ({ ...o })),
              anchor: handles[(hi + 2) % 4], corner: handles[hi],
              uniform: objs.some((o) => o.type === "text") || e.shiftKey,
            };
          break;
        }
        const hit = objectsTopFirst().find((o) => hitObject(o, p, 6 / v.k));
        if (hit) {
          let sel = live.current.selectedIds || [];
          if (e.shiftKey) sel = sel.includes(hit.id) ? sel.filter((i) => i !== hit.id) : [...sel, hit.id];
          else if (!sel.includes(hit.id)) sel = [hit.id];
          onSelectedChange?.(sel);
          drag.current = { type: "move", start: p, moved: false, ids: sel, objs: sel.map((id) => s.get(id)).filter(Boolean) };
        } else {
          if (!e.shiftKey) onSelectedChange?.([]);
          drag.current = { type: "marquee", start: p, rect: { x: p[0], y: p[1], w: 0, h: 0 }, base: e.shiftKey ? live.current.selectedIds || [] : [] };
        }
      }
    }
    schedule();
  };

  const eraseAt = (p) => {
    const { view: v, store: s, page: pg } = live.current;
    const tol = 10 / v.k;
    for (const o of s.onPage(pg)) {
      if (!erasing.current.has(o.id) && o.type !== "highlight" && hitObject(o, p, tol)) {
        erasing.current.add(o.id);
        sharePreview({ ...o, previewAlpha: 0.2 });
      }
    }
  };

  const flushStroke = (force = false) => {
    const d = drag.current;
    if (!d || d.type !== "stroke" || !onStrokeChunk) return;
    const now = performance.now();
    if (!force && now - d.startT < 90) return; // let two-finger gestures cancel before anything is shared
    if (!force && now - d.lastSend < 45) return;
    const chunk = d.pts.slice(d.sent);
    if (!chunk.length) return;
    onStrokeChunk({ id: d.id, page: d.page, meta: d.sent === 0 ? d.meta : undefined, points: chunk });
    d.sent = d.pts.length;
    d.lastSend = now;
  };

  const finishStroke = () => {
    const d = drag.current;
    if (!d || d.type !== "stroke") return;
    flushStroke(true);
    live.current.store.commit([{ op: "add", obj: { id: d.id, type: "stroke", page: d.page, ...d.meta, points: d.pts } }], { emit: !onStrokeChunk });
    drag.current = null;
  };

  const onPointerMove = (e) => {
    const rec = pointers.current.get(e.pointerId);
    if (rec) {
      rec.x = e.clientX;
      rec.y = e.clientY;
    }
    const d = drag.current;
    const { tool: tl, view: v, readOnly: ro } = live.current;
    if (!ro && live.current.mode === "board") shareCursor(toWorld(e));

    // Laser follows the cursor even when no button is pressed
    if (!d && tl === "laser" && !ro && e.pointerType === "mouse") {
      const p = toWorld(e);
      lasers.current.push({ x: p[0], y: p[1], t: performance.now() });
      emitLaser(p);
      schedule();
      return;
    }
    if (!d) return;

    if (d.type === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const nd = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const rect = canvasRef.current.getBoundingClientRect();
      if (d.dist > 0) onZoom?.(nd / d.dist, cx - rect.left, cy - rect.top);
      onPan?.(cx - d.cx, cy - d.cy);
      d.dist = nd;
      d.cx = cx;
      d.cy = cy;
      return;
    }
    if (d.type === "pan") {
      onPan?.(e.clientX - d.x, e.clientY - d.y);
      d.x = e.clientX;
      d.y = e.clientY;
      return;
    }

    const p = toWorld(e);

    switch (d.type) {
      case "stroke": {
        const events = e.nativeEvent?.getCoalescedEvents?.() || [];
        const list = events.length ? events : [e.nativeEvent || e];
        for (const ev of list) {
          const pt = toWorld(ev);
          const last = d.pts[d.pts.length - 1];
          if (dist(pt, last) < 0.8 / v.k) continue;
          const pr = d.pointerType === "pen" && ev.pressure > 0 ? ev.pressure : 0.5;
          if (d.pointerType === "pen" && Math.abs(pr - 0.5) > 0.02) d.meta.vp = true;
          d.pts.push([q(pt[0]), q(pt[1]), Math.round(pr * 100) / 100]);
        }
        flushStroke();
        break;
      }
      case "shape": {
        let [x2, y2] = p;
        const [x1, y1] = d.start;
        if (e.shiftKey) {
          if (d.kind === "line" || d.kind === "arrow") {
            const ang = Math.round(Math.atan2(y2 - y1, x2 - x1) / (Math.PI / 12)) * (Math.PI / 12);
            const len = Math.hypot(x2 - x1, y2 - y1);
            x2 = x1 + len * Math.cos(ang);
            y2 = y1 + len * Math.sin(ang);
          } else {
            const s = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
            x2 = x1 + Math.sign(x2 - x1 || 1) * s;
            y2 = y1 + Math.sign(y2 - y1 || 1) * s;
          }
        }
        d.obj = { ...d.obj, x2: q(x2), y2: q(y2), x1: q(x1), y1: q(y1) };
        sharePreview(d.obj);
        break;
      }
      case "erase":
        eraseAt(p);
        break;
      case "laser":
        lasers.current.push({ x: p[0], y: p[1], t: performance.now() });
        emitLaser(p);
        break;
      case "markup": {
        const rects = markupRects(d.start, { x: e.clientX, y: e.clientY });
        if (rects) {
          d.obj = { ...d.obj, rects };
          sharePreview(d.obj);
        }
        break;
      }
      case "marquee": {
        const [sx, sy] = d.start;
        d.rect = { x: Math.min(sx, p[0]), y: Math.min(sy, p[1]), w: Math.abs(p[0] - sx), h: Math.abs(p[1] - sy) };
        break;
      }
      case "move": {
        const dx = p[0] - d.start[0];
        const dy = p[1] - d.start[1];
        if (!d.moved && Math.hypot(dx, dy) * v.k < 3) break;
        d.moved = true;
        transient.current.clear();
        for (const o of d.objs) if (isMovable(o)) {
          const preview = { ...o, ...movePatch(o, dx, dy) };
          transient.current.set(o.id, preview);
          sharePreview(preview);
        }
        break;
      }
      case "endpoint": {
        let [x, y] = p;
        const o = d.obj;
        const fixed = d.index === 0 ? [o.x2, o.y2] : [o.x1, o.y1];
        if (e.shiftKey) {
          const ang = Math.round(Math.atan2(y - fixed[1], x - fixed[0]) / (Math.PI / 12)) * (Math.PI / 12);
          const len = Math.hypot(x - fixed[0], y - fixed[1]);
          x = fixed[0] + len * Math.cos(ang);
          y = fixed[1] + len * Math.sin(ang);
        }
        const preview = d.index === 0 ? { ...o, x1: q(x), y1: q(y) } : { ...o, x2: q(x), y2: q(y) };
        transient.current.set(o.id, preview);
        sharePreview(preview);
        break;
      }
      case "graphGeometry": {
        const graph = d.obj;
        const dx = (p[0] - d.start[0]) * (graph.xMax - graph.xMin) / Math.max(20, graph.w - 54);
        const dy = -(p[1] - d.start[1]) * (graph.yMax - graph.yMin) / Math.max(20, graph.h - 58);
        if (Math.hypot(dx, dy) > 0) d.moved = true;
        const geometry = graph.geometry.map((element) => {
          if (element.id !== d.geometryId) return element;
          if (element.kind === "point" || element.kind === "vector") {
            return { ...element, x: q(element.x + dx), y: q(element.y + dy) };
          }
          if (element.kind === "polygon") {
            return { ...element, vertices: element.vertices.map(([x, y]) => [q(x + dx), q(y + dy)]) };
          }
          if (element.kind === "angle") {
            return {
              ...element,
              ax: q(element.ax + dx), ay: q(element.ay + dy),
              vx: q(element.vx + dx), vy: q(element.vy + dy),
              cx: q(element.cx + dx), cy: q(element.cy + dy),
            };
          }
          return {
            ...element,
            x1: q(element.x1 + dx), y1: q(element.y1 + dy),
            x2: q(element.x2 + dx), y2: q(element.y2 + dy),
          };
        });
        const preview = { ...graph, geometry };
        transient.current.set(graph.id, preview);
        sharePreview(preview);
        break;
      }
      case "graphCamera": {
        const deltaX = e.clientX - d.start[0];
        const deltaY = e.clientY - d.start[1];
        d.moved ||= Math.abs(deltaX) + Math.abs(deltaY) > 1;
        const preview = {
          ...d.obj,
          azimuth: ((d.azimuth + deltaX * 0.7) % 360 + 360) % 360,
          elevation: Math.max(12, Math.min(82, d.elevation - deltaY * 0.5)),
        };
        transient.current.set(d.obj.id, preview);
        sharePreview(preview);
        break;
      }
      case "resize": {
        const [ax, ay] = d.anchor;
        const [cx, cy] = d.corner;
        let sx = Math.abs(cx - ax) < 1e-6 ? 1 : (p[0] - ax) / (cx - ax);
        let sy = Math.abs(cy - ay) < 1e-6 ? 1 : (p[1] - ay) / (cy - ay);
        if (d.uniform) {
          const s = Math.max(Math.abs(sx), Math.abs(sy));
          sx = s;
          sy = s;
        }
        sx = Math.max(0.05, sx);
        sy = Math.max(0.05, sy);
        transient.current.clear();
        for (const o of d.objs) {
          const preview = { ...o, ...scalePatch(o, sx, sy, ax, ay) };
          transient.current.set(o.id, preview);
          sharePreview(preview);
        }
        break;
      }
      default:
        break;
    }
    schedule();
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    const { store: s, page: pg } = live.current;

    if (d?.type === "pinch") {
      if (pointers.current.size < 2) drag.current = null;
      return;
    }
    if (!d) return;

    switch (d.type) {
      case "stroke":
        finishStroke();
        break;
      case "shape": {
        const o = d.obj;
        const { view: v } = live.current;
        if (Math.hypot(o.x2 - o.x1, o.y2 - o.y1) * v.k > 4) {
          s.commit([{ op: "add", obj: o }]);
          if (!keepTool) {
            onSelectedChange?.([o.id]);
            onToolChange?.("select");
          }
        }
        clearPreview(o.id, o.page);
        break;
      }
      case "erase": {
        const ids = [...erasing.current];
        erasing.current.clear();
        if (ids.length) s.commit(ids.map((id) => ({ op: "remove", id })));
        ids.forEach((id) => clearPreview(id));
        break;
      }
      case "markup": {
        if (d.obj.rects.length) {
          s.commit([{ op: "add", obj: { ...d.obj, page: pg } }]);
        }
        clearPreview(d.obj.id, pg);
        break;
      }
      case "laser":
        if (e.pointerType !== "mouse") emitLaser(null, false);
        break;
      case "marquee": {
        const hits = s.onPage(pg).filter((o) => objectInRect(o, d.rect)).map((o) => o.id);
        onSelectedChange?.([...new Set([...(d.base || []), ...hits])]);
        break;
      }
      case "move": {
        if (d.moved) {
          const ops = [...transient.current.entries()].map(([id, o]) => {
            const base = s.get(id);
            return { op: "update", id, patch: diffPatch(base, o) };
          });
          transient.current.clear();
          s.commit(ops);
          for (const o of d.objs) clearPreview(o.id, o.page);
        }
        break;
      }
      case "endpoint":
      case "resize": {
        const ops = [...transient.current.entries()].map(([id, o]) => ({ op: "update", id, patch: diffPatch(s.get(id), o) }));
        transient.current.clear();
        s.commit(ops);
        ops.forEach((op) => clearPreview(op.id));
        break;
      }
      case "graphGeometry": {
        const updated = transient.current.get(d.obj.id);
        transient.current.clear();
        if (updated && d.moved) s.commit([{ op: "update", id: d.obj.id, patch: { geometry: updated.geometry } }]);
        clearPreview(d.obj.id, d.obj.page);
        break;
      }
      case "graphCamera": {
        const updated = transient.current.get(d.obj.id);
        transient.current.clear();
        if (updated && d.moved) s.commit([{ op: "update", id: d.obj.id, patch: { azimuth: updated.azimuth, elevation: updated.elevation } }]);
        clearPreview(d.obj.id, d.obj.page);
        if (canvasRef.current) canvasRef.current.style.cursor = cursorRef.current;
        break;
      }
      default:
        break;
    }
    if (d.type === "erase") erasing.current.clear();
    if (d.type === "pan" && canvasRef.current) canvasRef.current.style.cursor = cursorRef.current;
    drag.current = null;
    shareCursor(toWorld(e), true);
    schedule();
  };

  const onPointerCancel = (e) => {
    pointers.current.delete(e.pointerId);
    if (drag.current?.type === "stroke" && drag.current.sent > 0) finishStroke();
    if (drag.current?.type === "pan" && canvasRef.current) canvasRef.current.style.cursor = cursorRef.current;
    if (drag.current?.type === "graphCamera" && canvasRef.current) canvasRef.current.style.cursor = cursorRef.current;
    if (drag.current?.obj?.id) clearPreview(drag.current.obj.id, drag.current.obj.page);
    if (drag.current?.type === "shape" || drag.current?.type === "markup") clearPreview(drag.current.obj.id, drag.current.obj.page);
    for (const [id, obj] of transient.current) clearPreview(id, obj.page);
    for (const id of erasing.current) clearPreview(id);
    drag.current = null;
    transient.current.clear();
    erasing.current.clear();
    shareCursor(null, true);
    schedule();
  };

  const onPointerLeave = () => {
    if (live.current.tool === "laser" && !drag.current) emitLaser(null, false);
    if (!live.current.readOnly && live.current.mode === "board") shareCursor(null, true);
  };

  const onDoubleClick = (e) => {
    const { readOnly: ro, tool: tl, view: v } = live.current;
    if (ro || tl !== "select") return;
    const p = toWorld(e);
    const table = objectsTopFirst().find((o) => o.type === "table" && hitObject(o, p, 0));
    if (table) {
      const col = Math.max(0, Math.min(table.cols - 1, Math.floor((p[0] - table.x) / table.cellWidth)));
      const row = Math.max(0, Math.min(table.rows - 1, Math.floor((p[1] - table.y) / table.cellHeight)));
      const edit = { id: table.id, row, col, value: table.cells[row * table.cols + col] || "" };
      tableEditRef.current = edit;
      setTableEditing(edit);
      onSelectedChange?.([table.id]);
      return;
    }
    const hit = objectsTopFirst().find((o) => o.type === "text" && hitObject(o, p, 4 / v.k));
    if (hit) startEdit(hit, false);
  };

  /* PDF text markup: map a pointer drag to the text between two caret positions */
  const markupRects = (a, b) => {
    const pe = live.current.pageEl;
    const canvas = canvasRef.current;
    if (!pe) return null;
    const prev = canvas.style.pointerEvents;
    canvas.style.pointerEvents = "none";
    const c1 = caretAt(a.x, a.y);
    const c2 = caretAt(b.x, b.y);
    canvas.style.pointerEvents = prev;
    if (!c1 || !c2) return null;
    const layer = pe.querySelector(".react-pdf__Page__textContent");
    if (!layer || !layer.contains(c1.node) || !layer.contains(c2.node)) return null;

    const range = document.createRange();
    try {
      range.setStart(c1.node, c1.offset);
      range.setEnd(c2.node, c2.offset);
      if (range.collapsed) {
        range.setStart(c2.node, c2.offset);
        range.setEnd(c1.node, c1.offset);
      }
    } catch {
      return null;
    }
    const pr = pe.getBoundingClientRect();
    const k = live.current.view.k;
    const raw = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 2 && r.height < pr.height * 0.2);
    return mergeLineRects(raw).map((r) => [q((r.left - pr.left) / k), q((r.top - pr.top) / k), q(r.width / k), q(r.height / k)]);
  };

  /* --------------------------- keyboard & wheel --------------------------- */
  useEffect(() => {
    const down = (e) => {
      if (e.code === "Space" && !isTyping(e.target) && !live.current.editing) {
        spaceDown.current = true;
        if (live.current.mode === "board") e.preventDefault();
      }
    };
    const up = (e) => {
      if (e.code === "Space") spaceDown.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onZoom?.(Math.exp(-e.deltaY * 0.0022), e.clientX - rect.left, e.clientY - rect.top);
      } else if (live.current.mode === "board") {
        e.preventDefault();
        onPan?.(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onPan, onZoom]);

  /* ------------------------------- text editor ------------------------------- */
  const editor = editing && view ? <TextEditor key={editing.id} editing={editing} view={view} onCommit={finishEdit} onPreview={sharePreview} /> : null;
  const tableEditor = tableEditing && view
    ? <TableCellEditor key={`${tableEditing.id}-${tableEditing.row}-${tableEditing.col}`} editing={tableEditing} store={store} view={view} onCommit={finishTableEdit} onPreview={sharePreview} />
    : null;

  const cursor = readOnly
    ? (mode === "board" ? "grab" : "default")
    : cursorFor(tool);
  cursorRef.current = cursor;

  // On a PDF, the overlay only captures input when a tool needs it; otherwise the page scrolls natively
  const capturing = mode === "board" || (!readOnly && tool !== "select") || (!readOnly && (selectedIds?.length > 0 || tool === "select"));
  const touchAction = mode === "board" ? "none" : (!readOnly && tool !== "select") ? "none" : "pan-x pan-y pinch-zoom";

  return (
    <div ref={wrapRef} className={`absolute inset-0 overflow-hidden ${className}`} data-surface={mode} style={{ zIndex: mode === "pdf" ? 10 : undefined, pointerEvents: "none" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full draw-surface"
        style={{ cursor, touchAction, pointerEvents: capturing ? "auto" : "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={mode === "board" ? "Whiteboard" : "Document annotations"}
      />
      {tableEditor}
      {editor}
    </div>
  );
});

export default Surface;

function TableCellEditor({ editing, store, view, onCommit, onPreview }) {
  const [value, setValue] = useState(editing.value);
  const ref = useRef(null);
  const table = store.get(editing.id);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  if (!table) return null;
  const left = (table.x + editing.col * table.cellWidth - view.x) * view.k;
  const top = (table.y + editing.row * table.cellHeight - view.y) * view.k;

  return (
    <input
      ref={ref}
      aria-label={`Table cell row ${editing.row + 1}, column ${editing.col + 1}`}
      value={value}
      onChange={(e) => {
        const nextValue = e.target.value;
        setValue(nextValue);
        const cells = table.cells.slice();
        cells[editing.row * table.cols + editing.col] = nextValue;
        const preview = { ...table, cells };
        onPreview(preview);
      }}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCommit(value, true);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-10 border-2 border-accent bg-white px-2 text-sm outline-none"
      style={{ left, top, width: table.cellWidth * view.k, height: table.cellHeight * view.k, pointerEvents: "auto" }}
    />
  );
}

/* ------------------------------------------------------------------ */

function styleKeyApplies(o, k) {
  // Allow colour changes on any object type; fill only on shapes; text keys only on text
  if (k === "color" || k === "opacity") return true;
  if (k === "width") return o.type === "stroke" || o.type === "shape";
  if (k === "fill") return o.type === "shape";
  return false;
}

function diffPatch(base, next) {
  const patch = {};
  for (const k of Object.keys(next)) if (base[k] !== next[k]) patch[k] = next[k];
  return patch;
}

function isTyping(el) {
  if (!el) return false;
  const t = el.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || el.isContentEditable;
}

function caretAt(x, y) {
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }
  const r = document.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/** Merge many small DOMRects into one rect per text line. */
function mergeLineRects(rects) {
  const sorted = rects.slice().sort((a, b) => a.top - b.top || a.left - b.left);
  const lines = [];
  for (const r of sorted) {
    const line = lines.find((l) => Math.abs(l.top - r.top) < Math.min(l.height, r.height) * 0.6 && r.left <= l.right + l.height);
    if (line) {
      line.left = Math.min(line.left, r.left);
      line.right = Math.max(line.right, r.right);
      line.top = Math.min(line.top, r.top);
      line.bottom = Math.max(line.bottom, r.bottom);
      line.height = line.bottom - line.top;
    } else {
      lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height });
    }
  }
  return lines.map((l) => ({ left: l.left, top: l.top, width: l.right - l.left, height: l.bottom - l.top }));
}

/* Inline text editor positioned over the canvas */
function TextEditor({ editing, view, onCommit, onPreview }) {
  const [value, setValue] = useState(editing.obj.text || "");
  const taRef = useRef(null);
  const o = { ...editing.obj, text: value };
  const m = measureText({ ...o, text: value || " " });

  useEffect(() => {
    const t = setTimeout(() => {
      taRef.current?.focus();
      taRef.current?.setSelectionRange(value.length, value.length);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const k = view.k;
  const width = Math.max(m.w * k + 28, 70);
  const left = (o.x - view.x) * k - (o.align === "center" ? width / 2 : o.align === "right" ? width - 4 : 4);
  const top = (o.y - view.y) * k - 2;

  // Keep the latest object style in sync when the style panel patches it while editing
  useEffect(() => {
    editing.obj.text = value;
  }, [value, editing.obj]);

  return (
    <textarea
      ref={taRef}
      value={value}
      onChange={(e) => {
        const nextValue = e.target.value;
        setValue(nextValue);
        onPreview({ ...editing.obj, text: nextValue });
      }}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key === "Enter")) {
          e.preventDefault();
          onCommit(value);
        }
      }}
      spellCheck={false}
      aria-label="Text"
      className="absolute resize-none overflow-hidden border border-dashed border-accent bg-white/60 p-0 px-1 outline-none"
      style={{
        left,
        top,
        width,
        height: m.h * k + 4,
        fontFamily: FONT_STACKS[o.fontFamily] || FONT_STACKS.sans,
        fontSize: o.fontSize * k,
        lineHeight: LINE_HEIGHT,
        fontWeight: o.bold ? 700 : 400,
        fontStyle: o.italic ? "italic" : "normal",
        textDecoration: o.underline ? "underline" : "none",
        textAlign: o.align || "left",
        color: o.color,
        whiteSpace: "pre",
        zIndex: 5,
      }}
    />
  );
}
