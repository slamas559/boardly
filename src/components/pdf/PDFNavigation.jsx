import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const PDFNavigation = ({ isTutor, pageNumber, numPages, goToPage, mode }) => {
  return (
    <>
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