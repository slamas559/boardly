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
  const touchStartRef = useRef(null);
  const touchSelectionRef = useRef(null);

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

  // Helper function to get text node from point
  const getTextNodeFromPoint = useCallback((x, y) => {
    let element = document.elementFromPoint(x, y);
    if (!element) return null;

    // Find the deepest text node
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rects = range.getClientRects();
      for (let rect of rects) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return { textNode, range };
        }
      }
      range.detach();
    }
    return null;
  }, []);

  // Helper function to create selection from touch points
  const createTouchSelection = useCallback((startX, startY, endX, endY) => {
    const startNode = getTextNodeFromPoint(startX, startY);
    const endNode = getTextNodeFromPoint(endX, endY);
    
    if (!startNode || !endNode) return false;

    const range = document.createRange();
    try {
      // Determine start and end positions within text nodes
      const startOffset = getOffsetFromPoint(startNode.textNode, startX, startY);
      const endOffset = getOffsetFromPoint(endNode.textNode, endX, endY);
      
      // Set range start and end
      range.setStart(startNode.textNode, startOffset);
      range.setEnd(endNode.textNode, endOffset);
      
      // Clear any existing selection and add new range
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      return true;
    } catch (error) {
      console.warn("Failed to create touch selection:", error);
      range.detach();
      return false;
    }
  }, [getTextNodeFromPoint]);

  // Helper function to get character offset from point within text node
  const getOffsetFromPoint = useCallback((textNode, x, y) => {
    const range = document.createRange();
    const text = textNode.textContent;
    
    for (let i = 0; i <= text.length; i++) {
      range.setStart(textNode, i);
      range.setEnd(textNode, i);
      const rect = range.getBoundingClientRect();
      
      if (rect.left > x || (rect.left <= x && rect.right >= x)) {
        range.detach();
        return i;
      }
    }
    
    range.detach();
    return text.length;
  }, []);

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

  // Touch event handlers
  const handleTouchStart = useCallback((e) => {
    if (mode !== "highlight" || !isTutor) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
    
    // Clear any existing selection
    window.getSelection().removeAllRanges();
  }, [mode, isTutor]);

  const handleTouchMove = useCallback((e) => {
    if (mode !== "highlight" || !isTutor || !touchStartRef.current) return;
    
    // Prevent default scrolling behavior during text selection
    e.preventDefault();
    
    const touch = e.touches[0];
    const startTouch = touchStartRef.current;
    
    // Create selection from start point to current touch point
    createTouchSelection(
      startTouch.x, 
      startTouch.y, 
      touch.clientX, 
      touch.clientY
    );
  }, [mode, isTutor, createTouchSelection]);

  const handleTouchEnd = useCallback((e) => {
    if (mode !== "highlight" || !isTutor || !touchStartRef.current) return;
    
    const touchDuration = Date.now() - touchStartRef.current.timestamp;
    
    // Only create highlight if touch was long enough to be intentional selection
    if (touchDuration > 100) {
      setTimeout(() => {
        createHighlightFromSelection();
      }, 50); // Small delay to ensure selection is complete
    }
    
    touchStartRef.current = null;
  }, [mode, isTutor, createHighlightFromSelection]);

  // Mouse event handlers (keeping existing functionality)
  const handleMouseUp = useCallback(() => {
    if (mode === "highlight" && isTutor) {
      createHighlightFromSelection();
    }
  }, [mode, isTutor, createHighlightFromSelection]);

  useEffect(() => {
    // Mouse events
    document.addEventListener("mouseup", handleMouseUp);
    
    // Touch events - add to the container or document
    const targetElement = containerRef.current || document;
    
    if (targetElement) {
      targetElement.addEventListener("touchstart", handleTouchStart, { passive: false });
      targetElement.addEventListener("touchmove", handleTouchMove, { passive: false });
      targetElement.addEventListener("touchend", handleTouchEnd, { passive: true });
    }

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      
      if (targetElement) {
        targetElement.removeEventListener("touchstart", handleTouchStart);
        targetElement.removeEventListener("touchmove", handleTouchMove);
        targetElement.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [mode, isTutor, createHighlightFromSelection, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseUp, containerRef]);

  return {
    annotations,
    setAnnotations,
    handleEraseAnnotation,
    handleAnnotation,
  };
};

export default usePDFAnnotations;