import React from "react";
import { FaChevronLeft, FaChevronRight, FaUpload } from "react-icons/fa";

const PDFNavigation = ({ 
  isTutor, 
  pageNumber, 
  numPages, 
  isUploading, 
  pdfFile, 
  fileInputRef, 
  handleUpload,
  setPdfFile, 
  goToPage, 
  mode 
}) => {
  // Handle file selection with auto-upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
      // Automatically trigger upload after file selection
      handleUpload(file);
    }
  };

  return (
    <>
      {/* Page Navigation for Mobile (when toolbar is closed) */}
      {isTutor && (
        <div className="flex justify-center items-center sm:hidden bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex w-full items-center gap-2 ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`px-3 py-2 border rounded-lg transition-colors text-sm flex items-center gap-2 ${
                isUploading 
                  ? "border-blue-300 bg-blue-50 text-blue-700 cursor-not-allowed"
                  : "border-gray-200 hover:bg-gray-50 text-gray-600"
              }`}
            >
              {isUploading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FaUpload size={12} />
                  <span>{pdfFile ? "Change PDF" : "Upload PDF"}</span>
                </>
              )}
            </button>
            {pdfFile && !isUploading && (
              <span className="text-xs text-gray-500 max-w-[120px] truncate" title={pdfFile.name}>
                {pdfFile.name}
              </span>
            )}
          </div>
          <div className="flex w-full items-center justify-center gap-4">
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
    </>
  );
};

export default PDFNavigation;