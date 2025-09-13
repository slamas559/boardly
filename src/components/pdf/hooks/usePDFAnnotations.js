import { useState, useEffect, useCallback, useRef } from "react";

const makeId = () => Math.random().toString(36).slice(2, 9);

function rectToPct(pageElement, rect) {
  const pr = pageElement.getBoundingClientRect();
  return {
    xPct: ((rect.left - pr.left) / pr.width) * 100,
    yPct: ((rect.top - pr.top) / pr.height) * 100,
    wPct: (rect.width / pr.width) * 100,
    hPct: (rect.height / pr.height) * 100,
  };
}

const usePDFAnnotations = ({ 
  isTutor, 
  mode, 
  highlightColor, 
  socket, 
  room, 
  containerRef, 
  pageNumber,
  savePdfState 
}) => {
  const [annotations, setAnnotations] = useState([]);

  const createHighlightFromSelection = useCallback(() => {
    if (!isTutor) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return null;

    const range = sel.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length === 0) return null;

    let pageEl = range.startContainer?.parentElement;
    while (pageEl && !pageEl.getAttribute?.("data-page-number")) {
      pageEl = pageEl.parentElement;
    }
    if (!pageEl) {
      const pr = clientRects[0];
      const allPages = containerRef.current?.querySelectorAll("[data-page-number]") ?? [];
      for (const p of allPages) {
        const pRect = p.getBoundingClientRect();
        if (pr.top >= pRect.top - 1 && pr.bottom <= pRect.bottom + 1) {
          pageEl = p;
          break;
        }
      }
    }
    if (!pageEl) return null;

    const pageNum = Number(pageEl.getAttribute("data-page-number"));
    const rects = clientRects.map((r) => rectToPct(pageEl, r));

    const annotation = {
      id: makeId(),
      type: "highlight",
      page: pageNum,
      rects,
      color: highlightColor,
      createdAt: Date.now(),
    };

    setAnnotations((prev) => [...prev, annotation]);
    socket.emit("pdf-annotation", { roomId: room._id, annotation });
    sel.removeAllRanges();
    return annotation;
  }, [isTutor, highlightColor, socket, room, containerRef]);

  const handleEraseAnnotation = useCallback((annotationId) => {
    if (!isTutor) return;
    const updated = annotations.filter((a) => a.id !== annotationId);
    setAnnotations(updated);
    socket.emit("pdf-annotation", {
      roomId: room._id,
      annotation: { id: annotationId, removed: true },
    });
    savePdfState(pageNumber, updated);
  }, [isTutor, annotations, socket, room, pageNumber, savePdfState]);

  const handleAnnotation = useCallback(({ annotation }) => {
    setAnnotations((prev) => {
      if (annotation.removed) {
        return prev.filter((a) => a.id !== annotation.id);
      }
      const idx = prev.findIndex((a) => a.id === annotation.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = annotation;
        return updated;
      }
      return [...prev, annotation];
    });
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      if (mode === "highlight" && isTutor) {
        createHighlightFromSelection();
      }
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [mode, isTutor, createHighlightFromSelection]);

  return {
    annotations,
    setAnnotations,
    handleEraseAnnotation,
    handleAnnotation,
  };
};

export default usePDFAnnotations;