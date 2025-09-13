// components/Toolbar.jsx
import React from 'react';
import { FaBrush, FaPencilAlt, FaEraser, FaPalette, FaSlidersH, FaTrash, FaTimes, FaPaintBrush } from 'react-icons/fa';

// Desktop Toolbar Component
export const DesktopToolbar = ({ tool, setTool, color, setColor, lineWidth, setLineWidth, onClearBoard, isTextMode, setIsTextMode }) => {
  return (
    <div className="hidden sm:flex items-center gap-4 bg-white px-4 py-3 border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTool("pen")}
          className={`p-2 rounded-lg transition-all ${
            tool === "pen" 
              ? "bg-blue-500 text-white shadow-md" 
              : "bg-white text-gray-600 hover:bg-gray-100 border"
          }`}
          title="Pen"
        >
          <FaBrush size={16} />
        </button>
        <button
          onClick={() => {
            setTool("text");
            setIsTextMode(true);
          }}
          className={`p-2 rounded-lg transition-all ${
            tool === "text" 
              ? "bg-green-500 text-white shadow-md" 
              : "bg-white text-gray-600 hover:bg-gray-100 border"
          }`}
          title="Text"
        >
          <FaPencilAlt size={16} />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`p-2 rounded-lg transition-all ${
            tool === "eraser" 
              ? "bg-red-500 text-white shadow-md" 
              : "bg-white text-gray-600 hover:bg-gray-100 border"
          }`}
          title="Eraser"
        >
          <FaEraser size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <button className="p-2 rounded-lg bg-white border text-gray-600 hover:bg-gray-100 transition-colors">
            <FaPalette size={16} />
          </button>
          <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-lg border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 border-0 rounded cursor-pointer"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border">
          <FaSlidersH size={12} className="text-gray-500" />
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(e.target.value)}
            className="w-16 accent-blue-500"
            title="Line Width"
          />
          <span className="text-xs text-gray-600 w-4">{lineWidth}</span>
        </div>
      </div>
      
      <button
        onClick={onClearBoard}
        className="ml-auto px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
      >
        <FaTrash size={14} /> Clear
      </button>
    </div>
  );
};

// Mobile Toolbar Toggle Button
export const MobileToolbarToggle = ({ toolbarOpen, onToggleToolbar }) => {
  return (
    <button
      onClick={onToggleToolbar}
      className="sm:hidden absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
    >
      {toolbarOpen ? <FaTimes /> : <FaPaintBrush />}
    </button>
  );
};

// Mobile Floating Toolbar
export const MobileFloatingToolbar = ({ 
  tool, 
  setTool, 
  color, 
  setColor, 
  lineWidth, 
  setLineWidth, 
  onClearBoard,
  isTextMode,
  setIsTextMode 
}) => {
  return (
    <div className="sm:hidden absolute top-16 left-4 z-10 bg-white rounded-xl shadow-lg p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setTool("pen")}
          className={`p-2 rounded-lg transition-all ${
            tool === "pen" 
              ? "bg-blue-500 text-white shadow-inner" 
              : "bg-white text-gray-600 hover:bg-gray-100 border"
          }`}
          title="Pen"
        >
          <FaBrush size={16} />
        </button>
        <button
          onClick={() => {
            setTool("text");
            setIsTextMode(true);
          }}
          className={`p-2 rounded-lg transition-all ${
            tool === "text" 
              ? "bg-green-500 text-white shadow-inner" 
              : "bg-white text-gray-600 hover:bg-gray-100 border"
          }`}
          title="Text"
        >
          <FaPencilAlt size={16} />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`p-2 rounded-lg transition-all ${
            tool === "eraser" 
              ? "bg-red-500 text-white shadow-inner" 
              : "bg-white text-gray-600 hover:bg-gray-100 border"
          }`}
          title="Eraser"
        >
          <FaEraser size={16} />
        </button>
      </div>

      <div className="border-t pt-2 flex flex-col gap-2">
        <div className="relative">
          <button className="p-2 rounded-lg bg-white border text-gray-600 hover:bg-gray-100 transition-colors w-full">
            <FaPalette size={16} />
          </button>
          <div className="absolute top-0 left-full ml-2 p-2 bg-white rounded-lg shadow-lg border z-10">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 border-0 rounded cursor-pointer"
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1 bg-white px-2 py-2 rounded-lg border">
          <FaSlidersH size={12} className="text-gray-500" />
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(e.target.value)}
            className="w-12 accent-blue-500"
            title="Line Width"
          />
          <span className="text-xs text-gray-600">{lineWidth}</span>
        </div>
      </div>
      
      <div className="border-t pt-2">
        <button
          onClick={onClearBoard}
          className="p-2 w-full bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
          title="Clear Canvas"
        >
          <FaTrash size={14} />
        </button>
      </div>
    </div>
  );
};