// components/Sidebar.jsx
import React from 'react';
import { FaPencilAlt, FaFilePdf, FaStop, FaTimes } from 'react-icons/fa';
import { QaControls } from './QaManager';

// Desktop Sidebar Component
export const DesktopSidebar = ({ 
  view, 
  onViewChange, 
  qaEnabled, 
  onToggleQa, 
  qaLoading, 
  studentQuestions, 
  onOpenQaPanel, 
  onEndRoom, 
  isTutor,
  showStopRoom,
  setShowStopRoom, 
}) => {
  return (
    <div className="p-4 bg-white border-l border-gray-200 pt-17 shadow-sm hidden sm:block">
      {isTutor ? (
        <div className="space-y-2 relative">
          <button
            title="Whiteboard"
            onClick={() => onViewChange("whiteboard")}
            className={`w-12 h-12 rounded-lg ${view === "whiteboard" ? "bg-blue-500" : "bg-blue-300"} flex items-center justify-center cursor-pointer`}
          >
            <FaPencilAlt className="text-white" />
          </button>
          
          <button
            title="PDF Viewer"
            onClick={() => onViewChange("pdf")}
            className={`w-12 h-12 rounded-lg ${view === "pdf" ? "bg-red-500" : "bg-red-300"} flex items-center justify-center cursor-pointer`}
          >
            <FaFilePdf className="text-white" />
          </button>

          <QaControls 
            qaEnabled={qaEnabled}
            onToggleQa={onToggleQa}
            qaLoading={qaLoading}
            studentQuestions={studentQuestions}
            onOpenPanel={onOpenQaPanel}
            isTutor={isTutor}
          />

          <button
            title="End Session"
            onClick={()=>{setShowStopRoom(true)}}
            className="mt-17 w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center cursor-pointer"
          >
            <FaStop className="text-white"/>
          </button>
        </div>
      ) : (
        <div className="">
          {/* Student-specific sidebar content can go here */}
        </div>
      )}
      {showStopRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🚫 Stop Session
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to stop room?
              You can resume it later,<br />
              <span className="font-medium">⚠️ This action will disconnect all participants.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowStopRoom(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => onEndRoom()}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                Stop Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

