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
  isTutor 
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
            onClick={onEndRoom}
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
    </div>
  );
};

// Mobile Sidebar Overlay Component
export const MobileSidebarOverlay = ({ 
  isOpen, 
  onClose, 
  view, 
  onViewChange, 
  qaEnabled, 
  onToggleQa, 
  qaLoading, 
  studentQuestions, 
  onOpenQaPanel, 
  onEndRoom, 
  isTutor 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 sm:hidden">
      <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-800 text-lg">Display Options</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <FaTimes />
          </button>
        </div>
        
        {isTutor ? (
          <div className="space-y-3">
            <button
              onClick={() => onViewChange("whiteboard")}
              className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                view === "whiteboard" 
                  ? "bg-blue-500 text-white shadow-md" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <FaPencilAlt className={view === "whiteboard" ? "text-white" : "text-blue-500"} />
              </div>
              <span className="font-medium">Whiteboard</span>
            </button>
            
            <button
              onClick={() => onViewChange("pdf")}
              className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                view === "pdf" 
                  ? "bg-red-500 text-white shadow-md" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <FaFilePdf className={view === "pdf" ? "text-white" : "text-red-500"} />
              </div>
              <span className="font-medium">PDF Viewer</span>
            </button>

            <button
              onClick={onEndRoom}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center gap-3 shadow-md"
            >
              <div className="w-8 h-8 rounded-lg bg-red-300 flex items-center justify-center">
                <FaStop className="text-white"/>
              </div>
              <span className="font-medium">End Session</span>
            </button>

            <QaControls 
              qaEnabled={qaEnabled}
              onToggleQa={onToggleQa}
              qaLoading={qaLoading}
              studentQuestions={studentQuestions}
              onOpenPanel={onOpenQaPanel}
              isTutor={isTutor}
            />
          </div>
        ) : (
          <div className="">
            {/* Student-specific mobile sidebar content can go here */}
          </div>
        )}
      </div>
    </div>
  );
};