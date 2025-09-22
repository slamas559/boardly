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

