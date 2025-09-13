// components/Header.jsx
import React from 'react';
import { FaArrowLeft, FaLink, FaBars, FaTimes, FaQuestionCircle, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { toast } from 'react-toastify';
import VoiceBroadcast from './VoiceBroadcast';

const Header = ({ 
  room, 
  socket, 
  isTutor, 
  qaEnabled, 
  qaLoading, 
  qaPanelOpen, 
  sidebarOpen, 
  onNavigateBack, 
  onToggleQa, 
  onToggleSidebar, 
  onToggleQaPanel 
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
    toast.success("Link copied");
  };

  return (
    <div className="flex justify-between items-center bg-white px-2 py-2 border-b border-gray-200 shadow-sm">
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
      >
        <FaArrowLeft className="w-4 h-4" />
      </button>
      
      <div className="flex items-center gap-3 min-w-0">
        {room.creator?.avatar && (
          <img
            src={room.creator.avatar}
            alt="avatar"
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
          />
        )}
        <div className="truncate">
          <h1 className="font-semibold text-gray-800 text-base sm:text-lg truncate">
            {room.topic}
          </h1>
          <p className="text-xs text-gray-600 truncate">
            Hosted by: {room.creator?.name}
          </p>
        </div>
      </div>

      <VoiceBroadcast room={room} socket={socket} isTutor={isTutor} />
      
      <div className="flex items-center gap-3">
        {/* Q&A Controls in Header */}
        {isTutor ? (
          <button
            onClick={onToggleQa}
            disabled={qaLoading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            title={qaEnabled ? "Disable Q&A" : "Enable Q&A"}
          >
            {qaLoading ? (
              <span className="animate-spin">⟳</span>
            ) : qaEnabled ? (
              <FaToggleOn className="text-green-500" />
            ) : (
              <FaToggleOff />
            )}
            <span className='text-xs'>Q&A {qaLoading ? '...' : ''}</span>
          </button>
        ) : (
          <button
            onClick={onToggleQaPanel}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <FaQuestionCircle />
            <span className='text-xs'>Ask Question</span>
          </button>
        )}
        
        <button
          onClick={handleCopy}
          className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <FaLink className="text-sm" /> Copy Link
        </button>
        {isTutor && (
          <button
            onClick={onToggleSidebar}
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm"
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;