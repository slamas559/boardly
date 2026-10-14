// Shared tool state + keyboard shortcuts for the board and PDF annotation toolbars.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SHAPE_KINDS, STYLE_GROUP, defaultStyles } from "./constants.js";

const SHORTCUTS = {
  board: { v: "select", h: "pan", p: "pen", m: "highlighter", e: "eraser", t: "text", r: "rect", o: "ellipse", d: "diamond", l: "line", a: "arrow", k: "laser" },
  pdf: { v: "select", h: "highlight", u: "underline", s: "strike", p: "pen", m: "highlighter", e: "eraser", t: "text", r: "rect", o: "ellipse", a: "arrow", k: "laser" },
};

export function useAnnotationTools({ mode, store, surfaceRef, enabled }) {
  const [tool, setTool] = useState("select");
  const [styles, setStyles] = useState(() => defaultStyles(mode));
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingObj, setEditingObj] = useState(null);
  const [keepTool, setKeepTool] = useState(false);
  const [lastShape, setLastShape] = useState("rect");

  useSyncExternalStore(store.subscribe, store.getVersion);

  const chooseTool = useCallback((t) => {
    setTool(t);
    if (SHAPE_KINDS.includes(t)) setLastShape(t);
    if (t !== "select") setSelectedIds([]);
  }, []);

  // Drop selection entries whose objects disappeared (undo, remote clear, ...)
  const liveSelected = useMemo(
    () => selectedIds.filter((id) => store.get(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, store.getVersion()]
  );

  const selectedObjects = liveSelected.map((id) => store.get(id));

  // Which remembered-style group the panel is editing right now
  const group = editingObj ? "text"
    : selectedObjects.length ? groupOf(selectedObjects[0], tool)
      : STYLE_GROUP[tool] || null;

  const activeStyle = (() => {
    if (!group) return null;
    if (editingObj) return { ...styles.text, ...pickText(editingObj) };
    if (selectedObjects.length) return { ...styles[group], ...pickStyle(selectedObjects[0]) };
    return styles[group];
  })();

  const setStyle = useCallback((patch) => {
    if (!group) return;
    setStyles((s) => ({ ...s, [group]: { ...s[group], ...patch } }));
    surfaceRef.current?.patchStyle(patch);
  }, [group, surfaceRef]);

  // Keyboard shortcuts (host only)
  const toolsRef = useRef({});
  toolsRef.current = { chooseTool, store, surfaceRef, selectedIds: liveSelected, setSelectedIds, editingObj };

  useEffect(() => {
    if (!enabled) return undefined;
    const map = SHORTCUTS[mode];
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const { chooseTool: choose, store: st, surfaceRef: sr, selectedIds: sel, setSelectedIds: setSel } = toolsRef.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo(); else st.undo();
        return;
      }
      if (mod && key === "y") { e.preventDefault(); st.redo(); return; }
      if (mod && key === "a") { e.preventDefault(); sr.current?.selectAll(); return; }
      if (mod && key === "c") { sr.current?.copy(); return; }
      if (mod && key === "v") { e.preventDefault(); sr.current?.paste(); return; }
      if (mod && key === "d") { e.preventDefault(); sr.current?.duplicate(); return; }
      if (mod || e.altKey) return;

      if ((key === "delete" || key === "backspace") && sel.length) {
        e.preventDefault();
        sr.current?.deleteSelected();
        return;
      }
      if (key === "escape") {
        if (sel.length) setSel([]);
        else choose("select");
        return;
      }
      if (sel.length && key.startsWith("arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        sr.current?.nudge(key === "arrowleft" ? -step : key === "arrowright" ? step : 0, key === "arrowup" ? -step : key === "arrowdown" ? step : 0);
        return;
      }
      if (map[key]) choose(map[key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, mode]);

  return {
    tool, setTool: chooseTool, styles, setStyle, group, activeStyle,
    selectedIds: liveSelected, setSelectedIds, selectedObjects,
    editingObj, setEditingObj, keepTool, setKeepTool, lastShape,
    canUndo: store.canUndo, canRedo: store.canRedo,
  };
}

function groupOf(o, tool) {
  if (o.type === "stroke") return o.tool === "highlighter" ? "highlighter" : "pen";
  if (o.type === "shape") return "shape";
  if (o.type === "text") return "text";
  if (o.type === "table") return "table";
  if (o.type === "media") return "media";
  if (o.type === "markup") return o.kind === "highlight" ? "markup" : "markupLine";
  return STYLE_GROUP[tool] || null;
}

const pickText = (o) => ({ color: o.color, fontFamily: o.fontFamily, fontSize: o.fontSize, bold: o.bold, italic: o.italic, underline: o.underline, align: o.align });
function pickStyle(o) {
  if (o.type === "text") return pickText(o);
  if (o.type === "table") return {
    color: o.color || "#17181C",
    fontSize: o.fontSize || 14,
    cellWidth: o.cellWidth,
    cellHeight: o.cellHeight,
  };
  if (o.type === "media") return { mediaType: o.mediaType, playing: Boolean(o.playing) };
  const out = { color: o.color };
  if (o.width !== undefined) out.width = o.width;
  if (o.opacity !== undefined) out.opacity = o.opacity;
  if (o.type === "shape") out.fill = !!o.fill;
  return out;
}
