import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Document, Page } from "react-pdf";
import { FaFilePdf, FaSearchPlus, FaSearchMinus, FaExpand, FaCompress } from "react-icons/fa";
import TutorCursor from "./TutorCursor";

const PDFDocumentViewer = ({
  pdfUrl,
  pageNumber,
  pdfWidth,
  onDocumentLoadSuccess,
  annotations,
  mode,
  isTutor,
  handleEraseAnnotation,
  containerRef,
  handlePdfMouseMove,
  tutorCursor,
  onScroll,
}) => {
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Detect mobile device and screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      
      // Set initial scale based on device type and screen size
      if (mobile) {
        // For mobile, start with a higher scale to make text more readable
        const mobileScale = Math.min(window.innerWidth / 400, 1.5); // Adjust 600 based on your PDF width
        setScale(mobileScale);
      } else {
        setScale(1);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate responsive width
  const getResponsivePdfWidth = useCallback(() => {
    if (!pdfWidth) return 600; // fallback width
    
    const containerWidth = containerRef?.current?.clientWidth || window.innerWidth;
    const padding = isMobile ? 32 : 64; // Account for padding
    const availableWidth = containerWidth - padding;
    // Apply scale factor
    let scaledWidth = pdfWidth * scale;
    
    // Ensure it doesn't exceed container width
    if (scaledWidth > availableWidth) {
      scaledWidth = availableWidth;
    }
    
    // Minimum width for readability
    const minWidth = isMobile ? 300 : 400;
    return Math.max(scaledWidth, minWidth);
  }, [pdfWidth, scale, isMobile, containerRef]);

  // Zoom controls
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3)); // Max 3x zoom
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5)); // Min 0.5x zoom
  };

  const resetZoom = () => {
    if (isMobile) {
      const mobileScale = Math.min(window.innerWidth / 600, 1.5);
      setScale(mobileScale);
    } else {
      setScale(1);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const documentOptions = useMemo(() => ({
     cMapUrl: 'cmaps/',
     cMapPacked: true,
   }), []);

  const renderPageWithOverlay = (pageNum) => {
    const responsiveWidth = getResponsivePdfWidth();
    
    return (
      <div
        key={`page-${pageNum}`}
        data-page-number={pageNum}
        className="relative mb-6 bg-white rounded-lg shadow-sm"
      >
        <Page 
          pageNumber={pageNum} 
          width={responsiveWidth}
          scale={1} // Let width handle the scaling
          loading={
            <div 
              className="bg-gray-100 animate-pulse rounded-lg flex items-center justify-center"
              style={{ width: responsiveWidth, height: responsiveWidth * 1.4 }}
            >
              <div className="text-gray-400">Loading page {pageNum}...</div>
            </div>
          }
          renderTextLayer={true}
          renderAnnotationLayer={true}
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
  };

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      onMouseMove={handlePdfMouseMove}
      className={`flex-1 overflow-auto bg-gray-100 relative ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      
      {/* Desktop Zoom Controls */}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-40 bg-white rounded-lg shadow-md border border-gray-200 p-2 flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            disabled={scale <= 0.5}
          >
            <FaSearchMinus className="text-sm text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            disabled={scale >= 3}
          >
            <FaSearchPlus className="text-sm text-gray-600" />
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* PDF Content */}
      <div className={`flex justify-center ${isMobile ? 'p-2' : 'p-4'}`}>
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
          options={documentOptions}
        >
          {renderPageWithOverlay(pageNumber)}
        </Document>
      </div>
      
      {/* Show tutor cursor for students */}
      {!isTutor && tutorCursor && (
        <TutorCursor cursor={tutorCursor} />
      )}
    </div>
  );
};

export default PDFDocumentViewer;