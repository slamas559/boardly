import React from "react";
import {
  FaHighlighter,
  FaEraser,
  FaUpload,
  FaChevronLeft,
  FaChevronRight,
  FaPalette,
  FaEye,
  FaFilePdf,
  FaTimes,
  FaFileUpload,
} from "react-icons/fa";

// helper: convert hex (e.g. #ffff00) to rgba with given alpha
const hexToRgba = (hex, alpha = 0.4) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const PDFToolbar = ({
  isTutor,
  mode,
  setMode,
  highlightColor,
  setHighlightColor,
  showColorPicker,
  setShowColorPicker,
  pageNumber,
  numPages,
  goToPage,
  pdfFile,
  setPdfFile,
  fileInputRef,
  handleUpload,
  isUploading,
  toolbarOpen,
  setToolbarOpen,
}) => {
  const highlightColors = [
    "#FFEB3B", "#4CAF50", "#E91E63", "#00BCD4", "#FF9800",
    "#9C27B0", "#F44336", "#2196F3", "#FF5722", "#607D8B"
  ];

  // Handle file selection with auto-upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
      // Automatically trigger upload after file selection
      handleUpload(file);
    }
  };

  if (!isTutor) return (
    <div className="h-16 bg-white shadow-sm border-b border-gray-200 py-3"></div>
  );

  return (
    <>
      {/* Floating Toolbar Toggle Button (Mobile Only) */}
      <button
        onClick={() => setToolbarOpen(!toolbarOpen)}
        className="sm:hidden absolute top-10 left-4 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
      >
        {toolbarOpen ? <FaTimes /> : <FaFilePdf />}
      </button>

      {/* Toolbar for Desktop */}
      <div className="hidden sm:block bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
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
        </div>
      </div>

      {/* Floating Toolbar for Mobile */}
      {toolbarOpen && (
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
        </div>
      )}
    </>
  );
};

export default PDFToolbar;