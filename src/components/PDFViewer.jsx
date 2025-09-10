import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import {
  FaHighlighter,
  FaEraser,
  FaUpload,
  FaChevronLeft,
  FaChevronRight,
  FaPalette,
  FaEye,
  FaTrash,
  FaFilePdf,
  FaTimes,
  FaFileUpload,
} from "react-icons/fa";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getToken } from "../utils/auth";

// Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Suppress repetitive pdf.js warnings
(() => {
  const origWarn = console.warn.bind(console);
  console.warn = (...args) => {
    if (typeof args[0] === "string" && args[0].includes('Empty "FlateDecode" stream')) {
      return;
    }
    origWarn(...args);
  };
})();

const makeId = () => Math.random().toString(36).slice(2, 9);

// helper: convert hex (e.g. #ffff00) to rgba with given alpha
const hexToRgba = (hex, alpha = 0.4) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const PDFViewer = ({ isTutor, room }) => {
  const { socket } = useSocket();
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeTimeoutRef = useRef(null);

  const [pdfUrl, setPdfUrl] = useState(room?.pdf?.url || "");
  const [pageNumber, setPageNumber] = useState(room?.pdf?.currentPage || 1);
  const [numPages, setNumPages] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const [annotations, setAnnotations] = useState([]);
  const [mode, setMode] = useState("view");
  const [highlightColor, setHighlightColor] = useState("rgba(255, 230, 0, 0.4)");
  const [isUploading, setIsUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const saveStateTimeout = useRef(null);
  const [pdfWidth, setPdfWidth] = useState(600);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  // Add state for tutor cursor tracking in PDF with normalized coordinates
  const [tutorCursor, setTutorCursor] = useState(null);
  const cursorTimeoutRef = useRef(null);

  // Check if room is active
  const isRoomActive = room.status === 'active';

  // Coordinate normalization functions (similar to whiteboard)
  const normalizeCoordinates = useCallback((x, y) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return { x: 0, y: 0 };
    
    // Convert device coordinates to normalized coordinates (0-1 range)
    const normalizedX = Math.max(0, Math.min(1, x / containerRect.width));
    const normalizedY = Math.max(0, Math.min(1, y / containerRect.height));
    
    return { x: normalizedX, y: normalizedY };
  }, []);

  const denormalizeCoordinates = useCallback((normalizedX, normalizedY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return { x: 0, y: 0 };
    
    // Convert normalized coordinates back to device coordinates
    const deviceX = Math.max(0, Math.min(containerRect.width, normalizedX * containerRect.width));
    const deviceY = Math.max(0, Math.min(containerRect.height, normalizedY * containerRect.height));
    
    return { x: deviceX, y: deviceY };
  }, []);

  // Improved responsive PDF width calculation with debouncing to prevent flickering
  const updatePdfWidth = useCallback(() => {
    if (!containerRef.current) return;

    // Clear existing timeout to debounce rapid resize events
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const calculatedWidth = Math.min(containerWidth - 40, 800);
        
        // Only update if there's a meaningful change to prevent unnecessary re-renders
        setPdfWidth(prevWidth => {
          if (Math.abs(prevWidth - calculatedWidth) > 10) {
            return calculatedWidth;
          }
          return prevWidth;
        });
      }
    }, 100); // 100ms debounce delay
  }, []);

  // Single useEffect for handling container resize with proper cleanup
  useEffect(() => {
    updatePdfWidth();

    let resizeObserver;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(updatePdfWidth);
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize as backup
    window.addEventListener("resize", updatePdfWidth);

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      window.removeEventListener("resize", updatePdfWidth);
    };
  }, [updatePdfWidth]);

  useEffect(() => {
    if (room?.pdf?.url) setPdfUrl(room.pdf.url);
    if (room?.pdf?.currentPage) setPageNumber(room.pdf.currentPage);
  }, [room]);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/pdf/state/${room._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("tutor_token")}`,
          },
        });
        if (res.data) {
          if (res.data.currentPage) setPageNumber(res.data.currentPage);
          if (Array.isArray(res.data.annotations)) setAnnotations(res.data.annotations);
        }
      } catch (err) {
        console.error("Failed to fetch PDF state:", err);
      }
    };
    fetchState();
  }, [room._id]);

  const savePdfState = useCallback((newPage, newAnnotations) => {
    if (saveStateTimeout.current) clearTimeout(saveStateTimeout.current);

    saveStateTimeout.current = setTimeout(async () => {
      try {
        await axios.post(
          "http://localhost:5000/pdf/save-state",
          {
            roomId: room._id,
            currentPage: newPage ?? pageNumber,
            annotations: newAnnotations ?? annotations,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("tutor_token")}`,
            },
          }
        );
      } catch (err) {
        console.error("Failed to save PDF state:", err);
      }
    }, 500);
  }, [room._id, pageNumber, annotations]);

  useEffect(() => {
    savePdfState(pageNumber, annotations);
  }, [pageNumber, savePdfState]);

  useEffect(() => {
    savePdfState(pageNumber, annotations);
  }, [annotations, savePdfState]);

  // Updated mouse move handler with proper normalization
  const handlePdfMouseMove = useCallback((e) => {
    if (!isTutor || !isRoomActive) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Only emit if coordinates are within container bounds
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      // Normalize coordinates for cross-device consistency
      const normalizedCoords = normalizeCoordinates(x, y);
      
      const cursorData = {
        x: normalizedCoords.x, // normalized coordinates
        y: normalizedCoords.y,
        mode,
        room: room._id,
        timestamp: Date.now(),
        view: 'pdf' // Add view identifier
      };
      
      // Emit cursor position to other users
      socket.emit("tutor-cursor-move-pdf", cursorData);
    }
  }, [socket, room._id, isTutor, isRoomActive, mode, normalizeCoordinates]);

  const handlePageChange = useCallback(({ page }) => {
    if (page !== pageNumber) {
      setPageNumber(page);
    }
  }, [pageNumber]);

  const handlePdfUpdated = useCallback(({ url }) => {
    setPdfUrl(url);
    setPageNumber(1);
    setAnnotations([]);
  }, []);

  const handlePdfScroll = useCallback(({ scrollTop }) => {
    if (!isTutor && containerRef.current) {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [isTutor]);

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

  // Updated handler for tutor cursor with proper denormalization
  const handleTutorCursorPdf = useCallback((cursorData) => {
    // Convert normalized cursor coordinates to device coordinates for display
    const deviceCoords = denormalizeCoordinates(cursorData.x, cursorData.y);
    
    setTutorCursor({
      ...cursorData,
      x: deviceCoords.x,
      y: deviceCoords.y
    });
    
    // Clear previous timeout
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }
    
    // Hide cursor after 1 second of inactivity
    cursorTimeoutRef.current = setTimeout(() => {
      setTutorCursor(null);
    }, 1000);
  }, [denormalizeCoordinates]);

  useEffect(() => {
    if (!socket) return;

    socket.on("pdf-page-change", handlePageChange);
    socket.on("pdf-updated", handlePdfUpdated);
    socket.on("pdf-annotation", handleAnnotation);
    socket.on("pdf-scroll", handlePdfScroll);
    socket.on("tutor-cursor-move-pdf", handleTutorCursorPdf);

    return () => {
      socket.off("pdf-page-change", handlePageChange);
      socket.off("pdf-updated", handlePdfUpdated);
      socket.off("pdf-annotation", handleAnnotation);
      socket.off("pdf-scroll", handlePdfScroll);
      socket.off("tutor-cursor-move-pdf", handleTutorCursorPdf);
      
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [socket, handlePageChange, handlePdfUpdated, handleAnnotation, handlePdfScroll, handleTutorCursorPdf]);

  const handleUpload = async () => {
    if (!pdfFile) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await axios.post(`http://localhost:5000/pdf/upload/${room._id}`, formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const uploadedUrl = res.data.pdf.url;
      setPdfUrl(uploadedUrl);
      setPageNumber(1);
      socket.emit("pdf-updated", { url: uploadedUrl, room: room._id });
      setAnnotations([]);
      setPdfFile(null);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > numPages) return;
    setPageNumber(newPage);
    socket.emit("pdf-page-change", { page: newPage, room: room._id });
  };

  function rectToPct(pageElement, rect) {
    const pr = pageElement.getBoundingClientRect();
    return {
      xPct: ((rect.left - pr.left) / pr.width) * 100,
      yPct: ((rect.top - pr.top) / pr.height) * 100,
      wPct: (rect.width / pr.width) * 100,
      hPct: (rect.height / pr.height) * 100,
    };
  }

  const createHighlightFromSelection = () => {
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
  };

  useEffect(() => {
    const onMouseUp = () => {
      if (mode === "highlight" && isTutor) {
        createHighlightFromSelection();
      }
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [mode, isTutor, highlightColor, socket, room]);

  const handleEraseAnnotation = (annotationId) => {
    if (!isTutor) return;
    const updated = annotations.filter((a) => a.id !== annotationId);
    setAnnotations(updated);
    socket.emit("pdf-annotation", {
      roomId: room._id,
      annotation: { id: annotationId, removed: true },
    });
    savePdfState(pageNumber, updated);
  };

  // Tutor Cursor Component for PDF with improved styling
  const TutorCursorPdf = ({ cursor }) => {
    if (!cursor) return null;
    
    const getModeIcon = () => {
      switch (cursor.mode) {
        case "highlight":
          return <FaHighlighter className="text-yellow-600" size={12} />;
        case "erase":
          return <FaEraser className="text-red-600" size={12} />;
        default:
          return <FaEye className="text-blue-600" size={12} />;
      }
    };
    
    return (
      <div 
        className="absolute z-40 pointer-events-none transition-transform duration-100"
        style={{
          left: cursor.x,
          top: cursor.y,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="flex flex-col items-center">
          <div className="bg-blue-500 text-white rounded-full w-2 h-2 border-white shadow-lg">
          </div>
          {/* <div className="bg-white rounded px-2 py-1 shadow-md border mt-1 opacity-90">
            {getModeIcon()}
          </div> */}
        </div>
      </div>
    );
  };

  const renderPageWithOverlay = (pageNum) => (
    <div
      key={`page-${pageNum}`}
      data-page-number={pageNum}
      className="relative mb-6 bg-white rounded-lg shadow-sm"
    >
      <Page 
        pageNumber={pageNum} 
        width={pdfWidth}
        loading={<div className="w-full h-96 bg-gray-100 animate-pulse rounded-lg" />}
      />
      <div className="absolute inset-0 z-10 pointer-events-none">
        {annotations
          .filter((a) => a.page === pageNum && a.type === "highlight")
          .map((ann) =>
            ann.rects.map((r, i) => (
              <div
                key={`${ann.id}-${i}`}
                onClick={() => handleEraseAnnotation(ann.id)}
                className="absolute transition-opacity hover:opacity-70"
                style={{
                  left: `${r.xPct}%`,
                  top: `${r.yPct}%`,
                  width: `${r.wPct}%`,
                  height: `${r.hPct}%`,
                  background: ann.color,
                  pointerEvents: mode === "erase" && isTutor ? "auto" : "none",
                  cursor: mode === "erase" && isTutor ? "pointer" : "default",
                }}
                title={mode === "erase" && isTutor ? "Click to erase highlight" : ""}
              />
            ))
          )}
      </div>
    </div>
  );

  const highlightColors = [
    "#FFEB3B", "#4CAF50", "#E91E63", "#00BCD4", "#FF9800",
    "#9C27B0", "#F44336", "#2196F3", "#FF5722", "#607D8B"
  ];

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative">
      {/* Floating Toolbar Toggle Button (Mobile Only) */}
      {isTutor && (
        <button
          onClick={() => setToolbarOpen(!toolbarOpen)}
          className="sm:hidden absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          {toolbarOpen ? <FaTimes /> : <FaFilePdf />}
        </button>
      )}

      {/* Toolbar for Desktop */}
      {isTutor && (
        <div className="hidden sm:block bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Highlight Tools */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  title="Highlight color"
                >
                  <FaPalette className="text-gray-600" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="flex gap-2">
                      {highlightColors.map((color) => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                          style={{ backgroundColor: hexToRgba(color, 0.4) }}
                          onClick={() => {
                            setHighlightColor(hexToRgba(color, 0.4));
                            setShowColorPicker(false);
                          }}
                          title={`${color}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMode(mode === "highlight" ? "view" : "highlight")}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  mode === "highlight" 
                    ? "bg-yellow-100 text-yellow-700 border border-yellow-300" 
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FaHighlighter size={14} />
                <span className="text-sm font-medium">Highlight</span>
              </button>

              <button
                onClick={() => setMode(mode === "erase" ? "view" : "erase")}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  mode === "erase" 
                    ? "bg-red-100 text-red-700 border border-red-300" 
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FaEraser size={14} />
                <span className="text-sm font-medium">Erase</span>
              </button>

              <button
                onClick={() => setMode("view")}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  mode === "view" 
                    ? "bg-blue-100 text-blue-700 border border-blue-300" 
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FaEye size={14} />
                <span className="text-sm font-medium">View</span>
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => goToPage(pageNumber - 1)}
                disabled={pageNumber <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              
              <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
                Page {pageNumber} of {numPages || "?"}
              </span>
              
              <button
                onClick={() => goToPage(pageNumber + 1)}
                disabled={!numPages || pageNumber >= numPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronRight className="text-gray-600" />
              </button>
            </div>

            {/* Upload Section */}
            <div className="flex items-center gap-2 ml-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
              >
                {pdfFile ? pdfFile.name : "Choose PDF"}
              </button>
              <button
                onClick={handleUpload}
                disabled={!pdfFile || isUploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <FaUpload size={12} />
                <span className="text-sm font-medium">
                  {isUploading ? "Uploading..." : "Upload"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toolbar for Mobile */}
      {isTutor && toolbarOpen && (
        <div className="sm:hidden absolute top-16 left-4 z-20 bg-white rounded-xl shadow-lg p-3 flex flex-col gap-3">
          {/* Highlight Tools */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors w-full"
                title="Highlight color"
              >
                <FaPalette className="text-gray-600 mx-auto" />
              </button>
              {showColorPicker && (
                <div className="absolute top-0 left-full ml-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                  <div className="flex flex-col gap-1">
                    {highlightColors.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: hexToRgba(color, 0.4) }}
                        onClick={() => {
                          setHighlightColor(hexToRgba(color, 0.4));
                          setShowColorPicker(false);
                        }}
                        title={`${color}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMode(mode === "highlight" ? "view" : "highlight")}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                mode === "highlight" 
                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
              title="Highlight"
            >
              <FaHighlighter size={14} />
            </button>

            <button
              onClick={() => setMode(mode === "erase" ? "view" : "erase")}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                mode === "erase" 
                  ? "bg-red-100 text-red-700 border border-red-300" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
              title="Erase"
            >
              <FaEraser size={14} />
            </button>

            <button
              onClick={() => setMode("view")}
              className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                mode === "view" 
                  ? "bg-blue-100 text-blue-700 border border-blue-300" 
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
              title="View"
            >
              <FaEye size={14} />
            </button>
          </div>

          {/* Page Navigation */}
          <div className="border-t pt-2 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(pageNumber - 1)}
                disabled={pageNumber <= 1}
                className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <FaChevronLeft className="text-gray-600 text-xs" />
              </button>
              
              <span className="text-xs font-medium text-gray-700 min-w-[40px] text-center">
                {pageNumber}/{numPages || "?"}
              </span>
              
              <button
                onClick={() => goToPage(pageNumber + 1)}
                disabled={!numPages || pageNumber >= numPages}
                className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <FaChevronRight className="text-gray-600 text-xs" />
              </button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="border-t pt-2 flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-600 flex items-center justify-center"
              title={pdfFile ? pdfFile.name : "Choose PDF"}
            >
              <FaFileUpload size={12} />
            </button>
            <button
              onClick={handleUpload}
              disabled={!pdfFile || isUploading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Upload PDF"
            >
              {isUploading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <FaUpload size={12} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Page Navigation for Mobile (when toolbar is closed) */}
      {isTutor && (
        <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronLeft className="text-gray-600" />
            </button>
            
            <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
              Page {pageNumber} of {numPages || "?"}
            </span>
            
            <button
              onClick={() => goToPage(pageNumber + 1)}
              disabled={!numPages || pageNumber >= numPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronRight className="text-gray-600" />
            </button>
            {/* <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
              >
                {pdfFile ? pdfFile.name : "Choose PDF"}
              </button>
              <button
                onClick={handleUpload}
                disabled={!pdfFile || isUploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <FaUpload size={12} />
                <span className="text-sm font-medium">
                  {isUploading ? "Uploading..." : "Upload"}
                </span>
              </button> */}
          </div>
        </div>
      )}

      {/* Current Mode Indicator for Mobile */}
      {isTutor && mode !== "view" && (
        <div className="sm:hidden absolute top-4 right-4 z-10 bg-white px-3 py-1 rounded-full shadow-md border border-gray-200">
          <span className="text-xs font-medium text-blue-700">
            {mode === "highlight" ? "Highlighting" : "Erasing"}
          </span>
        </div>
      )}

      {/* PDF Container */}
      <div
        ref={containerRef}
        onScroll={() => {
          if (!isTutor) return;
          const scrollTop = containerRef.current.scrollTop;
          socket.emit("pdf-scroll", { roomId: room._id, scrollTop });
        }}
        onMouseMove={handlePdfMouseMove}
        className="flex-1 overflow-auto bg-gray-100 p-4 relative"
      >
        <div className="flex justify-center">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                </div>
              </div>
            }
            error={
              <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm p-8 text-center">
                <FaFilePdf className="text-gray-400 text-4xl mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No PDF document loaded</p>
                {isTutor && (
                  <p className="text-sm text-gray-500">
                    Upload a PDF file to get started
                  </p>
                )}
              </div>
            }
          >
            {renderPageWithOverlay(pageNumber)}
          </Document>
        </div>
        
        {/* Show tutor cursor for students */}
        {!isTutor && tutorCursor && (
          <TutorCursorPdf cursor={tutorCursor} />
        )}
      </div>

      {/* Current Mode Indicator for Desktop */}
      {isTutor && mode !== "view" && (
        <div className="hidden sm:block bg-white border-t border-gray-200 px-4 py-2">
          <div className="text-center">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              {mode === "highlight" ? "Highlight Mode" : "Erase Mode"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;