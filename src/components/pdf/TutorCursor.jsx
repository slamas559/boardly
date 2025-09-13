import React from "react";
import { FaHighlighter, FaEraser, FaEye } from "react-icons/fa";

const TutorCursor = ({ cursor }) => {
  if (!cursor) return null;
  
  const getModeIcon = () => {
    switch (cursor.mode) {
      case "highlight":
        return <FaHighlighter className="text-yellow-600" size={12} />;
      case "erase":
        return <FaEraser className="text-red-600" size={12} />;
      default:
        return <FaEye className="text-blue-600" size={12} />;
    }
  };
  
  return (
    <div 
      className="absolute z-40 pointer-events-none transition-transform duration-100"
      style={{
        left: cursor.x,
        top: cursor.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex flex-col items-center">
        <div className="bg-blue-500 text-white rounded-full w-2 h-2 border-white shadow-lg">
        </div>
        {/* Uncomment if you want to show mode icons
        <div className="bg-white rounded px-2 py-1 shadow-md border mt-1 opacity-90">
          {getModeIcon()}
        </div>
        */}
      </div>
    </div>
  );
};

export default TutorCursor;