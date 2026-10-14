// State for the properties panel (style + graph settings). Call once per workspace and pass the
// result to the rail (ToolDock), the QuickBar and the InspectorDock.
import { useCallback, useEffect, useRef, useState } from "react";

export const DOCK_WIDTH = 320; // keep in sync with the `w-80` class in Inspector.jsx
const PHONE_RAIL_CLEARANCE = 72; // the tool dock sits under the sheet (4.5rem)
const STORAGE_KEY = "boardly.properties.open";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

const readPreference = () => {
  try { return window.localStorage.getItem(STORAGE_KEY) !== "0"; } catch { return true; }
};

/** Shared state for the properties panel; call once per workspace. */
export function useInspector(tools) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [desktopOpen, setDesktopOpen] = useState(readPreference);
  const [sheet, setSheet] = useState({ open: false, snap: "half" });
  const [sheetHeight, setSheetHeight] = useState(0);

  const { selectedObjects, selectedIds, group, activeStyle, tool, editingObj } = tools;
  const selectedGraph = selectedObjects.length === 1 && selectedObjects[0].type === "graph" ? selectedObjects[0] : null;
  const showsStyle = Boolean(group && activeStyle && ![ "eraser", "laser", "select", "pan" ].includes(tool)) || selectedIds.length > 0 || Boolean(editingObj);
  const selectedEquation = selectedObjects.length === 1 && selectedObjects[0].type === "equation" ? selectedObjects[0] : null;
  const kind = selectedGraph ? "graph" : selectedEquation ? "equation" : group && activeStyle && showsStyle ? "style" : null;
  const visible = kind !== null && (desktop ? desktopOpen : sheet.open);

  const rememberDesktop = useCallback((value) => {
    setDesktopOpen(value);
    try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch { /* storage unavailable */ }
  }, []);

  // Phones: selecting a graph slides the sheet up to its "peek" height so the equation can be edited at once;
  // selecting a formula opens it at half height, where the math keyboard is
  const panelId = selectedGraph?.id ?? selectedEquation?.id ?? null;
  const panelSnap = selectedEquation ? "half" : "peek";
  const lastPanelId = useRef(null);
  useEffect(() => {
    if (!desktop) {
      if (panelId && panelId !== lastPanelId.current) setSheet({ open: true, snap: panelSnap });
      else if (!panelId && lastPanelId.current) setSheet((s) => ({ ...s, open: false }));
    }
    lastPanelId.current = panelId;
  }, [panelId, panelSnap, desktop]);

  const open = useCallback((snap = "half") => {
    if (desktop) rememberDesktop(true);
    else setSheet({ open: true, snap });
  }, [desktop, rememberDesktop]);
  const close = useCallback(() => {
    if (desktop) rememberDesktop(false);
    else setSheet((s) => ({ ...s, open: false }));
  }, [desktop, rememberDesktop]);
  const toggle = useCallback(() => {
    if (desktop) rememberDesktop(!desktopOpen);
    else setSheet((s) => ({ ...s, open: !s.open }));
  }, [desktop, desktopOpen, rememberDesktop]);
  const onToolPicked = useCallback(() => {
    if (!desktop) setSheet((s) => (s.open ? { ...s, open: false } : s));
  }, [desktop]);

  return {
    kind, selectedGraph, selectedEquation, desktop, visible, open, close, toggle, onToolPicked, sheet, setSheet, setSheetHeight,
    dockWidth: desktop && visible ? DOCK_WIDTH : 0, // how much canvas width the dock takes
    insetBottom: !desktop && visible ? sheetHeight + PHONE_RAIL_CLEARANCE : 0, // how much canvas height a phone sheet covers
  };
}
