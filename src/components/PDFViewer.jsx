import { useEffect, useRef, useState, useCallback } from "react";
import { pdfjs } from "react-pdf";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getToken } from "../utils/auth";

// Child Components
import PDFToolbar from "./pdf/PDFToolBar";
import PDFNavigation from "./pdf/PDFNavigation";
import PDFDocumentViewer from "./pdf/PDFDocumentViewer";
import usePDFAnnotations from "./pdf/hooks/usePDFAnnotations";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

// Point pdf.js to the correct worker file
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
// Worker setup
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   "pdfjs-dist/build/pdf.worker.min.js",
//   import.meta.url
// ).toString();

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

const PDFViewer = ({ isTutor, room }) => {
  const { socket } = useSocket();
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const saveStateTimeout = useRef(null);
  const cursorTimeoutRef = useRef(null);

  // PDF State
  const [pdfUrl, setPdfUrl] = useState(room?.pdf?.url || "");
  const [pageNumber, setPageNumber] = useState(room?.pdf?.currentPage || 1);
  const [numPages, setNumPages] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfWidth, setPdfWidth] = useState(600);

  // UI State
  const [mode, setMode] = useState("view");
  const [highlightColor, setHighlightColor] = useState("rgba(255, 230, 0, 0.4)");
  const [isUploading, setIsUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [tutorCursor, setTutorCursor] = useState(null);

  // Check if room is active
  const isRoomActive = room.status === 'active';

  // Coordinate normalization functions
  const normalizeCoordinates = useCallback((x, y) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return { x: 0, y: 0 };
    
    const normalizedX = Math.max(0, Math.min(1, x / containerRect.width));
    const normalizedY = Math.max(0, Math.min(1, y / containerRect.height));
    
    return { x: normalizedX, y: normalizedY };
  }, []);

  const denormalizeCoordinates = useCallback((normalizedX, normalizedY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return { x: 0, y: 0 };
    
    const deviceX = Math.max(0, Math.min(containerRect.width, normalizedX * containerRect.width));
    const deviceY = Math.max(0, Math.min(containerRect.height, normalizedY * containerRect.height));
    
    return { x: deviceX, y: deviceY };
  }, []);

  // PDF State Management
  const savePdfState = useCallback((newPage, newAnnotations) => {
    if (saveStateTimeout.current) clearTimeout(saveStateTimeout.current);

    saveStateTimeout.current = setTimeout(async () => {
      try {
        await axios.post(
          // "http://localhost:5000/pdf/save-state",
          "https://boardly-api.onrender.com/pdf/save-state",
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
  }, [room._id, pageNumber]);

  // Custom hook for annotations
  const { annotations, setAnnotations, handleEraseAnnotation, handleAnnotation } = usePDFAnnotations({
    isTutor,
    mode,
    highlightColor,
    socket,
    room,
    containerRef,
    pageNumber,
    savePdfState,
  });

  // Responsive PDF width calculation
  const updatePdfWidth = useCallback(() => {
    if (!containerRef.current) return;

    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const calculatedWidth = Math.min(containerWidth - 40, 800);
        
        setPdfWidth(prevWidth => {
          if (Math.abs(prevWidth - calculatedWidth) > 10) {
            return calculatedWidth;
          }
          return prevWidth;
        });
      }
    }, 100);
  }, []);

  // Mouse move handler for tutor cursor
  const handlePdfMouseMove = useCallback((e) => {
    if (!isTutor || !isRoomActive) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const normalizedCoords = normalizeCoordinates(x, y);
      
      const cursorData = {
        x: normalizedCoords.x,
        y: normalizedCoords.y,
        mode,
        room: room._id,
        timestamp: Date.now(),
        view: 'pdf'
      };
      
      socket.emit("tutor-cursor-move-pdf", cursorData);
    }
  }, [socket, room._id, isTutor, isRoomActive, mode, normalizeCoordinates]);

  // Event Handlers
  const handlePageChange = useCallback(({ page }) => {
    if (page !== pageNumber) {
      setPageNumber(page);
    }
  }, [pageNumber]);

  const handlePdfUpdated = useCallback(({ url }) => {
    setPdfUrl(url);
    setPageNumber(1);
    setAnnotations([]);
  }, [setAnnotations]);

  const handlePdfScroll = useCallback(({ scrollTop }) => {
    if (!isTutor && containerRef.current) {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [isTutor]);

  const handleTutorCursorPdf = useCallback((cursorData) => {
    const deviceCoords = denormalizeCoordinates(cursorData.x, cursorData.y);
    
    setTutorCursor({
      ...cursorData,
      x: deviceCoords.x,
      y: deviceCoords.y
    });
    
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }
    
    cursorTimeoutRef.current = setTimeout(() => {
      setTutorCursor(null);
    }, 1000);
  }, [denormalizeCoordinates]);

  const handleUpload = async () => {
    if (!pdfFile) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await axios.post(
        // `http://localhost:5000/pdf/upload/${room._id}`,
        `https://boardly-api.onrender.com/pdf/upload/${room._id}`,
        formData, {
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

  // Effects
  useEffect(() => {
    updatePdfWidth();

    let resizeObserver;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(updatePdfWidth);
      resizeObserver.observe(containerRef.current);
    }

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
        const res = await axios.get(
          // `http://localhost:5000/pdf/state/${room._id}`,
          `https://boardly-api.onrender.com/pdf/state/${room._id}`,
           {
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
  }, [room._id, setAnnotations]);

  useEffect(() => {
    savePdfState(pageNumber, annotations);
  }, [pageNumber, savePdfState, annotations]);

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

  // Scroll handler with socket emission
  const handleContainerScroll = useCallback(() => {
    if (!isTutor) return;
    const scrollTop = containerRef.current.scrollTop;
    socket.emit("pdf-scroll", { roomId: room._id, scrollTop });
  }, [isTutor, socket, room._id]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 relative">
      {/* Toolbar Component */}
      <PDFToolbar
        isTutor={isTutor}
        mode={mode}
        setMode={setMode}
        highlightColor={highlightColor}
        setHighlightColor={setHighlightColor}
        showColorPicker={showColorPicker}
        setShowColorPicker={setShowColorPicker}
        pageNumber={pageNumber}
        numPages={numPages}
        goToPage={goToPage}
        pdfFile={pdfFile}
        setPdfFile={setPdfFile}
        fileInputRef={fileInputRef}
        handleUpload={handleUpload}
        isUploading={isUploading}
        toolbarOpen={toolbarOpen}
        setToolbarOpen={setToolbarOpen}
      />

      {/* Navigation Component */}
      <PDFNavigation
        isTutor={isTutor}
        pageNumber={pageNumber}
        numPages={numPages}
        goToPage={goToPage}
        mode={mode}
      />

      {/* Document Viewer Component */}
      <PDFDocumentViewer
        pdfUrl={pdfUrl}
        pageNumber={pageNumber}
        pdfWidth={pdfWidth}
        onDocumentLoadSuccess={onDocumentLoadSuccess}
        annotations={annotations}
        mode={mode}
        isTutor={isTutor}
        handleEraseAnnotation={handleEraseAnnotation}
        containerRef={containerRef}
        handlePdfMouseMove={handlePdfMouseMove}
        tutorCursor={tutorCursor}
        onScroll={handleContainerScroll}
      />
    </div>
  );
};

export default PDFViewer;