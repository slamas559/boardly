import React from "react";
import { Document, Page } from "react-pdf";
import { FaFilePdf } from "react-icons/fa";
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

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
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
        <TutorCursor cursor={tutorCursor} />
      )}
    </div>
  );
};

export default PDFDocumentViewer;