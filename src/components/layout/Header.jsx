// components/Header.jsx
import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaLink, FaBars, FaTimes, FaQuestionCircle, FaToggleOn, FaToggleOff, FaUsers, FaPencilAlt, FaFilePdf, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import VoiceBroadcast from './VoiceBroadcast';
import { QaControls } from './QaManager';

const Header = ({ 
  room, 
  socket, 
  isTutor, 
  qaEnabled, 
  qaLoading, 
  onOpenQaPanel, 
  sidebarOpen, 
  view,
  onNavigateBack, 
  onToggleQa, 
  onToggleSidebar, 
  onToggleQaPanel,
  onViewChange,
  onEndRoom,
  studentQuestions,
}) => {
  const [roomStats, setRoomStats] = useState({
    totalUsers: 0,
    students: 0,
    tutors: 0,
    userList: []
  });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Listen for room stats updates
  useEffect(() => {
    if (!socket) return;

    const handleRoomStatsUpdate = (stats) => {
      setRoomStats(stats);
    };

    socket.on("room-stats-update", handleRoomStatsUpdate);

    return () => {
      socket.off("room-stats-update", handleRoomStatsUpdate);
    };
  }, [socket]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
    toast.success("Link copied");
  };

  return (
    <>
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center relative z-50">
        {/* Left section */}
        <div className="flex items-center flex-shrink-0">
          <button
            onClick={onNavigateBack}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors mr-2"
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
          
          {/* <div className="hidden xs:block">
            <VoiceBroadcast socket={socket} room={room} isTutor={isTutor} />
          </div> */}
        </div>
        
        {/* Center section */}
        <div className="flex-1 min-w-0 mx-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 mb-1 max-w-full">
              <h1 className="text-lg font-semibold text-gray-800 truncate">
                {room.topic}
              </h1>
              
              {/* Student Count Display */}
              <div title="number of listeners" className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                <FaUsers className="w-3 h-3" />
                <span className="font-medium">
                  {roomStats.students}
                </span>
                <span className="hidden xs:inline text-xs text-blue-500">
                  {roomStats.students === 1 ? 'student' : 'students'}
                </span>
              </div>
            </div>

            {!isTutor && (
              <div className="text-sm text-gray-600 truncate max-w-full">
                <span>Hosted by: {room.creator?.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="xs:hidden border-b border-gray-100">
          <VoiceBroadcast socket={socket} room={room} isTutor={isTutor} />
        </div>
        {/* Right section - Desktop buttons */}
        <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
          {/* Q&A Controls in Header */}
          {isTutor ? (
            <button
              onClick={onToggleQa}
              disabled={qaLoading}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                qaEnabled 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${qaLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {qaLoading ? (
                <span className="animate-spin">⟳</span>
              ) : qaEnabled ? (
                <FaToggleOn className="text-lg" />
              ) : (
                <FaToggleOff className="text-lg" />
              )}
              <span>Q&A {qaLoading ? '...' : ''}</span>
            </button>
          ) : (
            <button
              onClick={onToggleQaPanel}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg text-sm transition-colors"
            >
              <FaQuestionCircle />
              <span>Ask Question</span>
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors"
          >
            <FaLink />
            <span>Copy Link</span>
          </button>
          
          {/* {isTutor && (
            <button
              onClick={onToggleSidebar}
              className="p-2 md:hidden text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <FaTimes /> : <FaBars />}
              {studentQuestions.filter(q => !q.answered).length}
            </button>
          )} */}
        </div>

        {/* Right section - Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <FaBars />
          </button>
            <span className={`${studentQuestions.length === 0 || studentQuestions.filter(q => !q.answered).length === 0 && ("hidden")} absolute right-2 top-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center`}>
              {studentQuestions.filter(q => !q.answered).length}
            </span>
        </div>

        {/* Mobile menu dropdown */}
        <div className={`fixed top-16 right-0 bg-white shadow-lg rounded-lg p-4 z-50 transition-all duration-300 ease-in-out transform md:hidden ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          <div className="flex flex-col space-y-3 min-w-[200px]">
            {/* View Controls Section - Only for Tutors */}
            {isTutor && (
              <>
                <div className="text-sm font-medium text-gray-500 px-1 mb-1">
                  View Options
                </div>
                
                {/* Whiteboard Option */}
                <button
                  onClick={() => {
                    onViewChange("whiteboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
                    view === "whiteboard" 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FaPencilAlt className={view === "whiteboard" ? "text-blue-600" : "text-gray-500"} />
                  <span>Whiteboard</span>
                  {view === "whiteboard" && <span className="ml-auto text-xs text-blue-600">Active</span>}
                </button>
                
                {/* PDF Viewer Option */}
                <button
                  onClick={() => {
                    onViewChange("pdf");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
                    view === "pdf" 
                      ? 'bg-red-100 text-red-800 border border-red-200' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FaFilePdf className={view === "pdf" ? "text-red-600" : "text-gray-500"} />
                  <span>PDF Viewer</span>
                  {view === "pdf" && <span className="ml-auto text-xs text-red-600">Active</span>}
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-1"></div>
                
                <div className="text-sm font-medium text-gray-500 px-1 mb-1">
                  Q&A Controls
                </div>
              </>
            )}

            {/* Q&A Controls */}
            <QaControls 
              qaEnabled={qaEnabled}
              onToggleQa={onToggleQa}
              qaLoading={qaLoading}
              studentQuestions={studentQuestions}
              onOpenPanel={onOpenQaPanel}
              isTutor={isTutor}
            />
            
            
            {/* Copy Link Button */}
            <button
              onClick={() => {
                handleCopy();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors w-full text-left"
            >
              <FaLink />
              <span>Copy Link</span>
            </button>

            <button
              onClick={() => {
                onEndRoom();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm transition-colors w-full text-left"
            >
              <FaStop />
              <span>End Session</span>
            </button>
            
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;